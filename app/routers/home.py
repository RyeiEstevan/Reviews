import logging
from fastapi import APIRouter, Query
from typing import Literal
from datetime import datetime, timedelta

from app.db.database import get_database
from app.schemas.home import HomeResponse, MediaCard, RankingBlock, RankingItem

router = APIRouter()
logger = logging.getLogger(__name__)


def doc_to_card(doc: dict) -> MediaCard:
    return MediaCard(
        id=str(doc.get("_id", "")),
        title=doc.get("title", ""),
        type=doc.get("type", "movie"),
        year=doc.get("year", 2000), 
        poster_url=doc.get("poster_url"),
        avg_score=doc.get("avg_score", 0.0),
        review_count=doc.get("review_count", 0),
        platform=doc.get("platform"),
    )


def format_view_count(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.0f}K"
    return str(n)


@router.get("/home", response_model=HomeResponse, summary="Homepage data")
async def get_home(
    period: Literal["month", "year", "all"] = Query("month"),
    media_type: Literal["all", "movie", "series", "book"] = Query("all"),
):
    """
    Returns all data required to render the homepage:
    - Trending carousel
    - Top Rated carousel
    - Rankings (Most Viewed, Top Rated, New Arrivals)
    """
    db = get_database()

    # --- period filter ---
    now = datetime.utcnow()
    date_filter: dict = {}
    if period == "month":
        date_filter = {"created_at": {"$gte": now - timedelta(days=30)}}
    elif period == "year":
        date_filter = {"created_at": {"$gte": now - timedelta(days=365)}}

    # --- type filter ---
    type_filter: dict = {}
    if media_type != "all":
        type_filter = {"type": media_type}

    combined_filter = {**date_filter, **type_filter}

    # --- Trending (most viewed in the period) ---
    trending_cursor = db.media.find(combined_filter).sort("view_count", -1).limit(10)
    trending = [doc_to_card(doc) async for doc in trending_cursor]

    # --- Top Rated (best scores in the period, minimum 50 reviews) ---
    top_rated_filter = {**combined_filter, "review_count": {"$gte": 50}}
    top_rated_cursor = db.media.find(top_rated_filter).sort("avg_score", -1).limit(10)
    top_rated = [doc_to_card(doc) async for doc in top_rated_cursor]

    # ─── Ranking: Most Viewed ───
    viewed_cursor = db.media.find(combined_filter).sort("view_count", -1).limit(5)
    viewed_items = []
    pos = 1
    async for doc in viewed_cursor:
        card = doc_to_card(doc)
        viewed_items.append(RankingItem(
            position=pos,
            media=card,
            value=format_view_count(doc.get("view_count", 0)),
        ))
        pos += 1

    # ─── Ranking: Top Rated ───
    rated_cursor = db.media.find(top_rated_filter).sort("avg_score", -1).limit(5)
    rated_items = []
    pos = 1
    async for doc in rated_cursor:
        card = doc_to_card(doc)
        rated_items.append(RankingItem(
            position=pos,
            media=card,
            value=f"{doc.get('avg_score', 0):.1f}",
        ))
        pos += 1

    # --- Ranking: New Arrivals (last 14 days) ---
    new_filter = {
        **type_filter,
        "created_at": {"$gte": now - timedelta(days=14)},
    }
    new_cursor = db.media.find(new_filter).sort("created_at", -1).limit(5)
    new_items = []
    pos = 1
    async for doc in new_cursor:
        card = doc_to_card(doc)
        new_items.append(RankingItem(
            position=pos,
            media=card,
            value="New",
        ))
        pos += 1

    period_label = {"month": "This Month", "year": "This Year", "all": "All Time"}[period]

    rankings = [
        RankingBlock(title="Most Viewed",  badge=period_label,  items=viewed_items),
        RankingBlock(title="Top Rated",    badge=period_label,  items=rated_items),
        RankingBlock(title="New Arrivals", badge="This Week",    items=new_items),
    ]

    return HomeResponse(
        trending=trending,
        top_rated=top_rated,
        rankings=rankings,
    )
