"""Trending Filter feature tests.

Each scenario exercises the /home router through the SyncClient fixture,
driving the FastAPI ASGI app against an isolated in-memory mongomock-motor
database.  The critical isolation technique is monkeypatching
``app.routers.home.get_database`` so the router never touches the real
Motor/Atlas client that is initialised in ``app.db.database`` at import time.
That monkeypatch lives in tests/conftest.py (autouse) so it applies here
automatically -- no local duplicate is needed.

Business rules under test:
  * Quorum threshold:  works with review_count < 50 MUST NOT appear in top_rated.
  * Trending lock:     trending always uses ``recent_view_count`` (30-day),
                       regardless of the ``period`` query parameter.
  * Period-aware sort: top_rated and ranked lists sort by:
                         month → recent_avg_score / recent_view_count
                         year  → yearly_avg_score  / yearly_view_count
                         all   → avg_score          / view_count
  * Category filter:  media_type query param restricts results to that type.
  * Quorum-empty log: a WARNING is emitted when top_rated aggregation yields 0.
"""

import io
import logging
from datetime import datetime, timedelta

import pytest
from pytest_bdd import given, scenario, then, when

# ==========================================
# SCENARIOS
# ==========================================


@scenario("../features/TrendingFilter.feature", "Audience Filtering in the Service Layer")
def test_audience_filtering_in_the_service_layer():
    pass


@scenario("../features/TrendingFilter.feature", 'Temporal calculation for the "Trending" ranking')
def test_temporal_calculation_for_the_trending_ranking():
    pass


@scenario("../features/TrendingFilter.feature", "Category segmentation in the Popularity ranking")
def test_category_segmentation_in_the_popularity_ranking():
    pass


@scenario("../features/TrendingFilter.feature", "Quorum failure due to insufficient volume")
def test_quorum_failure_due_to_insufficient_volume():
    pass


@scenario("../features/TrendingFilter.feature", "All-time period does not override the trending temporal lock")
def test_all_time_does_not_override_trending_lock():
    pass


@scenario("../features/TrendingFilter.feature", "Top Rated is locked to the 30-day window regardless of period")
def test_top_rated_locked_to_recent_score_for_year_period():
    pass


@scenario("../features/TrendingFilter.feature", "Top Rated ignores global score and always ranks by recent 30-day score")
def test_top_rated_locked_to_recent_score_for_all_time_period():
    pass


# ==========================================
# STEPS (GIVEN) -- Audience / Quorum
# ==========================================


@given('that in the database the work "Short Film" has average 5.0 based on 5 ratings')
def setup_short_film(run, db):
    run(
        db.content.insert_one(
            {
                "title": "Short Film",
                "type": "movie",
                "avg_score": 5.0,
                "recent_avg_score": 5.0,
                "yearly_avg_score": 5.0,
                "review_count": 5,
                "view_count": 1000,
                "recent_view_count": 100,
                "yearly_view_count": 500,
                "created_at": datetime.utcnow(),
            }
        )
    )


@given('the work "The Godfather" has average 4.9 based on 1,200 ratings')
def setup_godfather(run, db):
    run(
        db.content.insert_one(
            {
                "title": "The Godfather",
                "type": "movie",
                "avg_score": 4.9,
                "recent_avg_score": 4.9,
                "yearly_avg_score": 4.9,
                "review_count": 1200,
                "view_count": 500000,
                "recent_view_count": 8000,
                "yearly_view_count": 60000,
                "created_at": datetime.utcnow(),
            }
        )
    )


@given("the service rule requires a minimum quorum of 50 ratings for the ranking")
def step_quorum_rule():
    """Semantic BDD step -- the quorum constant lives in the router (review_count >= 50)."""


# ==========================================
# STEPS (GIVEN) -- Temporal / Trending
# ==========================================


@given(
    'the work "Old Classic" has 100,000 total views, with only 10 recorded in the last 30 days'
)
def setup_old_classic(run, db):
    past_date = datetime.utcnow() - timedelta(days=365 * 5)
    run(
        db.content.insert_one(
            {
                "title": "Old Classic",
                "type": "movie",
                "view_count": 100_000,
                "recent_view_count": 10,
                "yearly_view_count": 500,
                "avg_score": 7.2,
                "recent_avg_score": 7.2,
                "yearly_avg_score": 7.2,
                "review_count": 200,
                "created_at": past_date,
            }
        )
    )


@given(
    'the work "Recent Release" has 500 total views, with 450 recorded in the last 30 days'
)
def setup_recent_release(run, db):
    run(
        db.content.insert_one(
            {
                "title": "Recent Release",
                "type": "movie",
                "view_count": 500,
                "recent_view_count": 450,
                "yearly_view_count": 450,
                "avg_score": 8.1,
                "recent_avg_score": 8.1,
                "yearly_avg_score": 8.1,
                "review_count": 60,
                "created_at": datetime.utcnow(),
            }
        )
    )


# ==========================================
# STEPS (GIVEN) -- Category segmentation
# ==========================================


@given('the work "Global Blockbuster" is a "movie" with high traction')
def setup_global_blockbuster(run, db):
    run(
        db.content.insert_one(
            {
                "title": "Global Blockbuster",
                "type": "movie",
                "view_count": 50_000,
                "recent_view_count": 5000,
                "yearly_view_count": 30000,
                "avg_score": 8.5,
                "recent_avg_score": 8.5,
                "yearly_avg_score": 8.5,
                "review_count": 300,
                "created_at": datetime.utcnow(),
            }
        )
    )


@given('the work "National Series" is a "series" with high traction')
def setup_national_series(run, db):
    run(
        db.content.insert_one(
            {
                "title": "National Series",
                "type": "series",
                "view_count": 45_000,
                "recent_view_count": 4500,
                "yearly_view_count": 28000,
                "avg_score": 8.2,
                "recent_avg_score": 8.2,
                "yearly_avg_score": 8.2,
                "review_count": 280,
                "created_at": datetime.utcnow(),
            }
        )
    )


# ==========================================
# STEPS (GIVEN) -- Quorum failure (empty DB)
# ==========================================


@given("the database only contains works with fewer than 50 ratings each")
def setup_low_quorum_db(run, db):
    run(db.content.delete_many({}))
    run(
        db.content.insert_many(
            [
                {
                    "title": "Obscure Indie A",
                    "type": "movie",
                    "avg_score": 5.0,
                    "recent_avg_score": 5.0,
                    "yearly_avg_score": 5.0,
                    "review_count": 10,
                    "view_count": 200,
                    "recent_view_count": 50,
                    "yearly_view_count": 120,
                    "created_at": datetime.utcnow(),
                },
                {
                    "title": "Obscure Indie B",
                    "type": "series",
                    "avg_score": 4.5,
                    "recent_avg_score": 4.5,
                    "yearly_avg_score": 4.5,
                    "review_count": 30,
                    "view_count": 500,
                    "recent_view_count": 100,
                    "yearly_view_count": 300,
                    "created_at": datetime.utcnow(),
                },
            ]
        )
    )


# ==========================================
# STEPS (GIVEN) -- Trending lock (period=all)
# ==========================================


@given(
    'the work "1990 Box Office Hit" has 1,000,000 total ratings and 0 ratings in the last 30 days'
)
def setup_1990_hit(run, db):
    past = datetime.utcnow() - timedelta(days=365 * 10)
    run(
        db.content.insert_one(
            {
                "title": "1990 Box Office Hit",
                "type": "movie",
                "view_count": 1_000_000,
                "recent_view_count": 0,
                "yearly_view_count": 200,
                "avg_score": 7.0,
                "recent_avg_score": 7.0,
                "yearly_avg_score": 7.0,
                "review_count": 1_000_000,
                "created_at": past,
            }
        )
    )


@given('the work "Viral Indie" has 1,000 ratings, all recorded in the last 24 hours')
def setup_viral_indie(run, db):
    run(
        db.content.insert_one(
            {
                "title": "Viral Indie",
                "type": "movie",
                "view_count": 1_000,
                "recent_view_count": 1_000,
                "yearly_view_count": 1_000,
                "avg_score": 9.0,
                "recent_avg_score": 9.0,
                "yearly_avg_score": 9.0,
                "review_count": 80,
                "created_at": datetime.utcnow(),
            }
        )
    )


# ==========================================
# STEPS (GIVEN) -- Period-aware Top Rated (year vs month)
# ==========================================


@given(
    'the work "Evergreen Classic" has yearly_avg_score 9.2, recent_avg_score 6.0, and 100 ratings'
)
def setup_evergreen_classic(run, db):
    run(
        db.content.insert_one(
            {
                "title": "Evergreen Classic",
                "type": "movie",
                "avg_score": 8.0,
                "recent_avg_score": 6.0,
                "yearly_avg_score": 9.2,
                "review_count": 100,
                "view_count": 50_000,
                "recent_view_count": 500,
                "yearly_view_count": 8000,
                "created_at": datetime.utcnow() - timedelta(days=400),
            }
        )
    )


@given(
    'the work "Month Darling" has yearly_avg_score 7.0, recent_avg_score 9.5, and 100 ratings'
)
def setup_month_darling(run, db):
    run(
        db.content.insert_one(
            {
                "title": "Month Darling",
                "type": "movie",
                "avg_score": 8.0,
                "recent_avg_score": 9.5,
                "yearly_avg_score": 7.0,
                "review_count": 100,
                "view_count": 10_000,
                "recent_view_count": 2000,
                "yearly_view_count": 5000,
                "created_at": datetime.utcnow(),
            }
        )
    )


# ==========================================
# STEPS (GIVEN) -- Period-aware Top Rated (all-time)
# ==========================================


@given(
    'the work "All Time Legend" has avg_score 9.8, yearly_avg_score 6.0, and 100 ratings'
)
def setup_all_time_legend(run, db):
    run(
        db.content.insert_one(
            {
                "title": "All Time Legend",
                "type": "movie",
                "avg_score": 9.8,
                "recent_avg_score": 6.0,
                "yearly_avg_score": 6.0,
                "review_count": 100,
                "view_count": 500_000,
                "recent_view_count": 100,
                "yearly_view_count": 2000,
                "created_at": datetime.utcnow() - timedelta(days=730),
            }
        )
    )


@given(
    'the work "Recent Sensation" has avg_score 7.0, yearly_avg_score 9.5, and 100 ratings'
)
def setup_recent_sensation(run, db):
    run(
        db.content.insert_one(
            {
                "title": "Recent Sensation",
                "type": "movie",
                "avg_score": 7.0,
                "recent_avg_score": 9.5,
                "yearly_avg_score": 9.5,
                "review_count": 100,
                "view_count": 5_000,
                "recent_view_count": 3000,
                "yearly_view_count": 4000,
                "created_at": datetime.utcnow(),
            }
        )
    )


# ==========================================
# STEPS (WHEN)
# ==========================================


@when('the service receives a request to generate the "Top Rated" list')
def request_top_rated(client, context):
    buf = io.StringIO()
    handler = logging.StreamHandler(buf)
    handler.setLevel(logging.DEBUG)
    home_logger = logging.getLogger("app.routers.home")
    prev_level = home_logger.level
    home_logger.setLevel(logging.DEBUG)
    home_logger.addHandler(handler)
    try:
        context["response"] = client.get("/home")
    finally:
        home_logger.removeHandler(handler)
        home_logger.setLevel(prev_level)
    context["log_text"] = buf.getvalue()


@when('the service receives a request to process the "Trending" ranking with period set to "month"')
def request_trending_month(client, context):
    context["response"] = client.get("/home?period=month")


@when('the service receives a ranking request with filter set to "series"')
def request_series_filter(client, context):
    context["response"] = client.get("/home?media_type=series")


@when('the service processes the "Trending" ranking with period set to "all"')
def request_trending_period_all(client, context):
    context["response"] = client.get("/home?period=all")


@when('the service receives a request with period set to "year"')
def request_period_year(client, context):
    context["response"] = client.get("/home?period=year")


@when('the service receives a request with period set to "all"')
def request_period_all(client, context):
    context["response"] = client.get("/home?period=all")


# ==========================================
# STEPS (THEN) -- Quorum filtering
# ==========================================


@then("the service processes the aggregation of ratings validating the quorum")
def validate_quorum_processing(context):
    assert context["response"].status_code == 200


@then('returns a dataset that includes the work "The Godfather"')
def check_godfather_included(context):
    data = context["response"].json()
    titles = [item["title"] for item in data.get("top_rated", [])]
    assert "The Godfather" in titles, f"Expected 'The Godfather' in top_rated, got: {titles}"


@then('completely omits the work "Short Film" from the generated response.')
def check_short_film_omitted(context):
    data = context["response"].json()
    top_rated_titles = [item["title"] for item in data.get("top_rated", [])]
    assert "Short Film" not in top_rated_titles, (
        f"'Short Film' (review_count=5 < 50 quorum) must be absent from top_rated, "
        f"found in: {top_rated_titles}"
    )


# ==========================================
# STEPS (THEN) -- Temporal ranking
# ==========================================


@then("the service performs the query filtering interactions only by the recent 30-day period")
def validate_temporal_filtering(context):
    assert context["response"].status_code == 200


@then('returns the result list ranking "Recent Release" higher than "Old Classic".')
def validate_temporal_ranking(context):
    data = context["response"].json()
    trending = data.get("trending", [])
    titles = [item["title"] for item in trending]

    assert "Recent Release" in titles, (
        f"Expected 'Recent Release' in trending (period=month, recent_view_count=450), "
        f"got: {titles}"
    )

    if "Old Classic" in titles:
        assert titles.index("Recent Release") < titles.index("Old Classic"), (
            "Recent Release (recent_view_count=450) must rank above "
            "Old Classic (recent_view_count=10) when sorted by recent activity"
        )


# ==========================================
# STEPS (THEN) -- Category segmentation
# ==========================================


@then("the service applies the category filter")
def validate_category_filter(context):
    assert context["response"].status_code == 200


@then('returns the dataset with the work "National Series"')
def validate_national_series(context):
    data = context["response"].json()
    all_titles = (
        [item["title"] for item in data.get("trending", [])]
        + [item["title"] for item in data.get("top_rated", [])]
    )
    assert "National Series" in all_titles, (
        f"Expected 'National Series' (type=series) in response for media_type=series, "
        f"got: {all_titles}"
    )


@then('omits the work "Global Blockbuster" from the generated response.')
def validate_blockbuster_omitted(context):
    data = context["response"].json()
    all_titles = (
        [item["title"] for item in data.get("trending", [])]
        + [item["title"] for item in data.get("top_rated", [])]
    )
    assert "Global Blockbuster" not in all_titles, (
        f"'Global Blockbuster' (type=movie) must be absent when media_type=series, "
        f"found in: {all_titles}"
    )


# ==========================================
# STEPS (THEN) -- Quorum failure / empty result
# ==========================================


@then(
    "the service processes the validation and identifies that no work reached the threshold"
)
def validate_threshold_failure(context):
    assert context["response"].status_code == 200


@then("returns an empty dataset instead of listing works with low quorum")
def validate_empty_quorum_dataset(context):
    data = context["response"].json()
    top_rated = data.get("top_rated", [])
    assert len(top_rated) == 0, (
        f"Expected empty top_rated when all works are below quorum (review_count < 50), "
        f"got: {top_rated}"
    )


@then(
    'the system writes a "WARN: top_rated aggregation returned 0 items. '
    'Quorum threshold not met for current period." record for monitoring.'
)
def validate_quorum_warn_log(context):
    log_text = context.get("log_text", "")
    assert "WARN: top_rated aggregation returned 0 items." in log_text, (
        f"Expected quorum-warning log line from app.routers.home, "
        f"captured log contained:\n{log_text}"
    )


# ==========================================
# STEPS (THEN) -- Trending lock (period=all)
# ==========================================


@then("the trending list is still ranked by recent 30-day view activity")
def validate_trending_still_temporal(context):
    """Trending always uses recent_view_count -- period=all must not change that."""
    assert context["response"].status_code == 200


@then('the work "Viral Indie" should rank above "1990 Box Office Hit" in the trending list')
def check_viral_indie_above_1990_hit(context):
    data = context["response"].json()
    trending = data.get("trending", [])
    titles = [item["title"] for item in trending]

    assert "Viral Indie" in titles, (
        f"Expected 'Viral Indie' (recent_view_count=1000) in trending for period=all, "
        f"got: {titles}"
    )
    if "1990 Box Office Hit" in titles:
        assert titles.index("Viral Indie") < titles.index("1990 Box Office Hit"), (
            "Viral Indie (recent_view_count=1000) must rank above "
            "1990 Box Office Hit (recent_view_count=0) even when period=all"
        )


# ==========================================
# STEPS (THEN) -- Period-aware Top Rated
# ==========================================


@then('the top_rated list ranks "Month Darling" above "Evergreen Classic"')
def check_month_darling_above_evergreen(context):
    data = context["response"].json()
    titles = [item["title"] for item in data.get("top_rated", [])]

    assert "Month Darling" in titles, (
        f"Expected 'Month Darling' in top_rated, got: {titles}"
    )
    assert "Evergreen Classic" in titles, (
        f"Expected 'Evergreen Classic' in top_rated, got: {titles}"
    )
    assert titles.index("Month Darling") < titles.index("Evergreen Classic"), (
        "Month Darling (recent_avg_score=9.5) must rank above "
        "Evergreen Classic (recent_avg_score=6.0) — top_rated is locked to the 30-day window"
    )


@then('the top_rated list ranks "Recent Sensation" above "All Time Legend"')
def check_recent_sensation_above_all_time_legend(context):
    data = context["response"].json()
    titles = [item["title"] for item in data.get("top_rated", [])]

    assert "Recent Sensation" in titles, (
        f"Expected 'Recent Sensation' in top_rated, got: {titles}"
    )
    assert "All Time Legend" in titles, (
        f"Expected 'All Time Legend' in top_rated, got: {titles}"
    )
    assert titles.index("Recent Sensation") < titles.index("All Time Legend"), (
        "Recent Sensation (recent_avg_score=9.5) must rank above "
        "All Time Legend (recent_avg_score=6.0) — top_rated is locked to the 30-day window"
    )
