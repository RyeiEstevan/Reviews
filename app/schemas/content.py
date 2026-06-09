from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel

ContentType = Literal["movie", "series", "book"]

class ContentCard(BaseModel):
    """Compact version for carousels and rankings."""
    id: str
    title: str
    type: ContentType
    year: int
    poster_url: Optional[str] = None
    avg_score: float = 0.0
    review_count: int = 0
    platform: Optional[str] = None

class ContentItem(BaseModel):
    """Full content document — used by catalog browsing and admin management."""
    id: str
    title: str
    type: ContentType
    year: int
    poster_url: Optional[str] = None
    description: Optional[str] = None
    genre: List[str] = []
    director: Optional[str] = None
    platform: Optional[str] = None
    avg_score: float = 0.0
    review_count: int = 0
    view_count: int = 0
    recent_view_count: int = 0
    recent_avg_score: float = 0.0
    yearly_avg_score: float = 0.0
    yearly_view_count: int = 0


class ContentCreate(BaseModel):
    title: str
    type: ContentType
    year: int
    poster_url: Optional[str] = None
    description: Optional[str] = None
    genre: List[str] = []
    director: Optional[str] = None
    platform: Optional[str] = None


class ContentUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[ContentType] = None
    year: Optional[int] = None
    poster_url: Optional[str] = None
    description: Optional[str] = None
    genre: Optional[List[str]] = None
    director: Optional[str] = None
    platform: Optional[str] = None
