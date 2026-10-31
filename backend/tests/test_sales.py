import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.category import Category
from app.models.customer import Customer
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.sales_order import SalesOrder, SalesOrderItem
from app.models.stock_balance import StockBalance
from app.models.stock_movement import StockMovement
from app.models.supplier import Supplier
from app.models.unit import Unit
from app.models.user import User
from app.models.user_session import UserSession
from app.models.warehouse import Warehouse


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        engine,
        tables=[
            User.__table__,
            UserSession.__table__,
            Organization.__table__,
            Membership.__table__,
            Supplier.__table__,
            Customer.__table__,
            Category.__table__,
            Unit.__table__,
            Product.__table__,
            Warehouse.__table__,
            StockBalance.__table__,
            StockMovement.__table__,
            PurchaseOrder.__table__,
            PurchaseOrderItem.__table__,
            SalesOrder.__table__,
            SalesOrderItem.__table__,
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


def _setup(client, initial_stock="5"):
    client.post("/auth/register", json={"email": "owner@example.com", "password": "rahasia123", "full_name": "Owner"})
    res = client.post("/auth/login", json={"email": "owner@example.com", "password": "rahasia123"})
    token = res.json()["access_token"]
    client.post("/organizations", json={"name": "Toko SO", "slug": "toko-so"}, headers={"Authorization": f"Bearer {token}"})
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Slug": "toko-so"}

    wh_id = client.post("/warehouses", json={"name": "Gudang Utama"}, headers=headers).json()["id"]
    unit_id = client.post("/units", json={"name": "Pcs", "symbol": "pcs"}, headers=headers).json()["id"]
    prod_id = client.post("/products", json={
        "sku": "PROD-SO-1",
        "name": "Gula Pasir",
        "unit_id": unit_id,
        "cost_price": 12000,
        "selling_price": 15000,
        "min_stock": 1,
    }, headers=headers).json()["id"]
    cust_id = client.post("/customers", json={"name": "Budi", "phone": "0812"}, headers=headers).json()["id"]

    client.post("/inventory/initial", json={
        "warehouse_id": wh_id,
        "product_id": prod_id,
        "quantity": initial_stock,
    }, headers=headers)

    return headers, wh_id, prod_id, cust_id


def _create_so(client, headers, prod_id, cust_id, qty):
    res = client.post("/sales", json={
        "customer_id": cust_id,
        "items": [{"product_id": prod_id, "quantity": qty, "unit_price": 15000}],
    }, headers=headers)
    assert res.status_code == 201
    return res.json()


def _balance(client, headers, prod_id):
    bals = client.get(f"/inventory/balances?product_id={prod_id}", headers=headers).json()
    return float(bals[0]["quantity"]) if bals else 0.0


def test_create_so_as_draft_does_not_change_stock(client):
    headers, wh_id, prod_id, cust_id = _setup(client, initial_stock="5")

    so = _create_so(client, headers, prod_id, cust_id, 2)
    assert so["status"] == "Draft"
    assert so["order_number"].startswith("SO-")
    assert float(so["total_amount"]) == 30000.00
    assert _balance(client, headers, prod_id) == 5.0


def test_confirm_rejected_when_stock_insufficient(client):
    headers, wh_id, prod_id, cust_id = _setup(client, initial_stock="5")

    so = _create_so(client, headers, prod_id, cust_id, 8)
    res = client.post(f"/sales/{so['id']}/confirm", json={}, headers=headers)
    assert res.status_code == 400
    assert "Stok tidak mencukupi" in res.json()["detail"]

    detail = client.get(f"/sales/{so['id']}", headers=headers).json()
    assert detail["status"] == "Draft"
    assert _balance(client, headers, prod_id) == 5.0


def test_confirm_decreases_stock_and_records_movement(client):
    headers, wh_id, prod_id, cust_id = _setup(client, initial_stock="5")

    so = _create_so(client, headers, prod_id, cust_id, 3)
    res = client.post(f"/sales/{so['id']}/confirm", json={"notes": "Lunas"}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Confirmed"
    assert data["confirmed_at"] is not None
    assert data["warehouse_id"] == wh_id

    assert _balance(client, headers, prod_id) == 2.0

    moves = client.get(f"/inventory/movements?product_id={prod_id}", headers=headers).json()
    out = [m for m in moves if m["movement_type"] == "OUT"]
    assert len(out) == 1
    assert float(out[0]["quantity"]) == 3.0
    assert out[0]["reference_type"] == "SALES_ORDER"
    assert out[0]["reference_id"] == so["id"]


def test_confirm_twice_is_rejected_and_stock_not_decreased_again(client):
    headers, wh_id, prod_id, cust_id = _setup(client, initial_stock="5")

    so = _create_so(client, headers, prod_id, cust_id, 2)
    assert client.post(f"/sales/{so['id']}/confirm", json={}, headers=headers).status_code == 200

    dup = client.post(f"/sales/{so['id']}/confirm", json={}, headers=headers)
    assert dup.status_code == 400
    assert _balance(client, headers, prod_id) == 3.0


def test_cancel_only_allowed_for_draft(client):
    headers, wh_id, prod_id, cust_id = _setup(client, initial_stock="5")

    so = _create_so(client, headers, prod_id, cust_id, 1)
    res = client.post(f"/sales/{so['id']}/cancel", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "Cancelled"

    assert client.post(f"/sales/{so['id']}/confirm", json={}, headers=headers).status_code == 400

    so2 = _create_so(client, headers, prod_id, cust_id, 1)
    client.post(f"/sales/{so2['id']}/confirm", json={}, headers=headers)
    assert client.post(f"/sales/{so2['id']}/cancel", headers=headers).status_code == 400


def test_sales_tenant_isolation(client):
    headers1, wh_id, prod_id, cust_id = _setup(client, initial_stock="5")
    so = _create_so(client, headers1, prod_id, cust_id, 1)

    client.post("/auth/register", json={"email": "other@example.com", "password": "rahasia123", "full_name": "Other"})
    token2 = client.post("/auth/login", json={"email": "other@example.com", "password": "rahasia123"}).json()["access_token"]
    client.post("/organizations", json={"name": "Toko Lain SO", "slug": "toko-lain-so"}, headers={"Authorization": f"Bearer {token2}"})
    headers2 = {"Authorization": f"Bearer {token2}", "X-Organization-Slug": "toko-lain-so"}

    assert client.get("/sales", headers=headers2).json() == []
    assert client.get(f"/sales/{so['id']}", headers=headers2).status_code == 404
    assert client.post(f"/sales/{so['id']}/confirm", json={}, headers=headers2).status_code == 404
    assert client.post(f"/sales/{so['id']}/cancel", headers=headers2).status_code == 404
