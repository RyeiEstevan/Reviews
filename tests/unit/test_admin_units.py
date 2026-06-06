"""Unit tests for pure admin-user logic (no DB, no HTTP).

These exercise individual functions in isolation (white-box, unit level — slides
pp.84-86): password hashing/verification and the admin business-rule predicates.
"""

import pytest

from app.core.security import hash_password, verify_password
from app.services.admin_service import (
    contributor_name_is_valid,
    is_privileged_target,
    requires_superadmin_to_create,
)


def test_hash_password_is_not_plaintext_and_verifies():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed) is True


def test_verify_password_rejects_wrong_password():
    hashed = hash_password("secret123")
    assert verify_password("wrong-password", hashed) is False


@pytest.mark.parametrize(
    "role, expected",
    [("admin", True), ("common", False), ("superadmin", False)],
)
def test_requires_superadmin_to_create(role, expected):
    assert requires_superadmin_to_create(role) is expected


@pytest.mark.parametrize(
    "role, expected",
    [("admin", True), ("superadmin", True), ("common", False)],
)
def test_is_privileged_target(role, expected):
    assert is_privileged_target(role) is expected


@pytest.mark.parametrize(
    "name, expected",
    [("Wendel Bezerra", True), ("", False), ("   ", False), (None, False)],
)
def test_contributor_name_is_valid(name, expected):
    assert contributor_name_is_valid(name) is expected
