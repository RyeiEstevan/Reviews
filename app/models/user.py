from datetime import datetime, UTC
from enum import Enum
from typing import Optional

from beanie import Document, Indexed
from pydantic import BaseModel, EmailStr, Field


class ListStatus(str, Enum):
    read = "read"
    watched = "watched"
    dropped = "dropped"


class UserListItem(BaseModel):
    item_id: str
    title: str = Field(min_length=1, max_length=255)
    media_type: str = Field(min_length=1, max_length=50)
    status: ListStatus
    added_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class User(Document):
    name: str
    username: Indexed(str, unique=True)
    email: Indexed(EmailStr, unique=True)
    hashed_password: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    is_private: bool = False
    list_items: list[UserListItem] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "users"