from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationResponse

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Organization:
    org = Organization(
        name=payload.name,
        slug=payload.slug,
    )
    db.add(org)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Slug sudah digunakan",
        )
    db.refresh(org)

    db.add(
        Membership(
            organization_id=org.id,
            user_id=current_user.id,
            role="owner",
        )
    )
    db.commit()
    db.refresh(org)
    return org


@router.get("/mine", response_model=list[OrganizationResponse])
def list_my_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Organization]:
    memberships = db.execute(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .order_by(Membership.created_at.desc())
    ).scalars().all()
    org_ids = [m.organization_id for m in memberships]
    if not org_ids:
        return []
    orgs = db.execute(
        select(Organization)
        .where(Organization.id.in_(org_ids))
        .order_by(Organization.created_at.desc())
    ).scalars().all()
    return orgs
