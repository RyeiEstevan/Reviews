"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, AlertCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { translateError } from "@/lib/copy";
import { FORUM_CATEGORIES, FORUM_MAX_CONTENT_LENGTH } from "@/lib/forum";
import { PageHeader } from "@/components/ui";

export default function NewPostPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Writing requires a session. Reading is public, but this page is not.
  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const post = await api.createForumPost({ title, content, category });
      router.push(`/forum/${post.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.message) : "Não foi possível publicar o post");
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  return (
    <div data-cy="forum-new-page" className="stagger">
      <PageHeader
        eyebrow="Fórum"
        title="Novo post"
        description="Compartilhe uma review ou inicie uma discussão com a comunidade."
        actions={
          <Link href="/forum" className="btn secondary">
            <ArrowLeft size={16} />
            Voltar
          </Link>
        }
      />

      {error && (
        <div className="alert error" data-cy="post-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={publish}>
          <label htmlFor="p-title">Título</label>
          <input
            id="p-title"
            data-cy="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Review Ratatouille"
          />

          <label htmlFor="p-content">Conteúdo</label>
          <textarea
            id="p-content"
            data-cy="post-content"
            rows={6}
            maxLength={FORUM_MAX_CONTENT_LENGTH}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva sua opinião…"
          />
          <div
            className={`char-count${content.length >= FORUM_MAX_CONTENT_LENGTH ? " limit" : ""}`}
            data-cy="post-content-count"
          >
            {content.length}/{FORUM_MAX_CONTENT_LENGTH}
          </div>

          <label htmlFor="p-category">Categoria</label>
          <select
            id="p-category"
            data-cy="post-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="" disabled>
              Selecione uma categoria
            </option>
            {FORUM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button type="submit" data-cy="post-publish" disabled={submitting} style={{ marginTop: "0.3rem" }}>
            <Send size={16} />
            {submitting ? "Publicando…" : "Publicar"}
          </button>
        </form>
      </div>
    </div>
  );
}
