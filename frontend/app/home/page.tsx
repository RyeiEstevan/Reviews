"use client";

/**
 * Home page — public feed for the Reviews platform.
 *
 * Architecture mirrors app/(admin)/ exactly:
 *   • "use client" at the top
 *   • api.home() called inside useEffect with an alive-flag cleanup
 *   • PageHeader from @/components/ui
 *   • Same CSS variable tokens (--panel, --accent, --border, etc.)
 *   • data-cy selectors on every interactive element for Cypress E2E
 *
 * Sections:
 *   1. Hero trending carousel  (data-cy="trending-carousel")
 *   2. Top-rated horizontal scroll  (data-cy="top-rated-carousel")
 *   3. Ranking panels  (data-cy="rankings")
 *   4. Search bar  (data-cy="home-search")
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Clapperboard,
  ChevronLeft,
  ChevronRight,
  Star,
  Eye,
  Sparkles,
  Search,
  AlertCircle,
  TrendingUp,
  Medal,
  Zap,
} from "lucide-react";
import {
  api,
  ApiError,
  type HomeResponse,
  type ContentCard,
  type RankingBlock,
  type Period,
  type ContentFilter,
} from "@/lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function typeLabel(type: string): string {
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

// ─── ContentCardTile — used in both carousels ──────────────────────────────────

function ContentCardTile({
  card,
  rank,
  "data-cy": dataCy,
}: {
  card: ContentCard;
  rank?: number;
  "data-cy"?: string;
}) {
  return (
    <div
      className="home-card"
      data-cy={dataCy ?? `media-card-${card.id}`}
      style={{
        width: "100%",
        background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)), var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        position: "relative",
        transition: "transform var(--dur) var(--ease), border-color var(--dur) var(--ease)",
        cursor: "pointer",
      }}
    >
      {/* Poster placeholder */}
      <div
        style={{
          height: "260px",
          flexShrink: 0,
          background: card.poster_url
            ? `url(${card.poster_url}) center/contain no-repeat, var(--panel-2)`
            : "linear-gradient(145deg, var(--panel-2), var(--panel-3))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {!card.poster_url && (
          <Clapperboard size={36} style={{ opacity: 0.2, color: "var(--muted)" }} />
        )}
        {rank !== undefined && (
          <div
            style={{
              position: "absolute",
              top: "0.5rem",
              left: "0.5rem",
              background: "var(--accent)",
              color: "#fff",
              borderRadius: "var(--r-xs)",
              padding: "0.15rem 0.5rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            #{rank}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: "0.5rem",
            right: "0.5rem",
          }}
        >
          <span
            className="badge role no-dot"
            style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem" }}
          >
            {typeLabel(card.type)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "0.85rem 0.9rem 0.9rem" }}>
        <div
          style={{
            fontSize: "0.9rem",
            fontWeight: 600,
            lineHeight: 1.25,
            marginBottom: "0.4rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "var(--text)",
          }}
          title={card.title}
        >
          {card.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <ScoreDot score={card.avg_score} />
          <span style={{ fontSize: "0.74rem", color: "var(--faint)" }}>
            {card.year || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── HorizontalCarousel ───────────────────────────────────────────────────────
//
// Uses a percentage-based CSS carousel:
//   - clip window = 100% of the section (no pixel math needed)
//   - each card = calc(100%/VISIBLE - gap*(VISIBLE-1)/VISIBLE)
//   - track slides via translateX(calc(-index * (100% + gap) / VISIBLE))
//
const CARD_GAP = 14; // px between cards
const VISIBLE = 5;   // cards visible at once

function HorizontalCarousel({
  title,
  eyebrow,
  icon,
  items,
  dataCy,
}: {
  title: string;
  eyebrow?: string;
  icon: React.ReactNode;
  items: ContentCard[];
  dataCy: string;
}) {
  const maxIndex = Math.max(0, items.length - VISIBLE);
  const [index, setIndex] = useState(0);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(maxIndex, i + 1)), [maxIndex]);

  // Each card is 1/VISIBLE of the window minus its share of the gaps.
  const cardWidth = `calc(${100 / VISIBLE}% - ${(CARD_GAP * (VISIBLE - 1)) / VISIBLE}px)`;
  // One step = one card width + one gap, expressed as a fraction of the window.
  const stepX = `calc((100% + ${CARD_GAP}px) / ${VISIBLE})`;

  return (
    <section
      data-cy={dataCy}
      style={{ marginBottom: "2.4rem" }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div>
          {eyebrow && (
            <div
              style={{
                fontSize: "0.66rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--accent-2)",
                fontWeight: 600,
                marginBottom: "0.25rem",
              }}
            >
              {eyebrow}
            </div>
          )}
          <h2
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--text)",
            }}
          >
            {icon}
            {title}
          </h2>
        </div>

        {/* Arrow controls — disabled at boundaries, no looping */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            className="secondary"
            style={{ padding: "0.45rem 0.6rem" }}
            onClick={prev}
            disabled={index === 0}
            data-cy={`${dataCy}-prev`}
            aria-label="Anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="secondary"
            style={{ padding: "0.45rem 0.6rem" }}
            onClick={next}
            disabled={index >= maxIndex}
            data-cy={`${dataCy}-next`}
            aria-label="Próximo"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Clip window: full section width, hides the off-screen cards */}
      <div
        data-cy={`${dataCy}-track`}
        style={{ overflow: "hidden" }}
      >
        {items.length === 0 ? (
          <div
            className="empty"
            style={{ minHeight: "120px", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            Nenhum item encontrado.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: `${CARD_GAP}px`,
              transform: `translateX(calc(-${index} * ${stepX}))`,
              transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
              willChange: "transform",
            }}
          >
            {items.map((card, i) => (
              <div
                key={card.id || i}
                style={{ flexShrink: 0, width: cardWidth }}
              >
                <ContentCardTile
                  card={card}
                  rank={i + 1}
                  data-cy={`${dataCy}-item-${card.title}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── RankingPanel ─────────────────────────────────────────────────────────────

function RankingPanel({ block }: { block: RankingBlock }) {
  const icons: Record<string, React.ReactNode> = {
    "Most Viewed":  <Eye size={16} style={{ color: "var(--accent-2)" }} />,
    "Top Rated":    <Star size={16} style={{ color: "var(--gold)" }} />,
    "New Arrivals": <Zap size={16} style={{ color: "var(--ok)" }} />,
  };

  return (
    <div
      className="card"
      data-cy={`ranking-panel-${block.title.replace(/\s+/g, "-").toLowerCase()}`}
      style={{ marginBottom: 0 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.9rem",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          {icons[block.title] ?? <Medal size={16} />}
          {block.title}
        </h3>
        <span
          className="badge role no-dot"
          style={{ fontSize: "0.68rem" }}
        >
          {block.badge}
        </span>
      </div>

      <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {block.items.map((item) => (
          <li
            key={item.position}
            data-cy={`ranking-item-${item.content.title}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.55rem 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              style={{
                minWidth: "1.4rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: item.position <= 3 ? "var(--accent-2)" : "var(--faint)",
                textAlign: "right",
              }}
            >
              {item.position}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.content.title}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                {typeLabel(item.content.type)} · {item.content.year || "—"}
              </div>
            </div>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--text-soft)",
                whiteSpace: "nowrap",
              }}
            >
              {item.value}
            </span>
          </li>
        ))}
        {block.items.length === 0 && (
          <li style={{ padding: "1rem 0", color: "var(--muted)", fontSize: "0.88rem", textAlign: "center" }}>
            Sem dados para este período.
          </li>
        )}
      </ol>
    </div>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function CarouselSkeleton() {
  return (
    <div style={{ display: "flex", gap: "0.9rem", overflow: "hidden" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ flex: "0 0 200px", height: "320px", borderRadius: "var(--r-lg)" }}
        />
      ))}
    </div>
  );
}

// ─── SearchBar ────────────────────────────────────────────────────────────────

function SearchBar() {
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    // Navigate to the search results page once implemented.
    // For now, redirect with a query string that the search route can consume.
    window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-cy="home-search-form"
      style={{ display: "flex", gap: "0.6rem", maxWidth: "560px" }}
    >
      <div style={{ position: "relative", flex: 1 }}>
        <Search
          size={16}
          className="muted"
          style={{
            position: "absolute",
            left: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
        <input
          placeholder="Buscar filmes, séries, livros…"
          data-cy="home-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: 0, paddingLeft: "2.2rem" }}
        />
      </div>
      <button
        type="submit"
        data-cy="home-search-submit"
        disabled={!query.trim()}
      >
        Buscar
      </button>
    </form>
  );
}

// ─── Filter controls ──────────────────────────────────────────────────────────

// "month" is removed: trending is always locked to 30 days and handles that window.
// This selector only governs Top Rated and Rankings.
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "year", label: "Este ano" },
  { value: "all",  label: "Todos"    },
];

const TYPE_OPTIONS: { value: ContentFilter; label: string }[] = [
  { value: "all",    label: "Todos"   },
  { value: "movie",  label: "Filmes"  },
  { value: "series", label: "Séries"  },
  { value: "book",   label: "Livros"  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("year");
  const [contentType, setContentType] = useState<ContentFilter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.home(period, contentType);
        if (alive) setData(res);
      } catch (err) {
        if (alive)
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar o feed."
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [period, contentType]);

  return (
    <div
      className="public-wrap"
      data-cy="home-page"
      style={{ maxWidth: "1180px", padding: "2.4rem 2.4rem 4rem" }}
    >
      {/* ── Masthead ── */}
      <div
        className="feed-masthead"
        style={{ alignItems: "flex-start", flexDirection: "column", gap: "1.2rem" }}
      >
        <div>
          <div
            className="kicker"
            style={{ marginBottom: "0.4rem" }}
          >
            Reviews · Descoberta
          </div>
          <h1 style={{ margin: 0, fontSize: "2.4rem" }}>
            Em destaque
          </h1>
          <p style={{ margin: "0.5rem 0 0", color: "var(--muted)", maxWidth: "52ch" }}>
            As obras mais vistas, melhores avaliadas e os novos lançamentos da plataforma.
          </p>
        </div>

        <SearchBar />

        {/* Type filter only — period filter lives near rankings */}
        <div
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}
          data-cy="home-filters"
        >
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={contentType === opt.value ? "" : "secondary"}
              style={{ padding: "0.38rem 0.85rem", fontSize: "0.82rem" }}
              onClick={() => setContentType(opt.value)}
              data-cy={`filter-type-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert error" data-cy="home-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {/* ── Trending carousel ── */}
      {loading ? (
        <section style={{ marginBottom: "2.4rem" }}>
          <div style={{ marginBottom: "1rem", height: "1.5rem", width: "160px" }} className="skeleton" />
          <CarouselSkeleton />
        </section>
      ) : !error ? (
        <HorizontalCarousel
          title="Em Alta"
          eyebrow="Últimos 30 dias"
          icon={<TrendingUp size={20} style={{ color: "var(--accent-2)" }} />}
          items={data?.trending ?? []}
          dataCy="trending-carousel"
        />
      ) : null}

      {/* ── Top-rated carousel ── */}
      {loading ? (
        <section style={{ marginBottom: "2.4rem" }}>
          <div style={{ marginBottom: "1rem", height: "1.5rem", width: "220px" }} className="skeleton" />
          <CarouselSkeleton />
        </section>
      ) : !error ? (
        <HorizontalCarousel
          title="Mais avaliados"
          eyebrow="Últimos 30 dias"
          icon={<Star size={20} style={{ color: "var(--gold)" }} />}
          items={data?.top_rated ?? []}
          dataCy="top-rated-carousel"
        />
      ) : null}

      {/* ── Rankings ── */}
      <section data-cy="rankings" style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sparkles size={18} style={{ color: "var(--accent-2)" }} />
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Rankings</h2>
          </div>

          {/* Period filter — controls Top Rated + Rankings (trending is always 30-day) */}
          <div
            style={{ display: "flex", gap: "0.4rem" }}
            data-cy="home-period-filters"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={period === opt.value ? "" : "secondary"}
                style={{ padding: "0.38rem 0.85rem", fontSize: "0.82rem" }}
                onClick={() => setPeriod(opt.value)}
                data-cy={`filter-period-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: "320px", borderRadius: "var(--r-lg)" }} />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {(data?.rankings ?? []).map((block) => (
              <RankingPanel key={block.title} block={block} />
            ))}
          </div>
        )}
      </section>

      {/* ── Back link ── */}
      <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
        <Link
          href="/dashboard"
          className="btn secondary"
          style={{ fontSize: "0.85rem" }}
        >
          Painel administrativo
        </Link>
      </div>
    </div>
  );
}   