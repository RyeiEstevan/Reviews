"""Unit tests for the home page functions."""

from app.routers.home import format_view_count, doc_to_card


def test_format_view_count():
    # Values below 1,000 should be returned as-is
    assert format_view_count(0) == "0"
    assert format_view_count(999) == "999"

    # Values in the thousands (K) with rounding
    assert format_view_count(1000) == "1K"
    assert format_view_count(1200) == "1K"
    assert format_view_count(1800) == "2K"
    assert format_view_count(999_000) == "999K"

    # Values in the millions (M) with one decimal place
    assert format_view_count(1_000_000) == "1.0M"
    assert format_view_count(1_500_000) == "1.5M"
    assert format_view_count(2_000_000) == "2.0M"


def test_doc_to_card_with_all_fields():
    """Ensures that the mapping from MongoDB dictionary to MediaCard schema is correct."""
    doc = {
        "_id": "60a7c1b2f1a2c3d4e5f6a7b8",
        "title": "Dune: Part Two",
        "type": "movie",
        "year": 2024,
        "poster_url": "http://example.com/dune.jpg",
        "avg_score": 8.9,
        "review_count": 500,
        "platform": "Cinema"
    }
    
    card = doc_to_card(doc)
    
    assert card.id == "60a7c1b2f1a2c3d4e5f6a7b8"
    assert card.title == "Dune: Part Two"
    assert card.type == "movie"
    assert card.year == 2024
    assert card.poster_url == "http://example.com/dune.jpg"
    assert card.avg_score == 8.9
    assert card.review_count == 500
    assert card.platform == "Cinema"


def test_doc_to_card_with_missing_optional_fields():
    """Tests the function's tolerance to incomplete documents (behavior of default values)."""
    doc = {
        "_id": "60a7c1b2f1a2c3d4e5f6a7b9",
        "title": "Shōgun",
        "type": "series",
        "year": 2024
    }
    
    card = doc_to_card(doc)
    
    # Required fields provided
    assert card.id == "60a7c1b2f1a2c3d4e5f6a7b9"
    assert card.title == "Shōgun"
    assert card.type == "series"
    assert card.year == 2024
    
    # Optional fields should assume safe values instead of causing KeyError
    assert card.poster_url is None
    assert card.avg_score == 0.0
    assert card.review_count == 0
    assert card.platform is None