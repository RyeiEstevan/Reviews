from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import EmailStr, Field


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Document):
    username: str
    email: Optional[EmailStr] = None
    password_hash: Optional[str] = None
    role: str = "common"          # common | admin | superadmin
    status: str = "active"        # active | banned
    ban_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "users"


class Post(Document):
    """Stand-in owned by the Fórum feature; admin only hides/cascades it."""

    owner: str
    title: str
    hidden: bool = False

    class Settings:
        name = "posts"


class Comment(Document):
    """Stand-in owned by the Fórum feature; admin only cascades it."""

    author: str
    content: str
    post_id: Optional[str] = None

    class Settings:
        name = "comments"


class CatalogContributor(Document):
    name: str
    role: str                     # artist | author | voice-actor
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "contributors"


class News(Document):
    title: str
    body: str = ""
    tags: list[str] = Field(default_factory=list)
    published: bool = True
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "news"


class AuditLog(Document):
    actor: str
    action: str                   # create_user, ban_user, create_artist, ...
    target_type: str              # user | artist | news
    target: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "audit_log"


DOCUMENT_MODELS = [User, Post, Comment, CatalogContributor, News, AuditLog]
