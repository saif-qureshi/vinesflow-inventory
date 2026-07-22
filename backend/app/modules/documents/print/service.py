from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.core.pdf import PdfService, page_footer_html
from app.modules.documents.enums import DocumentType
from app.modules.documents.print.mapper import branding_for, document_to_print
from app.modules.documents.print.skins import render_document_html
from app.modules.documents.service import DocumentService
from app.modules.orgs.models import Organization


class DocumentPrintService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.documents = DocumentService(db)
        self.pdf = PdfService()

    def _org(self, org_id: int) -> Organization:
        org = self.db.scalar(select(Organization).where(Organization.id == org_id))
        if org is None:
            raise NotFoundError("Organization not found")
        return org

    def render_html(self, org_id: int, doc_id: int, doc_type: DocumentType, skin: str) -> str:
        doc = self.documents.get_of_type(org_id, doc_id, doc_type)
        org = self._org(org_id)
        return render_document_html(document_to_print(doc, org), branding_for(org), skin)

    def render_pdf(
        self, org_id: int, doc_id: int, doc_type: DocumentType, skin: str, paper: str
    ) -> tuple[bytes, str]:
        doc = self.documents.get_of_type(org_id, doc_id, doc_type)
        org = self._org(org_id)
        branding = branding_for(org)
        html = render_document_html(document_to_print(doc, org), branding, skin)
        footer = page_footer_html(branding.footer_text) if branding.footer_text else None
        return self.pdf.html_to_pdf(html, paper, footer), f"{doc.number}.pdf"
