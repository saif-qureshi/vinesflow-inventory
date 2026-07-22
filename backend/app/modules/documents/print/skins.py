"""Skins: each is a Jinja template plus its own stylesheet, layered over the
shared base sheet. Templates and styles are read per render so edits hot-reload
in dev; the read is trivial next to a Gotenberg round-trip."""

from __future__ import annotations

import re
from pathlib import Path

from jinja2 import Environment, StrictUndefined

from app.modules.documents.print.print_document import PrintBranding, PrintDocument

_HERE = Path(__file__).parent
_TEMPLATES = _HERE / "templates"
_STYLES = _HERE / "styles"

SKIN_LABELS = {"corporate": "Corporate", "thermal": "Thermal"}

_SKIN_TEMPLATE = {"corporate": "document-corporate.jinja", "thermal": "document-thermal.jinja"}
_SKIN_STYLE = {"corporate": "corporate.css", "thermal": "thermal.css"}

_HEX = re.compile(r"^#[0-9a-fA-F]{3,8}$")

_env = Environment(autoescape=True, undefined=StrictUndefined)


def skin_options() -> list[dict[str, str]]:
    return [{"key": key, "label": label} for key, label in SKIN_LABELS.items()]


def _context(doc: PrintDocument, branding: PrintBranding) -> dict:
    columns = [{"label": c.label, "align": c.align} for c in doc.columns]
    rows = [
        {"cells": [{"value": row.cells.get(c.key, ""), "align": c.align} for c in doc.columns]}
        for row in doc.rows
    ]
    currency = (doc.currency or "").strip()
    totals = [
        {
            "label": t.label,
            "value": f"{currency} {t.value}" if currency else t.value,
            "emphasize": t.emphasize,
        }
        for t in doc.totals
    ]
    grand = next((t for t in doc.totals if t.emphasize), doc.totals[-1] if doc.totals else None)
    amount_due = (f"{currency} {grand.value}" if currency else grand.value) if grand else None
    contact = doc.footer_contact
    footer_contact = (
        contact.model_dump()
        if contact and any([contact.phone, contact.email, contact.website, contact.address])
        else None
    )
    return {
        "show_logo": branding.show_logo and bool(doc.company.logo_data_url),
        "watermark": branding.watermark_text or None,
        "header_note": doc.header_note or None,
        "company": doc.company.model_dump(),
        "title": doc.title,
        "document_no": doc.document_no,
        "meta": [m.model_dump() for m in doc.meta],
        "parties": [p.model_dump() for p in doc.parties],
        "columns": columns,
        "rows": rows,
        "totals": totals,
        "amount_in_words": doc.amount_in_words or None,
        "amount_due": amount_due,
        "footer_contact": footer_contact,
        "notes": doc.notes or None,
        "terms": branding.terms or None,
        "footer_text": branding.footer_text or None,
        "stamp": {
            "image": doc.stamp_image_data_url or None,
            "overlay": doc.stamp_overlay_data_url or None,
            "caption": doc.stamp_caption or None,
        },
    }


def render_document_html(doc: PrintDocument, branding: PrintBranding, skin: str = "corporate") -> str:
    skin = skin if skin in _SKIN_TEMPLATE else "corporate"
    accent = branding.accent_color if _HEX.match(branding.accent_color or "") else "#0f766e"
    opacity = min(max(branding.watermark_opacity, 0.0), 1.0)

    template = _env.from_string((_TEMPLATES / _SKIN_TEMPLATE[skin]).read_text(encoding="utf-8"))
    body = template.render(**_context(doc, branding))

    base_css = (_STYLES / "base.css").read_text(encoding="utf-8")
    skin_css = (_STYLES / _SKIN_STYLE[skin]).read_text(encoding="utf-8")
    return (
        '<!doctype html><html><head><meta charset="utf-8">'
        f"<style>{base_css}{skin_css}:root{{--accent:{accent};--wm-opacity:{opacity}}}</style>"
        f"</head><body>{body}</body></html>"
    )
