"""Landing Page (Feed) feature tests."""

from pytest_bdd import (
    given,
    scenario,
    then,
    when,
)


@scenario('features/LandingPage.feature', 'Navigating through horizontal carousels')
def test_navigating_through_horizontal_carousels():
    """Navigating through horizontal carousels."""


@scenario('features/LandingPage.feature', 'Searching for a work directly from the landing page')
def test_searching_for_a_work_directly_from_the_landing_page():
    """Searching for a work directly from the landing page."""


@scenario('features/LandingPage.feature', 'Viewing top-rated reviews (Mais bem avaliados)')
def test_viewing_toprated_reviews_mais_bem_avaliados():
    """Viewing top-rated reviews (Mais bem avaliados)."""


@scenario('features/LandingPage.feature', 'Viewing trending works (Em Alta)')
def test_viewing_trending_works_em_alta():
    """Viewing trending works (Em Alta)."""


@given('I am on the platform\'s landing page')
def _():
    """I am on the platform's landing page."""
    raise NotImplementedError


@when('I click the next horizontal arrow (">") in the "Em Alta" section')
def _():
    """I click the next horizontal arrow (">") in the "Em Alta" section."""
    raise NotImplementedError


@when('I fill in the search bar with "Fallout"')
def _():
    """I fill in the search bar with "Fallout"."""
    raise NotImplementedError


@when('I look at the "Em Alta" section')
def _():
    """I look at the "Em Alta" section."""
    raise NotImplementedError


@when('I look at the "Mais bem avaliados da semana" section')
def _():
    """I look at the "Mais bem avaliados da semana" section."""
    raise NotImplementedError


@when('I submit the search')
def _():
    """I submit the search."""
    raise NotImplementedError


@then('I should be on the search results page')
def _():
    """I should be on the search results page."""
    raise NotImplementedError


@then('I should see a list of currently trending works, such as "Dune: Part Two" and "Shōgun"')
def _():
    """I should see a list of currently trending works, such as "Dune: Part Two" and "Shōgun"."""
    raise NotImplementedError


@then('I should see a list of works that exactly match "Fallout"')
def _():
    """I should see a list of works that exactly match "Fallout"."""
    raise NotImplementedError


@then('I should see works with their respective scores, like a 9.4 rating for "Shōgun"')
def _():
    """I should see works with their respective scores, like a 9.4 rating for "Shōgun"."""
    raise NotImplementedError


@then('the list should scroll horizontally to display more items')
def _():
    """the list should scroll horizontally to display more items."""
    raise NotImplementedError


@then('the works should be ordered strictly by their average score')
def _():
    """the works should be ordered strictly by their average score."""
    raise NotImplementedError


@then('the works should be ordered strictly by their total view count')
def _():
    """the works should be ordered strictly by their total view count."""
    raise NotImplementedError

