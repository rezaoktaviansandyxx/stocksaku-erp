from app.models.revoked_token import RevokedToken
from decimal import Decimal
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
from app.models.stock_balance import StockBalance
from app.models.stock_movement import StockMovement
from app.models.supplier import Supplier
from app.models.unit import Unit
from app.models.user import User
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
            RevokedToken.__table__,
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


def _setup(client):
    client.post("/auth/register", json={"email": "owner@example.com", "password": "rahasia123", "full_name": "Owner"})
    res = client.post("/auth/login", json={"email": "owner@example.com", "password": "rahasia123"})
    token = res.json()["access_token"]
    client.post("/organizations", json={"name": "Toko PO", "slug": "toko-po"}, headers={"Authorization": f"Bearer {token}"})
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Slug": "toko-po"}

    # Setup Warehouse
    wh_res = client.post("/warehouses", json={"name": "Gudang Utama"}, headers=headers)
    wh_id = wh_res.json()["id"]

    # Setup Unit
    unit_res = client.post("/units", json={"name": "Pcs", "symbol": "pcs"}, headers=headers)
    unit_id = unit_res.json()["id"]

    # Setup Product
    prod_res = client.post("/products", json={
        "sku": "PROD-001",
        "name": "Beras Premium",
        "unit_id": unit_id,
        "cost_price": 50000,
        "selling_price": 65000,
        "min_stock": 10,
    }, headers=headers)
    prod_id = prod_res.json()["id"]

    # Setup Supplier
    sup_res = client.post("/suppliers", json={
        "name": "PT Beras Makmur",
        "phone": "0811223344",
        "email": "kontak@berasmakmur.com",
    }, headers=headers)
    sup_id = sup_res.json()["id"]

    return headers, wh_id, prod_id, sup_id


def test_create_and_list_purchase_order(client, session_factory):
    headers, wh_id, prod_id, sup_id = _setup(client)

    # 1. Create Purchase Order (starts as Draft)
    payload = {
        "supplier_id": sup_id,
        "warehouse_id": wh_id,
        "notes": "Pengadaan beras mingguan",
        "items": [
            {
                "product_id": prod_id,
                "quantity": 20,
                "unit_cost": 50000,
            }
        ],
    }
    res = client.post("/purchases", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "Draft"
    assert data["supplier_id"] == sup_id
    assert data["supplier_name"] == "PT Beras Makmur"
    assert float(data["total_amount"]) == 1000000.00
    assert len(data["items"]) == 1
    assert data["items"][0]["product_id"] == prod_id
    po_id = data["id"]

    # 2. List Purchase Orders
    list_res = client.get("/purchases", headers=headers)
    assert list_res.status_code == 200
    orders = list_res.json()
    assert len(orders) == 1
    assert orders[0]["id"] == po_id
    assert orders[0]["status"] == "Draft"

    # 3. Get Detail
    detail_res = client.get(f"/purchases/{po_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == po_id


def test_receive_purchase_order_increases_stock_and_records_movement(client, session_factory):
    headers, wh_id, prod_id, sup_id = _setup(client)

    # 1. Check initial stock balance (0)
    bal_res = client.get(f"/inventory/balances?product_id={prod_id}", headers=headers)
    assert bal_res.status_code == 200
    assert len(bal_res.json()) == 0

    # 2. Create PO for 15 units (starts as Draft)
    po_res = client.post("/purchases", json={
        "supplier_id": sup_id,
        "warehouse_id": wh_id,
        "items": [{"product_id": prod_id, "quantity": 15, "unit_cost": 48000}],
    }, headers=headers)
    assert po_res.status_code == 201
    po_id = po_res.json()["id"]
    assert po_res.json()["status"] == "Draft"

    # Receive should fail when Draft
    draft_rec = client.post(f"/purchases/{po_id}/receive", headers=headers)
    assert draft_rec.status_code == 400
    assert "Ordered" in draft_rec.json()["detail"]

    # Send PO -> Ordered
    send_res = client.post(f"/purchases/{po_id}/send", headers=headers)
    assert send_res.status_code == 200
    assert send_res.json()["status"] == "Ordered"

    # 3. Receive PO
    rec_res = client.post(f"/purchases/{po_id}/receive", json={"notes": "Barang sudah diterima lengkap"}, headers=headers)
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["status"] == "Received"
    assert rec_data["received_at"] is not None
    assert float(rec_data["items"][0]["received_quantity"]) == 15.0

    # 4. Verify Stock Balance increased to 15
    bal_after = client.get(f"/inventory/balances?product_id={prod_id}", headers=headers)
    assert bal_after.status_code == 200
    bals = bal_after.json()
    assert len(bals) == 1
    assert float(bals[0]["quantity"]) == 15.0

    # 5. Verify Stock Movement entry
    movements_res = client.get(f"/inventory/movements?product_id={prod_id}", headers=headers)
    assert movements_res.status_code == 200
    moves = movements_res.json()
    assert len(moves) == 1
    assert moves[0]["movement_type"] == "IN"
    assert float(moves[0]["quantity"]) == 15.0
    assert moves[0]["reference_type"] == "PURCHASE_ORDER"
    assert moves[0]["reference_id"] == po_id

    # 6. Idempotency test: Receiving again should be rejected
    dup_res = client.post(f"/purchases/{po_id}/receive", headers=headers)
    assert dup_res.status_code == 400
    assert "Ordered" in dup_res.json()["detail"]


def test_create_po_starts_as_draft(client, session_factory):
    headers, wh_id, prod_id, sup_id = _setup(client)
    res = client.post("/purchases", headers=headers, json={
        "supplier_id": sup_id, "items": [{"product_id": prod_id, "quantity": 3, "unit_cost": 50000}],
    })
    assert res.status_code == 201
    assert res.json()["status"] == "Draft"


def test_send_po_transitions_draft_to_ordered_once(client, session_factory):
    headers, wh_id, prod_id, sup_id = _setup(client)
    po_id = client.post("/purchases", headers=headers, json={
        "supplier_id": sup_id, "items": [{"product_id": prod_id, "quantity": 3, "unit_cost": 50000}],
    }).json()["id"]

    assert client.post(f"/purchases/{po_id}/send", headers=headers).status_code == 200
    # send kedua ditolak — transisi satu arah per status
    res2 = client.post(f"/purchases/{po_id}/send", headers=headers)
    assert res2.status_code == 409


def test_receive_rejected_for_draft_po(client, session_factory):
    headers, wh_id, prod_id, sup_id = _setup(client)
    po_id = client.post("/purchases", headers=headers, json={
        "supplier_id": sup_id, "items": [{"product_id": prod_id, "quantity": 3, "unit_cost": 50000}],
    }).json()["id"]

    res = client.post(f"/purchases/{po_id}/receive", headers=headers, json={"notes": "langsung"})
    assert res.status_code == 400


def test_purchase_order_tenant_isolation(client, session_factory):
    headers1, wh_id, prod_id, sup_id = _setup(client)

    po_res = client.post("/purchases", json={
        "supplier_id": sup_id,
        "warehouse_id": wh_id,
        "items": [{"product_id": prod_id, "quantity": 10, "unit_cost": 50000}],
    }, headers=headers1)
    po_id = po_res.json()["id"]

    # Setup Org 2
    client.post("/auth/register", json={"email": "other@example.com", "password": "rahasia123", "full_name": "Other"})
    res2 = client.post("/auth/login", json={"email": "other@example.com", "password": "rahasia123"})
    token2 = res2.json()["access_token"]
    client.post("/organizations", json={"name": "Toko Lain", "slug": "toko-lain"}, headers={"Authorization": f"Bearer {token2}"})
    headers2 = {"Authorization": f"Bearer {token2}", "X-Organization-Slug": "toko-lain"}

    # Org 2 list POs -> 0
    res = client.get("/purchases", headers=headers2)
    assert res.status_code == 200
    assert len(res.json()) == 0

    # Org 2 get detail -> 404
    res = client.get(f"/purchases/{po_id}", headers=headers2)
    assert res.status_code == 404

    # Org 2 receive -> 404
    res = client.post(f"/purchases/{po_id}/receive", headers=headers2)
    assert res.status_code == 404


def test_create_po_with_duplicate_explicit_number_conflict(client, session_factory):
    headers, wh_id, prod_id, sup_id = _setup(client)
    payload = {
        "supplier_id": sup_id,
        "order_number": "PO-20260101-0001",
        "items": [{"product_id": prod_id, "quantity": 1, "unit_cost": 100}],
    }
    assert client.post("/purchases", headers=headers, json=payload).status_code == 201
    res = client.post("/purchases", headers=headers, json=payload)
    assert res.status_code == 400
    assert "sudah ada" in res.json()["detail"]
