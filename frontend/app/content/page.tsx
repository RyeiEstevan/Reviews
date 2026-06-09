"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clapperboard, Search, Star, AlertCircle } from "lucide-react";
import { api, ApiError, type ContentItem, type ContentFilter } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function typeLabel(type: string) {
  return { movie: "Filme", series: "Série", book: "Livro" }[type] ?? type;
}

function ScoreDot({ score }: { score: number }) {
  const color =
    score >= 8.5 ? "var(--ok)" : score >= 7 ? "var(--gold)" : "var(--danger)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        color,
        fontWeight: 700,
        fontSize: "0.85rem",
      }}
    >
      <Star size={13} fill={color} stroke="none" />
      {score.toFixed(1)}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ContentCardTile({ item }: { item: ContentItem }) {
  return (
    <Link href={`/content/${item.id}`} style={{ textDecoration: "none" }}>
      <div
        data-cy={`catalog-item-${item.id}`}
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)), var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          cursor: "pointer",
          transition:
            "transform var(--dur) var(--ease), border-color var(--dur) var(--ease)",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(-3px)";
          el.style.borderColor = "var(--border-strong)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = "translateY(0)";
          el.style.borderColor = "var(--border)";
        }}
      >
        {/* Poster */}
        <div
          style={{
            height: "260px",
            background: item.poster_url
              ? `url(${item.poster_url}) center/cover no-repeat, var(--panel-2)`
              : "linear-gradient(145deg, var(--panel-2), var(--panel-3))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {!item.poster_url && (
            <Clapperboard
              size={36}
              style={{ opacity: 0.2, color: "var(--muted)" }}
            />
          )}

          {/* Type badge */}
          <div
            style={{ position: "absolute", bottom: "0.5rem", right: "0.5rem" }}
          >
            <span
              className="badge role no-dot"
              style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem" }}
            >
              {typeLabel(item.type)}
            </span>
          </div>

          {/* Platform badge */}
          {item.platform && (
            <div
              style={{ position: "absolute", top: "0.5rem", left: "0.5rem" }}
            >
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  borderRadius: "var(--r-xs)",
                  padding: "0.15rem 0.45rem",
                  backdropFilter: "blur(4px)",
                }}
              >
                {item.platform}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "0.85rem 0.9rem 0.9rem" }}>
          <div
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              lineHeight: 1.25,
              marginBottom: "0.35rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "var(--text)",
            }}
            title={item.title}
          >
            {item.title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.35rem",
            }}
          >
            <ScoreDot score={item.avg_score} />
            <span style={{ fontSize: "0.74rem", color: "var(--faint)" }}>
              {item.year || "—"}
            </span>
          </div>

          {item.genre.length > 0 && (
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.genre.join(" · ")}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CatalogSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "1rem",
      }}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: "330px", borderRadius: "var(--r-lg)" }}
        />
      ))}
    </div>
  );
}

// ─── Filter options ───────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: ContentFilter | "all"; label: string }[] = [
  { value: "all",    label: "Todos"   },
  { value: "movie",  label: "Filmes"  },
  { value: "series", label: "Séries"  },
  { value: "book",   label: "Livros"  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState(initialQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .listContent({ type: typeFilter !== "all" ? typeFilter : undefined })
      .then((data) => { if (alive) setItems(data); })
      .catch((err) => {
        if (alive)
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar o catálogo."
          );
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [typeFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.genre.some((g) => g.toLowerCase().includes(q)) ||
        (i.platform ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div
      className="public-wrap"
      data-cy="content-page"
      style={{ maxWidth: "1180px", padding: "2.4rem 2.4rem 4rem" }}
    >
      {/* Masthead */}
      <div
        className="feed-masthead"
        style={{
          alignItems: "flex-start",
          flexDirection: "column",
          gap: "1.2rem",
        }}
      >
        <div>
          <div className="kicker" style={{ marginBottom: "0.4rem" }}>
            Reviews · Catálogo
          </div>
          <h1 style={{ margin: 0, fontSize: "2.4rem" }}>Catálogo</h1>
          <p
            style={{ margin: "0.5rem 0 0", color: "var(--muted)", maxWidth: "52ch" }}
          >
            Explore filmes, séries e livros cadastrados na plataforma.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: "relative", width: "100%", maxWidth: "560px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--faint)",
              pointerEvents: "none",
            }}
          />
          <input
            placeholder="Buscar título, gênero ou plataforma…"
            data-cy="catalog-search"
            value={search}
            onChange={(e) => {
              const val = e.target.value;
              setSearch(val);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                const qs = val.trim() ? `?q=${encodeURIComponent(val.trim())}` : "";
                router.replace(`/content${qs}`, { scroll: false });
              }, 350);
            }}
            style={{ marginBottom: 0, paddingLeft: "2.2rem" }}
          />
        </div>

        {/* Type filter */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
          data-cy="catalog-type-filters"
        >
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={typeFilter === opt.value ? "" : "secondary"}
              style={{ padding: "0.38rem 0.85rem", fontSize: "0.82rem" }}
              onClick={() => setTypeFilter(opt.value)}
              data-cy={`catalog-filter-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert error" data-cy="catalog-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {/* Count */}
      {!loading && !error && (
        <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "1.2rem" }}>
          {filtered.length}{" "}
          {filtered.length === 1 ? "obra encontrada" : "obras encontradas"}
        </p>
      )}

      {/* Skeleton */}
      {loading && <CatalogSkeleton />}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="empty" data-cy="catalog-empty">
          <Clapperboard size={28} />
          <p>
            {search.trim()
              ? `Nenhuma obra encontrada para "${search.trim()}".`
              : "Nenhuma obra encontrada."}
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && filtered.length > 0 && (
        <div
          data-cy="catalog-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {filtered.map((item) => (
            <ContentCardTile key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
