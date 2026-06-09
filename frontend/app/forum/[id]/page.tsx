"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Send, AlertCircle, CheckCircle2, MessagesSquare, ArrowBigUp } from "lucide-react";
import { api, ApiError, type ForumPost, type ForumComment } from "@/lib/api";
import { getRole, getUsername, isLoggedIn } from "@/lib/auth";
import { translateError, formatDateTime } from "@/lib/copy";
import { isModerator, FORUM_MAX_CONTENT_LENGTH } from "@/lib/forum";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// What the confirmation modal is about: deleting the post, or one comment.
type Pending = { kind: "post" } | { kind: "comment"; id: string } | null;

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = String(params.id);

  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // session (read once on mount; UX only)
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);

  // comment composer
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // delete confirmation
  const [pending, setPending] = useState<Pending>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([api.getForumPost(postId), api.listForumComments(postId)]);
      setPost(p);
      setComments(c);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setError(err instanceof ApiError ? translateError(err.message) : "Não foi possível carregar o post");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    setLogged(isLoggedIn());
    setUsername(getUsername());
    setRole(getRole());
    load();
  }, [load]);

  const canDeletePost = logged && post != null && (username === post.owner || isModerator(role));
  const canDeleteComment = (c: ForumComment) => logged && (username === c.author || isModerator(role));

  async function toggleUpvote(comment: ForumComment) {
    if (!logged) return; // the button is disabled when logged out; reading stays public
    try {
      const updated = await api.toggleCommentUpvote(comment.id);
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.message) : "Não foi possível registrar o voto");
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    setCommentError(null);
    setPosting(true);
    try {
      // Let the backend reject an empty comment so the message matches the spec.
      const created = await api.createForumComment(postId, commentText);
      setComments((prev) => [...prev, created]);
      setCommentText("");
    } catch (err) {
      setCommentError(err instanceof ApiError ? translateError(err.message) : "Não foi possível comentar");
    } finally {
      setPosting(false);
    }
  }

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    try {
      if (pending.kind === "post") {
        await api.deleteForumPost(postId);
        router.push("/forum"); // post removed → back to the list
        return;
      }
      await api.deleteForumComment(pending.id);
      setComments((prev) => prev.filter((c) => c.id !== pending.id));
      setNotice("Comentário removido.");
      setPending(null);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.message) : "Não foi possível excluir");
      setPending(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="muted" data-cy="post-loading">Carregando…</div>;

  if (notFound) {
    return (
      <div className="empty" data-cy="post-not-found">
        <MessagesSquare />
        Post não encontrado.
        <div style={{ marginTop: "0.8rem" }}>
          <Link href="/forum" className="btn secondary btn-sm">
            <ArrowLeft size={15} /> Voltar ao fórum
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-cy="forum-post-page" className="stagger">
      <Link href="/forum" className="btn secondary btn-sm" data-cy="back-to-forum" style={{ marginBottom: "1rem" }}>
        <ArrowLeft size={15} /> Voltar
      </Link>

      {error && (
        <div className="alert error" data-cy="post-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}
      {notice && (
        <div className="alert success" data-cy="post-notice">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}

      {/* the post itself */}
      {post && (
        <article className="card" data-cy="post-detail">
          <div className="post-meta">
            {post.category && <span className="tag">{post.category}</span>}
            <span>
              por <b>{post.owner}</b>
            </span>
            <span>· {formatDateTime(post.created_at)}</span>
          </div>
          <h3>{post.title}</h3>
          {post.content && <p className="feed-body" style={{ whiteSpace: "pre-wrap" }}>{post.content}</p>}
          {canDeletePost && (
            <div className="row" style={{ marginTop: "0.4rem" }}>
              <button className="danger-soft btn-sm" data-cy="post-delete" onClick={() => setPending({ kind: "post" })}>
                <Trash2 size={15} /> Excluir post
              </button>
            </div>
          )}
        </article>
      )}

      {/* comments */}
      <div className="card">
        <h3>Comentários ({comments.length})</h3>

        {comments.length === 0 && <div className="muted">Nenhum comentário ainda.</div>}

        {comments.map((c) => (
          <div className="comment" key={c.id} data-cy={`comment-${c.content}`}>
            <div className="comment-head">
              <span className="comment-author">{c.author}</span>
              <span className="row" style={{ gap: "0.5rem" }}>
                <button
                  type="button"
                  className={`upvote${c.upvoted_by_me ? " active" : ""}`}
                  data-cy="comment-upvote"
                  onClick={() => toggleUpvote(c)}
                  disabled={!logged}
                  aria-pressed={c.upvoted_by_me}
                  title={logged ? (c.upvoted_by_me ? "Remover upvote" : "Dar upvote") : "Entre para votar"}
                >
                  <ArrowBigUp size={15} />
                  <span data-cy="comment-upvote-count">{c.upvotes}</span>
                </button>
                <span className="muted" style={{ fontSize: "0.76rem" }}>{formatDateTime(c.created_at)}</span>
                {canDeleteComment(c) && (
                  <button
                    className="ghost btn-sm"
                    data-cy="comment-delete"
                    title="Excluir comentário"
                    onClick={() => setPending({ kind: "comment", id: c.id })}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </span>
            </div>
            <div>{c.content}</div>
          </div>
        ))}

        {/* composer */}
        {logged ? (
          <form onSubmit={submitComment} style={{ marginTop: "1rem" }}>
            {commentError && (
              <div className="alert error" data-cy="comment-error">
                <AlertCircle size={17} />
                {commentError}
              </div>
            )}
            <label htmlFor="c-text">Adicionar comentário</label>
            <textarea
              id="c-text"
              data-cy="comment-input"
              rows={3}
              maxLength={FORUM_MAX_CONTENT_LENGTH}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário…"
            />
            <div
              className={`char-count${commentText.length >= FORUM_MAX_CONTENT_LENGTH ? " limit" : ""}`}
              data-cy="comment-input-count"
            >
              {commentText.length}/{FORUM_MAX_CONTENT_LENGTH}
            </div>
            <button type="submit" data-cy="comment-submit" disabled={posting}>
              <Send size={15} />
              {posting ? "Enviando…" : "Comentar"}
            </button>
          </form>
        ) : (
          <div className="helper" style={{ marginTop: "1rem" }}>
            <Link href="/login" style={{ color: "var(--accent-2)", fontWeight: 600 }}>
              Entre
            </Link>{" "}
            para comentar.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        loading={deleting}
        title={pending?.kind === "post" ? "Excluir post?" : "Excluir comentário?"}
        message={
          pending?.kind === "post"
            ? "Esta ação remove o post e todos os seus comentários. Não pode ser desfeita."
            : "Esta ação remove o comentário permanentemente."
        }
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
