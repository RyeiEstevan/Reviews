"""Trending Filter feature tests.

Each scenario exercises the /home router through the SyncClient fixture,
driving the FastAPI ASGI app against an isolated in-memory mongomock-motor
database.  The critical isolation technique is monkeypatching
``app.routers.home.get_database`` so the router never touches the real
Motor/Atlas client that is initialised in ``app.db.database`` at import time.
That monkeypatch lives in tests/conftest.py (autouse) so it applies here
automatically -- no local duplicate is needed.

Business rules under test:
  * Quorum threshold: works with review_count < 50 MUST NOT appear in top_rated.
  * Temporal filter:  trending uses ``recent_view_count`` (not total view_count)
                      when period != "all".
  * Category filter:  media_type query param restricts results to that type.
  * Quorum-empty log: a WARNING is emitted when top_rated aggregation yields 0.
  * Period=all error: an ERROR is logged when the temporal filter is bypassed.
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


@scenario("../features/TrendingFilter.feature", "Relevance failure due to expired time window")
def test_relevance_failure_due_to_expired_time_window():
    pass




# ==========================================
# STEPS (GIVEN) -- Audience / Quorum
# ==========================================


@given('that in the database the work "Short Film" has average 5.0 based on 5 ratings')
def setup_short_film(run, db):
    run(
        db.media.insert_one(
            {
                "title": "Short Film",
                "type": "movie",
                "avg_score": 5.0,
                "review_count": 5,         # below quorum
                "view_count": 1000,
                "recent_view_count": 100,
                "created_at": datetime.utcnow(),
            }
        )
    )


@given('the work "The Godfather" has average 4.9 based on 1,200 ratings')
def setup_godfather(run, db):
    run(
        db.media.insert_one(
            {
                "title": "The Godfather",
                "type": "movie",
                "avg_score": 4.9,
                "review_count": 1200,      # comfortably above quorum
                "view_count": 500000,
                "recent_view_count": 8000,
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
        db.media.insert_one(
            {
                "title": "Old Classic",
                "type": "movie",
                "view_count": 100_000,
                "recent_view_count": 10,   # very low in the recent window
                "avg_score": 7.2,
                "review_count": 200,
                "created_at": past_date,   # years ago -- outside 30-day window
            }
        )
    )


@given(
    'the work "Recent Release" has 500 total views, with 450 recorded in the last 30 days'
)
def setup_recent_release(run, db):
    run(
        db.media.insert_one(
            {
                "title": "Recent Release",
                "type": "movie",
                "view_count": 500,
                "recent_view_count": 450,  # dominant in the recent window
                "avg_score": 8.1,
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
        db.media.insert_one(
            {
                "title": "Global Blockbuster",
                "type": "movie",
                "view_count": 50_000,
                "recent_view_count": 5000,
                "avg_score": 8.5,
                "review_count": 300,
                "created_at": datetime.utcnow(),
            }
        )
    )


@given('the work "National Series" is a "series" with high traction')
def setup_national_series(run, db):
    run(
        db.media.insert_one(
            {
                "title": "National Series",
                "type": "series",
                "view_count": 45_000,
                "recent_view_count": 4500,
                "avg_score": 8.2,
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
    run(db.media.delete_many({}))
    run(
        db.media.insert_many(
            [
                {
                    "title": "Obscure Indie A",
                    "type": "movie",
                    "avg_score": 5.0,
                    "review_count": 10,    # below quorum
                    "view_count": 200,
                    "recent_view_count": 50,
                    "created_at": datetime.utcnow(),
                },
                {
                    "title": "Obscure Indie B",
                    "type": "series",
                    "avg_score": 4.5,
                    "review_count": 30,    # still below quorum
                    "view_count": 500,
                    "recent_view_count": 100,
                    "created_at": datetime.utcnow(),
                },
            ]
        )
    )


# ==========================================
# STEPS (GIVEN) -- Temporal bypass (period=all)
# ==========================================


@given(
    'the work "1990 Box Office Hit" has 1,000,000 total ratings and 0 ratings in the last 30 days'
)
def setup_1990_hit(run, db):
    past = datetime.utcnow() - timedelta(days=365 * 10)
    run(
        db.media.insert_one(
            {
                "title": "1990 Box Office Hit",
                "type": "movie",
                "view_count": 1_000_000,
                "recent_view_count": 0,    # no recent activity
                "avg_score": 7.0,
                "review_count": 1_000_000,
                "created_at": past,
            }
        )
    )


@given('the work "Viral Indie" has 1,000 ratings, all recorded in the last 24 hours')
def setup_viral_indie(run, db):
    run(
        db.media.insert_one(
            {
                "title": "Viral Indie",
                "type": "movie",
                "view_count": 1_000,
                "recent_view_count": 1_000,  # all recent
                "avg_score": 9.0,
                "review_count": 80,
                "created_at": datetime.utcnow(),
            }
        )
    )


# ==========================================
# STEPS (WHEN)
# ==========================================


@when('the service receives a request to generate the "Top Rated" list')
def request_top_rated(client, context):
    # caplog.at_level() doesn't install its handler in pytest-bdd 7.x + pytest 8.x
    # (each step gets its own fixture scope). Use a plain StreamHandler directly.
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


@when('the service processes the "Trending" ranking incorrectly ignoring the date filter')
def request_ignore_date_filter(client, context):
    # Same direct-handler pattern as request_top_rated — caplog doesn't work here.
    buf = io.StringIO()
    handler = logging.StreamHandler(buf)
    handler.setLevel(logging.DEBUG)
    home_logger = logging.getLogger("app.routers.home")
    prev_level = home_logger.level
    home_logger.setLevel(logging.DEBUG)
    home_logger.addHandler(handler)
    try:
        context["response"] = client.get("/home?period=all")
    finally:
        home_logger.removeHandler(handler)
        home_logger.setLevel(prev_level)
    context["log_text"] = buf.getvalue()


# ==========================================
# STEPS (THEN) -- Quorum filtering
# ==========================================


@then("the service processes the aggregation of ratings validating the quorum")
def validate_quorum_processing(context):
    """The router enforces review_count >= 50 -- a 200 response confirms it ran."""
    assert context["response"].status_code == 200


@then('returns a dataset that includes the work "The Godfather"')
def check_godfather_included(context):
    data = context["response"].json()
    titles = [item["title"] for item in data.get("top_rated", [])]
    assert "The Godfather" in titles, f"Expected 'The Godfather' in top_rated, got: {titles}"


@then('completely omits the work "Short Film" from the generated response.')
def check_short_film_omitted(context):
    data = context["response"].json()
    # The quorum filter (review_count >= 50) applies to the top_rated list only;
    # trending ranks by recent activity and has no quorum gate.
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
    """Confirmed implicitly by the ranking-order check that follows."""
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

    # "Old Classic" has recent_view_count=10 vs Recent Release's 450, so it
    # must rank lower when the router sorts by recent_view_count.
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
    """The router emits logger.warning(...) when top_rated is empty.

    Log text was captured in context["log_text"] by the WHEN step, because
    pytest-bdd 7.x gives each step its own caplog scope.
    """
    log_text = context.get("log_text", "")
    assert "WARN: top_rated aggregation returned 0 items." in log_text, (
        f"Expected quorum-warning log line from app.routers.home, "
        f"captured log contained:\n{log_text}"
    )


# ==========================================
# STEPS (THEN) -- Temporal bypass / ERROR log
# ==========================================


@then(
    "the system should identify the inconsistency between total volume and time-based volume"
)
def validate_relevance_inconsistency(context):
    assert context["response"].status_code == 200


@then('the work "1990 Box Office Hit" should not appear at the top of the "Trending" ranking')
def check_1990_hit_not_top(context):
    data = context["response"].json()
    trending = data.get("trending", [])
    if trending:
        assert trending[0]["title"] != "1990 Box Office Hit", (
            "The '1990 Box Office Hit' must not lead trending even in period=all; "
            "Viral Indie has higher recent_view_count and should dominate"
        )


@then(
    'an "ERROR: trending aggregation bypassed temporal date_filter." '
    "alert should be recorded in the logs."
)
def check_error_log(context):
    """The router emits logger.error(...) when period='all' is requested.

    Log text was captured in context["log_text"] by the WHEN step.
    """
    log_text = context.get("log_text", "")
    assert "ERROR: trending aggregation bypassed temporal date_filter." in log_text, (
        f"Expected bypass-error log line from app.routers.home, "
        f"captured log contained:\n{log_text}"
    )
