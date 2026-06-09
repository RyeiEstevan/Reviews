"use client";

import { useEffect, useState, use } from "react";
import { ReviewForm } from "../../../components/ReviewForm";
import { api, type ContentItem } from "../../../lib/api";
import { getToken } from "../../../lib/auth";
import { Clapperboard, Star } from "lucide-react";

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = getToken() ?? "";

  useEffect(() => {
    api
      .getContent(id)
      .then(setItem)
      .catch(() => setError("Conteúdo não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading">Carregando…</div>;
  if (error) return <div className="page-error" role="alert">{error}</div>;
  if (!item) return null;

  const scoreColor =
    item.avg_score >= 8.5
      ? "var(--ok)"
      : item.avg_score >= 7
      ? "var(--gold)"
      : "var(--danger)";

  const typeLabel =
    { movie: "Filme", series: "Série", book: "Livro" }[item.type] ?? item.type;

  return (
    <main className="content-detail-page">
      <article className="content-detail">
        {/* Poster */}
        <div
          style={{
            width: "200px",
            height: "290px",
            borderRadius: "var(--r-lg)",
            background: item.poster_url
              ? `url(${item.poster_url}) center/cover no-repeat, var(--panel-2)`
              : "linear-gradient(145deg, var(--panel-2), var(--panel-3))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginBottom: "1.5rem",
          }}
        >
          {!item.poster_url && (
            <Clapperboard size={36} style={{ opacity: 0.2, color: "var(--muted)" }} />
          )}
        </div>

        <header className="content-detail__header">
          <h1 className="content-detail__title">{item.title}</h1>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                color: scoreColor,
                fontWeight: 700,
                fontSize: "1.1rem",
              }}
            >
              <Star size={16} fill={scoreColor} stroke="none" />
              {item.avg_score.toFixed(1)}
            </span>
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              ({item.review_count.toLocaleString("pt-BR")} reviews)
            </span>
          </div>
        </header>

        <dl className="content-detail__meta">
          <div>
            <dt>Tipo</dt>
            <dd><span className="badge role no-dot">{typeLabel}</span></dd>
          </div>
          <div>
            <dt>Ano</dt>
            <dd>{item.year}</dd>
          </div>
          {item.platform && (
            <div>
              <dt>Plataforma</dt>
              <dd>{item.platform}</dd>
            </div>
          )}
          {item.director && (
            <div>
              <dt>Diretor / Autor</dt>
              <dd>{item.director}</dd>
            </div>
          )}
          {item.genre.length > 0 && (
            <div>
              <dt>Gêneros</dt>
              <dd>{item.genre.join(", ")}</dd>
            </div>
          )}
        </dl>

        {item.description && (
          <p style={{ color: "var(--muted)", lineHeight: 1.6, marginTop: "1rem" }}>
            {item.description}
          </p>
        )}
      </article>

      {token && (
        <section className="content-detail__review-section">
          <ReviewForm
            contentId={item.id}
            token={token}
          />
        </section>
      )}
    </main>
  );
}
