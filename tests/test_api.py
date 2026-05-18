import pytest
import pytest_asyncio

from httpx import AsyncClient, ASGITransport
from mongomock_motor import AsyncMongoMockClient
from unittest.mock import AsyncMock
from datetime import datetime, UTC, timedelta

from app.main import app
from app.database import init_db
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.models.email_verification_token import EmailVerificationToken
from app.models.friend_request import FriendRequest
from app.models.friendship import Friendship
from app.models.block import Block
from app.core.security import hash_password


@pytest_asyncio.fixture(autouse=True)
async def mock_db(monkeypatch):
    client = AsyncMongoMockClient()
    db = client["test_reviews_db"]

    monkeypatch.setattr(
        "app.services.email_service.EmailService.send_email",
        AsyncMock(return_value=None),
    )

    await init_db(db)

    await db["users"].delete_many({})
    await db["email_verification_tokens"].delete_many({})
    await db["password_reset_tokens"].delete_many({})
    await db["friend_requests"].delete_many({})
    await db["friendships"].delete_many({})
    await db["blocks"].delete_many({})

    yield db


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest_asyncio.fixture
async def verified_user():
    user = User(
        name="Mário Borba",
        username="marioborba",
        email="mario@email.com",
        hashed_password=hash_password("123456"),
        is_active=True,
        is_verified=True,
        is_private=False,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def inactive_user():
    user = User(
        name="Mário Borba",
        username="marioborba",
        email="mario@email.com",
        hashed_password=hash_password("123456"),
        is_active=False,
        is_verified=True,
        is_private=False,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def second_verified_user():
    user = User(
        name="Ana Souza",
        username="anasouza",
        email="ana@email.com",
        hashed_password=hash_password("123456"),
        is_active=True,
        is_verified=True,
        is_private=False,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def private_user():
    user = User(
        name="Carlos Lima",
        username="carloslima",
        email="carlos@email.com",
        hashed_password=hash_password("123456"),
        is_active=True,
        is_verified=True,
        is_private=True,
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def auth_headers(client, verified_user):
    response = await client.post(
        "/auth/login",
        json={
            "email": "mario@email.com",
            "password": "123456",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def private_user_headers(client, private_user):
    response = await client.post(
        "/auth/login",
        json={
            "email": "carlos@email.com",
            "password": "123456",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# =========================
# AUTH
# =========================

@pytest.mark.asyncio
async def test_register_user_success(client):
    response = await client.post(
        "/auth/register",
        json={
            "name": "Mário Borba",
            "username": "marioborba",
            "email": "mario@email.com",
            "password": "123456",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Mário Borba"
    assert data["username"] == "marioborba"
    assert data["email"] == "mario@email.com"

    user = await User.find_one(User.email == "mario@email.com")
    assert user is not None
    assert user.is_verified is False

    token = await EmailVerificationToken.find_one(
        EmailVerificationToken.email == "mario@email.com"
    )
    assert token is not None
    assert token.used is False


@pytest.mark.asyncio
async def test_register_fails_when_email_already_exists(client, verified_user):
    response = await client.post(
        "/auth/register",
        json={
            "name": "Pedro Borba",
            "username": "pedroborba",
            "email": "mario@email.com",
            "password": "123456",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "E-mail já está em uso"


@pytest.mark.asyncio
async def test_register_fails_when_username_already_exists(client, verified_user):
    response = await client.post(
        "/auth/register",
        json={
            "name": "Alice Borba",
            "username": "marioborba",
            "email": "alice@email.com",
            "password": "123456",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Username já está em uso"


@pytest.mark.asyncio
async def test_login_success(client, verified_user):
    response = await client.post(
        "/auth/login",
        json={
            "email": "mario@email.com",
            "password": "123456",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_fails_after_logical_deletion(client, inactive_user):
    response = await client.post(
        "/auth/login",
        json={
            "email": "mario@email.com",
            "password": "123456",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "A conta está inativa"


# =========================
# USERS
# =========================

@pytest.mark.asyncio
async def test_get_me(client, auth_headers):
    response = await client.get("/users/me", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "mario@email.com"
    assert data["username"] == "marioborba"


@pytest.mark.asyncio
async def test_update_profile_success(client, auth_headers):
    response = await client.patch(
        "/users/me",
        headers=auth_headers,
        json={
            "name": "Mário Borba Lima",
            "username": "marioborbalima",
            "bio": "Estudante e desenvolvedor",
            "avatar_url": "foto-perfil.jpg",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Mário Borba Lima"
    assert data["username"] == "marioborbalima"
    assert data["bio"] == "Estudante e desenvolvedor"
    assert data["avatar_url"] == "foto-perfil.jpg"


@pytest.mark.asyncio
async def test_update_profile_fails_with_existing_username(
    client, auth_headers, second_verified_user
):
    response = await client.patch(
        "/users/me",
        headers=auth_headers,
        json={
            "username": "anasouza",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Username já está em uso"


@pytest.mark.asyncio
async def test_delete_me_deactivates_account(client, auth_headers):
    response = await client.delete("/users/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["message"] == "Conta desativada com sucesso"

    user = await User.find_one(User.email == "mario@email.com")
    assert user.is_active is False


# =========================
# LISTS
# =========================

@pytest.mark.asyncio
async def test_add_item_to_read_list(client, auth_headers):
    response = await client.post(
        "/users/me/lists/items",
        headers=auth_headers,
        json={
            "item_id": "book-1",
            "title": "Dom Casmurro",
            "media_type": "book",
            "status": "read",
        },
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Item adicionado à lista com sucesso"

    lists_response = await client.get("/users/me/lists", headers=auth_headers)
    data = lists_response.json()

    assert len(data["read"]) == 1
    assert data["read"][0]["title"] == "Dom Casmurro"


@pytest.mark.asyncio
async def test_add_item_to_watched_list(client, auth_headers):
    response = await client.post(
        "/users/me/lists/items",
        headers=auth_headers,
        json={
            "item_id": "movie-1",
            "title": "Interestelar",
            "media_type": "movie",
            "status": "watched",
        },
    )

    assert response.status_code == 200

    lists_response = await client.get("/users/me/lists", headers=auth_headers)
    data = lists_response.json()

    assert len(data["watched"]) == 1
    assert data["watched"][0]["title"] == "Interestelar"


@pytest.mark.asyncio
async def test_add_item_to_dropped_list(client, auth_headers):
    response = await client.post(
        "/users/me/lists/items",
        headers=auth_headers,
        json={
            "item_id": "series-1",
            "title": "The Walking Dead",
            "media_type": "series",
            "status": "dropped",
        },
    )

    assert response.status_code == 200

    lists_response = await client.get("/users/me/lists", headers=auth_headers)
    data = lists_response.json()

    assert len(data["dropped"]) == 1
    assert data["dropped"][0]["title"] == "The Walking Dead"


@pytest.mark.asyncio
async def test_move_item_between_lists(client, auth_headers):
    await client.post(
        "/users/me/lists/items",
        headers=auth_headers,
        json={
            "item_id": "movie-1",
            "title": "Interestelar",
            "media_type": "movie",
            "status": "watched",
        },
    )

    response = await client.patch(
        "/users/me/lists/items/movie-1",
        headers=auth_headers,
        json={"status": "dropped"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Item movido de lista com sucesso"

    lists_response = await client.get("/users/me/lists", headers=auth_headers)
    data = lists_response.json()

    assert len(data["watched"]) == 0
    assert len(data["dropped"]) == 1
    assert data["dropped"][0]["title"] == "Interestelar"


@pytest.mark.asyncio
async def test_view_lists_in_profile(client, auth_headers):
    await client.post(
        "/users/me/lists/items",
        headers=auth_headers,
        json={
            "item_id": "book-1",
            "title": "Dom Casmurro",
            "media_type": "book",
            "status": "read",
        },
    )
    await client.post(
        "/users/me/lists/items",
        headers=auth_headers,
        json={
            "item_id": "movie-1",
            "title": "Interestelar",
            "media_type": "movie",
            "status": "watched",
        },
    )
    await client.post(
        "/users/me/lists/items",
        headers=auth_headers,
        json={
            "item_id": "series-1",
            "title": "The Walking Dead",
            "media_type": "series",
            "status": "dropped",
        },
    )

    response = await client.get("/users/me/lists", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data["read"]) == 1
    assert len(data["watched"]) == 1
    assert len(data["dropped"]) == 1


# =========================
# SOCIAL
# =========================

@pytest.mark.asyncio
async def test_update_privacy(client, auth_headers):
    response = await client.patch(
        "/users/me/privacy",
        headers=auth_headers,
        json={"is_private": True},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "updated"

    user = await User.find_one(User.email == "mario@email.com")
    assert user.is_private is True


@pytest.mark.asyncio
async def test_send_friend_request_to_private_user(
    client, auth_headers, private_user
):
    response = await client.post(
        "/users/carloslima/friend-request",
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"

    request = await FriendRequest.find_one(FriendRequest.receiver_id == str(private_user.id))
    assert request is not None


@pytest.mark.asyncio
async def test_accept_friend_request(client, auth_headers, private_user, private_user_headers):
    send_response = await client.post(
        "/users/carloslima/friend-request",
        headers=auth_headers,
    )
    assert send_response.status_code == 200

    pending = await client.get(
        "/users/me/friend-requests",
        headers=private_user_headers,
    )
    pending_data = pending.json()
    request_id = pending_data[0]["id"]

    accept_response = await client.post(
        f"/friend-requests/{request_id}/accept",
        headers=private_user_headers,
    )

    assert accept_response.status_code == 200
    assert accept_response.json()["status"] == "friends"

    friendships = await Friendship.find().to_list()
    assert len(friendships) == 1


@pytest.mark.asyncio
async def test_create_friendship_for_public_profile(client, auth_headers, second_verified_user):
    response = await client.post(
        "/users/anasouza/friend-request",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "friends"

    friendships = await Friendship.find().to_list()
    assert len(friendships) == 1


@pytest.mark.asyncio
async def test_block_user(client, auth_headers, second_verified_user):
    response = await client.post(
        "/users/anasouza/block",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "blocked"

    block = await Block.find_one(Block.blocked_id == str(second_verified_user.id))
    assert block is not None


# =========================
# PASSWORD RESET
# =========================

@pytest.mark.asyncio
async def test_forgot_password_existing_email(client, verified_user):
    response = await client.post(
        "/auth/forgot-password",
        json={"email": "mario@email.com"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == (
        "Se o e-mail estiver cadastrado, você receberá um link em instantes"
    )

    token = await PasswordResetToken.find_one(
        PasswordResetToken.email == "mario@email.com"
    )
    assert token is not None
    assert token.used is False


@pytest.mark.asyncio
async def test_forgot_password_non_existing_email(client):
    response = await client.post(
        "/auth/forgot-password",
        json={"email": "naoexiste@email.com"},
    )

    assert response.status_code == 200
    assert response.json()["message"] == (
        "Se o e-mail estiver cadastrado, você receberá um link em instantes"
    )

    token = await PasswordResetToken.find_one(
        PasswordResetToken.email == "naoexiste@email.com"
    )
    assert token is None


@pytest.mark.asyncio
async def test_reset_password_success(client, verified_user):
    await client.post(
        "/auth/forgot-password",
        json={"email": "mario@email.com"},
    )

    token = await PasswordResetToken.find_one(
        PasswordResetToken.email == "mario@email.com"
    )
    assert token is not None

    reset_response = await client.post(
        "/auth/reset-password",
        json={
            "token": token.token,
            "new_password": "NovaSenha123",
        },
    )

    assert reset_response.status_code == 200
    assert reset_response.json()["message"] == "Sua senha foi redefinida com sucesso!"

    updated_token = await PasswordResetToken.find_one(
        PasswordResetToken.email == "mario@email.com"
    )
    assert updated_token.used is True

    old_login = await client.post(
        "/auth/login",
        json={
            "email": "mario@email.com",
            "password": "123456",
        },
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/auth/login",
        json={
            "email": "mario@email.com",
            "password": "NovaSenha123",
        },
    )
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_fails_with_expired_token(client, verified_user):
    expired_token = PasswordResetToken(
        user_id=str(verified_user.id),
        email=verified_user.email,
        token="expired-token-12345",
        expires_at=datetime.now(UTC) - timedelta(hours=3),
        used=False,
    )
    await expired_token.insert()

    response = await client.post(
        "/auth/reset-password",
        json={
            "token": "expired-token-12345",
            "new_password": "NovaSenha123",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "O link de recuperação expirou ou já foi utilizado."