from fastapi import APIRouter, Depends

from app.dependencies import get_current_membership
from app.models.membership import Membership

router = APIRouter(tags=["Debug"])


@router.get("/whoami")
def whoami(membership: Membership = Depends(get_current_membership)) -> dict[str, int | str]:
    return {
        "user_id": membership.user_id,
        "organization_id": membership.organization_id,
        "role": membership.role,
    }
