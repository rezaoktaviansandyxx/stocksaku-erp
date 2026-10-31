import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from datetime import datetime, timedelta, timezone

from app.database import Base, get_db
from app.main import app
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.revoked_token import RevokedToken
from app.models.user import User
from app.security import hash_password, verify_password, create_access_token, decode_access_token


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        engine,
        tables=[User.__table__, Organization.__table__, Membership.__table__, RevokedToken.__table__],
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


VALID_PAYLOAD = {
    "email": "Owner@Example.com",
    "password": "rahasia123",
    "full_name": "  Siti Aminah  ",
}


def test_hash_password_tidak_menyimpan_teks_biasa():
    hashed = hash_password("rahasia123")

    assert "rahasia123" not in hashed
    assert verify_password("rahasia123", hashed)
    assert not verify_password("salah12345", hashed)


def test_hash_password_menghasilkan_salt_berbeda():
    assert hash_password("rahasia123") != hash_password("rahasia123")


def test_verify_password_menolak_format_hash_rusak():
    assert not verify_password("rahasia123", "bukan-hash")


def test_registrasi_berhasil_dan_password_di_hash(client, session_factory):
    response = client.post("/auth/register", json=VALID_PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "owner@example.com"
    assert body["full_name"] == "Siti Aminah"
    assert body["is_active"] is True
    assert "password" not in body
    assert "password_hash" not in body

    with session_factory() as db:
        user = db.execute(select(User).where(User.email == "owner@example.com")).scalar_one()
        assert user.password_hash != "rahasia123"
        assert verify_password("rahasia123", user.password_hash)


def test_email_duplikat_ditolak(client):
    first = client.post("/auth/register", json=VALID_PAYLOAD)
    second = client.post("/auth/register", json={**VALID_PAYLOAD, "email": "OWNER@example.com"})

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["detail"] == "Email sudah digunakan"


@pytest.mark.parametrize(
    "field, value",
    [
        ("email", "bukan-email"),
        ("password", "pendek1"),
        ("password", "hanyahuruf"),
        ("password", "12345678"),
        ("full_name", "   "),
        ("full_name", ""),
    ],
)
def test_input_tidak_valid_ditolak(client, field, value):
    payload = {**VALID_PAYLOAD, field: value}

    response = client.post("/auth/register", json=payload)

    assert response.status_code == 422
    messages = [item["msg"] for item in response.json()["detail"]]
    assert messages


def test_field_wajib_hilang_ditolak(client):
    response = client.post("/auth/register", json={"email": "a@example.com"})

    assert response.status_code == 422


def _register(client):
    client.post("/auth/register", json=VALID_PAYLOAD)


def _login(client, password="rahasia123"):
    return client.post(
        "/auth/login",
        json={"email": "owner@example.com", "password": password},
    )


def test_login_berhasil_mengembalikan_token(client, session_factory):
    _register(client)

    response = client.post(
        "/auth/login",
        json={"email": "OWNER@example.com", "password": "rahasia123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]

    from app.security import decode_access_token
    payload = decode_access_token(body["access_token"])
    assert payload["email"] == "owner@example.com"
    assert payload["sub"]


def test_login_password_salah_ditolak(client):
    _register(client)

    response = _login(client, password="salah12345")

    assert response.status_code == 401
    assert response.json()["detail"] == "Email atau password salah"


def test_login_email_tidak_terdaftar_ditolak(client):
    response = client.post(
        "/auth/login",
        json={"email": "tidak@ada.com", "password": "rahasia123"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Email atau password salah"


def test_endpoint_terlindungi_menolak_tanpa_token(client):
    response = client.post("/auth/logout")

    assert response.status_code == 401


def test_endpoint_terlindungi_menolak_token_palsu(client):
    _register(client)

    response = client.post(
        "/auth/logout",
        headers={"Authorization": "Bearer token-palsu"},
    )

    assert response.status_code == 401


def test_logout_berhasil_untuk_token_valid(client):
    _register(client)
    token = _login(client).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    first = client.post("/auth/logout", headers=headers)
    assert first.status_code == 204


def test_token_kedaluwarsa_ditolak(client, session_factory):
    _register(client)
    with session_factory() as db:
        user = db.execute(select(User)).scalar_one()

    from app.security import create_access_token
    expired_token, _ = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(seconds=-1),
    )

    response = client.post("/auth/logout", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401


def test_login_pengguna_nonaktif_ditolak(client, session_factory):
    _register(client)
    with session_factory() as db:
        user = db.execute(select(User)).scalar_one()
        user.is_active = False
        db.commit()

    response = _login(client)

    assert response.status_code == 401


def _login_and_get_token(client):
    _register(client)
    return client.post(
        "/auth/login",
        json={"email": "owner@example.com", "password": "rahasia123"},
    ).json()["access_token"]


def _org_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_create_organization_diberikan_ke_owner(client, session_factory):
    token = _login_and_get_token(client)

    response = client.post(
        "/organizations",
        json={"name": "Toko ABC", "slug": "toko-abc"},
        headers=_org_headers(token),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Toko ABC"
    assert body["slug"] == "toko-abc"
    assert body["status"] == "active"

    with session_factory() as db:
        org = db.execute(select(Organization).where(Organization.slug == "toko-abc")).scalar_one()
        membership = db.execute(
            select(Membership).where(Membership.organization_id == org.id)
        ).scalar_one()
        assert membership.user.email == "owner@example.com"
        assert membership.role == "owner"


def test_user_tidak_login_tidak_bisa_buat_organisasi(client):
    response = client.post("/organizations", json={"name": "Toko ABC", "slug": "toko-abc"})

    assert response.status_code == 401


def test_slug_duplikat_ditolak(client, session_factory):
    token = _login_and_get_token(client)
    create_payload = {"name": "Toko ABC", "slug": "toko-abc"}

    first = client.post("/organizations", json=create_payload, headers=_org_headers(token))
    second = client.post(
        "/organizations",
        json={"name": "Toko Lain", "slug": "toko-abc"},
        headers=_org_headers(token),
    )

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["detail"] == "Slug sudah digunakan"


def test_slug_invalid_ditolak(client, session_factory):
    token = _login_and_get_token(client)

    for bad in ["a", "toko abc!", "-toko", "toko-", "toko@abc"]:
        response = client.post(
            "/organizations",
            json={"name": "Toko ABC", "slug": bad},
            headers=_org_headers(token),
        )
        assert response.status_code == 422


def test_list_my_organizations_hanya_mengembalikan_organisasi_user(client, session_factory):
    token = _login_and_get_token(client)
    another_payload = {"email": "other@example.com", "password": "rahasia123", "full_name": "Budak"}
    client.post("/auth/register", json=another_payload)
    other_token = client.post(
        "/auth/login",
        json={"email": "other@example.com", "password": "rahasia123"},
    ).json()["access_token"]

    client.post(
        "/organizations",
        json={"name": "Toko ABC", "slug": "toko-abc"},
        headers=_org_headers(token),
    )
    client.post(
        "/organizations",
        json={"name": "Toko XYZ", "slug": "toko-xyz"},
        headers=_org_headers(other_token),
    )

    response = client.get("/organizations/mine", headers=_org_headers(token))

    assert response.status_code == 200
    slugs = [item["slug"] for item in response.json()]
    assert slugs == ["toko-abc"]


def test_logout_invalidates_token(client):
    client.post("/auth/register", json={"email": "revoke@example.com", "password": "rahasia123", "full_name": "R"})
    res = client.post("/auth/login", json={"email": "revoke@example.com", "password": "rahasia123"})
    token = res.json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    assert client.post("/auth/logout", headers=auth).status_code == 204
    # Token yang sudah di-logout harus ditolak
    assert client.get("/auth/me", headers=auth).status_code == 401


def test_token_without_logout_still_works(client):
    client.post("/auth/register", json={"email": "keep@example.com", "password": "rahasia123", "full_name": "K"})
    res = client.post("/auth/login", json={"email": "keep@example.com", "password": "rahasia123"})
    token = res.json()["access_token"]
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200


