from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_membership
from app.models.membership import Membership
from app.models.purchase_order import PurchaseOrder
from app.models.sales_order import SalesOrder
from app.schemas.dashboard import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_current_membership),
):
    org_id = membership.organization_id
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)

    def sales_total_since(since: datetime) -> Decimal:
        total = db.execute(
            select(func.sum(SalesOrder.total_amount)).where(
                SalesOrder.organization_id == org_id,
                SalesOrder.status == "Confirmed",
                SalesOrder.confirmed_at >= since,
            )
        ).scalar()
        return Decimal(str(total or 0))

    purchase_total_month = db.execute(
        select(func.sum(PurchaseOrder.total_amount)).where(
            PurchaseOrder.organization_id == org_id,
            PurchaseOrder.status.in_(["Ordered", "Received"]),
            PurchaseOrder.created_at >= month_start,
        )
    ).scalar()

    active_sales_orders = db.execute(
        select(func.count(SalesOrder.id)).where(
            SalesOrder.organization_id == org_id,
            SalesOrder.status == "Draft",
        )
    ).scalar() or 0

    return DashboardSummaryResponse(
        sales_total_today=sales_total_since(today_start),
        sales_total_month=sales_total_since(month_start),
        purchase_total_month=Decimal(str(purchase_total_month or 0)),
        active_sales_orders=active_sales_orders,
    )
