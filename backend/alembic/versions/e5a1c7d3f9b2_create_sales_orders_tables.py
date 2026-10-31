"""create sales orders and items tables

Revision ID: e5a1c7d3f9b2
Revises: 01c8476b7cc3
Create Date: 2026-10-31 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5a1c7d3f9b2'
down_revision: Union[str, Sequence[str], None] = '01c8476b7cc3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'sales_orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=True),
        sa.Column('warehouse_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('order_number', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=32), server_default='Draft', nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=14, scale=2), server_default='0', nullable=False),
        sa.Column('notes', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'order_number', name='uq_sales_orders_org_number')
    )
    op.create_index(op.f('ix_sales_orders_created_by'), 'sales_orders', ['created_by'], unique=False)
    op.create_index(op.f('ix_sales_orders_customer_id'), 'sales_orders', ['customer_id'], unique=False)
    op.create_index(op.f('ix_sales_orders_order_number'), 'sales_orders', ['order_number'], unique=False)
    op.create_index(op.f('ix_sales_orders_organization_id'), 'sales_orders', ['organization_id'], unique=False)
    op.create_index(op.f('ix_sales_orders_warehouse_id'), 'sales_orders', ['warehouse_id'], unique=False)

    op.create_table(
        'sales_order_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sales_order_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=14, scale=3), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('subtotal', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['sales_order_id'], ['sales_orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sales_order_items_product_id'), 'sales_order_items', ['product_id'], unique=False)
    op.create_index(op.f('ix_sales_order_items_sales_order_id'), 'sales_order_items', ['sales_order_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('sales_order_items')
    op.drop_table('sales_orders')
