from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.user_session import UserSession
from app.security import hash_session_token

bearer_scheme = HTTPBearer(auto_error=False)

UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Autentikasi diperlukan",
    headers={"WWW-Authenticate": "Bearer"},
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
