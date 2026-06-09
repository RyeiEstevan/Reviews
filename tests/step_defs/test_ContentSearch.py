"""pytest-bdd step definitions for features/ContentSearch.feature.

Backend/service tests: scenarios tagged @backend @service drive the real search
endpoint over an in-memory mongomock-motor database.

Frontend scenarios are left as stubs (tested via Cypress E2E).
"""

from datetime import datetime, UTC
from pytest_bdd import given, scenario, then, when, parsers


FEATURE = "ContentSearch.feature"


# --------------------------------------------------------------------------- #
# Scenario bindings - Backend scenarios
# --------------------------------------------------------------------------- #
@scenario(FEATURE, "backend returns media when title matches query")
def test_backend_returns_media_when_title_matches_query():
    """backend returns media when title matches query."""


@scenario(FEATURE, "backend returns empty results for non-existent term")
def test_backend_returns_empty_results_for_nonexistent_term():
    """backend returns empty results for non-existent term."""


# --------------------------------------------------------------------------- #
# Scenario bindings - Frontend scenarios (stub - tested via Cypress)
# --------------------------------------------------------------------------- #
@scenario(FEATURE, "search content by exact match")
def test_search_content_by_exact_match():
    """search content by exact match."""


@scenario(FEATURE, "search content with a spelling mistake")
def test_search_content_with_a_spelling_mistake():
    """search content with a spelling mistake."""


@scenario(FEATURE, "search content with a non-existent term")
def test_search_content_with_a_nonexistent_term():
    """search content with a non-existent term."""


@scenario(FEATURE, "search content by title")
def test_search_content_by_title():
    """search content by title."""


# --------------------------------------------------------------------------- #
# Backend scenario - Given steps
# --------------------------------------------------------------------------- #
@given(parsers.parse('the system has a movie titled "{title}" stored in the database'))
def given_movie_in_db(run, db, title):
    """Seed a movie in the database."""
    media_doc = {
        "title": title,
        "type": "movie",
        "year": 2019,
        "poster_url": "https://example.com/poster.jpg",
        "description": f"Description for {title}",
        "genre": ["action", "adventure"],
        "director": "Test Director",
        "platform": "Test Platform",
        "avg_score": 8.0,
        "review_count": 1000,
        "view_count": 50000,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    run(db.media.insert_one(media_doc))


@given(parsers.parse('the system has a series titled "{title}" stored in the database'))
def given_series_in_db(run, db, title):
    """Seed a series in the database."""
    media_doc = {
        "title": title,
        "type": "series",
        "year": 2012,
        "poster_url": "https://example.com/poster.jpg",
        "description": f"Description for {title}",
        "genre": ["action", "adventure"],
        "director": "Test Director",
        "platform": "Test Platform",
        "avg_score": 7.5,
        "review_count": 800,
        "view_count": 30000,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    run(db.media.insert_one(media_doc))


# --------------------------------------------------------------------------- #
# Backend scenario - When steps
# --------------------------------------------------------------------------- #
@when(parsers.parse('the system processes a search query for "{query}"'), target_fixture="context")
def when_search_query(client, context, query):
    """Execute search via the /search endpoint."""
    response = client.get(f"/search?q={query}")
    context["response"] = response
    return context


# --------------------------------------------------------------------------- #
# Backend scenario - Then steps
# --------------------------------------------------------------------------- #
@then(parsers.parse('the search returns {count:d} results'))
def then_search_returns_count(context, count):
    """Verify the number of search results."""
    response = context["response"]
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == count
    assert len(data["results"]) == count


@then(parsers.parse('the results include "{title}"'))
def then_results_include_title(context, title):
    """Verify a specific title is in the results."""
    response = context["response"]
    data = response.json()
    titles = [item["title"] for item in data["results"]]
    assert title in titles


# --------------------------------------------------------------------------- #
# Frontend scenario - Given steps (stubs)
# --------------------------------------------------------------------------- #
@given("the system has some content stored")
def given_some_content_stored():
    """the system has some content stored."""
    raise NotImplementedError("Frontend scenario - tested via Cypress")


# --------------------------------------------------------------------------- #
# Frontend scenario - When steps (stubs)
# --------------------------------------------------------------------------- #
@when('I search for the term "Avengers: Endgame"')
def when_search_avengers_endgame():
    """I search for the term "Avengers: Endgame"."""
    raise NotImplementedError("Frontend scenario - tested via Cypress")


@when('I search for the term "Avengrs"')
def when_search_avengrs():
    """I search for the term "Avengrs"."""
    raise NotImplementedError("Frontend scenario - tested via Cypress")


@when('I search for the term "Titanic"')
def when_search_titanic():
    """I search for the term "Titanic"."""
    raise NotImplementedError("Frontend scenario - tested via Cypress")


@when('I search for the term "UnknownTitle123"')
def when_search_unknown():
    """I search for the term "UnknownTitle123"."""
    raise NotImplementedError("Frontend scenario - tested via Cypress")


# --------------------------------------------------------------------------- #
# Frontend scenario - Then steps (stubs)
# --------------------------------------------------------------------------- #
@then('I can see a "No results found" screen')
def then_no_results_screen():
    """I can see a "No results found" screen."""
    raise NotImplementedError("Frontend scenario - tested via Cypress")


@then("I can see the list of works that exactly match the searched term")
def then_exact_match_list():
    """I can see the list of works that exactly match the searched term."""
    raise NotImplementedError("Frontend scenario - tested via Cypress")


@then("I can see works that match the searched term")
def then_matching_works():
    """I can see works that match the searched term."""
    raise NotImplementedError("Frontend scenario - tested via Cypress")


@then('I can still see the searched term "Avengrs" in the search bar')
def then_term_in_search_bar():
    """I can still see the searched term "Avengrs" in the search bar."""
    raise NotImplementedError("Frontend scenario - tested via Cypress")


@then("no works are returned for the searched term")
def then_no_works_returned():
    """no works are returned for the searched term."""
    raise NotImplementedError("Frontend scenario - tested via Cypress")


@then("the returned results contain works with the term in the title, synopsis or description")
def then_results_in_title_synopsis_description():
    """the returned results contain works with the term in the title, synopsis or description."""
    raise NotImplementedError("Frontend scenario - tested via Cypress")
