from app.models.revoked_token import RevokedToken
"""backend/tests/test_roles.py"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.category import Category
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.product import Product
from app.models.stock_balance import StockBalance
from app.models.stock_movement import StockMovement
from app.models.supplier import Supplier
from app.models.unit import Unit
from app.models.user import User
from app.models.warehouse import Warehouse


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(
        engine,
        tables=[
            User.__table__,
            RevokedToken.__table__,
            Organization.__table__,
            Membership.__table__,
            Category.__table__,
            Unit.__table__,
            Product.__table__,
            StockBalance.__table__,
            StockMovement.__table__,
            Supplier.__table__,
            Warehouse.__table__,
        ],
    )
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    yield factory
    engine.dispose()


@pytest.fixture()
def client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _owner_headers(client) -> dict:
    client.post("/auth/register", json={"email": "owner@example.com", "password": "rahasia123", "full_name": "Owner"})
    res = client.post("/auth/login", json={"email": "owner@example.com", "password": "rahasia123"})
    token = res.json()["access_token"]
    client.post("/organizations", json={"name": "Toko A", "slug": "toko-a"}, headers={"Authorization": f"Bearer {token}"})
    return {"Authorization": f"Bearer {token}", "X-Organization-Slug": "toko-a"}


def _staff_headers(client, session_factory) -> dict:
    client.post("/auth/register", json={"email": "staff@example.com", "password": "rahasia123", "full_name": "Staff"})
    res = client.post("/auth/login", json={"email": "staff@example.com", "password": "rahasia123"})
    token = res.json()["access_token"]
    db = session_factory()
    staff = db.execute(select(User).where(User.email == "staff@example.com")).scalar_one()
    org = db.execute(select(Organization).where(Organization.slug == "toko-a")).scalar_one()
    db.add(Membership(organization_id=org.id, user_id=staff.id, role="staff"))
    db.commit()
    db.close()
    return {"Authorization": f"Bearer {token}", "X-Organization-Slug": "toko-a"}


def test_staff_cannot_delete_supplier(client, session_factory):
    headers = _owner_headers(client)
    client.post("/suppliers", json={"name": "PT A"}, headers=headers)
    sup_id = client.get("/suppliers", headers=headers).json()[0]["id"]

    staff = _staff_headers(client, session_factory)
    res = client.delete(f"/suppliers/{sup_id}", headers=staff)
    assert res.status_code == 403
    # data tidak terhapus
    assert client.get("/suppliers", headers=headers).json()[0]["id"] == sup_id


def test_owner_can_delete_supplier(client, session_factory):
    headers = _owner_headers(client)
    client.post("/suppliers", json={"name": "PT A"}, headers=headers)
    sup_id = client.get("/suppliers", headers=headers).json()[0]["id"]

    res = client.delete(f"/suppliers/{sup_id}", headers=headers)
    assert res.status_code == 204
    assert client.get("/suppliers", headers=headers).json() == []


def test_staff_cannot_deactivate_product(client, session_factory):
    headers = _owner_headers(client)
    unit_id = client.post("/units", json={"name": "Pcs", "symbol": "pcs"}, headers=headers).json()["id"]
    prod_id = client.post("/products", json={
        "sku": "P1", "name": "Produk", "unit_id": unit_id,
        "cost_price": 1000, "selling_price": 2000, "min_stock": 0,
    }, headers=headers).json()["id"]

    staff = _staff_headers(client, session_factory)
    res = client.post(f"/inventory/deactivate-product?product_id={prod_id}", headers=staff)
    assert res.status_code == 403
