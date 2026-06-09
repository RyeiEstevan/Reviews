from pydantic import BaseModel
from typing import List, Literal, Optional

MediaType = Literal["movie", "series", "book"]

class MediaCard(BaseModel):
    """Compact version for carousels and rankings."""
    id: str
    title: str
    type: MediaType
    year: int
    poster_url: Optional[str] = None
    avg_score: float = 0.0
    review_count: int = 0
    platform: Optional[str] = None
    
class RankingItem(BaseModel):
    position: int
    media: MediaCard
    value: str  # can be "1.2M views", "9.4", "New", etc.


class RankingBlock(BaseModel):
    title: str           # "Most Viewed", "Top Rated", "New Arrivals"
    badge: str           # "This Month", "This Week", etc.
    items: List[RankingItem]


class HomeResponse(BaseModel):
    trending: List[MediaCard]
    top_rated: List[MediaCard]
    rankings: List[RankingBlock]


class SearchResponse(BaseModel):
    """Search results for media content."""
    query: str
    results: List[MediaCard]
    count: int
