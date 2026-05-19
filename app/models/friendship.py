from datetime import datetime, UTC

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel


class Friendship(Document):
    user_low_id: str
    user_high_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "friendships"
        indexes = [
            IndexModel(
                [("user_low_id", ASCENDING), ("user_high_id", ASCENDING)],
                unique=True,
                name="unique_friendship_pair",
            ),
            [("user_low_id", ASCENDING)],
            [("user_high_id", ASCENDING)],
        ]