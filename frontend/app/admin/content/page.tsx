/**
 * frontend/app/(admin)/content/page.tsx
 *
 * Admin content management page.
 * Only accessible to moderador / admin / superadmin roles.
 * Shows the ContentForm and a list with delete buttons.
 */

"use client";

import { useEffect, useState } from "react";
import { ContentCard } from "../../../components/ContentCard";
import { ContentForm } from "../../../components/ContentForm";
// Utilizing the unified api object and new import path
import { ApiError, api, ContentItem } from "../../../lib/api";

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    try {
      // Swapped contentApi.list() for api.listContent()
      const data = await api.listContent();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadItems(); }, []);

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      // Swapped contentApi.delete for api.deleteContent(id). Token is automatic!
      await api.deleteContent(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setDeleteError(
            "Permissão insuficiente. Apenas moderadores podem remover conteúdo."
          );
        } else {
          // The unified ApiError uses .message instead of .detail
          setDeleteError(err.message);
        }
      } else {
        setDeleteError("Falha ao remover conteúdo.");
      }
    }
  }

  function handleSuccess() {
    loadItems();
  }

  return (
    <div className="admin-content-page">
      <h1>Gerenciar Catálogo</h1>

      {deleteError && (
        <div className="page-error" role="alert">
          {deleteError}
        </div>
      )}

      <section className="admin-content-page__form-section">
        {/* Removed token prop since the API wrapper handles authorization centrally */}
        <ContentForm onSuccess={handleSuccess} />
      </section>

      <section className="admin-content-page__list-section">
        <h2>Itens no catálogo ({items.length})</h2>

        {loading && <p>Carregando…</p>}

        {!loading && items.length === 0 && (
          <p className="catalog-empty">Nenhum conteúdo cadastrado.</p>
        )}

        <div className="catalog-grid">
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              canDelete
              onDeleteClick={handleDelete}
            />
          ))}
        </div>
      </section>
    </div>
  );
}