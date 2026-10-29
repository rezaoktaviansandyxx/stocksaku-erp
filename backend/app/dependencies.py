from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.user import User
from app.models.user_session import UserSession
from app.security import hash_session_token

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


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> UserSession:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UNAUTHORIZED

    token_hash = hash_session_token(credentials.credentials)
    session = db.execute(
        select(UserSession).where(UserSession.token_hash == token_hash)
    ).scalar_one_or_none()

    if session is None or session.revoked_at is not None:
        raise UNAUTHORIZED
    if _as_utc(session.expires_at) <= datetime.now(timezone.utc):
        raise UNAUTHORIZED

    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise UNAUTHORIZED

    return session


def get_current_user(
    session: UserSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> User:
    return db.get(User, session.user_id)


def get_current_membership(
    x_organization: Annotated[str | None, Header(alias="X-Organization-Slug")] = None,
    session: UserSession = Depends(get_current_session),
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
            Membership.user_id == session.user_id,
            Membership.organization_id == org.id,
        )
    ).scalar_one_or_none()

    if membership is None:
        raise FORBIDDEN

    return membership


