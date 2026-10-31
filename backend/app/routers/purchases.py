from datetime import datetime, timezone
from decimal import Decimal
import random
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_membership
from app.models.membership import Membership
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.stock_balance import StockBalance
from app.models.stock_movement import StockMovement
from app.models.supplier import Supplier
from app.models.warehouse import Warehouse
from app.schemas.purchase import (
    PurchaseOrderCreate,
    PurchaseOrderItemResponse,
    PurchaseOrderResponse,
    PurchaseReceiveRequest,
)

router = APIRouter(prefix="/purchases", tags=["Purchases"])


def _generate_po_number(db: Session, org_id: int) -> str:
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"PO-{today_str}-"
    
    count_stmt = select(func.count(PurchaseOrder.id)).where(
        PurchaseOrder.organization_id == org_id,
        PurchaseOrder.order_number.like(f"{prefix}%"),
    )
    count = db.execute(count_stmt).scalar() or 0
    seq = count + 1
    return f"{prefix}{seq:04d}"


def _format_po_response(po: PurchaseOrder, db: Session) -> PurchaseOrderResponse:
    # Resolve supplier name
    supplier = db.get(Supplier, po.supplier_id)
    supplier_name = supplier.name if supplier else None

    # Resolve warehouse name
    warehouse_name = None
    if po.warehouse_id:
        wh = db.get(Warehouse, po.warehouse_id)
        if wh:
            warehouse_name = wh.name

    items_res: List[PurchaseOrderItemResponse] = []
    for it in po.items:
        prod = db.get(Product, it.product_id)
        items_res.append(
            PurchaseOrderItemResponse(
                id=it.id,
                purchase_order_id=it.purchase_order_id,
                product_id=it.product_id,
                product_name=prod.name if prod else None,
                product_sku=prod.sku if prod else None,
                quantity=it.quantity,
                received_quantity=it.received_quantity,
                unit_cost=it.unit_cost,
                subtotal=it.subtotal,
            )
        )

    return PurchaseOrderResponse(
        id=po.id,
        organization_id=po.organization_id,
        supplier_id=po.supplier_id,
        supplier_name=supplier_name,
        warehouse_id=po.warehouse_id,
        warehouse_name=warehouse_name,
        created_by=po.created_by,
        order_number=po.order_number,
        status=po.status,
        total_amount=po.total_amount,
        notes=po.notes,
        created_at=po.created_at,
        received_at=po.received_at,
        items=items_res,
    )


@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_current_membership),
):
    # 1. Verify supplier belongs to this organization
    supplier = db.execute(
        select(Supplier).where(
            Supplier.id == payload.supplier_id,
            Supplier.organization_id == membership.organization_id,
        )
    ).scalar_one_or_none()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier tidak ditemukan dalam organisasi ini",
        )

    # 2. Verify warehouse if provided
    if payload.warehouse_id:
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

    # 3. Generate PO order number if not supplied
    order_number = payload.order_number
    if not order_number or not order_number.strip():
        order_number = _generate_po_number(db, membership.organization_id)
    else:
        # Check uniqueness
        exists = db.execute(
            select(PurchaseOrder).where(
                PurchaseOrder.organization_id == membership.organization_id,
                PurchaseOrder.order_number == order_number,
            )
        ).scalar_one_or_none()
        if exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nomor pesanan '{order_number}' sudah ada",
            )

    # 4. Validate items and products
    total_amount = Decimal("0.00")
    po_items: List[PurchaseOrderItem] = []

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
        
        subtotal = round(item_data.quantity * item_data.unit_cost, 2)
        total_amount += subtotal

        po_items.append(
            PurchaseOrderItem(
                product_id=prod.id,
                quantity=item_data.quantity,
                received_quantity=Decimal("0.000"),
                unit_cost=item_data.unit_cost,
                subtotal=subtotal,
            )
        )

    po = PurchaseOrder(
        organization_id=membership.organization_id,
        supplier_id=supplier.id,
        warehouse_id=payload.warehouse_id,
        created_by=membership.user_id,
        order_number=order_number,
        status="Draft",
        total_amount=total_amount,
        notes=payload.notes,
        items=po_items,
    )
    db.add(po)
    db.commit()
    db.refresh(po)

    return _format_po_response(po, db)


@router.get("", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    supplier_id: Optional[int] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_current_membership),
):
    stmt = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.organization_id == membership.organization_id)
        .order_by(desc(PurchaseOrder.created_at))
    )

    if status_filter:
        stmt = stmt.where(PurchaseOrder.status == status_filter)
    if supplier_id:
        stmt = stmt.where(PurchaseOrder.supplier_id == supplier_id)

    stmt = stmt.offset(skip).limit(limit)
    orders = db.execute(stmt).scalars().all()

    return [_format_po_response(o, db) for o in orders]


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order_detail(
    po_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_current_membership),
):
    stmt = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(
            PurchaseOrder.id == po_id,
            PurchaseOrder.organization_id == membership.organization_id,
        )
    )
    po = db.execute(stmt).scalar_one_or_none()
    if not po:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan pembelian tidak ditemukan",
        )

    return _format_po_response(po, db)


@router.post("/{po_id}/send", response_model=PurchaseOrderResponse)
def send_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_current_membership),
):
    """Transisi Draft -> Ordered. Satu arah dan hanya dari Draft."""
    stmt = (
        select(PurchaseOrder)
        .where(
            PurchaseOrder.id == po_id,
            PurchaseOrder.organization_id == membership.organization_id,
        )
        .with_for_update()
    )
    po = db.execute(stmt).scalar_one_or_none()
    if not po:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan pembelian tidak ditemukan",
        )
    if po.status != "Draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hanya Purchase Order berstatus Draft yang dapat dikirim",
        )

    po.status = "Ordered"
    db.commit()
    db.refresh(po)
    return _format_po_response(po, db)


@router.post("/{po_id}/receive", response_model=PurchaseOrderResponse)
def receive_purchase_order(
    po_id: int,
    payload: Optional[PurchaseReceiveRequest] = None,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_current_membership),
):
    """
    Menerima barang dari Purchase Order.
    Operasi ini bersifat atomik:
    1. Memverifikasi status PO (hanya yang berstatus 'Ordered' yang dapat diterima).
    2. Menentukan gudang target (dari payload atau gudang default PO atau gudang aktif pertama organisasi).
    3. Mengupdate received_quantity pada setiap item.
    4. Menambah saldo di stock_balances.
    5. Menambahkan log mutasi di stock_movements (movement_type='IN', reference_type='PURCHASE_ORDER').
    6. Mengubah status PO menjadi 'Received'.
    """
    stmt = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(
            PurchaseOrder.id == po_id,
            PurchaseOrder.organization_id == membership.organization_id,
        )
        .with_for_update()
    )
    po = db.execute(stmt).scalar_one_or_none()
    if not po:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pesanan pembelian tidak ditemukan",
        )

    if po.status != "Ordered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hanya Purchase Order berstatus Ordered yang dapat diterima",
        )

    # Determine warehouse
    target_wh_id = None
    if payload and payload.warehouse_id:
        target_wh_id = payload.warehouse_id
    elif po.warehouse_id:
        target_wh_id = po.warehouse_id
    else:
        # Pick the first active warehouse
        first_wh = db.execute(
            select(Warehouse).where(
                Warehouse.organization_id == membership.organization_id,
                Warehouse.is_active == True,
            )
        ).scalar_one_or_none()
        if not first_wh:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak ada gudang aktif untuk menerima barang",
            )
        target_wh_id = first_wh.id

    # Verify warehouse belongs to org
    wh = db.execute(
        select(Warehouse).where(
            Warehouse.id == target_wh_id,
            Warehouse.organization_id == membership.organization_id,
        )
    ).scalar_one_or_none()
    if not wh:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gudang tujuan tidak valid",
        )

    now = datetime.now(timezone.utc)

    # Atomic stock update & movement recording
    for item in po.items:
        qty_to_receive = item.quantity
        item.received_quantity = qty_to_receive

        # 1. Update / Create stock_balance
        balance_stmt = (
            select(StockBalance)
            .where(
                StockBalance.organization_id == membership.organization_id,
                StockBalance.warehouse_id == target_wh_id,
                StockBalance.product_id == item.product_id,
            )
            .with_for_update()
        )
        balance = db.execute(balance_stmt).scalar_one_or_none()

        if balance:
            balance.quantity += qty_to_receive
        else:
            balance = StockBalance(
                organization_id=membership.organization_id,
                warehouse_id=target_wh_id,
                product_id=item.product_id,
                quantity=qty_to_receive,
            )
            db.add(balance)

        # 2. Record stock_movement
        movement = StockMovement(
            organization_id=membership.organization_id,
            warehouse_id=target_wh_id,
            product_id=item.product_id,
            created_by=membership.user_id,
            movement_type="IN",
            quantity=qty_to_receive,
            reference_type="PURCHASE_ORDER",
            reference_id=po.id,
            notes=f"Penerimaan PO {po.order_number}" + (f": {payload.notes}" if payload and payload.notes else ""),
        )
        db.add(movement)

    po.status = "Received"
    po.received_at = now
    po.warehouse_id = target_wh_id

    db.commit()
    db.refresh(po)

    return _format_po_response(po, db)
