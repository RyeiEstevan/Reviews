/**
 * Cypress E2E — ContentSearch feature
 * Covers the 4 frontend scenarios from features/ContentSearch.feature
 * plus type-filter and logo/sidebar presence.
 */

const API = Cypress.env("apiUrl") ?? "http://localhost:8000";

// ── helpers ──────────────────────────────────────────────────────────────────

function adminHeaders() {
  return cy
    .request("POST", `${API}/auth/login`, { username: "RootAdmin", password: "rootpass" })
    .then((res) => ({ Authorization: `Bearer ${res.body.access_token}` }));
}

function deleteAllContent(headers: object) {
  cy.request({ url: `${API}/content`, headers }).then((res) => {
    res.body.forEach((item: { id: string }) => {
      cy.request({ method: "DELETE", url: `${API}/content/${item.id}`, headers });
    });
  });
}

// ── seed data ─────────────────────────────────────────────────────────────────

const SEED = [
  {
    title: "Avengers: Endgame",
    type: "movie",
    year: 2019,
    description: "Os heróis fazem uma última tentativa de reverter os danos de Thanos.",
    genre: ["action", "adventure"],
    avg_score: 8.4,
    review_count: 90000,
  },
  {
    title: "Titanic",
    type: "movie",
    year: 1997,
    description: "Um romance épico a bordo do famoso navio.",
    genre: ["romance", "drama"],
    avg_score: 7.9,
    review_count: 60000,
  },
  {
    title: "Breaking Bad",
    type: "series",
    year: 2008,
    description: "Professor de química se torna fabricante de metanfetamina.",
    genre: ["drama", "crime"],
    avg_score: 9.5,
    review_count: 120000,
  },
];

// ── layout / brand ────────────────────────────────────────────────────────────

describe("ContentSearch — layout", () => {
  before(() => {
    adminHeaders().then((headers) => {
      deleteAllContent(headers);
      SEED.forEach((item) => {
        cy.request({ method: "POST", url: `${API}/content`, body: item, headers });
      });
    });
  });

  it("shows sidebar and logo on the search page", () => {
    cy.visit("/search");
    cy.get('[data-cy="home-sidebar"]').should("be.visible");
    cy.get('[data-cy="home-logo"]').should("be.visible");
  });

  it("has nav links to Feed and Catálogo", () => {
    cy.visit("/search");
    cy.get('[data-cy="home-nav-feed"]').should("exist");
    cy.get('[data-cy="home-nav-catalog"]').should("exist");
  });
});

// ── scenario: search content by exact match ───────────────────────────────────

describe("ContentSearch — search content by exact match", () => {
  before(() => {
    adminHeaders().then((headers) => {
      deleteAllContent(headers);
      SEED.forEach((item) => {
        cy.request({ method: "POST", url: `${API}/content`, body: item, headers });
      });
    });
  });

  it("shows results when term exactly matches a title", () => {
    cy.visit("/search?q=Avengers%3A+Endgame");
    cy.get('[data-cy="search-results"]').should("be.visible");
    cy.get('[data-cy="result-title"]').should("contain.text", "Avengers: Endgame");
  });

  it("results contain the term in title or description", () => {
    cy.visit("/search?q=Avengers%3A+Endgame");
    cy.get('[data-cy="search-results"]').should("be.visible");
    cy.get('[data-cy="result-title"]').first().should("contain.text", "Avengers");
  });
});

// ── scenario: search with a spelling mistake ──────────────────────────────────

describe("ContentSearch — search content with a spelling mistake", () => {
  before(() => {
    adminHeaders().then((headers) => {
      deleteAllContent(headers);
      SEED.forEach((item) => {
        cy.request({ method: "POST", url: `${API}/content`, body: item, headers });
      });
    });
  });

  it("shows no-results screen for misspelled term", () => {
    cy.visit("/search?q=Avengrs");
    cy.get('[data-cy="no-results"]').should("be.visible");
  });

  it("no works are returned for the misspelled term", () => {
    cy.visit("/search?q=Avengrs");
    cy.get('[data-cy="search-results"]').should("not.exist");
    cy.get('[data-cy="no-results"]').should("be.visible");
  });

  it("keeps the searched term visible in the input", () => {
    cy.visit("/search?q=Avengrs");
    cy.get('[data-cy="search-input"]').should("have.value", "Avengrs");
  });
});

// ── scenario: search with a non-existent term ────────────────────────────────

describe("ContentSearch — search content with a non-existent term", () => {
  before(() => {
    adminHeaders().then((headers) => {
      deleteAllContent(headers);
      SEED.forEach((item) => {
        cy.request({ method: "POST", url: `${API}/content`, body: item, headers });
      });
    });
  });

  it("shows no-results screen for unknown term", () => {
    cy.visit("/search?q=UnknownTitle123");
    cy.get('[data-cy="no-results"]').should("be.visible");
  });

  it("no works are returned for unknown term", () => {
    cy.visit("/search?q=UnknownTitle123");
    cy.get('[data-cy="search-results"]').should("not.exist");
  });
});

// ── scenario: search content by title ────────────────────────────────────────

describe("ContentSearch — search content by title", () => {
  before(() => {
    adminHeaders().then((headers) => {
      deleteAllContent(headers);
      SEED.forEach((item) => {
        cy.request({ method: "POST", url: `${API}/content`, body: item, headers });
      });
    });
  });

  it("shows matching works when searching by title", () => {
    cy.visit("/search?q=Titanic");
    cy.get('[data-cy="search-results"]').should("be.visible");
    cy.get('[data-cy="result-title"]').should("contain.text", "Titanic");
  });
});

// ── type filter ───────────────────────────────────────────────────────────────

describe("ContentSearch — type filter", () => {
  before(() => {
    adminHeaders().then((headers) => {
      deleteAllContent(headers);
      SEED.forEach((item) => {
        cy.request({ method: "POST", url: `${API}/content`, body: item, headers });
      });
    });
  });

  it("shows type filter pills after results load", () => {
    cy.visit("/search?q=a");
    cy.get('[data-cy="type-filter"]').should("be.visible");
    cy.get('[data-cy="filter-all"]').should("exist");
    cy.get('[data-cy="filter-movie"]').should("exist");
    cy.get('[data-cy="filter-series"]').should("exist");
    cy.get('[data-cy="filter-book"]').should("exist");
  });

  it("filters results to movies only", () => {
    cy.visit("/search?q=a");
    cy.get('[data-cy="filter-movie"]').click();
    cy.get('[data-cy="search-result-item"]').each(($el) => {
      cy.wrap($el).should("contain.text", "Filme");
    });
  });

  it("filters results to series only", () => {
    cy.visit("/search?q=a");
    cy.get('[data-cy="filter-series"]').click();
    cy.get('[data-cy="search-result-item"]').each(($el) => {
      cy.wrap($el).should("contain.text", "Série");
    });
  });

  it("all filter shows all results", () => {
    cy.visit("/search?q=a");
    cy.get('[data-cy="filter-movie"]').click();
    cy.get('[data-cy="filter-all"]').click();
    cy.get('[data-cy="search-result-item"]').should("have.length.gte", 2);
  });
});

// ── LandingPage search integration ───────────────────────────────────────────

describe("ContentSearch — search from landing page (LandingPage.feature #4)", () => {
  before(() => {
    adminHeaders().then((headers) => {
      deleteAllContent(headers);
      SEED.forEach((item) => {
        cy.request({ method: "POST", url: `${API}/content`, body: item, headers });
      });
    });
  });

  it("navigates to /content with results when typing from home page", () => {
    cy.visit("/home");
    cy.get('[data-cy="home-search-input"]').type("Titanic");
    cy.url().should("include", "/content?q=Titanic", { timeout: 5000 });
    cy.get('[data-cy="catalog-grid"]').should("be.visible");
    cy.get('[data-cy^="catalog-item-"]').should("contain.text", "Titanic");
  });
});
