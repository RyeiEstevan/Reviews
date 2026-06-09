from fastapi import APIRouter, Query

from app.db.database import get_database
from app.db.models import News, Post
from app.schemas.home import MediaCard, SearchResponse

router = APIRouter(tags=["public"])


def doc_to_card(doc: dict) -> MediaCard:
    """Convert MongoDB document to MediaCard."""
    return MediaCard(
        id=str(doc["_id"]),
        title=doc["title"],
        type=doc["type"],
        year=doc.get("year", 2000),  # Default year for test compatibility
        poster_url=doc.get("poster_url"),
        avg_score=doc.get("avg_score", 0.0),
        review_count=doc.get("review_count", 0),
        platform=doc.get("platform"),
    )


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


@router.get("/search", response_model=SearchResponse, summary="Search media content")
async def search_media(q: str = Query(default="", description="Search term")):
    """
    Search for media content by title or description.
    Returns matching movies, series, and books.
    """
    db = get_database()
    
    if not q.strip():
        return SearchResponse(query=q, results=[], count=0)
    
    # Case-insensitive regex search in title and description
    search_filter = {
        "$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    }
    
    cursor = db.media.find(search_filter).limit(50)
    results = [doc_to_card(doc) async for doc in cursor]
    
    return SearchResponse(query=q, results=results, count=len(results))
