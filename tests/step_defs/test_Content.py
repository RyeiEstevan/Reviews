"""tests/step_defs/test_Content.py

pytest-bdd step definitions for features/Content.feature.

Design notes (matching the existing harness in conftest.py):
  - All steps are SYNC — pytest-bdd 7.x drops async silently.
  - DB access goes through the `run` fixture (run(coroutine)).
  - HTTP calls go through the `client` fixture (SyncClient).
  - Auth tokens come from the `auth` fixture.
"""

from __future__ import annotations

from datetime import datetime

import pytest
from pytest_bdd import given, parsers, scenarios, then, when

scenarios("../features/Content.feature")

# ── Background ────────────────────────────────────────────────────────────────


@given("o sistema está inicializado")
def system_initialized():
    pass


# ── Auth ──────────────────────────────────────────────────────────────────────


@given(parsers.parse('eu acesso o sistema como "{role}"'))
def logged_in_as(role: str, auth, context):
    username_map = {
        "moderador":    ("moderador_user", "moderador"),
        "usuario_comum": ("common_user",   "usuario_comum"),
        "admin":        ("admin_user",     "admin"),
        "superadmin":   ("super_user",     "superadmin"),
    }
    username, mapped_role = username_map.get(role, (role, role))
    context["headers"] = auth(username, mapped_role)


# ── Seed helpers ──────────────────────────────────────────────────────────────


@given(parsers.parse('o sistema tem uma mídia "{title}" do tipo "{type}" do ano "{year}"'))
def seed_content(title: str, type: str, year: str, run, db, context):
    doc = {
        "title": title,
        "type": type,
        "year": int(year),
        "genre": [],
        "avg_score": 0.0,
        "review_count": 0,
        "view_count": 0,
        "recent_view_count": 0,
        "recent_avg_score": 0.0,
        "yearly_avg_score": 0.0,
        "yearly_view_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = run(db.content.insert_one(doc))
    context.setdefault("seeded", {})[title] = str(result.inserted_id)


# ── Action steps ──────────────────────────────────────────────────────────────


@when(parsers.parse('eu cadastro uma mídia com título "{title}" do tipo "{type}" do ano "{year}"'))
def create_content(title: str, type: str, year: str, client, context):
    payload = {"title": title, "type": type, "year": int(year), "genre": []}
    context["response"] = client.post(
        "/content", json=payload, headers=context.get("headers", {})
    )


@when("eu listo as mídias")
def list_content(client, context):
    context["response"] = client.get("/content")


@when(parsers.parse('eu listo as mídias com filtro de tipo "{type}"'))
def list_content_by_type(type: str, client, context):
    context["response"] = client.get(f"/content?type={type}")


@when(parsers.parse('eu atualizo o título da mídia "{title}" para "{new_title}"'))
def update_content_title(title: str, new_title: str, client, context):
    content_id = context["seeded"][title]
    context["response"] = client.patch(
        f"/content/{content_id}",
        json={"title": new_title},
        headers=context.get("headers", {}),
    )
    context["seeded"][new_title] = content_id


@when(parsers.parse('eu removo a mídia "{title}"'))
def delete_content(title: str, client, context):
    content_id = context.get("seeded", {}).get(title)
    assert content_id, f"No seeded content named '{title}'"
    context["response"] = client.delete(
        f"/content/{content_id}", headers=context.get("headers", {})
    )


# ── Assertion steps ───────────────────────────────────────────────────────────


@then("o sistema retorna status 201")
def assert_201(context):
    assert context["response"].status_code == 201, context["response"].text


@then("o sistema retorna status 200")
def assert_200(context):
    assert context["response"].status_code == 200, context["response"].text


@then("o sistema retorna status 204")
def assert_204(context):
    assert context["response"].status_code == 204, context["response"].text


@then("o sistema retorna status 403")
def assert_403(context):
    assert context["response"].status_code == 403, context["response"].text


@then(parsers.parse('a mídia "{title}" aparece no catálogo'))
def assert_in_catalog(title: str, client):
    resp = client.get("/content")
    assert resp.status_code == 200
    titles = [item["title"] for item in resp.json()]
    assert title in titles, f"'{title}' not found in {titles}"


def _titles_from(resp, client) -> list[str]:
    """Extract titles from resp if it's a JSON list, otherwise re-fetch /content."""
    try:
        body = resp.json()
        if isinstance(body, list):
            return [item["title"] for item in body]
    except Exception:
        pass
    return [item["title"] for item in client.get("/content").json()]


@then(parsers.parse('o catálogo contém "{title}"'))
def assert_catalog_contains(title: str, client, context):
    titles = _titles_from(context["response"], client)
    assert title in titles, f"'{title}' not found in {titles}"


@then(parsers.parse('o catálogo não contém "{title}"'))
def assert_catalog_not_contains(title: str, client, context):
    titles = _titles_from(context["response"], client)
    assert title not in titles, f"'{title}' should NOT be in catalog but is"
