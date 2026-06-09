"""Integration tests (slides pp.87-103): the *interfaces between modules*.

These drive the real ``ForumService`` against the in-memory mongomock-motor
database (the ``run``/``db`` fixtures) and assert the persisted state across the
``Post`` and ``Comment`` collections — including the cross-feature contract that
a post hidden by the admin ban cascade never surfaces in the forum feed.
"""

from app.db.models import Comment, Post
from app.schemas.forum import CommentCreate, PostCreate
from app.services.forum_service import ForumService

PEDRO = {"username": "Pedro123", "role": "common"}
MARIA = {"username": "Maria321", "role": "common"}
MOD = {"username": "mod", "role": "moderador"}


def test_delete_post_cascades_its_comments(run):
    """Deleting a post must remove its whole comment thread (Post + Comment)."""
    post = run(ForumService.create_post(PEDRO, PostCreate(title="Review Ratatouille", category="Filmes")))
    run(ForumService.create_comment(MARIA, str(post.id), CommentCreate(content="Legal!")))
    run(ForumService.create_comment(MARIA, str(post.id), CommentCreate(content="Concordo")))

    # Act: a moderator removes the post.
    run(ForumService.delete_post(MOD, str(post.id)))

    # Assert: post and every attached comment are gone.
    assert run(Post.get(post.id)) is None
    assert run(Comment.find(Comment.post_id == str(post.id)).to_list()) == []


def test_category_filter_returns_only_matching_posts(run):
    """create_post + list_posts integrate so the filter narrows by category."""
    run(ForumService.create_post(PEDRO, PostCreate(title="Review Ratatouille", category="Filmes")))
    run(ForumService.create_post(PEDRO, PostCreate(title="Tudo sobre Friends", category="Séries")))

    filmes = run(ForumService.list_posts("Filmes"))
    livros = run(ForumService.list_posts("Livros"))

    assert [p.title for p in filmes] == ["Review Ratatouille"]
    assert livros == []  # category with no posts


def test_hidden_post_is_excluded_from_forum_feed(run):
    """A post hidden by the admin ban cascade must not appear in the forum."""
    run(Post(owner="BannedUser", title="Spam", category="Filmes", hidden=True).insert())
    run(ForumService.create_post(PEDRO, PostCreate(title="Review Ratatouille", category="Filmes")))

    visible = run(ForumService.list_posts())

    titles = [p.title for p in visible]
    assert "Review Ratatouille" in titles
    assert "Spam" not in titles


def test_empty_comment_is_rejected_and_not_persisted(run):
    """A rejected comment must not leak a Comment document."""
    post = run(ForumService.create_post(PEDRO, PostCreate(title="Review Ratatouille", category="Filmes")))
    try:
        run(ForumService.create_comment(MARIA, str(post.id), CommentCreate(content="   ")))
        raised = False
    except Exception:
        raised = True

    assert raised is True
    assert run(Comment.find_all().to_list()) == []


def test_upvote_toggles_and_persists_one_vote_per_user(run):
    """A user may upvote once; voting again removes it (toggle), and the count
    never double-counts the same user."""
    post = run(ForumService.create_post(PEDRO, PostCreate(title="Review Ratatouille", category="Filmes")))
    comment = run(ForumService.create_comment(MARIA, str(post.id), CommentCreate(content="Legal!")))

    # Pedro upvotes -> count 1.
    run(ForumService.toggle_comment_upvote(PEDRO, str(comment.id)))
    stored = run(Comment.get(comment.id))
    assert stored.upvoters == ["Pedro123"]

    # Pedro upvoting again removes his vote -> count 0 (idempotent per user).
    run(ForumService.toggle_comment_upvote(PEDRO, str(comment.id)))
    stored = run(Comment.get(comment.id))
    assert stored.upvoters == []


def test_comments_are_ordered_by_upvotes_then_oldest_first(run):
    """list_comments must return most-upvoted first, ties keeping thread order."""
    post = run(ForumService.create_post(PEDRO, PostCreate(title="Review Ratatouille", category="Filmes")))
    first = run(ForumService.create_comment(MARIA, str(post.id), CommentCreate(content="primeiro")))
    second = run(ForumService.create_comment(PEDRO, str(post.id), CommentCreate(content="segundo")))
    third = run(ForumService.create_comment(MOD, str(post.id), CommentCreate(content="terceiro")))

    # Give the third comment two votes and the second one vote; first stays at 0.
    run(ForumService.toggle_comment_upvote(PEDRO, str(third.id)))
    run(ForumService.toggle_comment_upvote(MARIA, str(third.id)))
    run(ForumService.toggle_comment_upvote(MARIA, str(second.id)))

    ordered = run(ForumService.list_comments(str(post.id)))
    assert [c.content for c in ordered] == ["terceiro", "segundo", "primeiro"]


def test_upvote_on_missing_comment_raises(run):
    """Upvoting a non-existent comment is a 404, not a silent no-op."""
    from fastapi import HTTPException

    try:
        run(ForumService.toggle_comment_upvote(PEDRO, "0123456789abcdef01234567"))
        raised = False
    except HTTPException as exc:
        raised = exc.status_code == 404

    assert raised is True


def test_post_content_over_limit_is_rejected(run):
    """Post content beyond 100 chars is rejected and nothing is persisted."""
    from fastapi import HTTPException

    try:
        run(ForumService.create_post(PEDRO, PostCreate(title="Ok", category="Filmes", content="a" * 101)))
        raised = False
    except HTTPException as exc:
        raised = exc.status_code == 400 and exc.detail == "post content too long"

    assert raised is True
    assert run(Post.find_all().to_list()) == []


def test_comment_over_limit_is_rejected(run):
    """Comment text beyond 100 chars is rejected and nothing is persisted."""
    from fastapi import HTTPException

    post = run(ForumService.create_post(PEDRO, PostCreate(title="Review Ratatouille", category="Filmes")))
    try:
        run(ForumService.create_comment(MARIA, str(post.id), CommentCreate(content="a" * 101)))
        raised = False
    except HTTPException as exc:
        raised = exc.status_code == 400 and exc.detail == "comment too long"

    assert raised is True
    assert run(Comment.find_all().to_list()) == []


def test_content_exactly_at_limit_is_accepted(run):
    """Exactly 100 characters is allowed (boundary)."""
    post = run(ForumService.create_post(PEDRO, PostCreate(title="Ok", category="Filmes", content="a" * 100)))
    assert len(post.content) == 100


def test_upvote_route_and_upvoted_by_me_flag(client, auth, run):
    """Full stack: the POST upvote route persists, and the public comment list
    reports ``upvoted_by_me`` only for the viewer whose token is sent."""
    post = run(ForumService.create_post(PEDRO, PostCreate(title="Review Ratatouille", category="Filmes")))
    comment = run(ForumService.create_comment(MARIA, str(post.id), CommentCreate(content="Legal!")))

    pedro = auth("Pedro123", "common")
    maria = auth("Maria321", "common")

    # Pedro upvotes through the HTTP route.
    res = client.post(f"/forum/comments/{comment.id}/upvote", headers=pedro)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["upvotes"] == 1 and data["upvoted_by_me"] is True

    # Listing as Pedro shows the vote as his; listing as Maria shows it isn't hers.
    as_pedro = client.get(f"/forum/posts/{post.id}/comments", headers=pedro).json()["data"][0]
    as_maria = client.get(f"/forum/posts/{post.id}/comments", headers=maria).json()["data"][0]
    assert as_pedro["upvotes"] == 1 and as_pedro["upvoted_by_me"] is True
    assert as_maria["upvotes"] == 1 and as_maria["upvoted_by_me"] is False

    # Reading without a token stays public (count visible, no personalisation).
    anon = client.get(f"/forum/posts/{post.id}/comments").json()["data"][0]
    assert anon["upvotes"] == 1 and anon["upvoted_by_me"] is False
