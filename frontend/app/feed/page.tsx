"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, type News } from "@/lib/api";

// Public news feed — no authentication. Mirrors GET /news, visible to every visitor.
export default function PublicFeedPage() {
  const [news, setNews] = useState<News[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .publicNews()
      .then(setNews)
      .catch((err) => setError(err instanceof ApiError ? err.message : "could not load the feed"));
  }, []);

  return (
    <div className="public-wrap" data-cy="public-feed">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Reviews — News</h1>
        <Link href="/dashboard" className="muted">
          Admin →
        </Link>
      </div>

      {error && (
        <div className="alert error" data-cy="feed-error">
          {error}
        </div>
      )}

      {news.length === 0 && !error && <p className="muted">No news published yet.</p>}

      {news.map((n) => (
        <article key={n.id} className="card" data-cy={`feed-item-${n.title}`}>
          <h3>{n.title}</h3>
          <div>
            {n.tags.map((t) => (
              <span key={t} className="tag" data-cy="feed-tag">
                #{t}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
