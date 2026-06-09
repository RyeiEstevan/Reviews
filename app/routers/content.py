"""app/routers/content.py

CRUD endpoints for the `content` collection — the same collection that
the /home feed reads for trending/rankings.

GET    /content          — list all (public, optional ?type= and ?q=)
GET    /content/{id}     — single item (public)
POST   /content          — create (admin+)
PATCH  /content/{id}     — update (admin+)
DELETE /content/{id}     — delete (admin+)
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_user
from app.db.database import get_database
from app.schemas.content import ContentCreate, ContentItem, ContentUpdate

router = APIRouter(prefix="/content", tags=["content"])

_WRITE_ROLES = {"moderador", "admin", "superadmin"}


def _to_item(doc: dict) -> ContentItem:
    return ContentItem(
        id=str(doc["_id"]),
        title=doc.get("title", ""),
        type=doc.get("type", "movie"),
        year=doc.get("year", 0),
        poster_url=doc.get("poster_url"),
        description=doc.get("description"),
        genre=doc.get("genre") or [],
        director=doc.get("director"),
        platform=doc.get("platform"),
        avg_score=doc.get("avg_score", 0.0),
        review_count=doc.get("review_count", 0),
        view_count=doc.get("view_count", 0),
        recent_view_count=doc.get("recent_view_count", 0),
        recent_avg_score=doc.get("recent_avg_score", 0.0),
        yearly_avg_score=doc.get("yearly_avg_score", 0.0),
        yearly_view_count=doc.get("yearly_view_count", 0),
    )


def _oid(content_id: str) -> ObjectId:
    try:
        return ObjectId(content_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Content not found")


# ── Public reads ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[ContentItem])
async def list_content(
    type: Optional[Literal["all", "movie", "series", "book"]] = Query(None),
    q: Optional[str] = Query(None),
):
    """List all content items, optionally filtered by type and title search."""
    db = get_database()
    filt: dict = {}
    if type and type != "all":
        filt["type"] = type
    if q:
        filt["title"] = {"$regex": q, "$options": "i"}
    cursor = db.content.find(filt).sort("title", 1)
    return [_to_item(doc) async for doc in cursor]


@router.get("/{content_id}", response_model=ContentItem)
async def get_content(content_id: str):
    db = get_database()
    doc = await db.content.find_one({"_id": _oid(content_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    return _to_item(doc)


# ── Protected mutations ───────────────────────────────────────────────────────

@router.post("", response_model=ContentItem, status_code=status.HTTP_201_CREATED)
async def create_content(
    payload: ContentCreate,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] not in _WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    db = get_database()
    now = datetime.utcnow()
    doc = payload.model_dump()
    doc.update(
        avg_score=0.0,
        review_count=0,
        view_count=0,
        recent_view_count=0,
        recent_avg_score=0.0,
        yearly_avg_score=0.0,
        yearly_view_count=0,
        created_at=now,
        updated_at=now,
    )
    result = await db.content.insert_one(doc)
    created = await db.content.find_one({"_id": result.inserted_id})
    return _to_item(created)


@router.patch("/{content_id}", response_model=ContentItem)
async def update_content(
    content_id: str,
    payload: ContentUpdate,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] not in _WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    db = get_database()
    oid = _oid(content_id)
    update = payload.model_dump(exclude_unset=True)
    if not update:
        raise HTTPException(status_code=422, detail="No fields to update")
    update["updated_at"] = datetime.utcnow()
    result = await db.content.update_one({"_id": oid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    updated = await db.content.find_one({"_id": oid})
    return _to_item(updated)


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    content_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] not in _WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    db = get_database()
    result = await db.content.delete_one({"_id": _oid(content_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
