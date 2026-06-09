from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user, get_optional_user
from app.db.models import Comment, Post
from app.schemas.forum import CommentCreate, PostCreate
from app.services.forum_service import ForumService

router = APIRouter(prefix="/forum", tags=["forum"])


def _post_out(p: Post) -> dict:
    return {
        "id": str(p.id),
        "owner": p.owner,
        "title": p.title,
        "content": p.content,
        "category": p.category,
        "created_at": p.created_at,
    }


def _comment_out(c: Comment, viewer: Optional[str] = None) -> dict:
    return {
        "id": str(c.id),
        "author": c.author,
        "content": c.content,
        "post_id": c.post_id,
        "upvotes": len(c.upvoters),
        "upvoted_by_me": viewer in c.upvoters if viewer else False,
        "created_at": c.created_at,
    }


# Posts
@router.get("/posts")
async def list_posts(category: str = Query(default="")):
    """Public forum feed. With ``?category=`` it filters to one category;
    an empty/unknown category simply returns the matching (possibly empty) set.
    """
    posts = await ForumService.list_posts(category or None)
    return {"data": [_post_out(p) for p in posts]}


@router.post("/posts", status_code=201)
async def create_post(body: PostCreate, actor: dict = Depends(get_current_user)):
    post = await ForumService.create_post(actor, body)
    return {"data": _post_out(post)}


@router.get("/posts/{post_id}")
async def get_post(post_id: str):
    post = await ForumService.get_post(post_id)
    return {"data": _post_out(post)}


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, actor: dict = Depends(get_current_user)):
    await ForumService.delete_post(actor, post_id)
    return {"data": {"deleted": True}}


# Comments
@router.get("/posts/{post_id}/comments")
async def list_comments(post_id: str, viewer: Optional[dict] = Depends(get_optional_user)):
    comments = await ForumService.list_comments(post_id)
    me = viewer["username"] if viewer else None
    return {"data": [_comment_out(c, viewer=me) for c in comments]}


@router.post("/posts/{post_id}/comments", status_code=201)
async def create_comment(
    post_id: str, body: CommentCreate, actor: dict = Depends(get_current_user)
):
    comment = await ForumService.create_comment(actor, post_id, body)
    return {"data": _comment_out(comment)}


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, actor: dict = Depends(get_current_user)):
    await ForumService.delete_comment(actor, comment_id)
    return {"data": {"deleted": True}}


@router.post("/comments/{comment_id}/upvote")
async def toggle_comment_upvote(comment_id: str, actor: dict = Depends(get_current_user)):
    """Toggle the current user's upvote on a comment (one vote per user)."""
    comment = await ForumService.toggle_comment_upvote(actor, comment_id)
    return {"data": _comment_out(comment, viewer=actor["username"])}
