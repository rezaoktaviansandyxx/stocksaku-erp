from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_membership, require_owner
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.schemas.partner import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
)

router = APIRouter(tags=["Partners"])


# =============================================================================
# Suppliers Endpoints
# =============================================================================

@router.post(
    "/suppliers",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    supplier = Supplier(
        organization_id=membership.organization_id,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/suppliers", response_model=list[SupplierResponse])
def list_suppliers(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    search: Optional[str] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
):
    stmt = select(Supplier).where(
        Supplier.organization_id == membership.organization_id
    )
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            Supplier.name.ilike(search_filter)
            | Supplier.email.ilike(search_filter)
            | Supplier.phone.ilike(search_filter)
        )
    suppliers = (
        db.execute(stmt.offset(skip).limit(limit).order_by(Supplier.name))
        .scalars()
        .all()
    )
    return suppliers


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    supplier = db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.organization_id == membership.organization_id,
        )
    ).scalar_one_or_none()
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier tidak ditemukan",
        )
    return supplier


@router.patch("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    supplier = db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.organization_id == membership.organization_id,
        )
    ).scalar_one_or_none()
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier tidak ditemukan",
        )

    if payload.name is not None:
        supplier.name = payload.name
    if payload.phone is not None:
        supplier.phone = payload.phone
    if payload.email is not None:
        supplier.email = payload.email

    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    membership: object = Depends(require_owner),
):
    supplier = db.execute(
        select(Supplier).where(
            Supplier.id == supplier_id,
            Supplier.organization_id == membership.organization_id,
        )
    ).scalar_one_or_none()
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier tidak ditemukan",
        )

    db.delete(supplier)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Customers Endpoints
# =============================================================================

@router.post(
    "/customers",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    customer = Customer(
        organization_id=membership.organization_id,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/customers", response_model=list[CustomerResponse])
def list_customers(
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
    search: Optional[str] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
):
    stmt = select(Customer).where(
        Customer.organization_id == membership.organization_id
    )
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            Customer.name.ilike(search_filter)
            | Customer.email.ilike(search_filter)
            | Customer.phone.ilike(search_filter)
        )
    customers = (
        db.execute(stmt.offset(skip).limit(limit).order_by(Customer.name))
        .scalars()
        .all()
    )
    return customers


@router.get("/customers/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    customer = db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.organization_id == membership.organization_id,
        )
    ).scalar_one_or_none()
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pelanggan tidak ditemukan",
        )
    return customer


@router.patch("/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    membership: object = Depends(get_current_membership),
):
    customer = db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.organization_id == membership.organization_id,
        )
    ).scalar_one_or_none()
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pelanggan tidak ditemukan",
        )

    if payload.name is not None:
        customer.name = payload.name
    if payload.phone is not None:
        customer.phone = payload.phone
    if payload.email is not None:
        customer.email = payload.email

    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    membership: object = Depends(require_owner),
):
    customer = db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.organization_id == membership.organization_id,
        )
    ).scalar_one_or_none()
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pelanggan tidak ditemukan",
        )

    db.delete(customer)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
