"""tests/unit/test_content_unit.py

Fast, pure-Python unit tests — no DB, no HTTP.
Tests the ContentCreate and ContentUpdate schemas in isolation.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.content import ContentCreate, ContentUpdate


# ── ContentCreate — required fields ─────────────────────────────────────────────


def test_create_schema_minimum_fields():
    m = ContentCreate(title="Matrix", type="movie", year=1999)
    assert m.title == "Matrix"
    assert m.type == "movie"
    assert m.year == 1999
    assert m.genre == []


def test_create_schema_all_fields():
    m = ContentCreate(
        title="Fallout",
        type="series",
        year=2024,
        genre=["sci-fi", "action"],
        director="Jonathan Nolan",
        platform="Prime Video",
        poster_url="https://example.com/poster.jpg",
        description="A great show.",
    )
    assert m.genre == ["sci-fi", "action"]
    assert m.platform == "Prime Video"


@pytest.mark.parametrize("content_type", ["movie", "series", "book"])
def test_create_valid_types(content_type: str):
    m = ContentCreate(title="X", type=content_type, year=2000)
    assert m.type == content_type


def test_create_requires_title():
    with pytest.raises(ValidationError):
        ContentCreate(type="movie", year=2000)  # type: ignore[call-arg]


def test_create_requires_type():
    with pytest.raises(ValidationError):
        ContentCreate(title="X", year=2000)  # type: ignore[call-arg]


def test_create_requires_year():
    with pytest.raises(ValidationError):
        ContentCreate(title="X", type="movie")  # type: ignore[call-arg]


def test_create_rejects_invalid_type():
    with pytest.raises(ValidationError):
        ContentCreate(title="X", type="cartoon", year=2000)


# ── ContentUpdate — all fields optional ────────────────────────────────────────


def test_update_schema_empty_is_valid():
    u = ContentUpdate()
    assert u.title is None
    assert u.type is None
    assert u.year is None


def test_update_schema_partial():
    u = ContentUpdate(title="New Title")
    assert u.title == "New Title"
    assert u.year is None


def test_update_schema_genre_list():
    u = ContentUpdate(genre=["drama", "thriller"])
    assert u.genre == ["drama", "thriller"]


def test_update_rejects_invalid_type():
    with pytest.raises(ValidationError):
        ContentUpdate(type="cartoon")
