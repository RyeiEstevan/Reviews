from datetime import datetime, UTC
from beanie import Document, Indexed
from pydantic import EmailStr, Field


class PasswordResetToken(Document):
    user_id: str
    email: EmailStr
    token: Indexed(str, unique=True)
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "password_reset_tokens"