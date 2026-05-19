from datetime import datetime, UTC

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel


class FriendRequest(Document):
    sender_id: str
    receiver_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "friend_requests"
        indexes = [
            IndexModel(
                [("sender_id", ASCENDING), ("receiver_id", ASCENDING)],
                unique=True,
                name="unique_friend_request_pair",
            ),
            [("receiver_id", ASCENDING), ("created_at", ASCENDING)],
        ]