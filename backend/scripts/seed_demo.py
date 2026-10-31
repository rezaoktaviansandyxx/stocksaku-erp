from datetime import datetime, timezone
from decimal import Decimal

from app.database import SessionLocal
from app.models.category import Category  # noqa: F401  (wajib agar FK products.category_id teregistrasi)
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
from app.security import hash_password

DEMO_PASSWORD = "demo12345"
DEMO_ORG_NAME = "Toko Demo"
DEMO_ORG_SLUG = "toko-demo"


def _get_or_create_user(db, email: str, full_name: str) -> User:
    user = db.query(User).filter_by(email=email).first()
    if user:
        return user
    user = User(email=email, password_hash=hash_password(DEMO_PASSWORD), full_name=full_name)
    db.add(user)
    db.flush()
    return user


def _add_stock(db, org_id: int, warehouse_id: int, product_id: int, qty: Decimal) -> None:
    balance = (
        db.query(StockBalance)
        .filter_by(organization_id=org_id, warehouse_id=warehouse_id, product_id=product_id)
        .first()
    )
    if balance:
        balance.quantity += qty
    else:
        db.add(
            StockBalance(
                organization_id=org_id,
                warehouse_id=warehouse_id,
                product_id=product_id,
                quantity=qty,
            )
        )


def main() -> None:
    with SessionLocal() as db:
        if db.query(Organization).filter_by(slug=DEMO_ORG_SLUG).first():
            print(f"Data demo '{DEMO_ORG_SLUG}' sudah ada. Seed dilewati.")
            return

        owner = _get_or_create_user(db, "owner@demo.com", "Owner Demo")
        staff = _get_or_create_user(db, "staff@demo.com", "Staff Demo")

        org = Organization(name=DEMO_ORG_NAME, slug=DEMO_ORG_SLUG)
        db.add(org)
        db.flush()

        db.add_all([
            Membership(organization_id=org.id, user_id=owner.id, role="owner"),
            Membership(organization_id=org.id, user_id=staff.id, role="staff"),
        ])

        warehouse = Warehouse(organization_id=org.id, name="Gudang Utama")
        unit = Unit(organization_id=org.id, name="Pcs", symbol="pcs")
        db.add_all([warehouse, unit])
        db.flush()

        beras = Product(
            organization_id=org.id, unit_id=unit.id, sku="BRS-001", name="Beras Premium 5kg",
            cost_price=Decimal("50000"), selling_price=Decimal("65000"), min_stock=Decimal("10"),
        )
        gula = Product(
            organization_id=org.id, unit_id=unit.id, sku="GLP-001", name="Gula Pasir 1kg",
            cost_price=Decimal("12000"), selling_price=Decimal("15000"), min_stock=Decimal("5"),
        )
        minyak = Product(
            organization_id=org.id, unit_id=unit.id, sku="MNK-001", name="Minyak Goreng 1L",
            cost_price=Decimal("14000"), selling_price=Decimal("18000"), min_stock=Decimal("12"),
        )
        db.add_all([beras, gula, minyak])

        supplier = Supplier(
            organization_id=org.id, name="PT Beras Makmur",
            phone="0811223344", email="kontak@berasmakmur.com",
        )
        customer = Customer(organization_id=org.id, name="Budi Santoso", phone="0812345678")
        db.add_all([supplier, customer])
        db.flush()

        now = datetime.now(timezone.utc)

        po_received = PurchaseOrder(
            organization_id=org.id,
            supplier_id=supplier.id,
            warehouse_id=warehouse.id,
            created_by=owner.id,
            order_number="PO-20260101-0001",
            status="Received",
            total_amount=Decimal("1860000.00"),
            notes="Pengadaan awal stok",
            received_at=now,
            items=[
                PurchaseOrderItem(
                    product_id=beras.id, quantity=Decimal("30"),
                    received_quantity=Decimal("30"), unit_cost=Decimal("50000"),
                    subtotal=Decimal("1500000.00"),
                ),
                PurchaseOrderItem(
                    product_id=gula.id, quantity=Decimal("30"),
                    received_quantity=Decimal("30"), unit_cost=Decimal("12000"),
                    subtotal=Decimal("360000.00"),
                ),
            ],
        )
        po_ordered = PurchaseOrder(
            organization_id=org.id,
            supplier_id=supplier.id,
            warehouse_id=warehouse.id,
            created_by=owner.id,
            order_number="PO-20260101-0002",
            status="Ordered",
            total_amount=Decimal("336000.00"),
            notes="Menunggu pengiriman minyak",
            items=[
                PurchaseOrderItem(
                    product_id=minyak.id, quantity=Decimal("24"),
                    received_quantity=Decimal("0"), unit_cost=Decimal("14000"),
                    subtotal=Decimal("336000.00"),
                ),
            ],
        )
        db.add_all([po_received, po_ordered])
        db.flush()

        for item in po_received.items:
            _add_stock(db, org.id, warehouse.id, item.product_id, item.quantity)
            db.add(
                StockMovement(
                    organization_id=org.id,
                    warehouse_id=warehouse.id,
                    product_id=item.product_id,
                    created_by=owner.id,
                    movement_type="IN",
                    quantity=item.quantity,
                    reference_type="PURCHASE_ORDER",
                    reference_id=po_received.id,
                    notes=f"Penerimaan PO {po_received.order_number}",
                )
            )

        so_confirmed = SalesOrder(
            organization_id=org.id,
            customer_id=customer.id,
            warehouse_id=warehouse.id,
            created_by=owner.id,
            order_number="SO-20260101-0001",
            status="Confirmed",
            total_amount=Decimal("45000.00"),
            confirmed_at=now,
            items=[
                SalesOrderItem(
                    product_id=gula.id, quantity=Decimal("3"),
                    unit_price=Decimal("15000"), subtotal=Decimal("45000.00"),
                ),
            ],
        )
        db.add(so_confirmed)
        db.flush()

        _add_stock(db, org.id, warehouse.id, gula.id, Decimal("-3"))
        db.add(
            StockMovement(
                organization_id=org.id,
                warehouse_id=warehouse.id,
                product_id=gula.id,
                created_by=owner.id,
                movement_type="OUT",
                quantity=Decimal("3"),
                reference_type="SALES_ORDER",
                reference_id=so_confirmed.id,
                notes=f"Penjualan SO {so_confirmed.order_number}",
            )
        )

        db.add(
            SalesOrder(
                organization_id=org.id,
                customer_id=customer.id,
                warehouse_id=warehouse.id,
                created_by=staff.id,
                order_number="SO-20260101-0002",
                status="Draft",
                total_amount=Decimal("130000.00"),
                notes="Menunggu konfirmasi pembayaran",
                items=[
                    SalesOrderItem(
                        product_id=beras.id, quantity=Decimal("2"),
                        unit_price=Decimal("65000"), subtotal=Decimal("130000.00"),
                    ),
                ],
            )
        )

        db.commit()

    print("Seed demo selesai.")
    print(f"Organisasi (slug): {DEMO_ORG_SLUG}")
    print(f"Owner: owner@demo.com / {DEMO_PASSWORD}")
    print(f"Staff: staff@demo.com / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
