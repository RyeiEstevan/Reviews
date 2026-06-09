"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquarePlus, AlertCircle, Inbox, MessageCircle } from "lucide-react";
import { api, ApiError, type ForumPost } from "@/lib/api";
import { translateError, formatDateTime } from "@/lib/copy";
import { FORUM_CATEGORIES, type ForumCategory } from "@/lib/forum";

// "" = no filter (all categories). Otherwise one of FORUM_CATEGORIES.
type Filter = "" | ForumCategory;

export default function ForumHomePage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [filter, setFilter] = useState<Filter>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Drop a stale in-flight request when the filter changes, so a slow "all
    // posts" fetch can't overwrite a newer category's result (and vice-versa).
    let active = true;
    setLoading(true);
    setError(null);
    api
      .listForumPosts(filter)
      .then((data) => {
        if (active) setPosts(data);
      })
      .catch((err) => {
        if (active)
          setError(err instanceof ApiError ? translateError(err.message) : "Não foi possível carregar os posts");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter]);

  return (
    <div data-cy="forum-page">
      <div className="feed-masthead">
        <div>
          <div className="kicker">Reviews · Comunidade</div>
          <h1>Fórum</h1>
        </div>
        <Link href="/forum/novo" className="btn" data-cy="forum-new-post">
          <MessageSquarePlus size={16} />
          Novo post
        </Link>
      </div>

      {/* category filter */}
      <div className="cat-filter" data-cy="forum-filter" style={{ marginBottom: "1.3rem" }}>
        <button
          className={`cat-chip${filter === "" ? " active" : ""}`}
          data-cy="cat-chip-todos"
          onClick={() => setFilter("")}
        >
          Todos
        </button>
        {FORUM_CATEGORIES.map((c) => (
          <button
            key={c}
            className={`cat-chip${filter === c ? " active" : ""}`}
            data-cy={`cat-chip-${c}`}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert error" data-cy="forum-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {loading && <div className="muted">Carregando…</div>}

      {!loading && posts.length === 0 && !error && (
        <div className="empty" data-cy="forum-empty">
          <Inbox />
          {filter
            ? "Não há posts disponíveis nessa categoria."
            : "Nenhum post no fórum ainda. Seja o primeiro a publicar!"}
        </div>
      )}

      <div className="stagger">
        {posts.map((p) => (
          <Link key={p.id} href={`/forum/${p.id}`} className="card" data-cy={`post-card-${p.title}`}>
            <div className="post-meta">
              {p.category && <span className="tag">{p.category}</span>}
              <span>
                por <b>{p.owner}</b>
              </span>
              <span>· {formatDateTime(p.created_at)}</span>
            </div>
            <h3>{p.title}</h3>
            {p.content && (
              <p className="feed-body" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {p.content}
              </p>
            )}
            <div className="muted" style={{ fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <MessageCircle size={14} /> Ver discussão
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
