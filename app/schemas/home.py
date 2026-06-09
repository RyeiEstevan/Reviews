from pydantic import BaseModel
from typing import List, Literal, Optional

from app.schemas.content import ContentCard

    
class RankingItem(BaseModel):
    position: int
    content: ContentCard
    value: str  # can be "1.2M views", "9.4", "New", etc.


class RankingBlock(BaseModel):
    title: str           # "Most Viewed", "Top Rated", "New Arrivals"
    badge: str           # "This Month", "This Week", etc.
    items: List[RankingItem]


class HomeResponse(BaseModel):
    trending: List[ContentCard]
    top_rated: List[ContentCard]
    rankings: List[RankingBlock]


class SearchResponse(BaseModel):
    """Search results for content."""
    query: str
    results: List[ContentCard]
    count: int
