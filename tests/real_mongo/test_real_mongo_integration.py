"""Integration tests that require a real MongoDB (PLAN T1, RNF03/RNF05/RF05/RF07).

These exercise semantics where mongomock and a real server can disagree:
  * case-insensitive substring search via `$regex` (RF07/RNF05);
  * a real index on `name` (RNF05);
  * cascade delete spanning users/posts/comments (RF05);
  * audit non-bypass through the HTTP stack: every 2xx mutation adds exactly one
    entry, every rejected request adds none (RNF03).
"""

import pytest

from app.db.models import AuditLog, CatalogContributor, Comment, Post, User
from app.services.admin_service import AdminService

pytestmark = pytest.mark.real_mongo

ADMIN = {"username": "GabrielAdmin", "role": "admin"}


# --- RF07 / RNF05: real $regex search ------------------------------------- #
def test_search_is_case_insensitive_substring_on_real_mongo(run):
    for name, role in [
        ("Wendel Bezerra", "voice-actor"),
        ("Guilherme Briggs", "voice-actor"),
        ("Hans Zimmer", "artist"),
    ]:
        run(CatalogContributor(name=name, role=role).insert())

    def names(term):
        return [c.name for c in run(AdminService.search_contributors(term))]

    assert "Wendel Bezerra" in names("bezerra")   # lower-case substring
    assert "Wendel Bezerra" in names("WEN")        # upper-case prefix
    assert "Hans Zimmer" in names("zimmer")
    assert names("nonexistent") == []


# --- RNF05: a real index on `name` ---------------------------------------- #
def test_index_on_name_is_usable_on_real_mongo(run, db):
    run(db.contributors.create_index("name"))
    info = run(db.contributors.index_information())
    assert any(keys[0][0] == "name" for keys in (v["key"] for v in info.values()))

    run(CatalogContributor(name="Akira Toriyama", role="author").insert())
    found = run(AdminService.search_contributors("toriyama"))
    assert [c.name for c in found] == ["Akira Toriyama"]


# --- RF05: cascade delete across collections ------------------------------ #
def test_cascade_delete_spans_collections_on_real_mongo(run):
    run(User(username="Pedro123", role="common", status="active").insert())
    run(Post(owner="Pedro123", title="Review Up", hidden=False).insert())
    pedro_post = run(Post.find_one(Post.owner == "Pedro123"))
    run(Comment(author="Maria321", content="Legal!", post_id=str(pedro_post.id)).insert())
    run(Comment(author="Pedro123", content="Obrigado!", post_id="other-post").insert())
    pedro = run(User.find_one(User.username == "Pedro123"))

    run(AdminService.delete_user(ADMIN, str(pedro.id)))

    assert run(User.find_one(User.username == "Pedro123")) is None
    assert run(Post.find_one(Post.title == "Review Up")) is None
    assert run(Comment.find_one(Comment.content == "Legal!")) is None      # comment on a removed post
    assert run(Comment.find_one(Comment.content == "Obrigado!")) is None   # comment authored by Pedro
    audit = run(AuditLog.find_one(AuditLog.action == "delete_user", AuditLog.actor == "GabrielAdmin"))
    assert audit is not None and audit.metadata.get("cascade") is True


# --- RNF03: audit is not bypassable (2xx → +1, reject → +0) --------------- #
def test_successful_mutation_writes_exactly_one_audit_entry(client, auth, run):
    headers = auth("GabrielAdmin", "admin")
    resp = client.post("/admin/artists", headers=headers, json={"name": "Toshio Furukawa", "role": "voice-actor"})
    assert resp.status_code == 201

    entries = run(AuditLog.find_all().to_list())
    assert len(entries) == 1
    assert entries[0].action == "create_artist"


def test_rejected_mutation_writes_no_audit_entry(client, auth, run):
    headers = auth("GabrielAdmin", "admin")
    resp = client.post("/admin/artists", headers=headers, json={"name": "   ", "role": "artist"})
    assert resp.status_code == 400

    assert run(AuditLog.find_all().to_list()) == []
