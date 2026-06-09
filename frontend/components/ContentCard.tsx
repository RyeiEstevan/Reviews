"use client";

/**
 * frontend/components/ContentCard.tsx
 *
 * Renders a catalog content card with:
 * - Title, genre, year, duration metadata
 * - Star rating display
 * - "Já vi / Li" button that fires POST /content/{id}/view
 *
 * Props:
 * item        — the ContentItem from the API
 * onViewRecorded — optional callback after the view is recorded (e.g. refresh)
 */

import { useState } from "react";
// Utilizing the unified api object
import { api, ContentItem } from "../lib/api";
import { StarRating } from "./StarRating";

interface ContentCardProps {
  item: ContentItem;
  onViewRecorded?: (updated: ContentItem) => void;
  onDeleteClick?: (id: string) => void;
  canDelete?: boolean;
}

export function ContentCard({
  item,
  onViewRecorded,
  onDeleteClick,
  canDelete = false,
}: ContentCardProps) {
  const [viewed, setViewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleView() {
    if (viewed || loading) return;
    setLoading(true);
    setError(null);
    try {
      // Swapped contentApi.recordView with api.recordContentView
      const updated = await api.recordContentView(item.id);
      setViewed(true);
      onViewRecorded?.(updated);
    } catch (err: unknown) {
      setError("Não foi possível registrar a visualização.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="content-card" data-testid={`content-card-${item.id}`}>
      <div className="content-card__body">
        <header className="content-card__header">
          <h3 className="content-card__title">{item.title}</h3>
          <StarRating value={item.rating} size={16} />
        </header>

        <dl className="content-card__meta">
          <div>
            <dt>Gênero</dt>
            <dd>{item.genre}</dd>
          </div>
          <div>
            <dt>Ano</dt>
            <dd>{item.release_year}</dd>
          </div>
          <div>
            <dt>Duração</dt>
            <dd>{item.duration}</dd>
          </div>
          <div>
            <dt>Reviews</dt>
            <dd>{item.review_count}</dd>
          </div>
        </dl>
      </div>

      <footer className="content-card__footer">
        {error && (
          <p className="content-card__error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className={`btn btn--view ${viewed ? "btn--viewed" : ""}`}
          onClick={handleView}
          disabled={viewed || loading}
          aria-pressed={viewed}
          aria-label={
            viewed
              ? `Você já marcou ${item.title} como visto`
              : `Marcar ${item.title} como visto`
          }
        >
          {loading ? (
            <span aria-hidden>⏳</span>
          ) : viewed ? (
            <>✓ Visto</>
          ) : (
            <>👁 Já vi / Li</>
          )}
        </button>

        {canDelete && onDeleteClick && (
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => onDeleteClick(item.id)}
            aria-label={`Remover ${item.title}`}
          >
            Remover
          </button>
        )}
      </footer>
    </article>
  );
}