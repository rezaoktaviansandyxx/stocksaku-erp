import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.user import User


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        engine,
        tables=[User.__table__, Organization.__table__, Membership.__table__],
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


def _register(client, email="user@example.com", password="rahasia123", full_name="User"):
    return client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )


def _login(client, email="user@example.com", password="rahasia123"):
    return client.post(
        "/auth/login",
        json={"email": email, "password": password},
    ).json()["access_token"]


def _create_org(client, token, name="Toko ABC", slug="toko-abc"):
    return client.post(
        "/organizations",
        json={"name": name, "slug": slug},
        headers={"Authorization": f"Bearer {token}"},
    )


def test_tenant_akses_dengan_slug_sendiri(client):
    _register(client, email="user1@example.com")
    token = _login(client, email="user1@example.com")
    _create_org(client, token, slug="toko-abc")

    response = client.get(
        "/whoami",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Organization-Slug": "toko-abc",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "owner"
    assert body["organization_id"] == 1


def test_user_bukan_anggota_ditolak_memesan_org_lain(client):
    _register(client, email="user1@example.com", full_name="User 1")
    token1 = _login(client, email="user1@example.com")
    _create_org(client, token1, name="Toko A", slug="toko-a")

    _register(client, email="user2@example.com", full_name="User 2")
    token2 = _login(client, email="user2@example.com")
    _create_org(client, token2, name="Toko B", slug="toko-b")

    response = client.get(
        "/whoami",
        headers={
            "Authorization": f"Bearer {token2}",
            "X-Organization-Slug": "toko-a",
        },
    )

    assert response.status_code == 403


def test_org_tidak_ada_ditolak(client):
    _register(client, email="user1@example.com")
    token = _login(client, email="user1@example.com")
    _create_org(client, token, slug="toko-abc")

    response = client.get(
        "/whoami",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Organization-Slug": "toko-tidak-ada",
        },
    )

    assert response.status_code == 403


def test_tanpa_header_organisasi_ditolak(client):
    _register(client, email="user1@example.com")
    token = _login(client, email="user1@example.com")

    response = client.get("/whoami", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 422


def test_tanpa_autentikasi_ditolak(client):
    response = client.get(
        "/whoami",
        headers={"X-Organization-Slug": "toko-abc"},
    )

    assert response.status_code == 401


@pytest.mark.parametrize("bad", ["toko-abc "])
def test_slug_di_header_dinormalisasi(client, bad):
    _register(client, email="user1@example.com")
    token = _login(client, email="user1@example.com")
    _create_org(client, token, slug="toko-abc")

    response = client.get(
        "/whoami",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Organization-Slug": bad,
        },
    )

    assert response.status_code == 200
