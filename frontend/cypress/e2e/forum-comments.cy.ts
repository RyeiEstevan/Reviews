// E2E for the Fórum — comentários. Mirrors features/ForumComments.feature:
//   • Comentar em um post com sucesso   • Falha ao comentar sem conteúdo
//   • Exclusão de comentário por moderador

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ROOT = { username: "RootAdmin", password: "rootpass" };

describe("fórum · comentários", () => {
  // Seed a post owned by a fresh common user; yields the post id to the test.
  function seedPostByCommonUser(): Cypress.Chainable<string> {
    const author = `Autor_${uid()}`;
    return cy.apiToken(ROOT.username, ROOT.password).then((rootToken) => {
      cy.seedUser(rootToken, { username: author, password: "secret123", role: "common" });
      return cy
        .apiToken(author, "secret123")
        .then((authorToken) => cy.seedPost(authorToken, { title: `Post_${uid()}`, category: "Filmes" }));
    });
  }

  it("comments on a post successfully (Comentar com sucesso)", () => {
    seedPostByCommonUser().then((postId) => {
      cy.loginAs(ROOT.username, ROOT.password);
      cy.visit(`/forum/${postId}`);

      cy.get("[data-cy=comment-input]").type("Legal!");
      cy.get("[data-cy=comment-submit]").click();

      // The comment shows up associated with this post.
      cy.get('[data-cy="comment-Legal!"]').should("be.visible").and("contain", "Legal!");
    });
  });

  it("rejects an empty comment (Falha sem conteúdo)", () => {
    seedPostByCommonUser().then((postId) => {
      cy.loginAs(ROOT.username, ROOT.password);
      cy.visit(`/forum/${postId}`);

      // Submit with the textarea left empty.
      cy.get("[data-cy=comment-submit]").click();

      cy.get("[data-cy=comment-error]").should("be.visible").and("contain", "vazio");
    });
  });

  it("lets a moderator delete a comment (Exclusão por moderador)", () => {
    const author = `Autor_${uid()}`;

    cy.apiToken(ROOT.username, ROOT.password).then((rootToken) => {
      cy.seedUser(rootToken, { username: author, password: "secret123", role: "common" });
      cy.apiToken(author, "secret123").then((authorToken) => {
        cy.seedPost(authorToken, { title: `Post_${uid()}`, category: "Filmes" }).then((postId) => {
          // The comment is authored by the common user, deleted by the moderator.
          cy.seedComment(authorToken, postId, "Chato!");

          cy.loginAs(ROOT.username, ROOT.password);
          cy.visit(`/forum/${postId}`);

          cy.get('[data-cy="comment-Chato!"]').should("be.visible");
          cy.get('[data-cy="comment-Chato!"] [data-cy=comment-delete]').click();
          cy.get("[data-cy=confirm-dialog]").should("be.visible"); // confirmation
          cy.get("[data-cy=confirm-ok]").click();

          cy.get("[data-cy=post-notice]").should("be.visible");
          cy.get('[data-cy="comment-Chato!"]').should("not.exist"); // removed
        });
      });
    });
  });
});
