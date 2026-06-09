// E2E for the Fórum — filtro por categoria. Mirrors features/ForumSearch.feature:
//   • Filtrar posts por categoria   • Categoria sem posts
// Reading is public, so these visit /forum without logging in. Titles are made
// unique per run so the presence/absence assertions stay deterministic against a
// shared database. The "empty category" check assumes the dedicated E2E database
// (MONGODB_DB=reviews_e2e), where no spec ever creates a "Livros" post.

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ROOT = { username: "RootAdmin", password: "rootpass" };

describe("fórum · filtro por categoria", () => {
  it("shows only the posts of the selected category (Filtrar por categoria)", () => {
    const filme = `Filme_${uid()}`;
    const serie = `Serie_${uid()}`;

    cy.apiToken(ROOT.username, ROOT.password).then((token) => {
      cy.seedPost(token, { title: filme, category: "Filmes" });
      cy.seedPost(token, { title: serie, category: "Séries" });
    });

    cy.visit("/forum");
    // Wait for the initial (unfiltered) load to finish before filtering, so the
    // category click can't race the first fetch.
    cy.get(`[data-cy=post-card-${filme}]`).should("be.visible");
    cy.get(`[data-cy=post-card-${serie}]`).should("be.visible");

    cy.get("[data-cy=cat-chip-Filmes]").click();

    cy.get(`[data-cy=post-card-${filme}]`).should("be.visible"); // só Filmes listado
    cy.get(`[data-cy=post-card-${serie}]`).should("not.exist"); // Séries não aparece
  });

  it("shows the empty state for a category with no posts (Categoria sem posts)", () => {
    const filme = `Filme_${uid()}`;
    const serie = `Serie_${uid()}`;

    cy.apiToken(ROOT.username, ROOT.password).then((token) => {
      cy.seedPost(token, { title: filme, category: "Filmes" });
      cy.seedPost(token, { title: serie, category: "Séries" });
    });

    cy.visit("/forum");
    cy.get(`[data-cy=post-card-${filme}]`).should("be.visible"); // initial load done

    cy.get("[data-cy=cat-chip-Livros]").click();

    cy.get("[data-cy=forum-empty]").should("be.visible").and("contain", "categoria");
    cy.get(`[data-cy=post-card-${filme}]`).should("not.exist");
    cy.get(`[data-cy=post-card-${serie}]`).should("not.exist");
  });
});
