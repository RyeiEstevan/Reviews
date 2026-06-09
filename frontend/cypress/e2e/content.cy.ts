/**
 * frontend/cypress/e2e/content.cy.ts
 *
 * E2E tests for the Content feature.
 * Auth is obtained at runtime via RootAdmin login — no env-var tokens required.
 */

const API = Cypress.env("apiUrl") ?? "http://localhost:8000";

// ── Auth helpers ──────────────────────────────────────────────────────────────

function adminHeaders() {
  return cy
    .request("POST", `${API}/auth/login`, { username: "RootAdmin", password: "rootpass" })
    .then((res) => ({ Authorization: `Bearer ${res.body.access_token}` as string }));
}

// ── Seed / cleanup helpers ────────────────────────────────────────────────────

function createContent(
  headers: object,
  payload: { title: string; type?: string; year?: number; genre?: string[] }
) {
  return cy.request({
    method: "POST",
    url: `${API}/content`,
    headers,
    body: { type: "movie", year: 2000, genre: [], ...payload },
    failOnStatusCode: false,
  });
}

function deleteContent(headers: object, id: string) {
  return cy.request({
    method: "DELETE",
    url: `${API}/content/${id}`,
    headers,
    failOnStatusCode: false,
  });
}

function deleteAllContent(headers: object) {
  cy.request({ url: `${API}/content`, failOnStatusCode: false }).then((res) => {
    if (res.status === 200 && Array.isArray(res.body)) {
      res.body.forEach((item: { id: string }) => deleteContent(headers, item.id));
    }
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Catálogo público (/content)", () => {
  before(() => {
    adminHeaders().then((headers) => deleteAllContent(headers));
  });

  beforeEach(() => {
    adminHeaders().then((headers) => deleteAllContent(headers));
  });

  it("exibe grade vazia quando não há mídias", () => {
    cy.visit("/content");
    cy.get('[data-cy="content-page"]').should("exist");
    cy.get('[data-cy="catalog-grid"]').should("not.exist");
    cy.contains("Nenhuma obra encontrada").should("be.visible");
  });

  it("lista as mídias cadastradas", () => {
    adminHeaders().then((headers) => {
      createContent(headers, { title: "Matrix", type: "movie", year: 1999 });
      createContent(headers, { title: "Fundação", type: "series", year: 2021 });
    });

    cy.visit("/content");
    cy.get('[data-cy="catalog-grid"]').should("exist");
    cy.contains("Matrix").should("be.visible");
    cy.contains("Fundação").should("be.visible");
  });

  it("filtra mídias por tipo", () => {
    adminHeaders().then((headers) => {
      createContent(headers, { title: "Matrix", type: "movie", year: 1999 });
      createContent(headers, { title: "Fundação", type: "series", year: 2021 });
    });

    cy.visit("/content");
    cy.get('[data-cy="catalog-filter-movie"]').click();
    cy.get('[data-cy="catalog-grid"]').contains("Matrix").should("be.visible");
    cy.get('[data-cy="catalog-grid"]').contains("Fundação").should("not.exist");
  });

  it("busca mídias pelo título", () => {
    adminHeaders().then((headers) => {
      createContent(headers, { title: "Matrix", type: "movie", year: 1999 });
      createContent(headers, { title: "Duna", type: "movie", year: 2021 });
    });

    cy.visit("/content");
    cy.get('[data-cy="catalog-search"]').type("duna");
    cy.contains("Duna").should("be.visible");
    cy.contains("Matrix").should("not.exist");
  });

  it("navega para a página de detalhe ao clicar em um card", () => {
    adminHeaders().then((headers) => {
      createContent(headers, { title: "Matrix", type: "movie", year: 1999 }).then((res) => {
        cy.visit("/content");
        cy.contains("Matrix").click();
        cy.url().should("include", `/content/${res.body.id}`);
        cy.contains("Matrix").should("be.visible");
      });
    });
  });
});

describe("Página de detalhe (/content/:id)", () => {
  it("exibe metadados da mídia", () => {
    adminHeaders().then((headers) => {
      createContent(headers, {
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
  });

  it("exibe erro ao acessar id inexistente", () => {
    cy.visit("/content/000000000000000000000000");
    cy.contains("Conteúdo não encontrado").should("be.visible");
  });
});

describe("Painel admin — gerenciar conteúdo (/content-manage)", () => {
  let session: { token: string; role: string; username: string };

  before(() => {
    cy.request("POST", `${API}/auth/login`, { username: "RootAdmin", password: "rootpass" })
      .then((res) => {
        session = { token: res.body.access_token, role: res.body.role, username: res.body.username };
      });
  });

  beforeEach(() => {
    adminHeaders().then((headers) => deleteAllContent(headers));
  });

  function visitAsAdmin() {
    cy.visit("/content-manage", {
      onBeforeLoad(win) {
        win.localStorage.setItem("reviews_token", session.token);
        win.localStorage.setItem("reviews_role", session.role);
        win.localStorage.setItem("reviews_username", session.username);
      },
    });
  }

  it("cadastra nova mídia com sucesso", () => {
    visitAsAdmin();

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
    adminHeaders().then((headers) => {
      createContent(headers, { title: "Matrix", type: "movie", year: 1999 }).then((res) => {
        visitAsAdmin();

        cy.get(`[data-cy="content-edit-${res.body.id}"]`).click();
        cy.get('[data-cy="content-edit-modal"]').should("be.visible");
        cy.get('[data-cy="content-edit-modal"] input').first().clear().type("Matrix Reloaded");
        cy.get('[data-cy="content-edit-submit"]').click();

        cy.get('[data-cy="content-success"]').should("contain", "Matrix Reloaded");
        cy.get('[data-cy="content-table"]').contains("Matrix Reloaded").should("exist");
      });
    });
  });

  it("remove uma mídia existente", () => {
    adminHeaders().then((headers) => {
      createContent(headers, { title: "Matrix", type: "movie", year: 1999 }).then((res) => {
        visitAsAdmin();

        cy.get(`[data-cy="content-delete-${res.body.id}"]`).click();
        cy.get('[data-cy="content-delete-modal"]').should("be.visible");
        cy.get('[data-cy="content-delete-confirm"]').click();

        cy.get('[data-cy="content-success"]').should("contain", "Matrix");
        cy.get('[data-cy="content-table"]').contains("Matrix").should("not.exist");
      });
    });
  });

  it("exibe lista vazia quando não há mídias", () => {
    visitAsAdmin();
    cy.get('[data-cy="content-table"]').contains("Nenhuma obra encontrada").should("be.visible");
  });
});

describe("Controle de permissões — /content API", () => {
  let commonHeaders: { Authorization: string };

  before(() => {
    // Create a temporary common user for permission tests
    const testUser = `perm_test_${Date.now()}`;
    adminHeaders().then((headers) => {
      cy.request({
        method: "POST",
        url: `${API}/admin/users`,
        headers,
        body: { username: testUser, password: "pass123", role: "usuario_comum" },
        failOnStatusCode: false,
      });
    });
    cy.request("POST", `${API}/auth/login`, { username: testUser, password: "pass123" })
      .then((res) => { commonHeaders = { Authorization: `Bearer ${res.body.access_token}` }; });
  });

  it("bloqueia criação de conteúdo por usuario_comum (403)", () => {
    cy.request({
      method: "POST",
      url: `${API}/content`,
      headers: commonHeaders,
      body: { title: "Avatar", type: "movie", year: 2009, genre: [] },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.equal(403);
    });
  });

  it("bloqueia remoção de conteúdo por usuario_comum (403)", () => {
    adminHeaders().then((headers) => {
      createContent(headers, { title: "Matrix", year: 1999 }).then((res) => {
        cy.request({
          method: "DELETE",
          url: `${API}/content/${res.body.id}`,
          headers: commonHeaders,
          failOnStatusCode: false,
        }).then((deleteRes) => {
          expect(deleteRes.status).to.equal(403);
        });

        cy.request(`${API}/content/${res.body.id}`).then((getRes) => {
          expect(getRes.status).to.equal(200);
          expect(getRes.body.title).to.equal("Matrix");
        });
      });
    });
  });
});
