import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

SLUG_PATTERN = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    slug: str = Field(min_length=3, max_length=150)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Nama organisasi tidak boleh kosong")
        return stripped

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        normalized = value.lower().strip()
        if not SLUG_PATTERN.match(normalized):
            raise ValueError(
                "Slug hanya dapat mengandung huruf kecil, angka, dan tanda hubung; "
                "tidak boleh diawali atau diakhiri dengan tanda hubung"
            )
        return normalized


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    status: str
    created_at: datetime
