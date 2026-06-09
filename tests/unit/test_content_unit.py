"""tests/unit/test_content_unit.py

Fast, pure-Python unit tests — no DB, no HTTP.
Tests the duration validator and schema layer in isolation.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.content import ContentCreate


# ──────────────────────────────────────────────────────────────────────────────
# Duration validator
# ──────────────────────────────────────────────────────────────────────────────


VALID_DURATIONS = [
    "120 min",
    "90 min",
    "1 min",
    "999 min",
    "  60 min  ",   # leading/trailing whitespace is stripped
    "180 MIN",      # case-insensitive
]

INVALID_DURATIONS = [
    "-120 min",     # negative
    "0 min",        # zero
    "-1 min",       # negative
    "120",          # missing unit
    "min",          # no number
    "abc min",      # non-numeric
    "1.5 min",      # float
    "",             # empty
    "120 minutes",  # wrong unit
]


@pytest.mark.parametrize("duration", VALID_DURATIONS)
def test_valid_duration_accepted(duration: str):
    payload = ContentCreate(
        title="Test",
        genre="drama",
        release_year=2000,
        duration=duration,
    )
    assert "min" in payload.duration.lower()


@pytest.mark.parametrize("duration", INVALID_DURATIONS)
def test_invalid_duration_rejected(duration: str):
    with pytest.raises(ValidationError):
        ContentCreate(
            title="Test",
            genre="drama",
            release_year=2000,
            duration=duration,
        )


# ──────────────────────────────────────────────────────────────────────────────
# Schema defaults
# ──────────────────────────────────────────────────────────────────────────────


def test_create_schema_minimum_fields():
    payload = ContentCreate(
        title="Matrix",
        genre="ficção científica",
        release_year=1999,
        duration="136 min",
    )
    assert payload.title == "Matrix"
    assert payload.release_year == 1999


def test_create_schema_requires_title():
    with pytest.raises(ValidationError):
        ContentCreate(genre="drama", release_year=2000, duration="90 min")  # type: ignore[call-arg]


def test_create_schema_requires_release_year():
    with pytest.raises(ValidationError):
        ContentCreate(title="X", genre="drama", duration="90 min")  # type: ignore[call-arg]