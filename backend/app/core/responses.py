from __future__ import annotations

import json
from typing import Any

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from starlette.exceptions import HTTPException as StarletteHTTPException

_SKIP_CONTENT_HEADERS = {"content-length", "content-type"}


def success_body(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data, "error": None}


def error_body(code: str, message: str, details: Any = None) -> dict[str, Any]:
    error: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        error["details"] = details
    return {"success": False, "data": None, "error": error}


class EnvelopeRoute(APIRoute):
    """Wraps successful JSON responses in the standard success envelope.

    Errors are raised as exceptions and handled by the registered exception
    handlers, so they never pass through here.
    """

    def get_route_handler(self):
        original = super().get_route_handler()

        async def wrapped(request: Request) -> JSONResponse:
            response = await original(request)
            content_type = response.headers.get("content-type", "")
            body = getattr(response, "body", b"")
            if not body or not content_type.startswith("application/json"):
                return response
            payload = json.loads(body)
            if isinstance(payload, dict) and payload.get("success") is not None and "error" in payload:
                return response  # already an envelope
            new_body = json.dumps(success_body(payload)).encode()
            response.body = new_body
            response.headers["content-length"] = str(len(new_body))
            return response

        return wrapped


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(
        error_body(f"http_{exc.status_code}", message),
        status_code=exc.status_code,
        headers=getattr(exc, "headers", None),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        error_body("validation_error", "Validation failed", jsonable_encoder(exc.errors())),
        status_code=422,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        error_body("internal_error", "Internal server error"),
        status_code=500,
    )


def register_exception_handlers(app) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
