"""A document flattened to a print-ready, presentation-only shape.

Any domain document (invoice, bill, ...) maps into this and the skins render it.
All money and dates are already formatted strings.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class PrintMetaField(BaseModel):
    label: str
    value: str


class PrintParty(BaseModel):
    heading: str
    name: str
    lines: list[str] = Field(default_factory=list)


class PrintColumn(BaseModel):
    key: str
    label: str
    align: str = "left"


class PrintRow(BaseModel):
    cells: dict[str, str] = Field(default_factory=dict)


class PrintTotalLine(BaseModel):
    label: str
    value: str
    emphasize: bool = False


class PrintCompany(BaseModel):
    name: str
    logo_data_url: str | None = None
    lines: list[str] = Field(default_factory=list)


class PrintContact(BaseModel):
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    address: str | None = None


class PrintDocument(BaseModel):
    title: str
    document_no: str
    header_note: str | None = None
    company: PrintCompany
    parties: list[PrintParty] = Field(default_factory=list)
    meta: list[PrintMetaField] = Field(default_factory=list)
    columns: list[PrintColumn] = Field(default_factory=list)
    rows: list[PrintRow] = Field(default_factory=list)
    totals: list[PrintTotalLine] = Field(default_factory=list)
    currency: str | None = None
    amount_in_words: str | None = None
    footer_contact: PrintContact | None = None
    notes: str | None = None
    # Reserved for FBR: the returned QR, an optional logo drawn in its centre.
    stamp_image_data_url: str | None = None
    stamp_overlay_data_url: str | None = None
    stamp_caption: str | None = None


class PrintBranding(BaseModel):
    accent_color: str = "#0f766e"
    show_logo: bool = True
    footer_text: str | None = None
    terms: str | None = None
    watermark_text: str | None = None
    watermark_opacity: float = 0.08


DEFAULT_BRANDING = PrintBranding()
