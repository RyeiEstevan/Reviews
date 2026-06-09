/**
 * frontend/cypress/e2e/content.cy.ts
 *
 * E2E tests for the Content feature.
 * Mirrors the BDD scenarios in features/Content.feature.
 *
 * Preconditions:
 *   - Backend running at CYPRESS_BASE_URL (default http://localhost:8000)
 *   - Cypress env vars:
 *       CYPRESS_MODERADOR_TOKEN  — valid JWT for a moderador user
 *       CYPRESS_COMMON_TOKEN     — valid JWT for a usuario_comum user
 */

const BASE = Cypress.env("BACKEND_URL") ?? "http://localhost:8000";
const MODERADOR_TOKEN = Cypress.env("MODERADOR_TOKEN") ?? "";
const COMMON_TOKEN = Cypress.env("COMMON_TOKEN") ?? "";

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe("Content feature", () => {
  // ── Helpers ───────────────────────────────────────────────────────────────

  function createContent(
    token: string,
    payload: {
      title: string;
      genre?: string;
      release_year?: number;
      duration?: string;
    }
  ) {
    return cy.request({
      method: "POST",
      url: `${BASE}/content`,
      headers: authHeader(token),
      body: {
        genre: "gênero de teste",
        release_year: 1999,
        duration: "90 min",
        ...payload,
      },
      failOnStatusCode: false,
    });
  }

  function deleteAllContent(token: string) {
    cy.request({ url: `${BASE}/content`, failOnStatusCode: false }).then(
      (res) => {
        if (res.status === 200 && Array.isArray(res.body)) {
          res.body.forEach((item: { id: string }) => {
            cy.request({
              method: "DELETE",
              url: `${BASE}/content/${item.id}`,
              headers: authHeader(token),
              failOnStatusCode: false,
            });
          });
        }
      }
    );
  }

  beforeEach(() => {
    deleteAllContent(MODERADOR_TOKEN);
  });

  // ── Cadastrar com sucesso ─────────────────────────────────────────────────

  it("cadastra novo conteúdo com sucesso via UI", () => {
    cy.visit("/content/admin");
    cy.window().then((win) => {
      win.localStorage.setItem("token", MODERADOR_TOKEN);
    });
    cy.reload();

    cy.get("#cf-title").type("Matrix");
    cy.get("#cf-genre").type("ficção científica");
    cy.get("#cf-year").clear().type("1999");
    cy.get("#cf-duration").type("120 min");
    cy.contains("button", "Salvar").click();

    cy.contains("Matrix cadastrado com sucesso").should("be.visible");
    cy.get('[data-testid="catalog-grid"]').contains("Matrix").should("exist");
  });

  // ── Duplicidade ───────────────────────────────────────────────────────────

  it("bloqueia cadastro duplicado e exibe mensagem de erro", () => {
    createContent(MODERADOR_TOKEN, { title: "Matrix", release_year: 1999 });

    cy.visit("/content/admin");
    cy.window().then((win) => {
      win.localStorage.setItem("token", MODERADOR_TOKEN);
    });
    cy.reload();

    cy.get("#cf-title").type("Matrix");
    cy.get("#cf-genre").type("ficção científica");
    cy.get("#cf-year").clear().type("1999");
    cy.get("#cf-duration").type("90 min");
    cy.contains("button", "Salvar").click();

    cy.contains("Conteúdo duplicado").should("be.visible");
    cy.get('[aria-invalid="true"]').should("exist");

    // Only one Matrix in catalog
    cy.request(`${BASE}/content`).then((res) => {
      const matrices = res.body.filter(
        (i: { title: string; release_year: number }) =>
          i.title === "Matrix" && i.release_year === 1999
      );
      expect(matrices).to.have.length(1);
    });
  });

  // ── Duração inválida ──────────────────────────────────────────────────────

  it("rejeita cadastro com duração inválida (-120 min)", () => {
    cy.visit("/content/admin");
    cy.window().then((win) => {
      win.localStorage.setItem("token", MODERADOR_TOKEN);
    });
    cy.reload();

    cy.get("#cf-title").type("Avatar");
    cy.get("#cf-genre").type("ação");
    cy.get("#cf-year").clear().type("2009");
    cy.get("#cf-duration").type("-120 min");
    cy.contains("button", "Salvar").click();

    cy.get('[data-testid="cf-duration"] .form-field__error, #cf-duration-err')
      .should("be.visible")
      .and("contain", "inválido");

    cy.request(`${BASE}/content`).then((res) => {
      const avatars = res.body.filter(
        (i: { title: string }) => i.title === "Avatar"
      );
      expect(avatars).to.have.length(0);
    });
  });

  // ── Permissão insuficiente para remoção ───────────────────────────────────

  it("bloqueia remoção por usuário comum e exibe erro de permissão", () => {
    createContent(MODERADOR_TOKEN, { title: "Matrix", release_year: 1999 });

    cy.request(`${BASE}/content`).then((res) => {
      const item = res.body.find(
        (i: { title: string }) => i.title === "Matrix"
      );
      cy.request({
        method: "DELETE",
        url: `${BASE}/content/${item.id}`,
        headers: authHeader(COMMON_TOKEN),
        failOnStatusCode: false,
      }).then((deleteRes) => {
        expect(deleteRes.status).to.be.oneOf([400, 403]);
        expect(deleteRes.body.detail.toLowerCase()).to.include("permiss");
      });
    });

    cy.request(`${BASE}/content`).then((res) => {
      const matrices = res.body.filter(
        (i: { title: string }) => i.title === "Matrix"
      );
      expect(matrices).to.have.length(1);
    });
  });

  // ── View counter ──────────────────────────────────────────────────────────

  it("incrementa contadores ao clicar em Já vi", () => {
    createContent(MODERADOR_TOKEN, { title: "Matrix", release_year: 1999 }).then(
      (res) => {
        const id = res.body.id;
        cy.visit("/content");
        cy.get(`[data-testid="content-card-${id}"]`)
          .find(".btn--view")
          .click();

        cy.request(`${BASE}/content/${id}`).then((updated) => {
          expect(updated.body.view_count).to.equal(1);
          expect(updated.body.recent_view_count).to.equal(1);
        });
      }
    );
  });

  // ── ReviewForm — envio com sucesso ────────────────────────────────────────

  it("publica review com sucesso e exibe mensagem de confirmação", () => {
    createContent(MODERADOR_TOKEN, {
      title: "Matrix",
      release_year: 1999,
    }).then((res) => {
      cy.visit(`/content/${res.body.id}`);
      cy.window().then((win) => {
        win.localStorage.setItem("token", COMMON_TOKEN);
      });
      cy.reload();

      // Pick 5 stars
      cy.get('[data-testid="rating-field"] svg').eq(4).click();

      // Write comment
      cy.get("#review-comment").type("Um clássico absoluto!");

      cy.contains("button", "Enviar").click();

      cy.get('[data-testid="review-success"]').should(
        "contain",
        "Sua review foi publicada com sucesso!"
      );
      cy.get('[data-testid="review-list"]').contains(
        "Um clássico absoluto!"
      );
    });
  });

  // ── ReviewForm — envio vazio ──────────────────────────────────────────────

  it("exibe erro ao tentar enviar review vazia", () => {
    createContent(MODERADOR_TOKEN, {
      title: "O Caminho dos Reis",
      release_year: 2010,
    }).then((res) => {
      cy.visit(`/content/${res.body.id}`);

      cy.contains("button", "Enviar").click();

      cy.get('[data-testid="review-error"]').should(
        "contain",
        "Por favor, preencha a nota e o comentário antes de enviar"
      );
      cy.get('[data-testid="rating-field"]').should(
        "have.class",
        "form-field--error"
      );
      cy.get('[data-testid="comment-field"]').should(
        "have.class",
        "form-field--error"
      );
    });
  });
});
