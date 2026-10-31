from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_membership, get_current_user
from app.models.customer import Customer
from app.models.membership import Membership
from app.models.product import Product
from app.models.sales_order import SalesOrder, SalesOrderItem
from app.models.stock_balance import StockBalance
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.models.warehouse import Warehouse
from app.schemas.sales import (
    SalesConfirmRequest,
    SalesOrderCreate,
    SalesOrderItemResponse,
    SalesOrderResponse,
)

router = APIRouter(prefix="/sales", tags=["Sales"])


def _generate_so_number(db: Session, org_id: int) -> str:
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"SO-{today_str}-"

    count_stmt = select(func.count(SalesOrder.id)).where(
        SalesOrder.organization_id == org_id,
        SalesOrder.order_number.like(f"{prefix}%"),
    )
    count = db.execute(count_stmt).scalar() or 0
    seq = count + 1
    return f"{prefix}{seq:04d}"


def _format_so_response(so: SalesOrder, db: Session) -> SalesOrderResponse:
    customer_name = None
    if so.customer_id:
        customer = db.get(Customer, so.customer_id)
        if customer:
            customer_name = customer.name

    warehouse_name = None
    if so.warehouse_id:
        wh = db.get(Warehouse, so.warehouse_id)
        if wh:
            warehouse_name = wh.name

    items_res: List[SalesOrderItemResponse] = []
    for it in so.items:
        prod = db.get(Product, it.product_id)
        items_res.append(
            SalesOrderItemResponse(
                id=it.id,
                sales_order_id=it.sales_order_id,
                product_id=it.product_id,
                product_name=prod.name if prod else None,
                product_sku=prod.sku if prod else None,
                quantity=it.quantity,
                unit_price=it.unit_price,
                subtotal=it.subtotal,
            )
        )

    return SalesOrderResponse(
        id=so.id,
        organization_id=so.organization_id,
        customer_id=so.customer_id,
        customer_name=customer_name,
        warehouse_id=so.warehouse_id,
        warehouse_name=warehouse_name,
        created_by=so.created_by,
        order_number=so.order_number,
        status=so.status,
        total_amount=so.total_amount,
        notes=so.notes,
        created_at=so.created_at,
        confirmed_at=so.confirmed_at,
        items=items_res,
    )


def _get_sales_order_for_update(db: Session, so_id: int, org_id: int) -> SalesOrder:
    stmt = (
        select(SalesOrder)
        .options(selectinload(SalesOrder.items))
        .where(SalesOrder.id == so_id, SalesOrder.organization_id == org_id)
        .with_for_update()
    )
    so = db.execute(stmt).scalar_one_or_none()
    if not so:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan penjualan tidak ditemukan",
        )
    return so


@router.post("", response_model=SalesOrderResponse, status_code=status.HTTP_201_CREATED)
def create_sales_order(
    payload: SalesOrderCreate,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_current_membership),
):
    # 1. Customer opsional, tapi jika diisi harus milik organisasi ini
    if payload.customer_id is not None:
        customer = db.execute(
            select(Customer).where(
                Customer.id == payload.customer_id,
                Customer.organization_id == membership.organization_id,
            )
        ).scalar_one_or_none()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer tidak ditemukan dalam organisasi ini",
            )

    # 2. Gudang opsional
    if payload.warehouse_id is not None:
        wh = db.execute(
            select(Warehouse).where(
                Warehouse.id == payload.warehouse_id,
                Warehouse.organization_id == membership.organization_id,
            )
        ).scalar_one_or_none()
        if not wh:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gudang tidak ditemukan dalam organisasi ini",
            )

    # 3. Nomor SO
    order_number = payload.order_number
    if not order_number or not order_number.strip():
        order_number = _generate_so_number(db, membership.organization_id)
    else:
        order_number = order_number.strip()
        exists = db.execute(
            select(SalesOrder).where(
                SalesOrder.organization_id == membership.organization_id,
                SalesOrder.order_number == order_number,
            )
        ).scalar_one_or_none()
        if exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nomor pesanan '{order_number}' sudah ada",
            )

    # 4. Validasi produk dan hitung total
    total_amount = Decimal("0.00")
    so_items: List[SalesOrderItem] = []

    for item_data in payload.items:
        prod = db.execute(
            select(Product).where(
                Product.id == item_data.product_id,
                Product.organization_id == membership.organization_id,
            )
        ).scalar_one_or_none()
        if not prod:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produk ID {item_data.product_id} tidak ditemukan",
            )
        if not prod.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Produk '{prod.name}' tidak aktif",
            )

        subtotal = round(item_data.quantity * item_data.unit_price, 2)
        total_amount += subtotal

        so_items.append(
            SalesOrderItem(
                product_id=prod.id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                subtotal=subtotal,
            )
        )

    so = SalesOrder(
        organization_id=membership.organization_id,
        customer_id=payload.customer_id,
        warehouse_id=payload.warehouse_id,
        created_by=membership.user_id,
        order_number=order_number,
        status="Draft",
        total_amount=total_amount,
        notes=payload.notes,
        items=so_items,
    )
    db.add(so)
    db.commit()
    db.refresh(so)

    return _format_so_response(so, db)


@router.get("", response_model=List[SalesOrderResponse])
def list_sales_orders(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    customer_id: Optional[int] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_current_membership),
):
    stmt = (
        select(SalesOrder)
        .options(selectinload(SalesOrder.items))
        .where(SalesOrder.organization_id == membership.organization_id)
        .order_by(desc(SalesOrder.created_at))
    )

    if status_filter:
        stmt = stmt.where(SalesOrder.status == status_filter)
    if customer_id:
        stmt = stmt.where(SalesOrder.customer_id == customer_id)

    stmt = stmt.offset(skip).limit(limit)
    orders = db.execute(stmt).scalars().all()

    return [_format_so_response(o, db) for o in orders]


@router.get("/{so_id}", response_model=SalesOrderResponse)
def get_sales_order_detail(
    so_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_current_membership),
):
    stmt = (
        select(SalesOrder)
        .options(selectinload(SalesOrder.items))
        .where(
            SalesOrder.id == so_id,
            SalesOrder.organization_id == membership.organization_id,
        )
    )
    so = db.execute(stmt).scalar_one_or_none()
    if not so:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan penjualan tidak ditemukan",
        )

    return _format_so_response(so, db)


@router.post("/{so_id}/confirm", response_model=SalesOrderResponse)
def confirm_sales_order(
    so_id: int,
    payload: Optional[SalesConfirmRequest] = None,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_current_membership),
    current_user: User = Depends(get_current_user),
):
    """
    Mengonfirmasi Sales Order. Operasi ini bersifat atomik:
    1. Mengunci baris SO dan memverifikasi status (hanya 'Draft' yang dapat dikonfirmasi).
    2. Menentukan gudang sumber (dari payload, SO, atau gudang aktif pertama).
    3. Memverifikasi saldo stok mencukupi untuk seluruh item (dijumlahkan per produk).
    4. Mengurangi saldo di stock_balances.
    5. Mencatat stock_movements (movement_type='OUT', reference_type='SALES_ORDER').
    6. Mengubah status SO menjadi 'Confirmed'.
    """
    so = _get_sales_order_for_update(db, so_id, membership.organization_id)

    # Idempotent check: SO yang sudah diproses tidak boleh diproses ulang
    if so.status != "Draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pesanan penjualan berstatus '{so.status}' dan tidak dapat dikonfirmasi",
        )

    # Tentukan gudang sumber
    target_wh_id = None
    if payload and payload.warehouse_id:
        target_wh_id = payload.warehouse_id
    elif so.warehouse_id:
        target_wh_id = so.warehouse_id
    else:
        first_wh = db.execute(
            select(Warehouse).where(
                Warehouse.organization_id == membership.organization_id,
                Warehouse.is_active.is_(True),
            )
        ).scalars().first()
        if not first_wh:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak ada gudang aktif untuk mengeluarkan barang",
            )
        target_wh_id = first_wh.id

    wh = db.execute(
        select(Warehouse).where(
            Warehouse.id == target_wh_id,
            Warehouse.organization_id == membership.organization_id,
        )
    ).scalar_one_or_none()
    if not wh:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gudang sumber tidak valid",
        )
    if not wh.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gudang tidak aktif",
        )

    # Jumlahkan kebutuhan per produk (satu produk bisa muncul di beberapa baris)
    required: dict[int, Decimal] = {}
    for item in so.items:
        required[item.product_id] = required.get(item.product_id, Decimal("0")) + item.quantity

    # Kunci saldo dan validasi ketersediaan sebelum mengubah apa pun
    balances: dict[int, StockBalance] = {}
    shortages: List[str] = []
    for product_id, qty_needed in required.items():
        balance = db.execute(
            select(StockBalance)
            .where(
                StockBalance.organization_id == membership.organization_id,
                StockBalance.warehouse_id == target_wh_id,
                StockBalance.product_id == product_id,
            )
            .with_for_update()
        ).scalar_one_or_none()

        available = balance.quantity if balance else Decimal("0")
        if available < qty_needed:
            prod = db.get(Product, product_id)
            name = prod.name if prod else str(product_id)
            shortages.append(f"{name} (tersedia {available}, dibutuhkan {qty_needed})")
        else:
            balances[product_id] = balance

    if shortages:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stok tidak mencukupi: " + "; ".join(shortages),
        )

    now = datetime.now(timezone.utc)

    for product_id, qty_needed in required.items():
        balances[product_id].quantity -= qty_needed

    for product_id, qty_needed in required.items():
        db.add(
            StockMovement(
                organization_id=membership.organization_id,
                warehouse_id=target_wh_id,
                product_id=product_id,
                created_by=current_user.id,
                movement_type="OUT",
                quantity=qty_needed,
                reference_type="SALES_ORDER",
                reference_id=so.id,
                notes=f"Penjualan SO {so.order_number}"
                + (f": {payload.notes}" if payload and payload.notes else ""),
            )
        )

    so.status = "Confirmed"
    so.confirmed_at = now
    so.warehouse_id = target_wh_id

    db.commit()
    db.refresh(so)

    return _format_so_response(so, db)


@router.post("/{so_id}/cancel", response_model=SalesOrderResponse)
def cancel_sales_order(
    so_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_current_membership),
):
    so = _get_sales_order_for_update(db, so_id, membership.organization_id)

    if so.status != "Draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hanya pesanan berstatus 'Draft' yang dapat dibatalkan (status saat ini: '{so.status}')",
        )

    so.status = "Cancelled"
    db.commit()
    db.refresh(so)

    return _format_so_response(so, db)
