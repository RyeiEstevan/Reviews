/**
 * frontend/app/content/page.tsx
 *
 * Public catalog page.
 * Renders all content items as ContentCard components.
 * The "Já vi / Li" button on each card fires POST /content/{id}/view.
 */

"use client";

import { useEffect, useState } from "react";
import { ContentCard } from "../../components/ContentCard";
// Utilizing the unified api object and new import path
import { api, ContentItem } from "../../lib/api";

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Replaced contentApi.list() with the unified api.listContent()
    api
      .listContent()
      .then(setItems)
      .catch(() => setError("Não foi possível carregar o catálogo."))
      .finally(() => setLoading(false));
  }, []);

  function handleViewRecorded(updated: ContentItem) {
    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  return (
    <main className="catalog-page">
      <header className="catalog-page__header">
        <h1>Catálogo</h1>
        <p className="catalog-page__subtitle">
          Explore filmes, séries e livros. Marque o que já assistiu ou leu.
        </p>
      </header>

      {loading && (
        <div className="catalog-page__loading" aria-live="polite">
          Carregando catálogo…
        </div>
      )}

      {error && (
        <div className="catalog-page__error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="catalog-page__empty">
          Nenhum conteúdo cadastrado ainda.
        </div>
      )}

      <div className="catalog-grid" data-testid="catalog-grid">
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            onViewRecorded={handleViewRecorded}
          />
        ))}
      </div>
    </main>
  );
}