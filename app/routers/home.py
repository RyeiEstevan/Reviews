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
        type=doc.get("type", ""),
        year=doc.get("year", 0),
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


# Rolling-window field names per period.
# Trending is intentionally excluded: it is always locked to the 30-day window
# (recent_view_count) regardless of the period parameter.
_VIEW_SORT = {
    "month": "recent_view_count",
    "year":  "yearly_view_count",
    "all":   "view_count",
}

_SCORE_SORT = {
    "month": "recent_avg_score",
    "year":  "yearly_avg_score",
    "all":   "avg_score",
}


@router.get("/home", response_model=HomeResponse, summary="Homepage data")
async def get_home(
    period: Literal["month", "year", "all"] = Query("month"),
    media_type: Literal["all", "movie", "series", "book"] = Query("all"),
):
    """
    Returns all data required to render the homepage:
    - Trending carousel     — always sorted by recent_view_count (30-day lock)
    - Top Rated carousel    — sorted by the period-appropriate score field
    - Rankings              — Most Viewed / Top Rated / New Arrivals
    """
    db = get_database()
    now = datetime.utcnow()

    type_filter: dict = {} if media_type == "all" else {"type": media_type}

    view_sort  = _VIEW_SORT[period]
    score_sort = _SCORE_SORT[period]

    # ── Trending ──────────────────────────────────────────────────────────────
    # Always locked to the 30-day rolling window regardless of `period`.
    trending_cursor = db.media.find(type_filter).sort("recent_view_count", -1).limit(10)
    trending = [doc_to_card(doc) async for doc in trending_cursor]

    # ── Top Rated ─────────────────────────────────────────────────────────────
    # Quorum guard: at least 50 reviews required to appear.
    # Like trending, this carousel is locked to the 30-day window (recent_avg_score)
    # regardless of the period parameter.
    top_rated_filter = {**type_filter, "review_count": {"$gte": 50}}
    top_rated_cursor = db.media.find(top_rated_filter).sort("recent_avg_score", -1).limit(10)
    top_rated = [doc_to_card(doc) async for doc in top_rated_cursor]

    if len(top_rated) == 0:
        logger.warning(
            "WARN: top_rated aggregation returned 0 items. Quorum threshold not met for current period."
        )

    # ── Ranking: Most Viewed ──────────────────────────────────────────────────
    viewed_cursor = db.media.find(type_filter).sort(view_sort, -1).limit(5)
    viewed_items = []
    pos = 1
    async for doc in viewed_cursor:
        val = doc.get(view_sort, doc.get("view_count", 0))
        viewed_items.append(RankingItem(
            position=pos,
            media=doc_to_card(doc),
            value=format_view_count(val),
        ))
        pos += 1

    # ── Ranking: Top Rated ────────────────────────────────────────────────────
    rated_cursor = db.media.find(top_rated_filter).sort(score_sort, -1).limit(5)
    rated_items = []
    pos = 1
    async for doc in rated_cursor:
        val = doc.get(score_sort, doc.get("avg_score", 0.0))
        rated_items.append(RankingItem(
            position=pos,
            media=doc_to_card(doc),
            value=f"{val:.1f}",
        ))
        pos += 1

    # ── Ranking: New Arrivals ─────────────────────────────────────────────────
    # created_at filter is appropriate here — "new" literally means recently added.
    new_filter = {**type_filter, "created_at": {"$gte": now - timedelta(days=14)}}
    new_cursor = db.media.find(new_filter).sort("created_at", -1).limit(5)
    new_items = []
    pos = 1
    async for doc in new_cursor:
        new_items.append(RankingItem(
            position=pos,
            media=doc_to_card(doc),
            value="New",
        ))
        pos += 1

    period_label = {"month": "This Month", "year": "This Year", "all": "All Time"}[period]

    rankings = [
        RankingBlock(title="Most Viewed",  badge=period_label, items=viewed_items),
        RankingBlock(title="Top Rated",    badge=period_label, items=rated_items),
        RankingBlock(title="New Arrivals", badge="This Week",  items=new_items),
    ]

    return HomeResponse(
        trending=trending,
        top_rated=top_rated,
        rankings=rankings,
    )
