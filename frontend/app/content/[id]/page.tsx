/**
 * frontend/app/content/[id]/page.tsx
 *
 * Detail page for a single content item.
 * Shows full metadata, star rating, and the ReviewForm.
 */

"use client";

// 1. Import 'use' from React
import { useEffect, useState, use } from "react";
import { ReviewForm } from "../../../components/ReviewForm";
import { StarRating } from "../../../components/StarRating";
// Updated imports to use the unified api and API_URL
import { api, API_URL, ContentItem } from "../../../lib/api";
import { getToken } from "../../../lib/auth";

interface Review {
  id: string;
  username: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function ContentDetailPage({
  params,
}: {
  // 2. Wrap the params type in a Promise
  params: Promise<{ id: string }>;
}) {
  // 3. Unwrap the params Promise to get the ID safely
  const resolvedParams = use(params);
  const contentId = resolvedParams.id;

  const [item, setItem] = useState<ContentItem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = getToken() ?? "";

  useEffect(() => {
    Promise.all([
      // 4. Use the unwrapped 'contentId' instead of 'params.id'
      api.getContent(contentId),
      fetch(`${API_URL}/content/${contentId}/reviews`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([contentData, reviewData]) => {
        setItem(contentData);
        setReviews(reviewData);
      })
      .catch(() => setError("Conteúdo não encontrado."))
      .finally(() => setLoading(false));
  }, [contentId]); // 5. Update the dependency array to track 'contentId'

  function handleReviewPublished(newReview: {
    rating: number;
    comment: string;
  }) {
    // Optimistically prepend the new review to the top of the list
    const optimistic: Review = {
      id: Date.now().toString(),
      username: "Você",
      rating: newReview.rating,
      comment: newReview.comment,
      created_at: new Date().toISOString(),
    };
    setReviews((prev) => [optimistic, ...prev]);
  }

  if (loading) return <div className="page-loading">Carregando…</div>;
  if (error) return <div className="page-error" role="alert">{error}</div>;
  if (!item) return null;

  return (
    <main className="content-detail-page">
      <article className="content-detail">
        <header className="content-detail__header">
          <h1 className="content-detail__title">{item.title}</h1>
          <div className="content-detail__rating">
            <StarRating value={item.rating} size={24} />
            <span className="content-detail__score">
              {item.rating.toFixed(1)} / 5
            </span>
            <span className="content-detail__review-count">
              ({item.review_count} reviews)
            </span>
          </div>
        </header>

        <dl className="content-detail__meta">
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
        </dl>
      </article>

      {/* Review submission */}
      {token && (
        <section className="content-detail__review-section">
          <ReviewForm
            contentId={item.id}
            token={token}
            onReviewPublished={handleReviewPublished}
          />
        </section>
      )}

      {/* Review list */}
      <section
        className="content-detail__review-list"
        data-testid="review-list"
        aria-label="Lista de comentários"
      >
        <h2>Comentários ({reviews.length})</h2>
        {reviews.length === 0 && (
          <p className="review-list__empty">
            Ainda sem reviews. Seja o primeiro!
          </p>
        )}
        {reviews.map((review) => (
          <div
            key={review.id}
            className="review-item"
            data-testid="review-item"
          >
            <div className="review-item__header">
              <strong>{review.username}</strong>
              <StarRating value={review.rating} size={14} />
              <time
                className="review-item__date"
                dateTime={review.created_at}
              >
                {new Date(review.created_at).toLocaleDateString("pt-BR")}
              </time>
            </div>
            <p className="review-item__comment">{review.comment}</p>
          </div>
        ))}
      </section>
    </main>
  );
}