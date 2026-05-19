from datetime import datetime, UTC

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel


class Block(Document):
    blocker_id: str
    blocked_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "blocks"
        indexes = [
            IndexModel(
                [("blocker_id", ASCENDING), ("blocked_id", ASCENDING)],
                unique=True,
                name="unique_block_pair",
            ),
            [("blocked_id", ASCENDING)],
        ]   