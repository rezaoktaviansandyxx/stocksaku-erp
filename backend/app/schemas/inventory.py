from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# =============================================================================
# Product schemas
# =============================================================================

class ProductBase(BaseModel):
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=150)
    cost_price: Decimal = Field(ge=0, decimal_places=2)
    selling_price: Decimal = Field(ge=0, decimal_places=2)
    min_stock: Decimal = Field(ge=0, decimal_places=3, default=Decimal("0"))
    is_active: bool = True

    @field_validator("sku")
    @classmethod
    def strip_sku(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("SKU tidak boleh kosong")
        return s

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Nama tidak boleh kosong")
        return s


class ProductCreate(ProductBase):
    category_id: Optional[int] = None
    unit_id: int


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    cost_price: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    selling_price: Optional[Decimal] = Field(default=None, ge=0, decimal_places=2)
    min_stock: Optional[Decimal] = Field(default=None, ge=0, decimal_places=3)
    is_active: Optional[bool] = None
    category_id: Optional[int] = None
    unit_id: Optional[int] = None


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    category_id: Optional[int] = None
    unit_id: int


# =============================================================================
# Category schemas
# =============================================================================

class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Nama kategori tidak boleh kosong")
        return s


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: datetime


# =============================================================================
# Unit schemas
# =============================================================================

class UnitBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    symbol: str = Field(min_length=1, max_length=20)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Nama satuan tidak boleh kosong")
        return s

    @field_validator("symbol")
    @classmethod
    def strip_symbol(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Simbol satuan tidak boleh kosong")
        return s


class UnitCreate(UnitBase):
    pass


class UnitResponse(UnitBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: datetime


# =============================================================================
# Warehouse schemas
# =============================================================================

class WarehouseBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Nama gudang tidak boleh kosong")
        return s


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    is_active: Optional[bool] = None


class WarehouseResponse(WarehouseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    created_at: datetime


# =============================================================================
# Stock balance & movement schemas
# =============================================================================

class StockBalanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    warehouse_id: int
    product_id: int
    quantity: Decimal
    updated_at: datetime


class StockMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    warehouse_id: int
    product_id: int
    created_by: Optional[int] = None
    movement_type: str
    quantity: Decimal
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime


# =============================================================================
# Inventory transaction schemas
# =============================================================================

class StockAdjustmentRequest(BaseModel):
    warehouse_id: int
    product_id: int
    quantity: Decimal = Field(..., description="New quantity after adjustment")
    reason: str = Field(min_length=1, max_length=255)
    notes: Optional[str] = None

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Alasan penyesuaian tidak boleh kosong")
        return s


class StockAdjustmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    warehouse_id: int
    product_id: int
    previous_quantity: Decimal
    new_quantity: Decimal
    reason: str
    notes: Optional[str] = None
    created_at: datetime


class StockInitialRequest(BaseModel):
    warehouse_id: int
    product_id: int
    quantity: Decimal = Field(..., gt=0)
    notes: Optional[str] = None


class StockMovementRequest(BaseModel):
    warehouse_id: int
    product_id: int
    quantity: Decimal = Field(..., gt=0)
    notes: Optional[str] = None
