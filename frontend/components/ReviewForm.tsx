"use client";

/**
 * frontend/components/ReviewForm.tsx
 *
 * Inline review (rating + comment) form.
 * Scenarios covered:
 *   - publicação de review com sucesso
 *   - tentativa de envio de review vazia (fields turn red)
 */

import { useState } from "react";
import { StarRating } from "./StarRating";

interface ReviewFormProps {
  contentId: string;
  token: string;
  onReviewPublished?: (review: { rating: number; comment: string }) => void;
}

export function ReviewForm({ contentId, token, onReviewPublished }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ rating?: boolean; comment?: boolean }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit() {
    // Client-side required-field check
    const newErrors: typeof errors = {};
    if (rating === 0) newErrors.rating = true;
    if (!comment.trim()) newErrors.comment = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorMessage(
        "Por favor, preencha a nota e o comentário antes de enviar"
      );
      setSuccessMessage(null);
      return;
    }

    setErrors({});
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const BASE =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${BASE}/content/${contentId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail ?? "Erro ao publicar review.");
      }

      setSuccessMessage("Sua review foi publicada com sucesso!");
      onReviewPublished?.({ rating, comment });
      setRating(0);
      setComment("");
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Falha ao publicar review."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="review-form" data-testid="review-form">
      <h3 className="review-form__heading">Escreva sua review</h3>

      {successMessage && (
        <div
          className="review-form__success"
          role="status"
          aria-live="polite"
          data-testid="review-success"
        >
          ✓ {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          className="review-form__error"
          role="alert"
          aria-live="assertive"
          data-testid="review-error"
        >
          {errorMessage}
        </div>
      )}

      <div
        className={`form-field ${errors.rating ? "form-field--error" : ""}`}
        data-testid="rating-field"
      >
        <label>Nota *</label>
        <StarRating
          value={rating}
          interactive
          onChange={setRating}
          hasError={errors.rating}
          size={28}
        />
        {errors.rating && (
          <span className="form-field__error" role="alert">
            Selecione uma nota.
          </span>
        )}
      </div>

      <div
        className={`form-field ${errors.comment ? "form-field--error" : ""}`}
        data-testid="comment-field"
      >
        <label htmlFor="review-comment">Comentário *</label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Escreva seu comentário aqui…"
          aria-invalid={errors.comment}
          aria-describedby={errors.comment ? "review-comment-err" : undefined}
        />
        {errors.comment && (
          <span
            id="review-comment-err"
            className="form-field__error"
            role="alert"
          >
            Escreva um comentário.
          </span>
        )}
      </div>

      <button
        type="button"
        className="btn btn--primary"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Enviando…" : "Enviar"}
      </button>
    </div>
  );
}
