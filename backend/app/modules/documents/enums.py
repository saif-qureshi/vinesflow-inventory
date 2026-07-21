from __future__ import annotations

from enum import StrEnum


class DocumentType(StrEnum):
    SALES_ORDER = "sales_order"
    DELIVERY_CHALLAN = "delivery_challan"
    INVOICE = "invoice"
    SALES_RECEIPT = "sales_receipt"
    CREDIT_NOTE = "credit_note"
    PURCHASE_ORDER = "purchase_order"
    GOODS_RECEIPT = "goods_receipt"
    BILL = "bill"
    VENDOR_CREDIT = "vendor_credit"


class DocumentStatus(StrEnum):
    DRAFT = "draft"
    SENT = "sent"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    VOID = "void"


DEFAULT_PREFIXES: dict[DocumentType, str] = {
    DocumentType.SALES_ORDER: "SO",
    DocumentType.DELIVERY_CHALLAN: "DC",
    DocumentType.INVOICE: "INV",
    DocumentType.SALES_RECEIPT: "SR",
    DocumentType.CREDIT_NOTE: "CN",
    DocumentType.PURCHASE_ORDER: "PO",
    DocumentType.GOODS_RECEIPT: "GRN",
    DocumentType.BILL: "BILL",
    DocumentType.VENDOR_CREDIT: "VC",
}
