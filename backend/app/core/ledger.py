from __future__ import annotations

from typing import Protocol

from sqlalchemy.orm import Session


class LedgerPoster(Protocol):
    def post_document(self, db: Session, document) -> None: ...
    def reverse_document(self, db: Session, document) -> None: ...
    def post_payment(self, db: Session, payment) -> None: ...
    def reverse_payment(self, db: Session, payment) -> None: ...


class NullLedgerPoster:
    def post_document(self, db: Session, document) -> None:
        return None

    def reverse_document(self, db: Session, document) -> None:
        return None

    def post_payment(self, db: Session, payment) -> None:
        return None

    def reverse_payment(self, db: Session, payment) -> None:
        return None


ledger_poster: LedgerPoster = NullLedgerPoster()
