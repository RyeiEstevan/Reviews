"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Clapperboard, Star } from "lucide-react";
import { api, type ContentCard, type ContentFilter } from "../../lib/api";

const TYPE_OPTIONS: { value: ContentFilter; label: string }[] = [
  { value: "all",    label: "Todas" },
  { value: "movie",  label: "Filmes" },
  { value: "series", label: "Séries" },
  { value: "book",   label: "Livros" },
];

const DEBOUNCE_MS = 350;

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";

  const [query, setQuery]           = useState(initialQ);
  const [typeFilter, setTypeFilter] = useState<ContentFilter>("all");
  const [allResults, setAllResults] = useState<ContentCard[]>([]);
  const [searched, setSearched]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  // Pre-populate from URL on first load only
  useEffect(() => {
    if (initialQ.trim() && !isTyping.current) {
      runSearch(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search as you type
  useEffect(() => {
    if (!isTyping.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setAllResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      router.replace(`/search?q=${encodeURIComponent(query.trim())}`, { scroll: false });
      runSearch(query.trim());
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function runSearch(term: string) {
    if (!term.trim()) return;
    setLoading(true);
    api
      .search(term)
      .then((res) => {
        setAllResults(res.results);
        setSearched(true);
      })
      .catch(() => {
        setAllResults([]);
        setSearched(true);
      })
      .finally(() => setLoading(false));
  }

  const results =
    typeFilter === "all"
      ? allResults
      : allResults.filter((r) => r.type === typeFilter);

  const noResults = searched && results.length === 0;

  const typeLabel = (t: string) =>
    ({ movie: "Filme", series: "Série", book: "Livro" }[t] ?? t);

  return (
    <div className="public-wrap">
      {/* ── Search form ──────────────────────────────────────────────────── */}
      <div
        data-cy="search-form"
        style={{ position: "relative", marginBottom: "1.25rem" }}
      >
        <Search
          size={16}
          style={{
            position: "absolute", left: "0.75rem", top: "50%",
            transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none",
          }}
        />
        <input
          ref={inputRef}
          data-cy="search-input"
          type="text"
          value={query}
          onChange={(e) => { isTyping.current = true; setQuery(e.target.value); }}
          placeholder="Buscar por título ou descrição…"
          style={{ paddingLeft: "2.25rem", width: "100%" }}
          autoFocus
        />
      </div>

      {/* ── Type filter pills ─────────────────────────────────────────────── */}
      {searched && allResults.length > 0 && (
        <div
          data-cy="type-filter"
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}
        >
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              data-cy={`filter-${opt.value}`}
              className={typeFilter === opt.value ? "" : "secondary"}
              onClick={() => setTypeFilter(opt.value)}
              style={{ padding: "0.3rem 0.85rem", fontSize: "0.85rem" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* ── No results ────────────────────────────────────────────────────── */}
      {noResults && (
        <div
          data-cy="no-results"
          style={{ textAlign: "center", padding: "3rem 0", color: "var(--muted)" }}
        >
          <Search size={40} style={{ opacity: 0.2, marginBottom: "1rem" }} />
          <p style={{ fontSize: "1.1rem" }}>Nenhum resultado encontrado</p>
          <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
            Nenhuma obra encontrada para{" "}
            <strong data-cy="no-results-term">&ldquo;{initialQ}&rdquo;</strong>
          </p>
        </div>
      )}

      {/* ── Results list ──────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <ul
          data-cy="search-results"
          style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {results.map((item) => (
            <li key={item.id} data-cy="search-result-item">
              <Link
                href={`/content/${item.id}`}
                className="card"
                style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.9rem 1rem" }}
              >
                <div
                  style={{
                    width: 48, height: 68, flexShrink: 0, borderRadius: "var(--r-md)",
                    background: item.poster_url
                      ? `url(${item.poster_url}) center/cover no-repeat, var(--panel-2)`
                      : "linear-gradient(145deg, var(--panel-2), var(--panel-3))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {!item.poster_url && <Clapperboard size={18} style={{ opacity: 0.2 }} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    data-cy="result-title"
                    style={{ fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {item.title}
                  </p>
                  <p style={{ color: "var(--muted)", fontSize: "0.8rem", margin: "0.2rem 0 0" }}>
                    <span className="badge role no-dot" style={{ marginRight: "0.4rem" }}>
                      {typeLabel(item.type)}
                    </span>
                    {item.year}
                    {item.platform && ` · ${item.platform}`}
                  </p>
                </div>

                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--gold)", fontWeight: 700, flexShrink: 0 }}>
                  <Star size={13} fill="currentColor" stroke="none" />
                  {item.avg_score.toFixed(1)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
