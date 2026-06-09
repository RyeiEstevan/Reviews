"""app/schemas/content.py — Pydantic request / response models for Content."""
 
from __future__ import annotations
 
import re
from typing import Optional
 
from pydantic import BaseModel, field_validator
 
 
# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────
 
_DURATION_RE = re.compile(r"^\s*([1-9]\d*)\s*min\s*$", re.IGNORECASE)
 
 
def _validate_duration(v: str) -> str:
    if not _DURATION_RE.match(v):
        raise ValueError(
            "Duração inválida. Use o formato '<número positivo> min', ex: '120 min'."
        )
    return v.strip()
 
 
# ──────────────────────────────────────────────────────────────────────────────
# Request schemas
# ──────────────────────────────────────────────────────────────────────────────
 
 
class ContentCreate(BaseModel):
    title: str
    genre: str
    release_year: int
    duration: str
 
    @field_validator("duration")
    @classmethod
    def check_duration(cls, v: str) -> str:
        return _validate_duration(v)
 
 
class ContentUpdate(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    release_year: Optional[int] = None
    duration: Optional[str] = None
 
    @field_validator("duration")
    @classmethod
    def check_duration(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validate_duration(v)
 
 
# ──────────────────────────────────────────────────────────────────────────────
# Response schemas
# ──────────────────────────────────────────────────────────────────────────────
 
 
class ContentResponse(BaseModel):
    id: str
    title: str
    genre: str
    release_year: int
    duration: str
    rating: float
    review_count: int
    view_count: int
    recent_view_count: int
 
    model_config = {"from_attributes": True}
 
    @classmethod
    def from_document(cls, doc) -> "ContentResponse":
        return cls(
            id=str(doc.id),
            title=doc.title,
            genre=doc.genre,
            release_year=doc.release_year,
            duration=doc.duration,
            rating=doc.rating,
            review_count=doc.review_count,
            view_count=doc.view_count,
            recent_view_count=doc.recent_view_count,
        )