"""Fórum service layer.

Holds the business rules for the Fórum feature (posts, comments, category
filter). Following the same split as ``admin_service``:

* module-level **pure predicates** (no DB, no HTTP) so the rules can be unit
  tested in isolation;
* a ``ForumService`` class that persists state through Beanie and raises
  ``HTTPException`` on rejected requests.

"""

from typing import Optional

from fastapi import HTTPException

from app.db.models import Comment, Post
from app.schemas.forum import CommentCreate, PostCreate

# The fixed forum taxonomy (matches the labels used by ForumSearch.feature).
FORUM_CATEGORIES: tuple[str, ...] = ("Filmes", "Séries", "Livros")

# Roles that may moderate (delete) anyone's content. Admins moderate too.
MODERATOR_ROLES: tuple[str, ...] = ("moderador", "admin", "superadmin")

# Max length for post content and comments (mirrored on the frontend).
MAX_CONTENT_LENGTH: int = 100


# --------------------------------------------------------------------------- #
# Pure predicates (unit-testable: no DB, no HTTP)
# --------------------------------------------------------------------------- #
def post_title_is_valid(title: Optional[str]) -> bool:
    """A forum post must have a non-blank title (ForumPosts: title required)."""
    return bool((title or "").strip())


def comment_content_is_valid(content: Optional[str]) -> bool:
    """A comment must have non-blank content (ForumComments: not empty)."""
    return bool((content or "").strip())


def content_within_limit(content: Optional[str], limit: int = MAX_CONTENT_LENGTH) -> bool:
    """Post content / comment text must not exceed the character limit."""
    return len(content or "") <= limit


def is_valid_category(category: Optional[str]) -> bool:
    """A post category must be one of the fixed forum categories."""
    return category in FORUM_CATEGORIES


def is_moderator(role: Optional[str]) -> bool:
    """Whether a role carries forum moderation privileges."""
    return role in MODERATOR_ROLES


def can_delete_post(actor_username: str, actor_role: Optional[str], post_owner: str) -> bool:
    """A post is deletable by its owner or by a moderator."""
    return actor_username == post_owner or is_moderator(actor_role)


def can_delete_comment(actor_username: str, actor_role: Optional[str], comment_author: str) -> bool:
    """A comment is deletable by its author or by a moderator."""
    return actor_username == comment_author or is_moderator(actor_role)


def has_upvoted(upvoters: list[str], username: str) -> bool:
    """Whether ``username`` already upvoted (used to render the toggle state)."""
    return username in upvoters


def toggle_upvote(upvoters: list[str], username: str) -> list[str]:
    """Pure toggle: add the user's vote if absent, remove it if present.

    Returns a *new* list (never mutates the input) so the rule is trivially
    unit-testable and the caller decides when to persist. One vote per user is
    guaranteed because the list is treated as a set of usernames.
    """
    if username in upvoters:
        return [u for u in upvoters if u != username]
    return [*upvoters, username]


# --------------------------------------------------------------------------- #
# Service
# --------------------------------------------------------------------------- #
class ForumService:
    # ---- posts ----------------------------------------------------------
    @staticmethod
    async def create_post(actor: dict, data: PostCreate) -> Post:
        # Title is checked before category so a blank-title request returns the
        # title error the scenario expects, regardless of the category.
        if not post_title_is_valid(data.title):
            raise HTTPException(status_code=400, detail="title is required")
        if not is_valid_category(data.category):
            raise HTTPException(status_code=400, detail="invalid category")
        if not content_within_limit(data.content):
            raise HTTPException(status_code=400, detail="post content too long")
        post = Post(
            owner=actor["username"],
            title=data.title.strip(),
            content=data.content,
            category=data.category,
        )
        await post.insert()
        return post

    @staticmethod
    async def list_posts(category: Optional[str] = None) -> list[Post]:
        """Visible posts (hidden ones are excluded), newest first.

        ``hidden`` is toggled by the admin ban cascade, so banned users' posts
        never surface in the forum — consistent with the public ``/posts`` feed.
        """
        criteria: dict = {"hidden": False}
        if category:
            criteria["category"] = category
        posts = await Post.find(criteria).to_list()
        posts.sort(key=lambda p: p.created_at, reverse=True)
        return posts

    @staticmethod
    async def get_post(post_id: str) -> Post:
        post = await Post.get(post_id)
        if not post or post.hidden:
            raise HTTPException(status_code=404, detail="post not found")
        return post

    @staticmethod
    async def delete_post(actor: dict, post_id: str) -> None:
        post = await Post.get(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="post not found")
        if not can_delete_post(actor["username"], actor.get("role"), post.owner):
            raise HTTPException(status_code=403, detail="not allowed to delete this post")
        # Cascade: a deleted post takes its comment thread with it.
        async for comment in Comment.find(Comment.post_id == str(post.id)):
            await comment.delete()
        await post.delete()

    # ---- comments -------------------------------------------------------
    @staticmethod
    async def create_comment(actor: dict, post_id: str, data: CommentCreate) -> Comment:
        if not comment_content_is_valid(data.content):
            raise HTTPException(status_code=400, detail="comment cannot be empty")
        if not content_within_limit(data.content):
            raise HTTPException(status_code=400, detail="comment too long")
        # The target post must exist and be visible to be commentable.
        await ForumService.get_post(post_id)
        comment = Comment(
            author=actor["username"],
            content=data.content.strip(),
            post_id=post_id,
        )
        await comment.insert()
        return comment

    @staticmethod
    async def list_comments(post_id: str) -> list[Comment]:
        comments = await Comment.find(Comment.post_id == post_id).to_list()
        # Most upvoted first; ties keep thread order (oldest first) so the
        # ordering is stable and a brand-new comment doesn't outrank older ones.
        comments.sort(key=lambda c: (-len(c.upvoters), c.created_at))
        return comments

    @staticmethod
    async def toggle_comment_upvote(actor: dict, comment_id: str) -> Comment:
        """Add or remove the actor's upvote on a comment (idempotent per user)."""
        comment = await Comment.get(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="comment not found")
        comment.upvoters = toggle_upvote(comment.upvoters, actor["username"])
        await comment.save()
        return comment

    @staticmethod
    async def delete_comment(actor: dict, comment_id: str) -> None:
        comment = await Comment.get(comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="comment not found")
        if not can_delete_comment(actor["username"], actor.get("role"), comment.author):
            raise HTTPException(status_code=403, detail="not allowed to delete this comment")
        await comment.delete()
