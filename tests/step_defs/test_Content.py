"""tests/step_defs/test_Content.py

pytest-bdd step definitions for features/Content.feature.

Design notes (matching the existing harness in conftest.py):
  - All steps are SYNC — pytest-bdd 7.x drops async silently.
  - DB access goes through the `run` fixture (run(coroutine)).
  - HTTP calls go through the `client` fixture (SyncClient).
  - Auth tokens come from the `auth` fixture.
"""

from __future__ import annotations

import pytest
from pytest_bdd import given, parsers, scenarios, then, when

scenarios("../features/Content.feature")

# ──────────────────────────────────────────────────────────────────────────────
# Background
# ──────────────────────────────────────────────────────────────────────────────


@given("o sistema está inicializado")
def system_initialized():
    """Nothing to do — the db fixture (autouse) already handles this."""
    pass


# ──────────────────────────────────────────────────────────────────────────────
# Auth / role helpers
# ──────────────────────────────────────────────────────────────────────────────


@given(parsers.parse('eu acesso o sistema como "{role}"'))
def logged_in_as(role: str, auth, context):
    """Store auth headers for the given role in context."""
    username_map = {
        "moderador": ("moderador_user", "moderador"),
        "usuario_comum": ("common_user", "usuario_comum"),
        "admin": ("admin_user", "admin"),
        "superadmin": ("super_user", "superadmin"),
    }
    username, mapped_role = username_map.get(role, (role, role))
    context["headers"] = auth(username, mapped_role)
    context["role"] = mapped_role


# ──────────────────────────────────────────────────────────────────────────────
# Seed helpers
# ──────────────────────────────────────────────────────────────────────────────


@given(parsers.parse('o sistema já tem um conteúdo "{title}" com ano "{year}"'))
def seed_content_already(title: str, year: str, run, context):
    from app.db.models import Content

    doc = Content(
        title=title,
        genre="gênero de teste",
        release_year=int(year),
        duration="90 min",
    )
    run(doc.insert())
    context.setdefault("seeded", {})[title] = str(doc.id)


@given(parsers.parse('o sistema tem um conteúdo "{title}" com ano "{year}"'))
def seed_content(title: str, year: str, run, context):
    from app.db.models import Content

    doc = Content(
        title=title,
        genre="gênero de teste",
        release_year=int(year),
        duration="90 min",
    )
    run(doc.insert())
    context.setdefault("seeded", {})[title] = str(doc.id)


@given(parsers.parse('o sistema tem um conteúdo "{title}" com o ano "{year}"'))
def seed_content_alt(title: str, year: str, run, context):
    # Alias for the slightly different phrasing in the permission scenario
    seed_content(title, year, run, context)


@given("eu visualizo o formulário de cadastro de novo item")
def view_form(context):
    """Just a narrative step — no action needed."""
    pass


# ──────────────────────────────────────────────────────────────────────────────
# Form filling steps (success scenario)
# ──────────────────────────────────────────────────────────────────────────────


@given(parsers.parse('eu preencho o campo de título com "{title}"'))
def fill_title(title: str, context):
    context.setdefault("form", {})["title"] = title


@given(parsers.parse('o campo de gênero com "{genre}"'))
def fill_genre(genre: str, context):
    context.setdefault("form", {})["genre"] = genre


@given(parsers.parse('o campo de ano de lançamento com "{year}"'))
def fill_year(year: str, context):
    context.setdefault("form", {})["release_year"] = int(year)


@given(parsers.parse('o campo de duração com "{duration}"'))
def fill_duration(duration: str, context):
    context.setdefault("form", {})["duration"] = duration


@when('eu clico no botão "Salvar"')
def click_save(client, context):
    form = context.get("form", {})
    headers = context.get("headers", {})
    context["response"] = client.post("/content", json=form, headers=headers)


# ──────────────────────────────────────────────────────────────────────────────
# Action steps
# ──────────────────────────────────────────────────────────────────────────────


@when(parsers.parse('eu tento cadastrar o conteúdo "{title}" com ano "{year}"'))
def try_create_duplicate(title: str, year: str, client, context):
    payload = {
        "title": title,
        "genre": "gênero de teste",
        "release_year": int(year),
        "duration": "90 min",
    }
    context["response"] = client.post(
        "/content", json=payload, headers=context.get("headers", {})
    )


@when(parsers.parse('eu tento remover o conteúdo "{title}"'))
def try_delete_content(title: str, client, context):
    content_id = context.get("seeded", {}).get(title)
    assert content_id, f"No seeded content named '{title}' found in context"
    context["response"] = client.delete(
        f"/content/{content_id}", headers=context.get("headers", {})
    )


@when(parsers.parse('eu tento cadastrar o conteúdo "{title}" com a duração "{duration}"'))
def try_create_invalid_duration(title: str, duration: str, client, context):
    payload = {
        "title": title,
        "genre": "ação",
        "release_year": 2009,
        "duration": duration,
    }
    context["response"] = client.post(
        "/content", json=payload, headers=context.get("headers", {})
    )


@when(parsers.parse('eu marco o conteúdo "{title}" como visto'))
def mark_as_viewed(title: str, client, context):
    content_id = context.get("seeded", {}).get(title)
    assert content_id
    context["response"] = client.post(f"/content/{content_id}/view")


# ──────────────────────────────────────────────────────────────────────────────
# Assertion steps
# ──────────────────────────────────────────────────────────────────────────────


@then("o sistema retorna status 201")
def assert_201(context):
    assert context["response"].status_code == 201, context["response"].text


@then(parsers.parse('o novo conteúdo aparece no catálogo com título "{title}"'))
def assert_in_catalog(title: str, client, context):
    resp = client.get("/content")
    assert resp.status_code == 200
    titles = [item["title"] for item in resp.json()]
    assert title in titles, f"'{title}' not found in {titles}"


@then("o sistema retorna uma mensagem de erro sobre duplicidade de conteúdo")
def assert_duplicate_error(context):
    resp = context["response"]
    assert resp.status_code == 400, resp.text
    assert "duplicado" in resp.json().get("detail", "").lower()


@then(parsers.parse('o sistema continua tendo apenas um conteúdo "{title}" com ano "{year}"'))
def assert_only_one(title: str, year: str, client):
    resp = client.get("/content")
    matches = [
        item
        for item in resp.json()
        if item["title"].lower() == title.lower()
        and item["release_year"] == int(year)
    ]
    assert len(matches) == 1, f"Expected exactly 1 '{title}', got {len(matches)}"


@then(parsers.parse('o sistema mantém o conteúdo "{title}" com ano "{year}"'))
def assert_still_exists(title: str, year: str, client):
    resp = client.get("/content")
    matches = [
        item
        for item in resp.json()
        if item["title"].lower() == title.lower()
        and item["release_year"] == int(year)
    ]
    assert len(matches) >= 1, f"'{title}' ({year}) not found in catalog"


@then("o sistema retorna uma mensagem de erro sobre permissão insuficiente")
def assert_permission_error(context):
    resp = context["response"]
    assert resp.status_code in (400, 403), resp.text
    detail = resp.json().get("detail", "").lower()
    assert "permiss" in detail or "insuficiente" in detail or "forbidden" in detail, detail


@then(parsers.parse('o sistema mantém o conteúdo "{title}" com o ano "{year}"'))
def assert_still_exists_alt(title: str, year: str, client):
    assert_still_exists(title, year, client)


@then("o sistema retorna uma mensagem de erro sobre formato de dados inválido")
def assert_format_error(context):
    resp = context["response"]
    # Pydantic validation errors come back as 422
    assert resp.status_code in (400, 422), resp.text


@then(parsers.parse('o sistema não realiza o cadastro do conteúdo "{title}"'))
def assert_not_created(title: str, client):
    resp = client.get("/content")
    titles = [item["title"].lower() for item in resp.json()]
    assert title.lower() not in titles, f"'{title}' should NOT be in catalog but is"


@then(parsers.parse('o view_count do conteúdo "{title}" é "{count}"'))
def assert_view_count(title: str, count: str, client):
    resp = client.get("/content")
    item = next(
        (i for i in resp.json() if i["title"].lower() == title.lower()), None
    )
    assert item, f"'{title}' not found"
    assert item["view_count"] == int(count), item


@then(parsers.parse('o recent_view_count do conteúdo "{title}" é "{count}"'))
def assert_recent_view_count(title: str, count: str, client):
    resp = client.get("/content")
    item = next(
        (i for i in resp.json() if i["title"].lower() == title.lower()), None
    )
    assert item, f"'{title}' not found"
    assert item["recent_view_count"] == int(count), item