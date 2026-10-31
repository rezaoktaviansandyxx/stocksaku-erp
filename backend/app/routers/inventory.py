import csv
import io
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_membership, get_current_user, require_owner
from app.models.category import Category
from app.models.product import Product
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
        select(StockBalance).where(
            StockBalance.organization_id == org_id,
            StockBalance.warehouse_id == warehouse_id,
            StockBalance.product_id == product_id,
        )
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

    # Check if product has stock movements
    has_movements = db.execute(
        select(StockMovement)
        .where(StockMovement.product_id == product_id)
        .limit(1)
    ).scalar_one_or_none()

    if has_movements is not None:
        # Product has been used in transactions, deactivate instead of delete
        product.is_active = False
        db.commit()
        return {"message": "Produk dinonaktifkan", "product_id": product_id}

    # No transactions, can be hard deleted
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
        query = query.where(StockMovement.created_at >= start_date)
    if end_date:
        query = query.where(StockMovement.created_at <= end_date)

    return query


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
