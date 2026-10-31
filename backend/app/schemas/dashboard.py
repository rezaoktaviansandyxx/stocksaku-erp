from decimal import Decimal

from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    sales_total_today: Decimal
    sales_total_month: Decimal
    purchase_total_month: Decimal
    active_sales_orders: int
