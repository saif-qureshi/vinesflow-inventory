from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.core.pagination import paginate_cursor
from app.modules.activities.service import ActivityService
from app.modules.documents.enums import DEFAULT_PREFIXES, DocumentStatus, DocumentType
from app.modules.documents.models import (
    Bill,
    Document,
    DocumentLine,
    DocumentSequence,
    Invoice,
    TaxRate,
)
from app.modules.documents.schemas import (
    DocumentCreate,
    DocumentLineInput,
    DocumentListQuery,
    DocumentUpdate,
    SellableItemRead,
    TaxRateCreate,
)
from app.modules.inventory.service import InventoryService
from app.modules.locations.models import Location
from app.modules.parties.models import Party
from app.modules.products.models import Product

_ZERO = Decimal("0")
_CENTS = Decimal("0.01")
_HUNDRED = Decimal("100")

DEFAULT_TAX_RATES = [("GST 18%", Decimal("18")), ("Exempt", Decimal("0"))]

DOCUMENT_CLASSES: dict[DocumentType, type[Document]] = {
    DocumentType.INVOICE: Invoice,
    DocumentType.BILL: Bill,
}

SALES_TYPES = {
    DocumentType.SALES_ORDER,
    DocumentType.DELIVERY_CHALLAN,
    DocumentType.INVOICE,
    DocumentType.SALES_RECEIPT,
    DocumentType.CREDIT_NOTE,
}


def _q(value: Decimal) -> Decimal:
    return Decimal(value).quantize(_CENTS)


class DocumentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.activity = ActivityService(db)
        self.inventory = InventoryService(db)

    # --- Seeding ----------------------------------------------------------

    def seed_tax_rates(self, org_id: int) -> None:
        existing = set(self.db.scalars(select(TaxRate.name).where(TaxRate.org_id == org_id)))
        self.db.add_all(
            TaxRate(org_id=org_id, name=name, rate=rate, is_system=True)
            for name, rate in DEFAULT_TAX_RATES
            if name not in existing
        )
        self.db.flush()

    def seed_sequences(self, org_id: int) -> None:
        existing = set(
            self.db.scalars(select(DocumentSequence.type).where(DocumentSequence.org_id == org_id))
        )
        self.db.add_all(
            DocumentSequence(org_id=org_id, type=doc_type, prefix=prefix)
            for doc_type, prefix in DEFAULT_PREFIXES.items()
            if doc_type not in existing
        )
        self.db.flush()

    # --- Tax rates --------------------------------------------------------

    def list_tax_rates(self, org_id: int) -> list[TaxRate]:
        return list(
            self.db.scalars(select(TaxRate).where(TaxRate.org_id == org_id).order_by(TaxRate.id))
        )

    def create_tax_rate(self, org_id: int, payload: TaxRateCreate) -> TaxRate:
        if self.db.scalar(
            select(TaxRate.id).where(TaxRate.org_id == org_id, TaxRate.name == payload.name)
        ):
            raise ConflictError("A tax rate with that name already exists")
        rate = TaxRate(
            org_id=org_id, name=payload.name, rate=payload.rate, is_active=payload.is_active
        )
        self.db.add(rate)
        self.db.commit()
        self.db.refresh(rate)
        return rate

    # --- Sellable items (document line picker) ----------------------------

    def sellable_items(self, org_id: int, search: str | None, limit: int) -> list[SellableItemRead]:
        stmt = select(Product).where(
            Product.org_id == org_id,
            Product.type == "single",
            Product.is_active.is_(True),
        )
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like)))
        products = self.db.scalars(stmt.order_by(Product.name).limit(limit))
        return [
            SellableItemRead(
                id=p.id,
                name=p.name,
                sku=p.sku,
                description=p.description or (p.parent.description if p.parent else None),
                image_url=self._item_image(p),
                uom_symbol=p.uom.symbol if p.uom else None,
                sale_price=p.sale_price,
                purchase_price=p.purchase_price,
            )
            for p in products
        ]

    @staticmethod
    def _item_image(product: Product) -> str | None:
        if product.media:
            return product.media[0].url
        if product.parent and product.parent.media:
            return product.parent.media[0].url
        return None

    # --- Numbering --------------------------------------------------------

    def _next_number(self, org_id: int, doc_type: DocumentType) -> str:
        seq = self.db.scalar(
            select(DocumentSequence)
            .where(DocumentSequence.org_id == org_id, DocumentSequence.type == doc_type)
            .with_for_update()
        )
        if seq is None:
            seq = DocumentSequence(org_id=org_id, type=doc_type, prefix=DEFAULT_PREFIXES[doc_type])
            self.db.add(seq)
            self.db.flush()
        number = seq.next_number
        seq.next_number = number + 1
        return f"{seq.prefix}-{number:0{seq.padding}d}"

    # --- Lines & totals ---------------------------------------------------

    def _tax_map(self, org_id: int, lines: list[DocumentLineInput]) -> dict[int, TaxRate]:
        ids = {line.tax_rate_id for line in lines if line.tax_rate_id is not None}
        if not ids:
            return {}
        rates = {
            r.id: r
            for r in self.db.scalars(
                select(TaxRate).where(TaxRate.org_id == org_id, TaxRate.id.in_(ids))
            )
        }
        if len(rates) != len(ids):
            raise NotFoundError("One or more tax rates were not found")
        return rates

    def _validate_products(self, org_id: int, lines: list[DocumentLineInput]) -> None:
        ids = {line.product_id for line in lines if line.product_id is not None}
        if not ids:
            return
        found = set(
            self.db.scalars(select(Product.id).where(Product.org_id == org_id, Product.id.in_(ids)))
        )
        if ids - found:
            raise NotFoundError("One or more items were not found")

    def _build_lines(
        self, org_id: int, line_inputs: list[DocumentLineInput]
    ) -> tuple[list[DocumentLine], Decimal, Decimal, Decimal]:
        self._validate_products(org_id, line_inputs)
        tax_map = self._tax_map(org_id, line_inputs)
        lines: list[DocumentLine] = []
        subtotal = discount_total = tax_total = _ZERO
        for i, line in enumerate(line_inputs):
            base = _q(line.quantity * line.unit_price)
            discount = _q(line.discount)
            taxable = base - discount
            rate = tax_map[line.tax_rate_id].rate if line.tax_rate_id is not None else _ZERO
            tax = _q(taxable * rate / _HUNDRED)
            lines.append(
                DocumentLine(
                    product_id=line.product_id,
                    description=line.description,
                    quantity=line.quantity,
                    unit_price=line.unit_price,
                    discount=discount,
                    tax_rate_id=line.tax_rate_id,
                    tax_amount=tax,
                    line_total=taxable + tax,
                    sort_order=i,
                )
            )
            subtotal += base
            discount_total += discount
            tax_total += tax
        return lines, subtotal, discount_total, tax_total

    def _apply_totals(
        self, doc: Document, subtotal: Decimal, discount_total: Decimal, tax_total: Decimal
    ) -> None:
        doc.subtotal = subtotal
        doc.discount_total = discount_total
        doc.tax_total = tax_total
        doc.total = subtotal - discount_total + tax_total + doc.shipping + doc.adjustment

    def _get_party(self, org_id: int, party_id: int, doc_type: DocumentType) -> Party:
        party = self.db.scalar(select(Party).where(Party.id == party_id, Party.org_id == org_id))
        if party is None:
            label = "Customer" if doc_type in SALES_TYPES else "Vendor"
            raise NotFoundError(f"{label} not found")
        return party

    def _default_location(self, org_id: int) -> int | None:
        return self.db.scalar(
            select(Location.id).where(Location.org_id == org_id).order_by(Location.id)
        )

    def _default_due(self, issue_date: date, party: Party) -> date | None:
        if party.payment_term_days:
            return issue_date + timedelta(days=party.payment_term_days)
        return None

    def get(self, org_id: int, doc_id: int) -> Document:
        doc = self.db.scalar(
            select(Document)
            .where(Document.id == doc_id, Document.org_id == org_id)
            .options(joinedload(Document.party))
        )
        if doc is None:
            raise NotFoundError("Document not found")
        return doc

    def get_of_type(self, org_id: int, doc_id: int, doc_type: DocumentType) -> Document:
        doc = self.get(org_id, doc_id)
        if doc.type != doc_type:
            raise NotFoundError("Document not found")
        return doc

    def create(self, org_id: int, doc_type: DocumentType, payload: DocumentCreate) -> Document:
        doc_cls = DOCUMENT_CLASSES[doc_type]
        party = self._get_party(org_id, payload.party_id, doc_type)
        issue_date = payload.issue_date or date.today()
        doc = doc_cls(
            org_id=org_id,
            number=self._next_number(org_id, doc_type),
            status=DocumentStatus.DRAFT,
            party_id=party.id,
            warehouse_id=payload.warehouse_id,
            issue_date=issue_date,
            due_date=payload.due_date or self._default_due(issue_date, party),
            reference=payload.reference,
            notes=payload.notes,
            terms=payload.terms,
            shipping=_q(payload.shipping),
            adjustment=_q(payload.adjustment),
            billing_address=party.billing_address,
            shipping_address=party.shipping_address,
        )
        lines, subtotal, discount_total, tax_total = self._build_lines(org_id, payload.lines)
        doc.lines = lines
        self._apply_totals(doc, subtotal, discount_total, tax_total)
        self.db.add(doc)
        self.db.flush()
        self.activity.record(org_id, "created", doc_type, doc.number, entity_id=doc.id)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def list_documents(
        self, org_id: int, doc_type: DocumentType, query: DocumentListQuery
    ) -> tuple[list[Document], str | None, bool]:
        stmt = select(Document).where(Document.org_id == org_id, Document.type == doc_type)
        if query.status:
            stmt = stmt.where(Document.status == query.status)
        if query.party_id is not None:
            stmt = stmt.where(Document.party_id == query.party_id)
        if query.search:
            like = f"%{query.search.strip()}%"
            stmt = stmt.where(or_(Document.number.ilike(like), Document.reference.ilike(like)))
        return paginate_cursor(self.db, stmt, Document.id, query)

    def update(
        self, org_id: int, doc_id: int, doc_type: DocumentType, payload: DocumentUpdate
    ) -> Document:
        doc = self.get_of_type(org_id, doc_id, doc_type)
        if doc.status != DocumentStatus.DRAFT:
            raise BadRequestError("Only draft documents can be edited")
        fields = payload.model_fields_set
        if "party_id" in fields and payload.party_id is not None:
            party = self._get_party(org_id, payload.party_id, doc_type)
            doc.party_id = party.id
            doc.billing_address = party.billing_address
            doc.shipping_address = party.shipping_address
        for field in ("issue_date", "due_date", "reference", "warehouse_id", "notes", "terms"):
            if field in fields:
                setattr(doc, field, getattr(payload, field))
        if payload.shipping is not None:
            doc.shipping = _q(payload.shipping)
        if payload.adjustment is not None:
            doc.adjustment = _q(payload.adjustment)
        if payload.lines is not None:
            lines, subtotal, discount_total, tax_total = self._build_lines(org_id, payload.lines)
            doc.lines = lines
            self._apply_totals(doc, subtotal, discount_total, tax_total)
        else:
            self._apply_totals(doc, doc.subtotal, doc.discount_total, doc.tax_total)
        self.activity.record(org_id, "updated", doc_type, doc.number, entity_id=doc.id)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def finalize(
        self, org_id: int, doc_id: int, expected_type: DocumentType | None = None
    ) -> Document:
        doc = self.get(org_id, doc_id)
        if expected_type and doc.type != expected_type:
            raise NotFoundError("Document not found")
        if doc.status != DocumentStatus.DRAFT:
            raise BadRequestError("Only draft documents can be finalized")
        if not doc.lines:
            raise BadRequestError("Cannot finalize a document with no lines")
        if doc.stock_direction != 0 and any(line.product_id for line in doc.lines):
            if doc.warehouse_id is None:
                doc.warehouse_id = self._default_location(org_id)
            if doc.warehouse_id is None:
                raise BadRequestError("No warehouse available to move stock")
        self._post_stock(org_id, doc, reverse=False)
        doc.status = DocumentStatus.SENT
        self.activity.record(org_id, "finalized", doc.type, doc.number, entity_id=doc.id)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def void(
        self, org_id: int, doc_id: int, expected_type: DocumentType | None = None
    ) -> Document:
        doc = self.get(org_id, doc_id)
        if expected_type and doc.type != expected_type:
            raise NotFoundError("Document not found")
        if doc.status in (DocumentStatus.DRAFT, DocumentStatus.VOID):
            raise BadRequestError("Only a finalized document can be voided")
        if doc.amount_paid > _ZERO:
            raise BadRequestError("Cannot void a document with recorded payments")
        self._post_stock(org_id, doc, reverse=True)
        doc.status = DocumentStatus.VOID
        self.activity.record(org_id, "voided", doc.type, doc.number, entity_id=doc.id)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def delete(self, org_id: int, doc_id: int, expected_type: DocumentType | None = None) -> None:
        doc = self.get(org_id, doc_id)
        if expected_type and doc.type != expected_type:
            raise NotFoundError("Document not found")
        if doc.status != DocumentStatus.DRAFT:
            raise BadRequestError("Only draft documents can be deleted")
        self.activity.record(org_id, "deleted", doc.type, doc.number, entity_id=doc.id)
        self.db.delete(doc)
        self.db.commit()

    def _post_stock(self, org_id: int, doc: Document, reverse: bool) -> None:
        if doc.stock_direction == 0 or doc.warehouse_id is None:
            return
        trackable = [line for line in doc.lines if line.product_id is not None]
        if not trackable:
            return
        products = {
            p.id: p
            for p in self.db.scalars(
                select(Product).where(Product.id.in_([line.product_id for line in trackable]))
            )
        }
        direction = -doc.stock_direction if reverse else doc.stock_direction
        for line in trackable:
            product = products.get(line.product_id)
            if product is None or not product.track_inventory:
                continue
            unit_cost = line.unit_price if doc.stock_direction > 0 else product.purchase_price
            self.inventory.post_document_movement(
                org_id=org_id,
                product_id=line.product_id,
                location_id=doc.warehouse_id,
                qty_delta=direction * line.quantity,
                type_=doc.movement_type,
                reference_type=doc.type,
                reference_id=doc.id,
                unit_cost=unit_cost,
            )
