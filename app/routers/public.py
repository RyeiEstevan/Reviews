from fastapi import APIRouter

from app.db.models import News, Post

router = APIRouter(tags=["public"])


@router.get("/posts")
async def public_posts():
    """Public posts feed: posts from banned/deleted users are excluded (hidden)."""
    posts = [p async for p in Post.find(Post.hidden == False)]  # noqa: E712
    return {"data": [{"id": str(p.id), "owner": p.owner, "title": p.title} for p in posts]}


@router.get("/news")
async def public_news():
    """Public news feed, visible to unauthenticated visitors, tags included."""
    items = [n async for n in News.find(News.published == True)]  # noqa: E712
    return {"data": [{"id": str(n.id), "title": n.title, "tags": n.tags} for n in items]}
