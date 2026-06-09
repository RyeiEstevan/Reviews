/**
 * frontend/cypress/e2e/content.cy.ts
 *
 * E2E tests for the Content / Media feature.
 *
 * Preconditions:
 *   - Backend running at CYPRESS_BACKEND_URL (default http://localhost:8000)
 *   - Frontend running at baseUrl (default http://localhost:3000)
 *   - Cypress env vars:
 *       CYPRESS_MODERADOR_TOKEN  — valid JWT for a moderador user
 *       CYPRESS_COMMON_TOKEN     — valid JWT for a usuario_comum user
 */

const BASE = Cypress.env("BACKEND_URL") ?? "http://localhost:8000";
const MODERADOR_TOKEN = Cypress.env("MODERADOR_TOKEN") ?? "";

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── Seed / cleanup helpers ────────────────────────────────────────────────────

function createMedia(
  token: string,
  payload: { title: string; type?: string; year?: number; genre?: string[] }
) {
  return cy.request({
    method: "POST",
    url: `${BASE}/media`,
    headers: authHeader(token),
    body: { type: "movie", year: 2000, genre: [], ...payload },
    failOnStatusCode: false,
  });
}

function deleteMedia(token: string, id: string) {
  return cy.request({
    method: "DELETE",
    url: `${BASE}/media/${id}`,
    headers: authHeader(token),
    failOnStatusCode: false,
  });
}

function deleteAllMedia(token: string) {
  cy.request({ url: `${BASE}/media`, failOnStatusCode: false }).then((res) => {
    if (res.status === 200 && Array.isArray(res.body)) {
      res.body.forEach((item: { id: string }) => deleteMedia(token, item.id));
    }
  });
}

function loginAs(token: string) {
  cy.window().then((win) => win.localStorage.setItem("token", token));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Catálogo público (/content)", () => {
  beforeEach(() => {
    deleteAllMedia(MODERADOR_TOKEN);
  });

  it("exibe grade vazia quando não há mídias", () => {
    cy.visit("/content");
    cy.get('[data-cy="content-page"]').should("exist");
    cy.get('[data-cy="catalog-grid"]').should("not.exist");
    cy.contains("Nenhuma obra encontrada").should("be.visible");
  });

  it("lista as mídias cadastradas", () => {
    createMedia(MODERADOR_TOKEN, { title: "Matrix", type: "movie", year: 1999 });
    createMedia(MODERADOR_TOKEN, { title: "Fundação", type: "series", year: 2021 });

    cy.visit("/content");
    cy.get('[data-cy="catalog-grid"]').should("exist");
    cy.contains("Matrix").should("be.visible");
    cy.contains("Fundação").should("be.visible");
  });

  it("filtra mídias por tipo", () => {
    createMedia(MODERADOR_TOKEN, { title: "Matrix", type: "movie", year: 1999 });
    createMedia(MODERADOR_TOKEN, { title: "Fundação", type: "series", year: 2021 });

    cy.visit("/content");
    cy.get('[data-cy="catalog-filter-movie"]').click();

    cy.get('[data-cy="catalog-grid"]').contains("Matrix").should("be.visible");
    cy.get('[data-cy="catalog-grid"]').contains("Fundação").should("not.exist");
  });

  it("busca mídias pelo título", () => {
    createMedia(MODERADOR_TOKEN, { title: "Matrix", type: "movie", year: 1999 });
    createMedia(MODERADOR_TOKEN, { title: "Duna", type: "movie", year: 2021 });

    cy.visit("/content");
    cy.get('[data-cy="catalog-search"]').type("duna");

    cy.contains("Duna").should("be.visible");
    cy.contains("Matrix").should("not.exist");
  });

  it("navega para a página de detalhe ao clicar em um card", () => {
    createMedia(MODERADOR_TOKEN, { title: "Matrix", type: "movie", year: 1999 }).then(
      (res) => {
        cy.visit("/content");
        cy.contains("Matrix").click();
        cy.url().should("include", `/content/${res.body.id}`);
        cy.contains("Matrix").should("be.visible");
      }
    );
  });
});

describe("Página de detalhe (/content/:id)", () => {
  it("exibe metadados da mídia", () => {
    createMedia(MODERADOR_TOKEN, {
      title: "Matrix",
      type: "movie",
      year: 1999,
      genre: ["sci-fi", "action"],
    }).then((res) => {
      cy.visit(`/content/${res.body.id}`);
      cy.contains("Matrix").should("be.visible");
      cy.contains("Filme").should("be.visible");
      cy.contains("1999").should("be.visible");
    });
  });

  it("exibe erro ao acessar id inexistente", () => {
    cy.visit("/content/000000000000000000000000");
    cy.contains("Conteúdo não encontrado").should("be.visible");
  });
});

describe("Painel admin — gerenciar conteúdo (/content-manage)", () => {
  beforeEach(() => {
    deleteAllMedia(MODERADOR_TOKEN);
  });

  it("cadastra nova mídia com sucesso", () => {
    cy.visit("/content-manage");
    loginAs(MODERADOR_TOKEN);
    cy.reload();

    cy.get('[data-cy="content-create-btn"]').click();
    cy.get('[data-cy="content-title"]').type("Fallout");
    cy.get('[data-cy="content-type"]').select("series");
    cy.get('[data-cy="content-year"]').clear().type("2024");
    cy.get('[data-cy="content-genre"]').type("sci-fi, action");
    cy.get('[data-cy="content-create-submit"]').click();

    cy.get('[data-cy="content-success"]').should("contain", "Fallout");
    cy.get('[data-cy="content-table"]').contains("Fallout").should("exist");
  });

  it("edita o título de uma mídia existente", () => {
    createMedia(MODERADOR_TOKEN, { title: "Matrix", type: "movie", year: 1999 }).then(
      (res) => {
        cy.visit("/content-manage");
        loginAs(MODERADOR_TOKEN);
        cy.reload();

        cy.get(`[data-cy="content-edit-${res.body.id}"]`).click();
        cy.get('[data-cy="content-edit-modal"]').should("be.visible");
        cy.get('[data-cy="content-edit-modal"] input').first().clear().type("Matrix Reloaded");
        cy.get('[data-cy="content-edit-submit"]').click();

        cy.get('[data-cy="content-success"]').should("contain", "Matrix Reloaded");
        cy.get('[data-cy="content-table"]').contains("Matrix Reloaded").should("exist");
      }
    );
  });

  it("remove uma mídia existente", () => {
    createMedia(MODERADOR_TOKEN, { title: "Matrix", type: "movie", year: 1999 }).then(
      (res) => {
        cy.visit("/content-manage");
        loginAs(MODERADOR_TOKEN);
        cy.reload();

        cy.get(`[data-cy="content-delete-${res.body.id}"]`).click();
        cy.get('[data-cy="content-delete-modal"]').should("be.visible");
        cy.get('[data-cy="content-delete-confirm"]').click();

        cy.get('[data-cy="content-success"]').should("contain", "Matrix");
        cy.get('[data-cy="content-table"]').contains("Matrix").should("not.exist");
      }
    );
  });

  it("exibe lista vazia quando não há mídias", () => {
    cy.visit("/content-manage");
    loginAs(MODERADOR_TOKEN);
    cy.reload();

    cy.get('[data-cy="content-table"]').contains("Nenhuma obra encontrada").should("be.visible");
  });
});

describe("Controle de permissões — /media API", () => {
  it("bloqueia criação de mídia por usuario_comum (403)", () => {
    const COMMON_TOKEN = Cypress.env("COMMON_TOKEN") ?? "";
    cy.request({
      method: "POST",
      url: `${BASE}/media`,
      headers: authHeader(COMMON_TOKEN),
      body: { title: "Avatar", type: "movie", year: 2009, genre: [] },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.equal(403);
    });
  });

  it("bloqueia remoção de mídia por usuario_comum (403)", () => {
    const COMMON_TOKEN = Cypress.env("COMMON_TOKEN") ?? "";
    createMedia(MODERADOR_TOKEN, { title: "Matrix", year: 1999 }).then((res) => {
      cy.request({
        method: "DELETE",
        url: `${BASE}/media/${res.body.id}`,
        headers: authHeader(COMMON_TOKEN),
        failOnStatusCode: false,
      }).then((deleteRes) => {
        expect(deleteRes.status).to.equal(403);
      });

      // Item must still exist
      cy.request(`${BASE}/media/${res.body.id}`).then((getRes) => {
        expect(getRes.status).to.equal(200);
        expect(getRes.body.title).to.equal("Matrix");
      });
    });
  });
});
