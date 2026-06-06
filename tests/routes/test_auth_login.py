"""Route test for POST /auth/login (slice B1).

Exercises the login contract end-to-end over the in-memory database: valid
credentials yield a Bearer token that actually authorizes an /admin route, login
also works by email, and every failure mode returns the same generic 401 so the
endpoint never leaks whether an account exists (RNF04).
"""

from app.core.security import hash_password
from app.db.models import User


def _seed_user(run, username, password, role="admin", email=None):
    run(
        User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role=role,
        ).insert()
    )


def test_login_with_valid_credentials_returns_usable_token(client, run):
    _seed_user(run, "GabrielAdmin", "secret123", role="admin", email="gabriel@reviews.dev")

    resp = client.post("/auth/login", json={"username": "GabrielAdmin", "password": "secret123"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["role"] == "admin"
    assert body["username"] == "GabrielAdmin"
    token = body["access_token"]
    assert token

    # The token must actually authorize a guarded /admin route.
    admin_resp = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert admin_resp.status_code == 200


def test_login_by_email_is_accepted(client, run):
    _seed_user(run, "RootAdmin", "rootpass", role="superadmin", email="root@reviews.dev")

    resp = client.post("/auth/login", json={"username": "root@reviews.dev", "password": "rootpass"})

    assert resp.status_code == 200
    assert resp.json()["role"] == "superadmin"


def test_login_with_wrong_password_is_rejected(client, run):
    _seed_user(run, "GabrielAdmin", "secret123")

    resp = client.post("/auth/login", json={"username": "GabrielAdmin", "password": "WRONG"})

    assert resp.status_code == 401
    assert resp.json()["detail"] == "invalid credentials"


def test_login_unknown_user_is_rejected_without_enumeration(client):
    resp = client.post("/auth/login", json={"username": "ghost", "password": "whatever"})

    assert resp.status_code == 401
    # Same generic message as a wrong password → no account enumeration.
    assert resp.json()["detail"] == "invalid credentials"
