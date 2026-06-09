from datetime import datetime, timezone
from typing import Optional

import re
from typing import Optional

from beanie import Document
from pydantic import EmailStr, Field, field_validator


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
    owner: str
    title: str
    content: str = ""
    category: Optional[str] = None     # Filmes | Séries | Livros
    hidden: bool = False               # set by the admin ban cascade
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "posts"
        indexes = ["category"]         # speeds the category filter (ForumSearch)


class Comment(Document):
    author: str
    content: str
    post_id: Optional[str] = None
    upvoters: list[str] = Field(default_factory=list)  # usernames who upvoted; count = len()
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "comments"
        indexes = ["post_id"]          # speeds loading a post's comment thread


class CatalogContributor(Document):
    name: str
    role: str                     # artist | author | voice-actor
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "contributors"
        indexes = ["name"]        # speeds prefix-anchored search (RNF05)


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

class Content(Document):
    title: str
    genre: str
    release_year: int
    duration: str          # "120 min"
    rating: float = 0.0
    review_count: int = 0
    view_count: int = 0
    recent_view_count: int = 0

    @field_validator("duration")
    @classmethod
    def validate_duration(cls, v: str) -> str:
        pattern = r"^\s*([1-9]\d*)\s*min\s*$"
        if not re.match(pattern, v, re.IGNORECASE):
            raise ValueError(
                "Duração inválida. Use o formato '<número positivo> min', ex: '120 min'."
            )
        return v.strip()

    class Settings:
        name = "content"

DOCUMENT_MODELS = [
    User, Post, Comment, CatalogContributor, News, AuditLog,
    Content, 
]
