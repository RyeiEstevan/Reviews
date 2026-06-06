"use client";

import { useState } from "react";
import Link from "next/link";
import { Newspaper, Send, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { api, ApiError, type News } from "@/lib/api";
import { translateError } from "@/lib/copy";
import { PageHeader } from "@/components/ui";

export default function NewsEditorPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<News | null>(null);

  const parsedTags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    try {
      const news = await api.createNews({ title, body, tags: parsedTags });
      setCreated(news);
      setTitle("");
      setBody("");
      setTagsRaw("");
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.message) : "Não foi possível publicar a notícia");
    }
  }

  return (
    <div data-cy="news-page" className="stagger">
      <PageHeader
        eyebrow="Editorial"
        title="Editor de notícias"
        description={
          <>
            Notícias publicadas aparecem no{" "}
            <Link href="/feed" style={{ color: "var(--accent-2)", fontWeight: 600 }}>
              feed público
            </Link>{" "}
            para todos.
          </>
        }
        actions={
          <Link href="/feed" className="btn secondary">
            <ExternalLink size={16} />
            Ver feed
          </Link>
        }
      />

      {error && (
        <div className="alert error" data-cy="news-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}
      {created && (
        <div className="alert success" data-cy="news-success">
          <CheckCircle2 size={17} />
          Notícia &quot;{created.title}&quot; publicada com tags: {created.tags.join(", ") || "—"}.
        </div>
      )}

      <div className="card">
        <h3>
          <Newspaper size={18} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
          Escrever notícia
        </h3>
        <form onSubmit={publish}>
          <label htmlFor="n-title">Título</label>
          <input id="n-title" data-cy="news-title" value={title} onChange={(e) => setTitle(e.target.value)} />

          <label htmlFor="n-body">Conteúdo</label>
          <textarea
            id="n-body"
            data-cy="news-body"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <label htmlFor="n-tags">Tags (separadas por vírgula)</label>
          <input
            id="n-tags"
            data-cy="news-tags"
            placeholder="anime, lançamento, prêmios"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
          />
          {parsedTags.length > 0 && (
            <div style={{ margin: "-0.3rem 0 0.9rem" }}>
              {parsedTags.map((t) => (
                <span key={t} className="tag">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <button type="submit" data-cy="news-publish" disabled={!title}>
            <Send size={16} />
            Publicar
          </button>
        </form>
      </div>
    </div>
  );
}
