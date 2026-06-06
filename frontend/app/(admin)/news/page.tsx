"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError, type News } from "@/lib/api";

export default function NewsEditorPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<News | null>(null);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      const news = await api.createNews({ title, body, tags });
      setCreated(news);
      setTitle("");
      setBody("");
      setTagsRaw("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "could not publish news");
    }
  }

  return (
    <div data-cy="news-page">
      <h1>News editor</h1>
      <p className="muted">
        Published news appears on the{" "}
        <Link href="/feed" style={{ color: "var(--accent)" }}>
          public feed
        </Link>{" "}
        for everyone.
      </p>

      {error && (
        <div className="alert error" data-cy="news-error">
          {error}
        </div>
      )}
      {created && (
        <div className="alert success" data-cy="news-success">
          Published &quot;{created.title}&quot; with tags: {created.tags.join(", ") || "—"}.
        </div>
      )}

      <div className="card">
        <form onSubmit={publish}>
          <label htmlFor="n-title">Title</label>
          <input id="n-title" data-cy="news-title" value={title} onChange={(e) => setTitle(e.target.value)} />

          <label htmlFor="n-body">Body</label>
          <textarea
            id="n-body"
            data-cy="news-body"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <label htmlFor="n-tags">Tags (comma-separated)</label>
          <input
            id="n-tags"
            data-cy="news-tags"
            placeholder="anime, release, awards"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
          />

          <button type="submit" data-cy="news-publish" disabled={!title}>
            Publish
          </button>
        </form>
      </div>
    </div>
  );
}
