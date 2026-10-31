from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.user import User
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Autentikasi diperlukan",
    headers={"WWW-Authenticate": "Bearer"},
)

FORBIDDEN = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail=" tidak memiliki akses ke organisasi ini",
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UNAUTHORIZED

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise UNAUTHORIZED

    sub = payload.get("sub")
    if sub is None:
        raise UNAUTHORIZED

    try:
        user_id = int(sub)
    except (ValueError, TypeError):
        raise UNAUTHORIZED

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise UNAUTHORIZED

    return user


def get_current_membership(
    x_organization: Annotated[str | None, Header(alias="X-Organization-Slug")] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Membership:
    if x_organization is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="X-Organization-Slug diperlukan",
        )

    org = db.execute(
        select(Organization).where(
            Organization.slug == x_organization.lower().strip()
        )
    ).scalar_one_or_none()

    if org is None:
        raise FORBIDDEN

    membership = db.execute(
        select(Membership).where(
            Membership.user_id == current_user.id,
            Membership.organization_id == org.id,
        )
    ).scalar_one_or_none()

    if membership is None:
        raise FORBIDDEN

    return membership
