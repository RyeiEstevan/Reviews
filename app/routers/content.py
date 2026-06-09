"""app/routers/content.py
 
Endpoints
---------
GET    /content               — list all content (public)
GET    /content/{id}          — get single item (public)
POST   /content               — create (moderador+)
PATCH  /content/{id}          — update (moderador+)
DELETE /content/{id}          — delete (moderador+)
POST   /content/{id}/view     — increment view counters (public)
 
JWT decoding re-uses the same pattern as the existing admin routers:
  `Depends(get_current_user)` returns a dict with at least {"username": ..., "role": ...}.
 
If you want the create/update/delete routes to also be accessible by unauthenticated
users (e.g. in tests without a token) you can swap the optional dependency.
"""
 
from __future__ import annotations
 
from fastapi import APIRouter, Depends, HTTPException, status
 
from app.core.security import get_current_user
from app.schemas.content import ContentCreate, ContentResponse, ContentUpdate
from app.services.content_service import ContentService
 
router = APIRouter(prefix="/content", tags=["content"])
 
 
# ──────────────────────────────────────────────────────────────────────────────
# Public read endpoints
# ──────────────────────────────────────────────────────────────────────────────
 
 
@router.get("", response_model=list[ContentResponse])
async def list_content():
    """Return all content items sorted by title."""
    return await ContentService.list_all()
 
 
@router.get("/{content_id}", response_model=ContentResponse)
async def get_content(content_id: str):
    return await ContentService.get_by_id(content_id)
 
 
# ──────────────────────────────────────────────────────────────────────────────
# View counter (public — anyone watching / reading can trigger it)
# ──────────────────────────────────────────────────────────────────────────────
 
 
@router.post("/{content_id}/view", response_model=ContentResponse)
async def record_view(content_id: str):
    """
    Increment view_count and recent_view_count.
    Called by the frontend "Já vi / Li" button.
    Both counters are consumed by the /home trending endpoint.
    """
    return await ContentService.increment_views(content_id)
 
 
# ──────────────────────────────────────────────────────────────────────────────
# Protected mutations (moderador / admin / superadmin)
# ──────────────────────────────────────────────────────────────────────────────
 
 
@router.post("", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
async def create_content(
    payload: ContentCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new catalog item.
    Raises 422 if duration format is invalid (Pydantic validation).
    Raises 400 if a content with the same title+year already exists.
    Raises 403 if the caller is not a moderador or higher.
    """
    return await ContentService.create(
        payload=payload,
        actor_username=current_user["username"],
        actor_role=current_user["role"],
    )
 
 
@router.patch("/{content_id}", response_model=ContentResponse)
async def update_content(
    content_id: str,
    payload: ContentUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await ContentService.update(
        content_id=content_id,
        payload=payload,
        actor_username=current_user["username"],
        actor_role=current_user["role"],
    )
 
 
@router.delete("/{content_id}")
async def delete_content(
    content_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a catalog item.
    Raises 403 if the caller is a 'usuario comum'.
    """
    return await ContentService.delete(
        content_id=content_id,
        actor_username=current_user["username"],
        actor_role=current_user["role"],
    )