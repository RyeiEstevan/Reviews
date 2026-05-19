from datetime import datetime, UTC
from beanie import Document, Indexed
from pydantic import Field


class EmailVerificationToken(Document):
    user_id: str
    email: str
    token: Indexed(str, unique=True)
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


    class Settings:
        name = "email_verification_tokens"