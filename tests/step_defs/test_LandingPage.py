"""Landing Page (Feed) feature tests.

Covers every scenario in features/LandingPage.feature against the real
/home and /search endpoints, over the isolated in-memory mongomock-motor
database provided by the autouse fixtures in tests/conftest.py (no MongoDB
Atlas, no live server).  The monkeypatch on get_database lives there too, so
the routers never touch the real Motor client.

Style follows the rgms convention: every scenario opens with a Given that
seeds concrete domain state, the When performs a single user-facing action,
and the Then asserts a deterministic system outcome.
"""

from datetime import datetime
from pytest_bdd import given, scenario, then, when, parsers


# Cards visible at once in the trending carousel
# (mirrors VISIBLE in frontend/app/home/HomePageClient.tsx).
VISIBLE = 5


def _content_doc(title: str, **overrides) -> dict:
    """Build a content document with sensible defaults for the home/search feeds.

    recent_* fields mirror their all-time counterparts by default so that the
    30-day-locked carousels and the global rankings agree unless a scenario
    deliberately overrides them.
    """
    doc = {
        "title": title,
        "type": "movie",
        "view_count": 1_000,
        "recent_view_count": 1_000,
        "yearly_view_count": 1_000,
        "avg_score": 8.0,
        "recent_avg_score": 8.0,
        "yearly_avg_score": 8.0,
        "review_count": 100,          # above the 50-review quorum
        "year": 2024,
        "description": f"Description for {title}",
        "created_at": datetime.utcnow(),
    }
    doc.update(overrides)
    return doc


# ==========================================
# SCENARIOS
# ==========================================


@scenario("../features/LandingPage.feature", "view trending works")
def test_view_trending_works():
    pass


@scenario("../features/LandingPage.feature", "view top-rated works")
def test_view_top_rated_works():
    pass


@scenario("../features/LandingPage.feature", "browse more trending works than the initial view")
def test_browse_more_trending_works_than_the_initial_view():
    pass


@scenario("../features/LandingPage.feature", "search for a work from the landing page")
def test_search_for_a_work_from_the_landing_page():
    pass


# ==========================================
# Scenario: view trending works
# ==========================================


@given('the system has the trending works "Dune: Part Two" and "Shōgun"')
def seed_trending_works(run, db):
    run(
        db.content.insert_many(
            [
                _content_doc("Dune: Part Two", type="movie", recent_view_count=1500, avg_score=8.9, recent_avg_score=8.9),
                _content_doc("Shōgun", type="series", recent_view_count=800, avg_score=9.4, recent_avg_score=9.4),
            ]
        )
    )


@when("I view the landing page")
def view_landing_page(client, context):
    context["response"] = client.get("/home")
    assert context["response"].status_code == 200


@then("the trending works are listed ordered by their recent 30-day view count")
def check_trending_order(context, run, db):
    trending = context["response"].json().get("trending", [])
    titles = [item["title"] for item in trending]

    assert "Dune: Part Two" in titles, f"Expected 'Dune: Part Two' in trending, got: {titles}"
    assert "Shōgun" in titles, f"Expected 'Shōgun' in trending, got: {titles}"

    # ContentCard does not expose recent_view_count, so validate the ordering
    # of the returned list against the underlying DB values.
    works = run(db.content.find({"title": {"$in": titles}}).to_list(length=100))
    views_by_title = {w["title"]: w["recent_view_count"] for w in works}
    ordered_views = [views_by_title[t] for t in titles]
    assert ordered_views == sorted(ordered_views, reverse=True), (
        f"trending is not ordered by recent_view_count desc: {list(zip(titles, ordered_views))}"
    )


# ==========================================
# Scenario: view top-rated works
# ==========================================


@given(parsers.parse('the system has the top-rated work "{title}" with average score "{score:f}"'))
def seed_top_rated_work(run, db, title, score):
    # Seed the headline work plus a lower-scored companion so the ordering
    # outcome is meaningful (a single-item list would sort trivially).
    run(
        db.content.insert_many(
            [
                _content_doc(title, type="series", avg_score=score, recent_avg_score=score),
                _content_doc("Dune: Part Two", type="movie", avg_score=8.9, recent_avg_score=8.9),
            ]
        )
    )


@then("the top-rated works are listed ordered by their average score")
def check_top_rated_order(context):
    top_rated = context["response"].json().get("top_rated", [])
    assert top_rated, "Expected a non-empty top_rated list"

    scores = [item["avg_score"] for item in top_rated]
    assert scores == sorted(scores, reverse=True), (
        f"top_rated is not ordered by avg_score desc: {scores}"
    )

    # The highest-scored work (Shōgun, 9.4) must head the list.
    assert top_rated[0]["title"] == "Shōgun", (
        f"Expected 'Shōgun' first in top_rated, got: {[i['title'] for i in top_rated]}"
    )
    assert top_rated[0]["avg_score"] == 9.4, (
        f"Expected avg_score=9.4 for the top work, got {top_rated[0]['avg_score']}"
    )


# ==========================================
# Scenario: browse more trending works than the initial view
# ==========================================


@given("the system has more trending works than fit in the initial view")
def seed_many_trending_works(run, db):
    # One more than VISIBLE so the carousel has works reachable beyond the
    # initial view; descending recent_view_count keeps the order deterministic.
    run(
        db.content.insert_many(
            [
                _content_doc(f"Trending Work {i}", recent_view_count=1000 - i * 10)
                for i in range(VISIBLE + 1)
            ]
        )
    )


@then("I can reach the trending works beyond the initial view")
def check_more_than_visible(context):
    trending = context["response"].json().get("trending", [])
    assert len(trending) > VISIBLE, (
        f"Expected more than {VISIBLE} trending works to browse, got: {len(trending)}"
    )


# ==========================================
# Scenario: search for a work from the landing page
# ==========================================


@given(parsers.parse('the system has a work titled "{title}"'))
def seed_searchable_work(run, db, title):
    run(db.content.insert_one(_content_doc(title, type="series")))


@when(parsers.parse('I search for "{query}" from the landing page'))
def search_from_landing_page(client, context, query):
    context["query"] = query
    context["response"] = client.get(f"/search?q={query}")
    assert context["response"].status_code == 200


@then(parsers.parse('the works matching "{query}" are listed'))
def check_search_results(context, query):
    results = context["response"].json().get("results", [])
    titles = [item["title"] for item in results]
    assert titles, f"Expected at least one result for '{query}', got none"
    assert any(query.lower() in t.lower() for t in titles), (
        f"Expected a result matching '{query}', got: {titles}"
    )
