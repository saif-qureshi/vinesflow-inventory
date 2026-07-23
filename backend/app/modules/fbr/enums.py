from __future__ import annotations

from enum import StrEnum


class FbrEnvironment(StrEnum):
    SANDBOX = "sandbox"
    PRODUCTION = "production"


class FbrReferenceType(StrEnum):
    DOC_TYPE = "doc_type"
    HS_CODE = "hs_code"
    UOM = "uom"
    SALE_TYPE = "sale_type"
    TAX_RATE = "tax_rate"
    SRO_SCHEDULE = "sro_schedule"
    SRO_ITEM = "sro_item"


class FbrProvince(StrEnum):
    PUNJAB = "PUNJAB"
    SINDH = "SINDH"
    KHYBER_PAKHTUNKHWA = "KHYBER PAKHTUNKHWA"
    BALOCHISTAN = "BALOCHISTAN"
    CAPITAL_TERRITORY = "CAPITAL TERRITORY"
    GILGIT_BALTISTAN = "GILGIT BALTISTAN"
    AZAD_JAMMU_KASHMIR = "AZAD JAMMU AND KASHMIR"


class FbrStatus(StrEnum):
    NOT_APPLICABLE = "not_applicable"
    PENDING = "pending"
    POSTED = "posted"
    FAILED = "failed"
