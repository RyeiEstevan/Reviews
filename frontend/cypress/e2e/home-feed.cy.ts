/**
 * Home feed E2E tests — mirrors LandingPage.feature scenarios.
 *
 * Patterns follow news-feed.cy.ts and artists.cy.ts:
 *   • cy.intercept() stubs the /home API so tests are deterministic and fast
 *   • data-cy selectors only (never CSS classes or tag names)
 *   • No login required — the home page is public
 *
 * Scenarios covered:
 *   1. Trending carousel renders with works (#LandingPage-1)
 *   2. Top-rated carousel renders with scores (#LandingPage-2)
 *   3. Horizontal scroll via arrow buttons (#LandingPage-3)
 *   4. Search bar navigates to results page (#LandingPage-4)
 *   5. Period filter changes the API call
 *   6. Media-type filter changes the API call
 *   7. Empty state renders without crashing
 *   8. API error shows error alert
 */

const API = Cypress.env("apiUrl") as string;

// ─── Shared fixture ───────────────────────────────────────────────────────────

const TRENDING_ITEMS = [
  { id: "t1", title: "Dune: Part Two", type: "movie",  year: 2024, poster_url: null, avg_score: 8.9, review_count: 500, platform: null },
  { id: "t2", title: "Shōgun",         type: "series", year: 2024, poster_url: null, avg_score: 9.4, review_count: 200, platform: null },
  { id: "t3", title: "Fallout",         type: "series", year: 2024, poster_url: null, avg_score: 8.5, review_count: 300, platform: null },
];

// Extended fixture used for scroll tests — needs more than VISIBLE (5) items
const TRENDING_ITEMS_EXTENDED = [
  ...TRENDING_ITEMS,
  { id: "t4", title: "Oppenheimer",    type: "movie",  year: 2023, poster_url: null, avg_score: 9.1, review_count: 800, platform: null },
  { id: "t5", title: "Intermezzo",     type: "movie",  year: 2024, poster_url: null, avg_score: 7.9, review_count: 120, platform: null },
  { id: "t6", title: "Obsession",      type: "movie",  year: 2026, poster_url: null, avg_score: 7.1, review_count: 150, platform: null },
];

const TOP_RATED_ITEMS = [TRENDING_ITEMS[1], TRENDING_ITEMS[0], TRENDING_ITEMS[2]];

const RANKINGS = [
  {
    title: "Most Viewed",
    badge: "This Year",
    items: TRENDING_ITEMS.slice(0, 3).map((m, i) => ({
      position: i + 1,
      media: m,
      value: `${(15000 - i * 3000).toLocaleString()} views`,
    })),
  },
  {
    title: "Top Rated",
    badge: "This Year",
    items: TOP_RATED_ITEMS.map((m, i) => ({
      position: i + 1,
      media: m,
      value: m.avg_score.toFixed(1),
    })),
  },
  {
    title: "New Arrivals",
    badge: "This Week",
    items: TRENDING_ITEMS.slice(0, 2).map((m, i) => ({
      position: i + 1,
      media: m,
      value: "New",
    })),
  },
];

const HOME_FIXTURE = { trending: TRENDING_ITEMS, top_rated: TOP_RATED_ITEMS, rankings: RANKINGS };

const HOME_FIXTURE_EXTENDED = {
  trending: TRENDING_ITEMS_EXTENDED,
  top_rated: [...TOP_RATED_ITEMS, TRENDING_ITEMS_EXTENDED[3], TRENDING_ITEMS_EXTENDED[4], TRENDING_ITEMS_EXTENDED[5]],
  rankings: RANKINGS,
};

/** Intercept GET /home with optional query string assertions. */
function interceptHome(
  alias: string,
  body: typeof HOME_FIXTURE = HOME_FIXTURE,
  params?: Record<string, string>,
) {
  cy.intercept("GET", `${API}/home*`, (req) => {
    if (params) {
      const url = new URL(req.url);
      Object.entries(params).forEach(([k, v]) => {
        expect(url.searchParams.get(k)).to.eq(v);
      });
    }
    req.reply({ statusCode: 200, body });
  }).as(alias);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Home feed page", () => {
  // ── Scenario 1: Trending carousel renders ──────────────────────────────────
  it("renders the trending carousel with works (LandingPage #1)", () => {
    interceptHome("homeLoad");
    cy.visit("/home");
    cy.wait("@homeLoad");

    cy.get("[data-cy=trending-carousel]").should("be.visible");

    cy.get("[data-cy='trending-carousel-item-Dune: Part Two']").should("be.visible");
    cy.get("[data-cy='trending-carousel-item-Shōgun']").should("be.visible");

    // Cards are rendered inside the track (use find, not children — track wraps a flex div)
    cy.get("[data-cy=trending-carousel-track]")
      .find("[data-cy^='trending-carousel-item-']")
      .should("have.length.at.least", 2);
  });

  // ── Scenario 2: Top-rated carousel with scores ─────────────────────────────
  it("renders the top-rated carousel with avg scores (LandingPage #2)", () => {
    interceptHome("homeLoad");
    cy.visit("/home");
    cy.wait("@homeLoad");

    cy.get("[data-cy=top-rated-carousel]").should("be.visible");

    // Shōgun (avg_score 9.4) is first in TOP_RATED_ITEMS — must appear in the carousel
    cy.get("[data-cy=top-rated-carousel-track]")
      .find("[data-cy^='top-rated-carousel-item-']")
      .first()
      .should("contain", "Shōgun");
  });

  // ── Scenario 3: Horizontal scroll via arrow buttons ────────────────────────
  // Carousel uses CSS translateX — we verify via button state, not scrollLeft.
  // At index=0 prev is disabled; clicking next enables it (and disables next at end).
  it("scrolls the trending carousel with arrow buttons (LandingPage #3)", () => {
    // Need more than VISIBLE (5) items so there is something to slide to.
    cy.intercept("GET", `${API}/home*`, { statusCode: 200, body: HOME_FIXTURE_EXTENDED }).as("homeLoad");
    cy.visit("/home");
    cy.wait("@homeLoad");

    // At start: prev must be disabled (index = 0)
    cy.get("[data-cy=trending-carousel-prev]").should("be.disabled");
    cy.get("[data-cy=trending-carousel-next]").should("not.be.disabled");

    // After clicking next: prev becomes enabled
    cy.get("[data-cy=trending-carousel-next]").click();
    cy.get("[data-cy=trending-carousel-prev]").should("not.be.disabled");

    // Clicking prev returns to index=0: prev disabled again
    cy.get("[data-cy=trending-carousel-prev]").click();
    cy.get("[data-cy=trending-carousel-prev]").should("be.disabled");
  });

  // ── Top-rated carousel scroll ──────────────────────────────────────────────
  it("scrolls the top-rated carousel with arrow buttons", () => {
    cy.intercept("GET", `${API}/home*`, { statusCode: 200, body: HOME_FIXTURE_EXTENDED }).as("homeLoad");
    cy.visit("/home");
    cy.wait("@homeLoad");

    cy.get("[data-cy=top-rated-carousel-prev]").should("be.disabled");
    cy.get("[data-cy=top-rated-carousel-next]").click();
    cy.get("[data-cy=top-rated-carousel-prev]").should("not.be.disabled");

    cy.get("[data-cy=top-rated-carousel-prev]").click();
    cy.get("[data-cy=top-rated-carousel-prev]").should("be.disabled");
  });

  // ── Scenario 4: Search bar navigates to results ────────────────────────────
  it("navigates to the search results page on submit (LandingPage #4)", () => {
    interceptHome("homeLoad");
    cy.visit("/home");
    cy.wait("@homeLoad");

    cy.get("[data-cy=home-search-input]").type("Fallout");
    cy.get("[data-cy=home-search-submit]").click();

    cy.url().should("include", "q=Fallout");
  });

  it("search submit button is disabled when query is empty", () => {
    interceptHome("homeLoad");
    cy.visit("/home");
    cy.wait("@homeLoad");

    cy.get("[data-cy=home-search-input]").clear();
    cy.get("[data-cy=home-search-submit]").should("be.disabled");
  });

  // ── Period filter changes API call ─────────────────────────────────────────
  // Default period is "year" — so we switch to "all" first, then back to "year".
  it("re-fetches with correct period param when filter changes", () => {
    interceptHome("initialLoad");
    cy.visit("/home");
    cy.wait("@initialLoad");

    interceptHome("allLoad", HOME_FIXTURE, { period: "all" });
    cy.get("[data-cy=filter-period-all]").click();
    cy.wait("@allLoad");

    interceptHome("yearLoad", HOME_FIXTURE, { period: "year" });
    cy.get("[data-cy=filter-period-year]").click();
    cy.wait("@yearLoad");
  });

  // "month" option no longer exists — trending is always locked to 30 days
  it("does not render a month period filter button", () => {
    interceptHome("homeLoad");
    cy.visit("/home");
    cy.wait("@homeLoad");

    cy.get("[data-cy=filter-period-month]").should("not.exist");
  });

  // ── Media-type filter changes API call ─────────────────────────────────────
  it("re-fetches with correct media_type param when filter changes", () => {
    interceptHome("initialLoad");
    cy.visit("/home");
    cy.wait("@initialLoad");

    interceptHome("moviesLoad", HOME_FIXTURE, { media_type: "movie" });
    cy.get("[data-cy=filter-type-movie]").click();
    cy.wait("@moviesLoad");

    interceptHome("seriesLoad", HOME_FIXTURE, { media_type: "series" });
    cy.get("[data-cy=filter-type-series]").click();
    cy.wait("@seriesLoad");
  });

  // ── Rankings section ───────────────────────────────────────────────────────
  it("renders the three ranking panels", () => {
    interceptHome("homeLoad");
    cy.visit("/home");
    cy.wait("@homeLoad");

    cy.get("[data-cy=rankings]").should("be.visible");
    cy.get("[data-cy=ranking-panel-most-viewed]").should("be.visible");
    cy.get("[data-cy=ranking-panel-top-rated]").should("be.visible");
    cy.get("[data-cy=ranking-panel-new-arrivals]").should("be.visible");

    cy.get("[data-cy=ranking-panel-most-viewed]")
      .find("[data-cy='ranking-item-Dune: Part Two']")
      .should("exist");
  });

  // ── Period filter is in the rankings section ───────────────────────────────
  it("period filter buttons are located inside the rankings section", () => {
    interceptHome("homeLoad");
    cy.visit("/home");
    cy.wait("@homeLoad");

    cy.get("[data-cy=rankings]")
      .find("[data-cy=home-period-filters]")
      .should("be.visible");

    cy.get("[data-cy=rankings]")
      .find("[data-cy=filter-period-year]")
      .should("be.visible");

    cy.get("[data-cy=rankings]")
      .find("[data-cy=filter-period-all]")
      .should("be.visible");
  });

  // ── Empty state ────────────────────────────────────────────────────────────
  it("renders gracefully when API returns empty lists", () => {
    cy.intercept("GET", `${API}/home*`, {
      statusCode: 200,
      body: { trending: [], top_rated: [], rankings: [] },
    }).as("emptyHome");

    cy.visit("/home");
    cy.wait("@emptyHome");

    cy.get("[data-cy=home-page]").should("be.visible");
    cy.get("[data-cy=home-error]").should("not.exist");
  });

  // ── Error state ────────────────────────────────────────────────────────────
  it("shows an error alert when the API fails", () => {
    cy.intercept("GET", `${API}/home*`, {
      statusCode: 500,
      body: { detail: "Internal Server Error" },
    }).as("errorHome");

    cy.visit("/home");
    cy.wait("@errorHome");

    cy.get("[data-cy=home-error]").should("be.visible");
    cy.get("[data-cy=trending-carousel]").should("not.exist");
  });
});
