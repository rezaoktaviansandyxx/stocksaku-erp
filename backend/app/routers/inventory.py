import csv
from datetime import datetime, time, timezone
import io
from decimal import Decimal
from typing import Optional

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_membership, get_current_user, require_owner
from app.models.category import Category
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.sales_order import SalesOrder, SalesOrderItem
from app.models.stock_balance import StockBalance
from app.models.stock_movement import StockMovement
from app.models.unit import Unit
from app.models.warehouse import Warehouse
from app.schemas.inventory import (
    CategoryCreate,
    CategoryResponse,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    StockAdjustmentRequest,
    StockAdjustmentResponse,
    StockBalanceResponse,
    StockInitialRequest,
    StockMovementRequest,
    StockMovementResponse,
    UnitCreate,
    UnitResponse,
    WarehouseCreate,
    WarehouseResponse,
    WarehouseUpdate,
)

router = APIRouter(tags=["Inventory"])


# =============================================================================
# Category endpoints
# =============================================================================

@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    category = Category(
        organization_id=membership.organization_id,
        name=payload.name,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
):
    categories = db.execute(
        select(Category)
        .where(Category.organization_id == membership.organization_id)
        .offset(skip)
        .limit(limit)
        .order_by(Category.name)
    ).scalars().all()
    return categories


# =============================================================================
# Unit endpoints
# =============================================================================

@router.post(
    "/units",
    response_model=UnitResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_unit(
    payload: UnitCreate,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    unit = Unit(
        organization_id=membership.organization_id,
        name=payload.name,
        symbol=payload.symbol,
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/units", response_model=list[UnitResponse])
def list_units(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
):
    units = db.execute(
        select(Unit)
        .where(Unit.organization_id == membership.organization_id)
        .offset(skip)
        .limit(limit)
        .order_by(Unit.name)
    ).scalars().all()
    return units


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    membership: object = Depends(require_owner),
):
    category = db.get(Category, category_id)
    if category is None or category.organization_id != membership.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kategori tidak ditemukan",
        )

    used = db.execute(
        select(Product.id).where(
            Product.organization_id == membership.organization_id,
            Product.category_id == category_id,
        ).limit(1)
    ).first()
    if used is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kategori masih digunakan oleh produk",
        )

    db.delete(category)
    db.commit()
    return None


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    membership: object = Depends(require_owner),
):
    unit = db.get(Unit, unit_id)
    if unit is None or unit.organization_id != membership.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Satuan tidak ditemukan",
        )

    used = db.execute(
        select(Product.id).where(
            Product.organization_id == membership.organization_id,
            Product.unit_id == unit_id,
        ).limit(1)
    ).first()
    if used is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Satuan masih digunakan oleh produk",
        )

    db.delete(unit)
    db.commit()
    return None


# =============================================================================
# Warehouse endpoints
# =============================================================================

@router.post(
    "/warehouses",
    response_model=WarehouseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_warehouse(
    payload: WarehouseCreate,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    warehouse = Warehouse(
        organization_id=membership.organization_id,
        name=payload.name,
        is_active=payload.is_active,
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.get("/warehouses", response_model=list[WarehouseResponse])
def list_warehouses(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    active_only: bool = Query(default=True),
):
    query = (
        select(Warehouse)
        .where(Warehouse.organization_id == membership.organization_id)
        .offset(skip)
        .limit(limit)
        .order_by(Warehouse.name)
    )
    if active_only:
        query = query.where(Warehouse.is_active.is_(True))
    return db.execute(query).scalars().all()


@router.get("/warehouses/{warehouse_id}", response_model=WarehouseResponse)
def get_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    warehouse = db.get(Warehouse, warehouse_id)
    if warehouse is None or warehouse.organization_id != membership.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gudang tidak ditemukan",
        )
    return warehouse


@router.patch("/warehouses/{warehouse_id}", response_model=WarehouseResponse)
def update_warehouse(
    warehouse_id: int,
    payload: WarehouseUpdate,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    warehouse = db.get(Warehouse, warehouse_id)
    if warehouse is None or warehouse.organization_id != membership.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gudang tidak ditemukan",
        )
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(warehouse, field, value)
    db.commit()
    db.refresh(warehouse)
    return warehouse


# =============================================================================
# Product endpoints — D-01 & D-02
# =============================================================================

@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    # Validate references belong to same organization
    if payload.category_id is not None:
        category = db.get(Category, payload.category_id)
        if category is None or category.organization_id != membership.organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kategori tidak valid",
            )
    unit = db.get(Unit, payload.unit_id)
    if unit is None or unit.organization_id != membership.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Satuan tidak valid",
        )

    product = Product(
        organization_id=membership.organization_id,
        sku=payload.sku,
        name=payload.name,
        cost_price=payload.cost_price,
        selling_price=payload.selling_price,
        min_stock=payload.min_stock,
        is_active=payload.is_active,
        category_id=payload.category_id,
        unit_id=payload.unit_id,
    )
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="SKU sudah digunakan dalam organisasi ini",
        )
    db.refresh(product)
    return product


@router.get("/products", response_model=list[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    search: Optional[str] = Query(default=None),
    active_only: bool = Query(default=True),
):
    query = (
        select(Product)
        .where(Product.organization_id == membership.organization_id)
        .offset(skip)
        .limit(limit)
        .order_by(Product.name)
    )
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            (Product.name.ilike(search_term)) | (Product.sku.ilike(search_term))
        )
    if active_only:
        query = query.where(Product.is_active.is_(True))
    return db.execute(query).scalars().all()


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    product = db.get(Product, product_id)
    if product is None or product.organization_id != membership.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produk tidak ditemukan",
        )
    return product


@router.patch("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    product = db.get(Product, product_id)
    if product is None or product.organization_id != membership.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produk tidak ditemukan",
        )

    update_data = payload.model_dump(exclude_unset=True)

    # Validate new category/unit ownership
    if "category_id" in update_data and update_data["category_id"] is not None:
        category = db.get(Category, update_data["category_id"])
        if category is None or category.organization_id != membership.organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kategori tidak valid",
            )
    if "unit_id" in update_data and update_data["unit_id"] is not None:
        unit = db.get(Unit, update_data["unit_id"])
        if unit is None or unit.organization_id != membership.organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Satuan tidak valid",
            )

    for field, value in update_data.items():
        setattr(product, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="SKU sudah digunakan dalam organisasi ini",
        )
    db.refresh(product)
    return product


# =============================================================================
# Inventory transaction endpoints — D-03, D-04, D-05
# =============================================================================

def _get_warehouse_and_product(
    db: Session, org_id: int, warehouse_id: int, product_id: int
):
    warehouse = db.get(Warehouse, warehouse_id)
    if warehouse is None or warehouse.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gudang tidak ditemukan",
        )
    product = db.get(Product, product_id)
    if product is None or product.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produk tidak ditemukan",
        )
    if not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Produk tidak aktif",
        )
    if not warehouse.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gudang tidak aktif",
        )
    return warehouse, product


def _get_or_create_balance(
    db: Session, org_id: int, warehouse_id: int, product_id: int
) -> StockBalance:
    balance = db.execute(
        select(StockBalance)
        .where(
            StockBalance.organization_id == org_id,
            StockBalance.warehouse_id == warehouse_id,
            StockBalance.product_id == product_id,
        )
        .with_for_update()
    ).scalar_one_or_none()

    if balance is None:
        balance = StockBalance(
            organization_id=org_id,
            warehouse_id=warehouse_id,
            product_id=product_id,
            quantity=Decimal("0"),
        )
        db.add(balance)
        db.flush()

    return balance


@router.post(
    "/inventory/initial",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
)
def set_initial_stock(
    payload: StockInitialRequest,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    current_user=Depends(get_current_user),
):
    _get_warehouse_and_product(
        db, membership.organization_id, payload.warehouse_id, payload.product_id
    )

    # Check if initial stock already recorded
    existing = db.execute(
        select(StockMovement).where(
            StockMovement.organization_id == membership.organization_id,
            StockMovement.warehouse_id == payload.warehouse_id,
            StockMovement.product_id == payload.product_id,
            StockMovement.movement_type == "initial",
        )
    ).scalar_one_or_none()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Stok awal sudah pernah dicatat untuk produk dan gudang ini",
        )

    balance = _get_or_create_balance(
        db, membership.organization_id, payload.warehouse_id, payload.product_id
    )

    balance.quantity = payload.quantity
    movement = StockMovement(
        organization_id=membership.organization_id,
        warehouse_id=payload.warehouse_id,
        product_id=payload.product_id,
        created_by=current_user.id,
        movement_type="initial",
        quantity=payload.quantity,
        reference_type=None,
        reference_id=None,
        notes=payload.notes or "Stok awal",
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


@router.post(
    "/inventory/inbound",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inbound(
    payload: StockMovementRequest,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    current_user=Depends(get_current_user),
):
    _get_warehouse_and_product(
        db, membership.organization_id, payload.warehouse_id, payload.product_id
    )

    balance = _get_or_create_balance(
        db, membership.organization_id, payload.warehouse_id, payload.product_id
    )
    balance.quantity = balance.quantity + payload.quantity

    movement = StockMovement(
        organization_id=membership.organization_id,
        warehouse_id=payload.warehouse_id,
        product_id=payload.product_id,
        created_by=current_user.id,
        movement_type="inbound",
        quantity=payload.quantity,
        reference_type=None,
        reference_id=None,
        notes=payload.notes,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


@router.post(
    "/inventory/outbound",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_outbound(
    payload: StockMovementRequest,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    current_user=Depends(get_current_user),
):
    _get_warehouse_and_product(
        db, membership.organization_id, payload.warehouse_id, payload.product_id
    )

    balance = _get_or_create_balance(
        db, membership.organization_id, payload.warehouse_id, payload.product_id
    )

    if balance.quantity < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stok tidak mencukupi. Saldo saat ini: {balance.quantity}",
        )

    balance.quantity = balance.quantity - payload.quantity

    movement = StockMovement(
        organization_id=membership.organization_id,
        warehouse_id=payload.warehouse_id,
        product_id=payload.product_id,
        created_by=current_user.id,
        movement_type="outbound",
        quantity=payload.quantity,
        reference_type=None,
        reference_id=None,
        notes=payload.notes,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


@router.post(
    "/inventory/adjustment",
    response_model=StockAdjustmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def adjust_stock(
    payload: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    current_user=Depends(get_current_user),
):
    _get_warehouse_and_product(
        db, membership.organization_id, payload.warehouse_id, payload.product_id
    )

    balance = _get_or_create_balance(
        db, membership.organization_id, payload.warehouse_id, payload.product_id
    )

    previous_quantity = balance.quantity
    balance.quantity = payload.quantity

    movement = StockMovement(
        organization_id=membership.organization_id,
        warehouse_id=payload.warehouse_id,
        product_id=payload.product_id,
        created_by=current_user.id,
        movement_type="adjustment",
        quantity=payload.quantity - previous_quantity,
        reference_type=None,
        reference_id=None,
        notes=payload.reason + (f"\n{payload.notes}" if payload.notes else ""),
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    return StockAdjustmentResponse(
        id=movement.id,
        warehouse_id=payload.warehouse_id,
        product_id=payload.product_id,
        previous_quantity=previous_quantity,
        new_quantity=payload.quantity,
        reason=payload.reason,
        notes=payload.notes,
        created_at=movement.created_at,
    )


@router.post("/inventory/deactivate-product", status_code=status.HTTP_200_OK)
def deactivate_product(
    product_id: int = Query(..., description="Product ID to deactivate"),
    db: Session = Depends(get_db),
    membership: object = Depends(require_owner),
):
    """D-02: Deactivate a product that has been used in transactions."""
    product = db.get(Product, product_id)
    if product is None or product.organization_id != membership.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produk tidak ditemukan",
        )

    org_id = membership.organization_id

    used = (
        db.execute(
            select(StockMovement.id)
            .where(
                StockMovement.organization_id == org_id,
                StockMovement.product_id == product_id,
            )
            .limit(1)
        ).first()
        or db.execute(
            select(StockBalance.id)
            .where(
                StockBalance.organization_id == org_id,
                StockBalance.product_id == product_id,
            )
            .limit(1)
        ).first()
        or db.execute(
            select(PurchaseOrderItem.id)
            .join(PurchaseOrder, PurchaseOrder.id == PurchaseOrderItem.purchase_order_id)
            .where(
                PurchaseOrder.organization_id == org_id,
                PurchaseOrderItem.product_id == product_id,
            )
            .limit(1)
        ).first()
        or db.execute(
            select(SalesOrderItem.id)
            .join(SalesOrder, SalesOrder.id == SalesOrderItem.sales_order_id)
            .where(
                SalesOrder.organization_id == org_id,
                SalesOrderItem.product_id == product_id,
            )
            .limit(1)
        ).first()
    )

    if used is not None:
        # Produk sudah dipakai transaksi: nonaktifkan, jangan dihapus (aturan B MVP)
        product.is_active = False
        db.commit()
        return {"message": "Produk dinonaktifkan", "product_id": product_id}

    db.delete(product)
    db.commit()
    return {"message": "Produk dihapus", "product_id": product_id}


# =============================================================================
# Inventory history & alerts — D-06
# =============================================================================

@router.get("/inventory/balances", response_model=list[StockBalanceResponse])
def list_stock_balances(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    warehouse_id: Optional[int] = Query(default=None),
    product_id: Optional[int] = Query(default=None),
):
    query = (
        select(StockBalance)
        .where(StockBalance.organization_id == membership.organization_id)
        .offset(skip)
        .limit(limit)
        .order_by(StockBalance.id)
    )

    if warehouse_id is not None:
        query = query.where(StockBalance.warehouse_id == warehouse_id)
    if product_id is not None:
        query = query.where(StockBalance.product_id == product_id)

    return db.execute(query).scalars().all()


def _movements_query(
    org_id: int,
    product_id: Optional[int],
    start_date: Optional[str],
    end_date: Optional[str],
):
    query = (
        select(StockMovement)
        .where(StockMovement.organization_id == org_id)
        .order_by(StockMovement.created_at.desc())
    )

    if product_id is not None:
        query = query.where(StockMovement.product_id == product_id)
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            query = query.where(StockMovement.created_at >= start_dt)
        except ValueError:
            pass
    if end_date:
        try:
            parsed = datetime.fromisoformat(end_date)
            if len(end_date.strip()) <= 10:
                end_dt = datetime.combine(parsed.date(), time.max, tzinfo=timezone.utc)
            else:
                end_dt = parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=timezone.utc)
            query = query.where(StockMovement.created_at <= end_dt)
        except ValueError:
            pass

    return query


def _xlsx_response(
    filename: str,
    title: str,
    headers: list[str],
    rows: list[list],
    col_types: Optional[list[str]] = None,
    total_col_indices: Optional[list[int]] = None,
) -> Response:
    """Membentuk Response file XLSX dengan styling profesional & rapi."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = title[:31]
    ws.views.sheetView[0].showGridLines = True

    # Palet warna modern & profesional (Slate Navy theme)
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")

    data_font = Font(name="Segoe UI", size=10)
    data_font_bold = Font(name="Segoe UI", size=10, bold=True)
    title_font = Font(name="Segoe UI", size=14, bold=True, color="0F172A")
    meta_font = Font(name="Segoe UI", size=9, italic=True, color="64748B")

    thin_border_side = Side(style="thin", color="CBD5E1")
    cell_border = Border(
        left=thin_border_side,
        right=thin_border_side,
        top=thin_border_side,
        bottom=thin_border_side,
    )
    total_border = Border(
        left=thin_border_side,
        right=thin_border_side,
        top=Side(style="thin", color="0F172A"),
        bottom=Side(style="double", color="0F172A"),
    )

    zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    total_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    num_cols = len(headers)

    # 1. Judul Laporan
    ws.append([title.upper()])
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=num_cols)
    title_cell = ws.cell(row=1, column=1)
    title_cell.font = title_font
    title_cell.alignment = Alignment(vertical="center")
    ws.row_dimensions[1].height = 28

    # 2. Metadata Tanggal Dibuat
    generated_at_str = f"Digenerate pada: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M:%S UTC')}"
    ws.append([generated_at_str])
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=num_cols)
    meta_cell = ws.cell(row=2, column=1)
    meta_cell.font = meta_font
    meta_cell.alignment = Alignment(vertical="center")
    ws.row_dimensions[2].height = 18

    # Row 3 kosong sebagai jarak
    ws.append([])
    ws.row_dimensions[3].height = 8

    # 3. Header Tabel (Row 4)
    ws.append(headers)
    ws.row_dimensions[4].height = 26
    for col_idx in range(1, num_cols + 1):
        cell = ws.cell(row=4, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.border = cell_border
        ctype = col_types[col_idx - 1] if col_types and col_idx - 1 < len(col_types) else "text"
        if ctype in ("currency", "number", "qty"):
            cell.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
        elif ctype in ("int", "date"):
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        else:
            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)

    # 4. Baris Data (Row 5 onwards)
    start_data_row = 5
    for r_idx, row_data in enumerate(rows, start=start_data_row):
        ws.append(row_data)
        ws.row_dimensions[r_idx].height = 20
        is_even = (r_idx - start_data_row) % 2 == 1
        for col_idx in range(1, num_cols + 1):
            cell = ws.cell(row=r_idx, column=col_idx)
            cell.font = data_font
            cell.border = cell_border
            if is_even:
                cell.fill = zebra_fill

            ctype = col_types[col_idx - 1] if col_types and col_idx - 1 < len(col_types) else "text"
            if ctype == "currency":
                cell.alignment = Alignment(horizontal="right", vertical="center")
                cell.number_format = '"Rp"#,##0.00'
            elif ctype == "qty":
                cell.alignment = Alignment(horizontal="right", vertical="center")
                cell.number_format = '#,##0.##'
            elif ctype == "int":
                cell.alignment = Alignment(horizontal="center", vertical="center")
                cell.number_format = '#,##0'
            elif ctype == "date":
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    # 5. Baris Total (Bila ada)
    end_data_row = start_data_row + len(rows) - 1
    if total_col_indices and len(rows) > 0:
        total_row_idx = end_data_row + 1
        ws.row_dimensions[total_row_idx].height = 24

        # Label total di kolom pertama
        first_total_col = min(total_col_indices)
        for c in range(1, num_cols + 1):
            cell = ws.cell(row=total_row_idx, column=c)
            cell.border = total_border
            cell.fill = total_fill
            cell.font = data_font_bold
            if c == 1:
                cell.value = "TOTAL"
                cell.alignment = Alignment(horizontal="left", vertical="center")
            elif c in total_col_indices:
                col_letter = get_column_letter(c)
                cell.value = f"=SUM({col_letter}{start_data_row}:{col_letter}{end_data_row})"
                ctype = col_types[c - 1] if col_types and c - 1 < len(col_types) else "currency"
                if ctype == "currency":
                    cell.number_format = '"Rp"#,##0.00'
                    cell.alignment = Alignment(horizontal="right", vertical="center")
                elif ctype == "qty":
                    cell.number_format = '#,##0.##'
                    cell.alignment = Alignment(horizontal="right", vertical="center")

    # Auto-adjust column width dengan batas wajar
    for col_idx in range(1, num_cols + 1):
        col_letter = get_column_letter(col_idx)
        max_len = len(str(headers[col_idx - 1]))
        for r in range(start_data_row, start_data_row + len(rows)):
            val = ws.cell(row=r, column=col_idx).value
            if val is not None:
                max_len = max(max_len, len(str(val)))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    xlsx_media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return Response(
        content=buf.getvalue(),
        media_type=xlsx_media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _csv_response(filename: str, header: list[str], rows: list[list]) -> Response:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    writer.writerows(rows)
    return Response(
        content=buffer.getvalue().encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/inventory/movements", response_model=list[StockMovementResponse])
def list_movements(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    product_id: Optional[int] = Query(default=None),
    start_date: Optional[str] = Query(default=None, description="ISO date e.g. 2026-01-01"),
    end_date: Optional[str] = Query(default=None, description="ISO date e.g. 2026-12-31"),
):
    query = _movements_query(
        membership.organization_id, product_id, start_date, end_date
    ).offset(skip).limit(limit)

    return db.execute(query).scalars().all()


@router.get("/inventory/export-xlsx")
def export_stock_balances_xlsx(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    """Laporan saldo dan valuasi stok per gudang (format XLSX profesional)."""
    results = db.execute(
        select(StockBalance, Product, Warehouse)
        .join(Product, Product.id == StockBalance.product_id)
        .join(Warehouse, Warehouse.id == StockBalance.warehouse_id)
        .where(StockBalance.organization_id == membership.organization_id)
        .order_by(Product.name, Warehouse.name)
    ).all()

    rows = []
    for idx, (balance, product, warehouse) in enumerate(results, start=1):
        quantity = float(balance.quantity)
        cost_price = float(product.cost_price)
        total_val = round(quantity * cost_price, 2)
        rows.append([
            idx,
            product.sku,
            product.name,
            warehouse.name,
            quantity,
            cost_price,
            total_val,
        ])

    return _xlsx_response(
        filename="laporan-saldo-stok.xlsx",
        title="Laporan Saldo & Valuasi Stok",
        headers=["No", "SKU", "Nama Produk", "Gudang", "Saldo Stok", "Harga Pokok", "Nilai Persediaan"],
        rows=rows,
        col_types=["int", "text", "text", "text", "qty", "currency", "currency"],
        total_col_indices=[5, 7],  # Total saldo stok & total nilai persediaan
    )


@router.get("/inventory/export-csv")
def export_stock_balances_csv(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    """Laporan saldo dan valuasi stok per gudang."""
    results = db.execute(
        select(StockBalance, Product, Warehouse)
        .join(Product, Product.id == StockBalance.product_id)
        .join(Warehouse, Warehouse.id == StockBalance.warehouse_id)
        .where(StockBalance.organization_id == membership.organization_id)
        .order_by(Product.name, Warehouse.name)
    ).all()

    rows = []
    for balance, product, warehouse in results:
        quantity = Decimal(str(balance.quantity))
        cost_price = Decimal(str(product.cost_price))
        rows.append([
            product.sku,
            product.name,
            warehouse.name,
            str(quantity),
            str(cost_price),
            str((quantity * cost_price).quantize(Decimal("0.01"))),
        ])

    return _csv_response(
        "laporan-saldo-stok.csv",
        ["SKU", "Nama Produk", "Gudang", "Saldo Stok", "Harga Pokok", "Nilai Persediaan"],
        rows,
    )


@router.get("/inventory/movements/export-xlsx")
def export_stock_movements_xlsx(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    product_id: Optional[int] = Query(default=None),
    start_date: Optional[str] = Query(default=None, description="ISO date e.g. 2026-01-01"),
    end_date: Optional[str] = Query(default=None, description="ISO date e.g. 2026-12-31"),
):
    """Riwayat mutasi stok dengan filter yang sama seperti daftar mutasi (format XLSX profesional)."""
    movements = db.execute(
        _movements_query(membership.organization_id, product_id, start_date, end_date)
    ).scalars().all()

    products = {
        p.id: p
        for p in db.execute(
            select(Product).where(Product.organization_id == membership.organization_id)
        ).scalars().all()
    }
    warehouses = {
        w.id: w
        for w in db.execute(
            select(Warehouse).where(Warehouse.organization_id == membership.organization_id)
        ).scalars().all()
    }

    movement_labels = {
        "in": "Masuk",
        "out": "Keluar",
        "adj": "Penyesuaian",
        "transfer": "Transfer",
    }

    rows = []
    for idx, m in enumerate(movements, start=1):
        product = products.get(m.product_id)
        warehouse = warehouses.get(m.warehouse_id)
        reference = f"{m.reference_type} #{m.reference_id}" if m.reference_type else "-"
        waktu_str = m.created_at.strftime("%d/%m/%Y %H:%M") if m.created_at else "-"
        tipe_label = movement_labels.get(m.movement_type, m.movement_type)
        qty = float(m.quantity)

        rows.append([
            idx,
            waktu_str,
            product.sku if product else "-",
            product.name if product else "-",
            warehouse.name if warehouse else "-",
            tipe_label,
            qty,
            reference,
            m.notes or "-",
        ])

    return _xlsx_response(
        filename="riwayat-mutasi-stok.xlsx",
        title="Riwayat Mutasi Stok",
        headers=["No", "Waktu", "SKU", "Nama Produk", "Gudang", "Tipe Mutasi", "Kuantitas", "Referensi", "Catatan"],
        rows=rows,
        col_types=["int", "date", "text", "text", "text", "text", "qty", "text", "text"],
        total_col_indices=[7],  # Total pergerakan kuantitas
    )


@router.get("/inventory/movements/export-csv")
def export_stock_movements_csv(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    product_id: Optional[int] = Query(default=None),
    start_date: Optional[str] = Query(default=None, description="ISO date e.g. 2026-01-01"),
    end_date: Optional[str] = Query(default=None, description="ISO date e.g. 2026-12-31"),
):
    """Riwayat mutasi stok dengan filter yang sama seperti daftar mutasi."""
    movements = db.execute(
        _movements_query(membership.organization_id, product_id, start_date, end_date)
    ).scalars().all()

    products = {
        p.id: p
        for p in db.execute(
            select(Product).where(Product.organization_id == membership.organization_id)
        ).scalars().all()
    }
    warehouses = {
        w.id: w
        for w in db.execute(
            select(Warehouse).where(Warehouse.organization_id == membership.organization_id)
        ).scalars().all()
    }

    rows = []
    for m in movements:
        product = products.get(m.product_id)
        warehouse = warehouses.get(m.warehouse_id)
        reference = f"{m.reference_type} #{m.reference_id}" if m.reference_type else ""
        rows.append([
            m.created_at.isoformat() if m.created_at else "",
            product.sku if product else "",
            product.name if product else "",
            warehouse.name if warehouse else "",
            m.movement_type,
            str(m.quantity),
            reference,
            m.notes or "",
        ])

    return _csv_response(
        "riwayat-mutasi-stok.csv",
        ["Waktu", "SKU", "Nama Produk", "Gudang", "Tipe Mutasi", "Kuantitas", "Referensi", "Catatan"],
        rows,
    )


@router.get("/inventory/alerts")
def get_inventory_alerts(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    """Return products with zero stock or below minimum stock."""
    # Zero stock items
    zero_stock = db.execute(
        select(Product, StockBalance)
        .join(StockBalance, Product.id == StockBalance.product_id)
        .where(
            Product.organization_id == membership.organization_id,
            StockBalance.organization_id == membership.organization_id,
            StockBalance.quantity == 0,
        )
    ).all()

    # Below minimum stock items
    below_min = db.execute(
        select(Product, StockBalance)
        .join(StockBalance, Product.id == StockBalance.product_id)
        .where(
            Product.organization_id == membership.organization_id,
            StockBalance.organization_id == membership.organization_id,
            StockBalance.quantity > 0,
            StockBalance.quantity < Product.min_stock,
        )
    ).all()

    return {
        "zero_stock": [
            {
                "product_id": p.id,
                "sku": p.sku,
                "name": p.name,
                "quantity": b.quantity,
            }
            for p, b in zero_stock
        ],
        "below_minimum": [
            {
                "product_id": p.id,
                "sku": p.sku,
                "name": p.name,
                "quantity": b.quantity,
                "min_stock": p.min_stock,
            }
            for p, b in below_min
        ],
    }
