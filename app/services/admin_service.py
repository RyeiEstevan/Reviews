"""Admin-user service layer.

Holds the business rules for the Usuário Administrador feature. Every successful
mutation writes exactly one audit entry; rejected requests (validation / hierarchy)
raise before any audit entry is written.
"""

from typing import Optional

from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

from app.core.security import hash_password
from app.db.models import (
    CatalogContributor,
    Comment,
    News,
    Post,
    User,
)
from app.schemas.admin import ContributorCreate, NewsCreate, UserCreate, UserUpdate
from app.services.audit_service import AuditService


def requires_superadmin_to_create(role: str) -> bool:
    """Creating an admin account requires superadmin privileges (rule R1)."""
    return role == "admin"


def is_privileged_target(role: str) -> bool:
    """admin/superadmin accounts may only be deleted by a superadmin (rule R1)."""
    return role in ("admin", "superadmin")


def contributor_name_is_valid(name: Optional[str]) -> bool:
    """A catalog contributor must have a non-blank name (rule R5)."""
    return bool((name or "").strip())


class AdminService:
    # ---- users ----------------------------------------------------------
    @staticmethod
    async def list_users() -> list[User]:
        return await User.find_all().to_list()

    @staticmethod
    async def create_user(actor: dict, data: UserCreate) -> User:
        if requires_superadmin_to_create(data.role) and actor["role"] != "superadmin":
            raise HTTPException(status_code=403, detail="only superadmin can create admin accounts")
        if await User.find_one(User.username == data.username):
            raise HTTPException(status_code=409, detail="username already exists")
        # Atlas has a non-sparse unique index on email; store a placeholder so null
        # is never written (two null values would violate the constraint).
        effective_email = data.email or f"_{data.username}@no-reply.internal"
        user = User(
            username=data.username,
            email=effective_email,
            password_hash=hash_password(data.password),
            role=data.role,
        )
        try:
            await user.insert()
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="email already in use")
        await AuditService.record(actor["username"], "create_user", "user", data.username)
        return user

    @staticmethod
    async def update_user(actor: dict, user_id: str, data: UserUpdate) -> User:
        user = await User.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="user not found")
        metadata: dict = {}
        if data.email and data.email != user.email:
            metadata = {"old_email": user.email, "new_email": data.email}
            user.email = data.email
        if data.username:
            user.username = data.username
        await user.save()
        await AuditService.record(actor["username"], "update_user", "user", user.username, metadata)
        return user

    @staticmethod
    async def delete_user(actor: dict, user_id: str) -> None:
        user = await User.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="user not found")
        if is_privileged_target(user.role) and actor["role"] != "superadmin":
            raise HTTPException(status_code=403, detail="only superadmin can delete admin accounts")
        # cascade: the user's own posts (and their comments) and the user's comments
        async for post in Post.find(Post.owner == user.username):
            async for comment in Comment.find(Comment.post_id == str(post.id)):
                await comment.delete()
            await post.delete()
        async for comment in Comment.find(Comment.author == user.username):
            await comment.delete()
        await user.delete()
        await AuditService.record(actor["username"], "delete_user", "user", user.username, {"cascade": True})

    @staticmethod
    async def ban_user(actor: dict, user_id: str, reason: Optional[str]) -> User:
        user = await User.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="user not found")
        user.status = "banned"
        user.ban_reason = reason
        await user.save()
        async for post in Post.find(Post.owner == user.username):
            post.hidden = True
            await post.save()
        await AuditService.record(actor["username"], "ban_user", "user", user.username, {"reason": reason})
        return user

    @staticmethod
    async def unban_user(actor: dict, user_id: str) -> User:
        user = await User.get(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="user not found")
        user.status = "active"
        user.ban_reason = None
        await user.save()
        async for post in Post.find(Post.owner == user.username):
            post.hidden = False
            await post.save()
        await AuditService.record(actor["username"], "unban_user", "user", user.username)
        return user

    # ---- catalog contributors ------------------------------------------
    @staticmethod
    async def create_contributor(actor: dict, data: ContributorCreate) -> CatalogContributor:
        if not contributor_name_is_valid(data.name):
            raise HTTPException(status_code=400, detail="name is required")
        contributor = CatalogContributor(name=data.name, role=data.role)
        await contributor.insert()
        await AuditService.record(actor["username"], "create_artist", "artist", data.name)
        return contributor

    @staticmethod
    async def search_contributors(term: str) -> list[CatalogContributor]:
        return await CatalogContributor.find(
            {"name": {"$regex": term, "$options": "i"}}
        ).to_list()

    # ---- news -----------------------------------------------------------
    @staticmethod
    async def create_news(actor: dict, data: NewsCreate) -> News:
        news = News(title=data.title, body=data.body, tags=data.tags)
        await news.insert()
        await AuditService.record(actor["username"], "create_news", "news", data.title)
        return news
