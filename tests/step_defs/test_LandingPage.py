"""Landing Page (Feed) feature tests."""

from pytest_bdd import given, scenario, then, when
from datetime import datetime, timedelta
import pytest

# ==========================================
# SCENARIOS
# ==========================================

@scenario('../features/LandingPage.feature', 'Viewing trending works (Em Alta)')
def test_viewing_trending_works_em_alta():
    pass

@scenario('../features/LandingPage.feature', 'Viewing top-rated reviews (Mais bem avaliados)')
def test_viewing_toprated_reviews_mais_bem_avaliados():
    pass

@scenario('../features/LandingPage.feature', 'Searching for a work directly from the landing page')
def test_searching_for_a_work_directly_from_the_landing_page():
    """Searching for a work directly from the landing page."""
    pytest.skip("not now.")
# ==========================================
# STEPS
# ==========================================

@given("I am on the platform's landing page")
def i_am_on_landing_page(client, context, run, db):
    """Ensure there is data in the database and access the home page."""
    # Seed the temporary mongomock database with works
    now = datetime.utcnow()
    run(db.media.delete_many({}))
    run(db.media.insert_many([
        {"title": "Shōgun", "view_count": 8000, "recent_view_count": 10, "avg_score": 9.4, "review_count": 200, "created_at": now},
        {"title": "Dune: Part Two", "view_count": 15000, "recent_view_count": 50, "avg_score": 8.9, "review_count": 500, "created_at": now},
        {"title": "Fallout", "view_count": 12000, "recent_view_count": 30, "avg_score": 8.5, "review_count": 300, "created_at": now},
    ]))
    
    # Simulate the initial home load in the front-end
    context["response"] = client.get("/home")


@when('I look at the "Em Alta" section')
def look_at_trending(context):
    assert context["response"].status_code == 200
    data = context["response"].json()
    context["trending_list"] = data.get("trending", [])


@then('I should see a list of currently trending works, such as "Dune: Part Two" and "Shōgun"')
def see_trending_works(context):
    titles = [item["title"] for item in context["trending_list"]]
    assert "Dune: Part Two" in titles
    assert "Shōgun" in titles


@then('the works should be ordered strictly by their total view count')
def check_trending_order(context, run, db):
    titles = [item["title"] for item in context["trending_list"]]
    
    # Query the database to verify the order reflects descending view counts
    # Note: The API returns the cards already converted, so we check the original rule
    works = run(db.media.find({"title": {"$in": titles}}).to_list(length=100))
    works_by_title = {w["title"]: w["view_count"] for w in works}
    
    for i in range(len(titles) - 1):
        assert works_by_title[titles[i]] >= works_by_title[titles[i+1]]


@when('I look at the "Mais bem avaliados da semana" section')
def look_at_top_rated(context):
    assert context["response"].status_code == 200
    data = context["response"].json()
    context["top_rated_list"] = data.get("top_rated", [])


@then('I should see works with their respective scores, like a 9.4 rating for "Shōgun"')
def see_top_rated_scores(context):
    shogun = next((item for item in context["top_rated_list"] if item["title"] == "Shōgun"), None)
    assert shogun is not None
    assert shogun["avg_score"] == 9.4


@then('the works should be ordered strictly by their average score')
def check_top_rated_order(context):
    scores = [item["avg_score"] for item in context["top_rated_list"]]
    assert scores == sorted(scores, reverse=True)


@when('I fill in the search bar with "Fallout"')
def fill_search_bar():
    pytest.skip("not now.")

@when('I submit the search')
def submit_search():
    pytest.skip("not now.")

@then('I should be on the search results page')
def check_search_results_page():
    pytest.skip("not now.")

@then('I should see a list of works that exactly match "Fallout"')
def verify_exact_match():
    pytest.skip("not now.")