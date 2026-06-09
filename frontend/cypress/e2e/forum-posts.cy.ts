// E2E for the Fórum — postagens. Mirrors features/ForumPosts.feature:
//   • Postagem com sucesso       • Falha ao criar post sem titulo
//   • Exclusao de post por usuário  • Exclusao de post por moderador
// Reading is public; writing/deleting uses the real API + UI. RootAdmin is the
// seeded superadmin (a moderator); a fresh common user owns the posts that the
// moderator deletes, so the "owner vs. moderator" paths are genuinely distinct.

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ROOT = { username: "RootAdmin", password: "rootpass" };

describe("fórum · postagens", () => {
  it("publishes a post successfully (Postagem com sucesso)", () => {
    const title = `Filme_${uid()}`;

    cy.loginAs(ROOT.username, ROOT.password);
    cy.visit("/forum/novo");

    cy.get("[data-cy=post-title]").type(title);
    cy.get("[data-cy=post-content]").type("Adorei, recomendo demais!");
    cy.get("[data-cy=post-category]").select("Filmes");
    cy.get("[data-cy=post-publish]").click();

    // On success the app navigates to the new post's page.
    cy.location("pathname").should("match", /\/forum\/.+/);
    cy.get("[data-cy=post-detail]").should("contain", title).and("contain", "Filmes");
  });

  it("rejects a post without a title and keeps the typed fields (Falha sem titulo)", () => {
    cy.loginAs(ROOT.username, ROOT.password);
    cy.visit("/forum/novo");

    // Leave the title blank on purpose.
    cy.get("[data-cy=post-content]").type("Conteúdo preenchido");
    cy.get("[data-cy=post-category]").select("Filmes");
    cy.get("[data-cy=post-publish]").click();

    cy.get("[data-cy=post-error]").should("be.visible").and("contain", "título");
    cy.location("pathname").should("eq", "/forum/novo"); // not published → still here
    cy.get("[data-cy=post-content]").should("have.value", "Conteúdo preenchido"); // fields remain
  });

  it("lets the owner delete their own post (Exclusao por usuário)", () => {
    const author = `Autor_${uid()}`;
    const title = `Meu_${uid()}`;

    cy.apiToken(ROOT.username, ROOT.password).then((rootToken) => {
      cy.seedUser(rootToken, { username: author, password: "secret123", role: "common" });
      cy.apiToken(author, "secret123").then((authorToken) => {
        cy.seedPost(authorToken, { title, category: "Filmes" }).then((postId) => {
          cy.loginAs(author, "secret123");
          cy.visit(`/forum/${postId}`);

          cy.get("[data-cy=post-delete]").click();
          cy.get("[data-cy=confirm-dialog]").should("be.visible");
          cy.get("[data-cy=confirm-ok]").click();

          // Removed: navigated back to the list and the post is gone.
          cy.location("pathname").should("eq", "/forum");
          cy.visit(`/forum/${postId}`);
          cy.get("[data-cy=post-not-found]").should("be.visible");
        });
      });
    });
  });

  it("lets a moderator delete any post (Exclusao por moderador)", () => {
    const author = `Autor_${uid()}`;
    const title = `Alheio_${uid()}`;

    cy.apiToken(ROOT.username, ROOT.password).then((rootToken) => {
      cy.seedUser(rootToken, { username: author, password: "secret123", role: "common" });
      cy.apiToken(author, "secret123").then((authorToken) => {
        cy.seedPost(authorToken, { title, category: "Filmes" }).then((postId) => {
          // Log in as the moderator (superadmin), not the owner.
          cy.loginAs(ROOT.username, ROOT.password);
          cy.visit(`/forum/${postId}`);

          cy.get("[data-cy=post-delete]").click();
          cy.get("[data-cy=confirm-dialog]").should("be.visible"); // confirmation
          cy.get("[data-cy=confirm-ok]").click();

          cy.location("pathname").should("eq", "/forum");
          cy.visit(`/forum/${postId}`);
          cy.get("[data-cy=post-not-found]").should("be.visible"); // removed
        });
      });
    });
  });
});
