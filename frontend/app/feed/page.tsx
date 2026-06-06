"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertCircle, Newspaper } from "lucide-react";
import { api, ApiError, type News } from "@/lib/api";
import { translateError } from "@/lib/copy";

// Feed público de notícias — sem autenticação. Espelha GET /news, visível a qualquer visitante.
export default function PublicFeedPage() {
  const [news, setNews] = useState<News[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .publicNews()
      .then(setNews)
      .catch((err) =>
        setError(err instanceof ApiError ? translateError(err.message) : "Não foi possível carregar o feed"),
      );
  }, []);

  return (
    <div className="public-wrap" data-cy="public-feed">
      <div className="feed-masthead">
        <div>
          <div className="kicker">Reviews · Imprensa</div>
          <h1>Notícias</h1>
        </div>
        <Link href="/dashboard" className="btn secondary">
          Painel
          <ArrowRight size={16} />
        </Link>
      </div>

      {error && (
        <div className="alert error" data-cy="feed-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {news.length === 0 && !error && (
        <div className="empty">
          <Newspaper size={28} style={{ display: "block", margin: "0 auto 0.5rem", opacity: 0.5 }} />
          Nenhuma notícia publicada ainda.
        </div>
      )}

      <div className="stagger">
        {news.map((n) => (
          <article key={n.id} className="card" data-cy={`feed-item-${n.title}`}>
            <h3>{n.title}</h3>
            {n.body && <p className="feed-body">{n.body}</p>}
            <div>
              {n.tags.map((t) => (
                <span key={t} className="tag" data-cy="feed-tag">
                  #{t}
                </span>
              ))}
            </div>
            <div className="feed-byline">Publicado pela administração do Reviews</div>
          </article>
        ))}
      </div>
    </div>
  );
}
