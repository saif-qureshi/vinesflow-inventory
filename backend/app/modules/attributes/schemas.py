from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class AttributeValueSummary(BaseModel):
    """A resolved attribute value used inside product / variant reads."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    attribute_id: int
    attribute_name: str
    value: str
