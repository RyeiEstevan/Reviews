"""Integration test (slides pp.87-103): exercises the *interfaces between modules*.

A single ban operation must coordinate three Beanie models through the service
layer and the database at once: it flips User.status, hides every owned Post, and
appends an AuditLog entry. We drive the real service against the in-memory
mongomock-motor database (the `run`/`db` fixtures) and assert all three collections.
"""

from app.db.models import AuditLog, Post, User
from app.schemas.admin import ContributorCreate
from app.services.admin_service import AdminService


def test_ban_user_integrates_user_post_and_audit(run):
    # Arrange: a common user with two public posts spanning the Post module.
    run(User(username="Pedro123", role="common", status="active").insert())
    run(Post(owner="Pedro123", title="Review Ratatouille", hidden=False).insert())
    run(Post(owner="Pedro123", title="Review Up", hidden=False).insert())
    pedro = run(User.find_one(User.username == "Pedro123"))

    # Act: one service call that spans User + Post + AuditLog.
    actor = {"username": "GabrielAdmin", "role": "admin"}
    run(AdminService.ban_user(actor, str(pedro.id), reason="rule violation"))

    # Assert: state is consistent across every collection touched.
    pedro = run(User.find_one(User.username == "Pedro123"))
    assert pedro.status == "banned"
    assert pedro.ban_reason == "rule violation"

    posts = run(Post.find(Post.owner == "Pedro123").to_list())
    assert posts and all(p.hidden for p in posts)

    audit = run(AuditLog.find_one(AuditLog.action == "ban_user", AuditLog.actor == "GabrielAdmin"))
    assert audit is not None
    assert audit.target == "Pedro123"


def test_create_contributor_blank_name_writes_no_audit(run):
    """Rejected requests must not leak an audit entry (rule R2)."""
    actor = {"username": "GabrielAdmin", "role": "admin"}
    try:
        run(AdminService.create_contributor(actor, ContributorCreate(name="   ", role="artist")))
        raised = False
    except Exception:
        raised = True

    assert raised is True
    assert run(AuditLog.find_all().to_list()) == []
