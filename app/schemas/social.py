from datetime import datetime, UTC
from typing import Optional

from pydantic import BaseModel


class PrivacyUpdateRequest(BaseModel):
    is_private: bool


class SocialActionResponse(BaseModel):
    message: str
    status: str


class FriendRequestResponse(BaseModel):
    id: str
    sender_username: str
    sender_name: str
    sender_avatar_url: Optional[str] = None
    created_at: datetime


class FriendResponse(BaseModel):
    id: str
    username: str
    name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None