"""Unit tests for pure Fórum logic (no DB, no HTTP).

White-box unit level (slides pp.84-86): the forum business-rule predicates —
title/comment validation, the category whitelist, and the moderation /
deletion-permission rules — exercised in isolation.
"""

import pytest

from app.services.forum_service import (
    can_delete_comment,
    can_delete_post,
    comment_content_is_valid,
    content_within_limit,
    has_upvoted,
    is_moderator,
    is_valid_category,
    post_title_is_valid,
    toggle_upvote,
)


@pytest.mark.parametrize(
    "title, expected",
    [("Review Ratatouille", True), ("   spaced   ", True), ("", False), ("   ", False), (None, False)],
)
def test_post_title_is_valid(title, expected):
    assert post_title_is_valid(title) is expected


@pytest.mark.parametrize(
    "content, expected",
    [("Legal!", True), ("", False), ("   ", False), (None, False)],
)
def test_comment_content_is_valid(content, expected):
    assert comment_content_is_valid(content) is expected


@pytest.mark.parametrize(
    "content, expected",
    [
        ("", True),
        ("a" * 100, True),       # exactly at the limit is allowed
        ("a" * 101, False),      # one over is rejected
        (None, True),
    ],
)
def test_content_within_limit(content, expected):
    assert content_within_limit(content) is expected


@pytest.mark.parametrize(
    "category, expected",
    [("Filmes", True), ("Séries", True), ("Livros", True), ("Música", False), ("", False), (None, False)],
)
def test_is_valid_category(category, expected):
    assert is_valid_category(category) is expected


@pytest.mark.parametrize(
    "role, expected",
    [("moderador", True), ("admin", True), ("superadmin", True), ("common", False), (None, False)],
)
def test_is_moderator(role, expected):
    assert is_moderator(role) is expected


@pytest.mark.parametrize(
    "actor_username, actor_role, post_owner, expected",
    [
        ("Pedro123", "common", "Pedro123", True),    # owner deletes own post
        ("moderador", "moderador", "Pedro123", True),  # moderator deletes any post
        ("admin1", "admin", "Pedro123", True),         # admins moderate too
        ("Maria321", "common", "Pedro123", False),     # stranger cannot delete
    ],
)
def test_can_delete_post(actor_username, actor_role, post_owner, expected):
    assert can_delete_post(actor_username, actor_role, post_owner) is expected


@pytest.mark.parametrize(
    "actor_username, actor_role, comment_author, expected",
    [
        ("Maria321", "common", "Maria321", True),       # author deletes own comment
        ("moderador", "moderador", "Maria321", True),   # moderator deletes any comment
        ("Pedro123", "common", "Maria321", False),      # stranger cannot delete
    ],
)
def test_can_delete_comment(actor_username, actor_role, comment_author, expected):
    assert can_delete_comment(actor_username, actor_role, comment_author) is expected


# --------------------------------------------------------------------------- #
# Upvotes (pure logic: one vote per user, toggle on/off, no DB)
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "upvoters, username, expected",
    [
        (["Maria321"], "Maria321", True),
        (["Maria321"], "Pedro123", False),
        ([], "Pedro123", False),
    ],
)
def test_has_upvoted(upvoters, username, expected):
    assert has_upvoted(upvoters, username) is expected


def test_toggle_upvote_adds_when_absent():
    assert toggle_upvote([], "Pedro123") == ["Pedro123"]


def test_toggle_upvote_removes_when_present():
    assert toggle_upvote(["Pedro123", "Maria321"], "Pedro123") == ["Maria321"]


def test_toggle_upvote_is_idempotent_per_user():
    # Two toggles by the same user return to the starting state (net zero votes).
    once = toggle_upvote([], "Pedro123")
    twice = toggle_upvote(once, "Pedro123")
    assert twice == []


def test_toggle_upvote_does_not_mutate_input():
    original = ["Maria321"]
    toggle_upvote(original, "Pedro123")
    assert original == ["Maria321"]  # input list left untouched
