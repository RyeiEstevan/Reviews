"""app/services/content_service.py
 
Business rules for the Content feature:
  - Role guard  : only moderador / admin / superadmin may create or delete.
  - Duplicate   : (title, release_year) must be unique (case-insensitive title).
  - Duration    : validated by Pydantic schema before reaching this layer.
  - Audit trail : every mutating operation writes an AuditLog entry.
  - View counter: increment_views bumps both view_count and recent_view_count.
"""
 
from __future__ import annotations
 
from fastapi import HTTPException, status
 
from app.db.models import AuditLog, Content
from app.schemas.content import ContentCreate, ContentResponse, ContentUpdate
from app.services.audit_service import AuditService
 
# Roles that are allowed to mutate catalog content.
_WRITE_ROLES = {"moderador", "admin", "superadmin"}
 
 
def _require_write_role(role: str) -> None:
    if role not in _WRITE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente. Apenas moderadores ou superiores podem executar esta ação.",
        )
 
 
async def _assert_no_duplicate(title: str, release_year: int, exclude_id=None) -> None:
    """Raise 400 if a Content with the same title+year already exists."""
    # Case-insensitive match via regex
    import re
 
    existing = await Content.find_one(
        {
            "title": {"$regex": f"^{re.escape(title)}$", "$options": "i"},
            "release_year": release_year,
        }
    )
    if existing and (exclude_id is None or str(existing.id) != str(exclude_id)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conteúdo duplicado: já existe um item com o título '{title}' e o ano {release_year}.",
        )
 
 
# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────
 
 
class ContentService:
 
    # ── Queries ───────────────────────────────────────────────────────────────
 
    @staticmethod
    async def list_all() -> list[ContentResponse]:
        docs = await Content.find_all().to_list()
        return [ContentResponse.from_document(d) for d in docs]
 
    @staticmethod
    async def get_by_id(content_id: str) -> ContentResponse:
        doc = await Content.get(content_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")
        return ContentResponse.from_document(doc)
 
    # ── Mutations ─────────────────────────────────────────────────────────────
 
    @staticmethod
    async def create(
        payload: ContentCreate,
        actor_username: str,
        actor_role: str,
    ) -> ContentResponse:
        _require_write_role(actor_role)
        await _assert_no_duplicate(payload.title, payload.release_year)
 
        doc = Content(
            title=payload.title,
            genre=payload.genre,
            release_year=payload.release_year,
            duration=payload.duration,
        )
        await doc.insert()
 
        await AuditService.record(
            actor=actor_username,
            action="create_content",
            target_type=str(doc.id),
            target=str(doc.id),
            metadata={"detail": f"Criou conteúdo '{doc.title}' ({doc.release_year})"},
        )
 
        return ContentResponse.from_document(doc)
 
    @staticmethod
    async def update(
        content_id: str,
        payload: ContentUpdate,
        actor_username: str,
        actor_role: str,
    ) -> ContentResponse:
        _require_write_role(actor_role)
 
        doc = await Content.get(content_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")
 
        update_data = payload.model_dump(exclude_none=True)
 
        # Check for duplicate only when title/year are being changed
        new_title = update_data.get("title", doc.title)
        new_year = update_data.get("release_year", doc.release_year)
        if "title" in update_data or "release_year" in update_data:
            await _assert_no_duplicate(new_title, new_year, exclude_id=content_id)
 
        for field, value in update_data.items():
            setattr(doc, field, value)
        await doc.save()
 
        await AuditService.record(
            await AuditService.record(
                actor=actor_username,
                action="update_content",
                target_type="content",
                target=str(doc.id),
                metadata={"detail": f"Atualizou conteúdo '{doc.title}' ({doc.release_year})"},
            )
        )
 
        return ContentResponse.from_document(doc)
 
    @staticmethod
    async def delete(
        content_id: str,
        actor_username: str,
        actor_role: str,
    ) -> dict:
        _require_write_role(actor_role)
 
        doc = await Content.get(content_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")
 
        title_snapshot = doc.title
        await doc.delete()
 
        await AuditService.record(
            actor=actor_username,
            action="delete_content",
            target_type="content",
            target=content_id,
            metadata={"detail": f"Removeu conteúdo '{title_snapshot}'"},
        )
 
        return {"message": f"Conteúdo '{title_snapshot}' removido com sucesso."}
 
    # ── View counter ──────────────────────────────────────────────────────────
 
    @staticmethod
    async def increment_views(content_id: str) -> ContentResponse:
        """
        Bumps both view_count and recent_view_count.
        This feeds the /home trending endpoint which sorts by recent_view_count.
        No auth required — any visitor may trigger this.
        """
        from beanie.operators import Inc
 
        doc = await Content.get(content_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Conteúdo não encontrado.")
 
        await doc.update(Inc({Content.view_count: 1, Content.recent_view_count: 1}))
        await doc.sync()
        return ContentResponse.from_document(doc)
 