from app.models.revoked_token import RevokedToken
"""
Test suite for Epic D: Inventory Backend (D-01 through D-06)

Covers:
- D-01: Product list & detail API
- D-02: Product CRUD API
- D-03: Initial stock setting
- D-04: Inbound & outbound transactions
- D-05: Stock adjustments
- D-06: Movement history & low stock alerts
"""
import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
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


# =============================================================================
# Fixtures
# =============================================================================

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
            Category.__table__,
            Unit.__table__,
            Product.__table__,
            Warehouse.__table__,
            StockBalance.__table__,
            StockMovement.__table__,
            Supplier.__table__,
            Customer.__table__,
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


# =============================================================================
# Helper functions
# =============================================================================

VALID_PAYLOAD = {
    "email": "Owner@Example.com",
    "password": "rahasia123",
    "full_name": "Test Owner",
}


def _register(client):
    return client.post("/auth/register", json=VALID_PAYLOAD)


def _login(client, password="rahasia123", email="owner@example.com"):
    return client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )


def _create_org(client, token, name="Toko ABC", slug="toko-abc"):
    return client.post(
        "/organizations",
        json={"name": name, "slug": slug},
        headers={"Authorization": f"Bearer {token}"},
    )


def _auth_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "X-Organization-Slug": "toko-abc",
    }


def _full_setup(client, session_factory):
    """Register user, login, create org, return token and db session."""
    _register(client)
    token = _login(client).json()["access_token"]
    _create_org(client, token)
    return token, session_factory


# =============================================================================
# D-01: Product list & detail API
# =============================================================================

class TestProductListAndDetail:
    """D-01: API daftar dan detail produk"""

    def test_list_products_empty(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        # Need a unit first
        with db_factory() as db:
            unit = db.get(Unit, db.execute(
                text("INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id")
            ).scalar())

        response = client.get("/products", headers=_auth_headers(token))
        assert response.status_code == 200
        assert response.json() == []

    def test_create_and_list_product(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        # Create a unit
        with db_factory() as db:
            unit_result = db.execute(text(
                "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
            )).scalar_one()
            db.commit()

        # Create a product
        create_response = client.post(
            "/products",
            headers=_auth_headers(token),
            json={
                "sku": "PRD-001",
                "name": "Produk Test",
                "cost_price": "10000",
                "selling_price": "15000",
                "min_stock": "5",
                "is_active": True,
                "unit_id": unit_result,
            },
        )
        assert create_response.status_code == 201

        # List products
        list_response = client.get("/products", headers=_auth_headers(token))
        assert list_response.status_code == 200
        products = list_response.json()
        assert len(products) == 1
        assert products[0]["sku"] == "PRD-001"
        assert products[0]["name"] == "Produk Test"

    def test_get_product_detail(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            unit_id = db.execute(text(
                "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
            )).scalar_one()
            db.commit()

            product_id = db.execute(text(
                "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id) "
                "VALUES (1, 'PRD-001', 'Produk Test', 10000, 15000, :unit_id) RETURNING id"
            ), {"unit_id": unit_id}).scalar_one()
            db.commit()

        response = client.get(f"/products/{product_id}", headers=_auth_headers(token))
        assert response.status_code == 200
        assert response.json()["sku"] == "PRD-001"

    def test_search_products(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            unit_id = db.execute(text(
                "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
            )).scalar_one()
            db.commit()

            db.execute(text(
                "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id, is_active) "
                "VALUES (1, 'ABC-001', 'Susu Bubuk', 10000, 15000, :unit_id, 1)"
            ), {"unit_id": unit_id})
            db.execute(text(
                "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id, is_active) "
                "VALUES (1, 'XYZ-002', 'Kopi Hitam', 5000, 8000, :unit_id, 1)"
            ), {"unit_id": unit_id})
            db.commit()

        # First, verify products exist without search
        list_all = client.get("/products", headers=_auth_headers(token))
        assert list_all.status_code == 200
        all_products = list_all.json()
        assert len(all_products) == 2

        # Search by full name
        response = client.get("/products?search=Susu Bubuk", headers=_auth_headers(token))
        assert response.status_code == 200
        products = response.json()
        skus = [p["sku"] for p in products]
        assert "ABC-001" in skus

    def test_product_tenant_isolation(self, client, session_factory):
        """Verify organization A's products don't leak to organization B."""
        # Organization A
        _register(client)
        token_a = _login(client).json()["access_token"]
        _create_org(client, token_a, slug="toko-a")

        # Organization B
        client.post("/auth/register", json={
            "email": "other@example.com",
            "password": "rahasia123",
            "full_name": "Other User",
        })
        token_b = _login(client, email="other@example.com").json()["access_token"]
        _create_org(client, token_b, name="Toko B", slug="toko-b")

        headers_b = {"Authorization": f"Bearer {token_b}", "X-Organization-Slug": "toko-b"}

        with session_factory() as db:
            unit_id_a = db.execute(text(
                "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
            )).scalar_one()
            db.execute(text(
                "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id) "
                "VALUES (1, 'ORG-A-PRODUCT', 'Org A Product', 10000, 15000, :unit_id)"
            ), {"unit_id": unit_id_a})
            db.commit()

        response = client.get("/products", headers=headers_b)
        assert response.status_code == 200
        assert response.json() == []


# =============================================================================
# D-02: Product CRUD API
# =============================================================================

class TestProductCRUD:
    """D-02: API CRUD produk"""

    def _setup_unit_and_product(self, db):
        """Helper to create unit and product in db."""
        unit_id = db.execute(text(
            "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
        )).scalar_one()
        db.execute(text(
            "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id) "
            "VALUES (1, 'PRD-001', 'Produk Test', 10000, 15000, :unit_id) RETURNING id"
        ), {"unit_id": unit_id})
        db.commit()
        return unit_id

    def test_create_product_with_duplicate_sku_rejected(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            self._setup_unit_and_product(db)

        create_response = client.post(
            "/products",
            headers=_auth_headers(token),
            json={
                "sku": "PRD-001",  # duplicate SKU
                "name": "Produk Duplikat",
                "cost_price": "10000",
                "selling_price": "15000",
                "unit_id": 1,
            },
        )
        assert create_response.status_code == 409
        assert "SKU sudah digunakan" in create_response.json()["detail"]

    def test_update_product(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            self._setup_unit_and_product(db)

        update_response = client.patch(
            "/products/1",
            headers=_auth_headers(token),
            json={
                "name": "Produk Test Updated",
                "selling_price": "20000",
            },
        )
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "Produk Test Updated"
        assert float(update_response.json()["selling_price"]) == 20000.0

    def test_product_validation_rejects_invalid_data(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            unit_id = db.execute(text(
                "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
            )).scalar_one()
            db.commit()

        response = client.post(
            "/products",
            headers=_auth_headers(token),
            json={
                "sku": "",  # invalid
                "name": "Test",
                "cost_price": -100,  # negative not allowed
                "selling_price": 15000,
                "unit_id": unit_id,
            },
        )
        assert response.status_code == 422

    def test_deactivate_product_with_transactions(self, client, session_factory):
        """Products used in transactions should be deactivated, not deleted."""
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            unit_id = db.execute(text(
                "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
            )).scalar_one()
            product_id = db.execute(text(
                "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id) "
                "VALUES (1, 'PRD-001', 'Produk Test', 10000, 15000, :unit_id) RETURNING id"
            ), {"unit_id": unit_id}).scalar_one()
            warehouse_id = db.execute(text(
                "INSERT INTO warehouses (organization_id, name) VALUES (1, 'Gudang Utama') RETURNING id"
            )).scalar_one()
            # Add a movement so product has been used in transactions
            db.execute(text(
                "INSERT INTO stock_movements (organization_id, warehouse_id, product_id, movement_type, quantity) "
                "VALUES (1, :wh_id, :pr_id, 'initial', 100)"
            ), {"wh_id": warehouse_id, "pr_id": product_id})
            db.commit()

        response = client.post("/inventory/deactivate-product?product_id=1", headers=_auth_headers(token))
        assert response.status_code == 200
        assert "dinonaktifkan" in response.json()["message"]

    def test_deactivate_product_referenced_by_draft_po_is_deactivated_not_deleted(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)
        headers = _auth_headers(token)

        unit_id = client.post("/units", json={"name": "Pcs", "symbol": "pcs"}, headers=headers).json()["id"]
        prod_id = client.post("/products", json={
            "sku": "P-DRAFT", "name": "Produk Draft", "unit_id": unit_id,
            "cost_price": 1000, "selling_price": 2000, "min_stock": 0,
        }, headers=headers).json()["id"]

        sup_id = client.post("/suppliers", json={"name": "PT Delta"}, headers=headers).json()["id"]
        client.post("/purchases", headers=headers, json={
            "supplier_id": sup_id,
            "items": [{"product_id": prod_id, "quantity": 5, "unit_cost": 50000}],
        })

        res = client.post(f"/inventory/deactivate-product?product_id={prod_id}", headers=headers)
        assert res.status_code == 200
        assert res.json()["message"] == "Produk dinonaktifkan"
        detail = client.get(f"/products/{prod_id}", headers=headers).json()
        assert detail["is_active"] is False

    def test_delete_category_with_reference_check(self, client, session_factory):
        token, _ = _full_setup(client, session_factory)
        headers = _auth_headers(token)
        cat_id = client.post("/categories", json={"name": "Elektronik"}, headers=headers).json()["id"]

        # hapus kategori yang belum dipakai
        res = client.delete(f"/categories/{cat_id}", headers=headers)
        assert res.status_code == 204
        # hapus ulang -> 404
        assert client.delete(f"/categories/{cat_id}", headers=headers).status_code == 404

    def test_delete_category_in_use_rejected(self, client, session_factory):
        token, _ = _full_setup(client, session_factory)
        headers = _auth_headers(token)
        cat_id = client.post("/categories", json={"name": "Elektronik"}, headers=headers).json()["id"]
        unit_id = client.post("/units", json={"name": "Pcs", "symbol": "pcs"}, headers=headers).json()["id"]
        client.post("/products", json={
            "sku": "P9", "name": "Produk Kategori", "unit_id": unit_id,
            "cost_price": 1000, "selling_price": 2000, "min_stock": 0,
            "category_id": cat_id,
        }, headers=headers)

        res = client.delete(f"/categories/{cat_id}", headers=headers)
        assert res.status_code == 400
        assert client.get("/categories", headers=headers).json()[0]["id"] == cat_id

    def test_delete_unit_with_reference_check(self, client, session_factory):
        token, _ = _full_setup(client, session_factory)
        headers = _auth_headers(token)
        unit_id = client.post("/units", json={"name": "Pcs", "symbol": "pcs"}, headers=headers).json()["id"]

        res = client.delete(f"/units/{unit_id}", headers=headers)
        assert res.status_code == 204
        assert client.delete(f"/units/{unit_id}", headers=headers).status_code == 404

    def test_delete_unit_in_use_rejected(self, client, session_factory):
        token, _ = _full_setup(client, session_factory)
        headers = _auth_headers(token)
        unit_id = client.post("/units", json={"name": "Pcs", "symbol": "pcs"}, headers=headers).json()["id"]
        client.post("/products", json={
            "sku": "P10", "name": "Produk Satuan", "unit_id": unit_id,
            "cost_price": 1000, "selling_price": 2000, "min_stock": 0,
        }, headers=headers)

        res = client.delete(f"/units/{unit_id}", headers=headers)
        assert res.status_code == 400
        assert client.get("/units", headers=headers).json()[0]["id"] == unit_id


# =============================================================================
# D-03: Initial stock
# =============================================================================

class TestInitialStock:
    """D-03: Stok awal"""

    def test_set_initial_stock(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            unit_id = db.execute(text(
                "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
            )).scalar_one()
            product_id = db.execute(text(
                "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id) "
                "VALUES (1, 'PRD-001', 'Produk Test', 10000, 15000, :unit_id) RETURNING id"
            ), {"unit_id": unit_id}).scalar_one()
            warehouse_id = db.execute(text(
                "INSERT INTO warehouses (organization_id, name) VALUES (1, 'Gudang A') RETURNING id"
            )).scalar_one()
            db.commit()

        response = client.post(
            "/inventory/initial",
            headers=_auth_headers(token),
            json={
                "warehouse_id": warehouse_id,
                "product_id": product_id,
                "quantity": "100",
            },
        )
        assert response.status_code == 201
        assert response.json()["movement_type"] == "initial"
        assert float(response.json()["quantity"]) == 100.0

        # Verify balance was created
        with db_factory() as db:
            balance = db.execute(
                select(StockBalance).where(StockBalance.warehouse_id == warehouse_id, StockBalance.product_id == product_id)
            ).scalar_one()
            assert float(balance.quantity) == 100.0

    def test_initial_stock_twice_rejected(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            unit_id = db.execute(text(
                "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
            )).scalar_one()
            product_id = db.execute(text(
                "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id) "
                "VALUES (1, 'PRD-001', 'Produk Test', 10000, 15000, :unit_id) RETURNING id"
            ), {"unit_id": unit_id}).scalar_one()
            warehouse_id = db.execute(text(
                "INSERT INTO warehouses (organization_id, name) VALUES (1, 'Gudang A') RETURNING id"
            )).scalar_one()
            db.commit()

        first = client.post(
            "/inventory/initial",
            headers=_auth_headers(token),
            json={
                "warehouse_id": warehouse_id,
                "product_id": product_id,
                "quantity": "100",
            },
        )
        assert first.status_code == 201

        second = client.post(
            "/inventory/initial",
            headers=_auth_headers(token),
            json={
                "warehouse_id": warehouse_id,
                "product_id": product_id,
                "quantity": "50",
            },
        )
        assert second.status_code == 409


# =============================================================================
# D-04: Inbound & Outbound
# =============================================================================

class TestInboundOutbound:
    """D-04: Barang masuk dan keluar"""

    def _setup_with_initial_stock(self, db):
        unit_id = db.execute(text(
            "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
        )).scalar_one()
        product_id = db.execute(text(
            "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id) "
            "VALUES (1, 'PRD-001', 'Produk Test', 10000, 15000, :unit_id) RETURNING id"
        ), {"unit_id": unit_id}).scalar_one()
        warehouse_id = db.execute(text(
            "INSERT INTO warehouses (organization_id, name) VALUES (1, 'Gudang A') RETURNING id"
        )).scalar_one()
        db.execute(text(
            "INSERT INTO stock_balances (organization_id, warehouse_id, product_id, quantity) "
            "VALUES (1, :wh_id, :pr_id, 100)"
        ), {"wh_id": warehouse_id, "pr_id": product_id})
        db.commit()
        return warehouse_id, product_id

    def test_inbound_increases_stock(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            warehouse_id, product_id = self._setup_with_initial_stock(db)

        response = client.post(
            "/inventory/inbound",
            headers=_auth_headers(token),
            json={
                "warehouse_id": warehouse_id,
                "product_id": product_id,
                "quantity": "50",
            },
        )
        assert response.status_code == 201
        assert response.json()["movement_type"] == "inbound"

        with db_factory() as db:
            balance = db.get(StockBalance, 1)
            assert float(balance.quantity) == 150.0

    def test_outbound_decreases_stock(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            warehouse_id, product_id = self._setup_with_initial_stock(db)

        response = client.post(
            "/inventory/outbound",
            headers=_auth_headers(token),
            json={
                "warehouse_id": warehouse_id,
                "product_id": product_id,
                "quantity": "30",
            },
        )
        assert response.status_code == 201
        assert response.json()["movement_type"] == "outbound"

        with db_factory() as db:
            balance = db.get(StockBalance, 1)
            assert float(balance.quantity) == 70.0

    def test_outbound_exact_stock_to_zero_allowed(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            warehouse_id, product_id = self._setup_with_initial_stock(db)

        response = client.post(
            "/inventory/outbound",
            headers=_auth_headers(token),
            json={
                "warehouse_id": warehouse_id,
                "product_id": product_id,
                "quantity": "100",  # exact stock to reach 0
                "notes": "keranjang habis",
            },
        )
        assert response.status_code == 201
        assert response.json()["movement_type"] == "outbound"

        with db_factory() as db:
            balance = db.get(StockBalance, 1)
            assert float(balance.quantity) == 0.0

    def test_outbound_more_than_stock_rejected(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            warehouse_id, product_id = self._setup_with_initial_stock(db)

        response = client.post(
            "/inventory/outbound",
            headers=_auth_headers(token),
            json={
                "warehouse_id": warehouse_id,
                "product_id": product_id,
                "quantity": "200",  # more than available 100
            },
        )
        assert response.status_code == 400
        assert "Stok tidak mencukupi" in response.json()["detail"]

    def test_zero_or_negative_quantity_rejected(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            warehouse_id, product_id = self._setup_with_initial_stock(db)

        response = client.post(
            "/inventory/inbound",
            headers=_auth_headers(token),
            json={
                "warehouse_id": warehouse_id,
                "product_id": product_id,
                "quantity": "0",  # zero not allowed
            },
        )
        assert response.status_code == 422


# =============================================================================
# D-05: Stock adjustments
# =============================================================================

class TestStockAdjustment:
    """D-05: Penyesuaian stok"""

    def test_adjust_stock(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            unit_id = db.execute(text(
                "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
            )).scalar_one()
            product_id = db.execute(text(
                "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id) "
                "VALUES (1, 'PRD-001', 'Produk Test', 10000, 15000, :unit_id) RETURNING id"
            ), {"unit_id": unit_id}).scalar_one()
            warehouse_id = db.execute(text(
                "INSERT INTO warehouses (organization_id, name) VALUES (1, 'Gudang A') RETURNING id"
            )).scalar_one()
            db.execute(text(
                "INSERT INTO stock_balances (organization_id, warehouse_id, product_id, quantity) "
                "VALUES (1, :wh_id, :pr_id, 100)"
            ), {"wh_id": warehouse_id, "pr_id": product_id})
            db.commit()

        response = client.post(
            "/inventory/adjustment",
            headers=_auth_headers(token),
            json={
                "warehouse_id": warehouse_id,
                "product_id": product_id,
                "quantity": "120",
                "reason": "Stock opname ditemukan 20 unit hilang",
            },
        )
        assert response.status_code == 201
        assert float(response.json()["new_quantity"]) == 120.0
        assert float(response.json()["previous_quantity"]) == 100.0

        # Verify movement was recorded
        with db_factory() as db:
            movement = db.execute(
                select(StockMovement).where(StockMovement.movement_type == "adjustment")
            ).scalar_one()
            assert "Stock opname" in movement.notes

    def test_adjustment_requires_reason(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            unit_id = db.execute(text(
                "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
            )).scalar_one()
            product_id = db.execute(text(
                "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id) "
                "VALUES (1, 'PRD-001', 'Produk Test', 10000, 15000, :unit_id) RETURNING id"
            ), {"unit_id": unit_id}).scalar_one()
            warehouse_id = db.execute(text(
                "INSERT INTO warehouses (organization_id, name) VALUES (1, 'Gudang A') RETURNING id"
            )).scalar_one()
            db.commit()

        response = client.post(
            "/inventory/adjustment",
            headers=_auth_headers(token),
            json={
                "warehouse_id": warehouse_id,
                "product_id": product_id,
                "quantity": "50",
                "reason": "   ",  # empty reason
            },
        )
        assert response.status_code == 422


# =============================================================================
# D-06: Movement history & alerts
# =============================================================================

class TestMovementHistoryAndAlerts:
    """D-06: Riwayat dan peringatan stok"""

    def _setup_movements(self, db):
        unit_id = db.execute(text(
            "INSERT INTO units (organization_id, name, symbol) VALUES (1, 'PCS', 'pcs') RETURNING id"
        )).scalar_one()
        product_id = db.execute(text(
            "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, min_stock, unit_id) "
            "VALUES (1, 'PRD-001', 'Produk Min Stock', 10000, 15000, 10, :unit_id) RETURNING id"
        ), {"unit_id": unit_id}).scalar_one()
        warehouse_id = db.execute(text(
            "INSERT INTO warehouses (organization_id, name) VALUES (1, 'Gudang A') RETURNING id"
        )).scalar_one()
        zero_product_id = db.execute(text(
            "INSERT INTO products (organization_id, sku, name, cost_price, selling_price, unit_id) "
            "VALUES (1, 'PRD-002', 'Produk Nol', 10000, 15000, :unit_id) RETURNING id"
        ), {"unit_id": unit_id}).scalar_one()

        # Initial: 100 for min_stock product
        db.execute(text(
            "INSERT INTO stock_balances (organization_id, warehouse_id, product_id, quantity) "
            "VALUES (1, :wh_id, :pr_id, 100)"
        ), {"wh_id": warehouse_id, "pr_id": product_id})

        # Initial: 0 for zero product
        db.execute(text(
            "INSERT INTO stock_balances (organization_id, warehouse_id, product_id, quantity) "
            "VALUES (1, :wh_id, :pr_id, 0)"
        ), {"wh_id": warehouse_id, "pr_id": zero_product_id})

        db.execute(text(
            "INSERT INTO stock_movements (organization_id, warehouse_id, product_id, movement_type, quantity) "
            "VALUES (1, :wh_id, :pr_id, 'initial', 100)"
        ), {"wh_id": warehouse_id, "pr_id": product_id})
        db.commit()
        return warehouse_id, product_id, zero_product_id

    def test_list_movements_with_filters(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            warehouse_id, product_id, _ = self._setup_movements(db)

        response = client.get(
            f"/inventory/movements?product_id={product_id}",
            headers=_auth_headers(token),
        )
        assert response.status_code == 200
        movements = response.json()
        assert len(movements) >= 1
        assert movements[0]["product_id"] == product_id

    def test_inventory_alerts_show_low_and_zero_stock(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            warehouse_id, product_id, zero_product_id = self._setup_movements(db)

        # Set min_stock product to 5 (below min of 10)
        with db_factory() as db:
            db.execute(
                text("UPDATE stock_balances SET quantity = 5 WHERE product_id = :pid"),
                {"pid": product_id}
            )
            db.commit()

        response = client.get("/inventory/alerts", headers=_auth_headers(token))
        assert response.status_code == 200
        alerts = response.json()
        assert len(alerts["below_minimum"]) >= 1
        assert len(alerts["zero_stock"]) >= 1

    def test_stock_balance_list(self, client, session_factory):
        token, db_factory = _full_setup(client, session_factory)

        with db_factory() as db:
            warehouse_id, product_id, _ = self._setup_movements(db)

        response = client.get("/inventory/balances", headers=_auth_headers(token))
        assert response.status_code == 200
        balances = response.json()
        assert len(balances) >= 2
