import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.customer import Customer
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.supplier import Supplier
from app.models.user import User
from app.models.user_session import UserSession

@pytest.fixture()
def session_factory():
    engine = create_engine(
        'sqlite://',
        connect_args={'check_same_thread': False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        engine,
        tables=[
            User.__table__,
            UserSession.__table__,
            Organization.__table__,
            Membership.__table__,
            Supplier.__table__,
            Customer.__table__,
        ],
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

def _register_and_login(client, email='user@example.com'):
    client.post('/auth/register', json={'email': email, 'password': 'rahasia123', 'full_name': 'Test User'})
    res = client.post('/auth/login', json={'email': email, 'password': 'rahasia123'})
    return res.json()['access_token']

def _create_org(client, token, slug='toko-abc'):
    return client.post('/organizations', json={'name': 'Toko ABC', 'slug': slug}, headers={'Authorization': f'Bearer {token}'})

def test_supplier_crud_and_isolation(client, session_factory):
    token = _register_and_login(client, 'owner1@example.com')
    _create_org(client, token, 'toko-1')
    headers1 = {'Authorization': f'Bearer {token}', 'X-Organization-Slug': 'toko-1'}

    # 1. Create supplier
    res = client.post('/suppliers', json={'name': 'Supplier A', 'phone': '08123', 'email': 'supa@mail.com'}, headers=headers1)
    assert res.status_code == 201
    sup_id = res.json()['id']
    assert res.json()['name'] == 'Supplier A'

    # 2. List suppliers
    res = client.get('/suppliers', headers=headers1)
    assert res.status_code == 200
    assert len(res.json()) == 1

    # 3. Get detail
    res = client.get(f'/suppliers/{sup_id}', headers=headers1)
    assert res.status_code == 200
    assert res.json()['id'] == sup_id

    # 4. Update
    res = client.patch(f'/suppliers/{sup_id}', json={'name': 'Supplier A Update'}, headers=headers1)
    assert res.status_code == 200
    assert res.json()['name'] == 'Supplier A Update'

    # 5. Isolation: org2 cannot see supplier from org1
    token2 = _register_and_login(client, 'owner2@example.com')
    _create_org(client, token2, 'toko-2')
    headers2 = {'Authorization': f'Bearer {token2}', 'X-Organization-Slug': 'toko-2'}
    res = client.get('/suppliers', headers=headers2)
    assert res.status_code == 200
    assert len(res.json()) == 0

    res = client.get(f'/suppliers/{sup_id}', headers=headers2)
    assert res.status_code == 404

    # 6. Delete
    res = client.delete(f'/suppliers/{sup_id}', headers=headers1)
    assert res.status_code == 204

def test_customer_crud_and_isolation(client, session_factory):
    token = _register_and_login(client, 'owner3@example.com')
    _create_org(client, token, 'toko-3')
    headers1 = {'Authorization': f'Bearer {token}', 'X-Organization-Slug': 'toko-3'}

    # 1. Create customer
    res = client.post('/customers', json={'name': 'Customer B', 'phone': '08999', 'email': 'custb@mail.com'}, headers=headers1)
    assert res.status_code == 201
    cust_id = res.json()['id']
    assert res.json()['name'] == 'Customer B'

    # 2. List customers
    res = client.get('/customers', headers=headers1)
    assert res.status_code == 200
    assert len(res.json()) == 1

    # 3. Update customer
    res = client.patch(f'/customers/{cust_id}', json={'name': 'Customer B Baru'}, headers=headers1)
    assert res.status_code == 200
    assert res.json()['name'] == 'Customer B Baru'

    # 4. Isolation: org4 cannot access
    token4 = _register_and_login(client, 'owner4@example.com')
    _create_org(client, token4, 'toko-4')
    headers2 = {'Authorization': f'Bearer {token4}', 'X-Organization-Slug': 'toko-4'}
    res = client.get(f'/customers/{cust_id}', headers=headers2)
    assert res.status_code == 404

    # 5. Delete
    res = client.delete(f'/customers/{cust_id}', headers=headers1)
    assert res.status_code == 204
