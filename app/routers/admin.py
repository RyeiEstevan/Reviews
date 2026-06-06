from fastapi import APIRouter, Depends, Query

from app.core.security import require_admin
from app.db.models import AuditLog, CatalogContributor, News, User
from app.schemas.admin import (
    BanRequest,
    ContributorCreate,
    NewsCreate,
    UserCreate,
    UserUpdate,
)
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _user_out(user: User) -> dict:
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "ban_reason": user.ban_reason,
    }


def _contributor_out(c: CatalogContributor) -> dict:
    return {"id": str(c.id), "name": c.name, "role": c.role}


def _news_out(n: News) -> dict:
    return {"id": str(n.id), "title": n.title, "body": n.body, "tags": n.tags}


def _audit_out(a: AuditLog) -> dict:
    return {
        "id": str(a.id),
        "actor": a.actor,
        "action": a.action,
        "target_type": a.target_type,
        "target": a.target,
        "metadata": a.metadata,
    }


# ---- users --------------------------------------------------------------
@router.get("/users")
async def list_users(actor: dict = Depends(require_admin)):
    users = await AdminService.list_users()
    return {"data": [_user_out(u) for u in users]}


@router.post("/users", status_code=201)
async def create_user(body: UserCreate, actor: dict = Depends(require_admin)):
    user = await AdminService.create_user(actor, body)
    return {"data": _user_out(user)}


@router.put("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdate, actor: dict = Depends(require_admin)):
    user = await AdminService.update_user(actor, user_id, body)
    return {"data": _user_out(user)}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, actor: dict = Depends(require_admin)):
    await AdminService.delete_user(actor, user_id)
    return {"data": {"deleted": True}}


@router.post("/users/{user_id}/ban")
async def ban_user(user_id: str, body: BanRequest, actor: dict = Depends(require_admin)):
    user = await AdminService.ban_user(actor, user_id, body.reason)
    return {"data": _user_out(user)}


@router.post("/users/{user_id}/unban")
async def unban_user(user_id: str, actor: dict = Depends(require_admin)):
    user = await AdminService.unban_user(actor, user_id)
    return {"data": _user_out(user)}


# ---- catalog contributors ----------------------------------------------
@router.post("/artists", status_code=201)
async def create_contributor(body: ContributorCreate, actor: dict = Depends(require_admin)):
    contributor = await AdminService.create_contributor(actor, body)
    return {"data": _contributor_out(contributor)}


@router.get("/artists")
async def search_contributors(q: str = Query(default=""), actor: dict = Depends(require_admin)):
    results = await AdminService.search_contributors(q)
    return {"data": [_contributor_out(c) for c in results]}


# ---- news ---------------------------------------------------------------
@router.post("/news", status_code=201)
async def create_news(body: NewsCreate, actor: dict = Depends(require_admin)):
    news = await AdminService.create_news(actor, body)
    return {"data": _news_out(news)}


# ---- audit --------------------------------------------------------------
@router.get("/audit-log")
async def query_audit(
    actor_filter: str = Query(default="", alias="actor"),
    action: str = Query(default=""),
    actor: dict = Depends(require_admin),
):
    entries = await AdminService.query_audit(actor_filter or None, action or None)
    return {"data": [_audit_out(a) for a in entries]}
