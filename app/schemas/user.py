from datetime import datetime, UTC
from typing import Optional
from enum import Enum
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    username: Optional[str] = Field(default=None, min_length=3, max_length=30)
    bio: Optional[str] = Field(default=None, max_length=300)
    avatar_url: Optional[str] = Field(default=None, max_length=255)


class UserResponse(BaseModel):
    name: str
    username: str
    email: EmailStr
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_private: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MessageResponse(BaseModel):
    message: str

class EmailTokenRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ListStatus(str, Enum):
    read = "read"
    watched = "watched"
    dropped = "dropped"


class UserListItemCreate(BaseModel):
    item_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=255)
    media_type: str = Field(min_length=1, max_length=50)
    status: ListStatus


class UserListItemMove(BaseModel):
    status: ListStatus


class UserListItemResponse(BaseModel):
    item_id: str
    title: str
    media_type: str
    status: ListStatus
    added_at: datetime


class UserListsResponse(BaseModel):
    read: list[UserListItemResponse]
    watched: list[UserListItemResponse]
    dropped: list[UserListItemResponse]