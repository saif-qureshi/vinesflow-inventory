"""Generic HTML -> PDF engine.

Knows nothing about any particular document: callers pass fully self-contained
HTML (inline CSS, data: URIs for images). Rendering is delegated to Gotenberg
(headless Chromium) over HTTP.
"""

from __future__ import annotations

import httpx

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError

PaperSize = str

# Inches. Thermal rolls use a long fixed height; the printer trims trailing space.
PAPER: dict[PaperSize, tuple[float, float, float]] = {
    "a4": (8.27, 11.69, 0.4),
    "letter": (8.5, 11.0, 0.4),
    "thermal80": (3.15, 40.0, 0.08),
    "thermal58": (2.28, 40.0, 0.06),
}


class PdfService:
    def html_to_pdf(
        self,
        html: str,
        paper: PaperSize = "a4",
        footer_html: str | None = None,
        margin_inches: float | None = None,
    ) -> bytes:
        width, height, default_margin = PAPER.get(paper, PAPER["a4"])
        margin = default_margin if margin_inches is None else margin_inches

        files = [("files", ("index.html", html.encode("utf-8"), "text/html"))]
        if footer_html:
            files.append(("files", ("footer.html", footer_html.encode("utf-8"), "text/html")))
        data = {
            "paperWidth": str(width),
            "paperHeight": str(height),
            "marginTop": str(margin),
            "marginBottom": str(margin),
            "marginLeft": str(margin),
            "marginRight": str(margin),
            "printBackground": "true",
        }
        url = f"{settings.GOTENBERG_URL.rstrip('/')}/forms/chromium/convert/html"
        try:
            response = httpx.post(url, files=files, data=data, timeout=60.0)
        except httpx.HTTPError as exc:
            raise ServiceUnavailableError("PDF service is unavailable") from exc
        if response.status_code != 200:
            raise ServiceUnavailableError("PDF generation failed")
        return response.content


def page_footer_html(text: str) -> str:
    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return (
        "<html><head><style>*{margin:0;padding:0}</style></head><body>"
        '<div style="width:100%;font-size:8px;font-style:italic;color:#8a8a8a;'
        f'text-align:center;padding:0 12px;">{safe}</div>'
        "</body></html>"
    )
