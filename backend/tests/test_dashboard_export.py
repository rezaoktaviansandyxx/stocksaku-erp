from app.models.revoked_token import RevokedToken
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


def _setup(client):
    client.post("/auth/register", json={"email": "owner@example.com", "password": "rahasia123", "full_name": "Owner"})
    res = client.post("/auth/login", json={"email": "owner@example.com", "password": "rahasia123"})
    token = res.json()["access_token"]
    client.post("/organizations", json={"name": "Toko Dash", "slug": "toko-dash"}, headers={"Authorization": f"Bearer {token}"})
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Slug": "toko-dash"}

    wh_id = client.post("/warehouses", json={"name": "Gudang Utama"}, headers=headers).json()["id"]
    unit_id = client.post("/units", json={"name": "Pcs", "symbol": "pcs"}, headers=headers).json()["id"]
    prod_id = client.post("/products", json={
        "sku": "PROD-DASH-1",
        "name": "Gula Pasir",
        "unit_id": unit_id,
        "cost_price": 12000,
        "selling_price": 15000,
        "min_stock": 1,
    }, headers=headers).json()["id"]
    client.post("/inventory/initial", json={"warehouse_id": wh_id, "product_id": prod_id, "quantity": "10"}, headers=headers)
    return headers, wh_id, prod_id


def test_dashboard_summary_counts_confirmed_sales_and_draft_orders(client):
    headers, wh_id, prod_id = _setup(client)

    confirmed = client.post("/sales", json={
        "items": [{"product_id": prod_id, "quantity": 2, "unit_price": 15000}],
    }, headers=headers).json()
    client.post(f"/sales/{confirmed['id']}/confirm", json={}, headers=headers)

    client.post("/sales", json={
        "items": [{"product_id": prod_id, "quantity": 1, "unit_price": 15000}],
    }, headers=headers)

    res = client.get("/dashboard/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert float(data["sales_total_today"]) == 30000.0
    assert float(data["sales_total_month"]) == 30000.0
    assert data["active_sales_orders"] == 1


def test_dashboard_summary_requires_org_header(client):
    _setup(client)
    res = client.get("/dashboard/summary")
    assert res.status_code in (401, 422)


def test_balances_export_csv_contains_valuation(client):
    headers, wh_id, prod_id = _setup(client)

    res = client.get("/inventory/export-csv", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "attachment" in res.headers["content-disposition"]

    lines = res.content.decode("utf-8-sig").strip().splitlines()
    assert lines[0] == "SKU,Nama Produk,Gudang,Saldo Stok,Harga Pokok,Nilai Persediaan"
    assert lines[1].startswith("PROD-DASH-1,Gula Pasir,Gudang Utama,10")
    assert lines[1].endswith(",120000.00")


def test_movements_export_csv_respects_product_filter(client):
    headers, wh_id, prod_id = _setup(client)

    other = client.post("/products", json={
        "sku": "PROD-DASH-2",
        "name": "Garam",
        "unit_id": client.get("/units", headers=headers).json()[0]["id"],
        "cost_price": 1000,
        "selling_price": 2000,
    }, headers=headers).json()["id"]
    client.post("/inventory/initial", json={"warehouse_id": wh_id, "product_id": other, "quantity": "3"}, headers=headers)

    res = client.get(f"/inventory/movements/export-csv?product_id={prod_id}", headers=headers)
    assert res.status_code == 200
    lines = res.content.decode("utf-8-sig").strip().splitlines()
    assert lines[0] == "Waktu,SKU,Nama Produk,Gudang,Tipe Mutasi,Kuantitas,Referensi,Catatan"
    assert len(lines) == 2
    assert "PROD-DASH-1" in lines[1]
    assert "PROD-DASH-2" not in res.content.decode("utf-8-sig")


def test_summary_counts_active_products(client):
    client.post("/auth/register", json={"email": "dash@example.com", "password": "rahasia123", "full_name": "D"})
    res = client.post("/auth/login", json={"email": "dash@example.com", "password": "rahasia123"})
    token = res.json()["access_token"]
    client.post("/organizations", json={"name": "Toko Dash", "slug": "toko-dash"},
                headers={"Authorization": f"Bearer {token}"})
    headers = {"Authorization": f"Bearer {token}", "X-Organization-Slug": "toko-dash"}

    unit_id = client.post("/units", json={"name": "Pcs", "symbol": "pcs"}, headers=headers).json()["id"]
    p1 = client.post("/products", json={
        "sku": "P-D", "name": "Produk Dash", "unit_id": unit_id,
        "cost_price": 1000, "selling_price": 2000, "min_stock": 0,
    }, headers=headers).json()

    summary = client.get("/dashboard/summary", headers=headers).json()
    assert summary["active_products"] >= 1

    # nonaktifkan satu produk -> jumlah produk aktif berkurang tepat satu
    client.patch(f"/products/{p1['id']}", headers=headers, json={"is_active": False})
    summary2 = client.get("/dashboard/summary", headers=headers).json()
    assert summary2["active_products"] == summary["active_products"] - 1
