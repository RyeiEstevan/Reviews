from typing import Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    password: str = "changeme"
    role: str = "common"


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None


class BanRequest(BaseModel):
    reason: Optional[str] = None


class ContributorCreate(BaseModel):
    name: str = ""
    role: str = "artist"


class NewsCreate(BaseModel):
    title: str
    body: str = ""
    tags: list[str] = []
