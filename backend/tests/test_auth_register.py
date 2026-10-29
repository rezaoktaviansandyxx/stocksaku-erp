import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.security import hash_password, verify_password


@pytest.fixture()
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine, tables=[User.__table__])
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
