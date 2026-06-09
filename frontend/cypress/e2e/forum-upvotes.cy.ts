// E2E for the Fórum — upvotes em comentários (one vote per user, toggle on/off,
// and comments ordered by upvotes). Reuses the same API-seeding helpers as the
// other forum specs.

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ROOT = { username: "RootAdmin", password: "rootpass" };

describe("fórum · upvotes em comentários", () => {
  // Seed a fresh common user + their post, yielding { postId, authorToken }.
  function seedPostByCommonUser(): Cypress.Chainable<{ postId: string; authorToken: string }> {
    const author = `Autor_${uid()}`;
    return cy.apiToken(ROOT.username, ROOT.password).then((rootToken) => {
      cy.seedUser(rootToken, { username: author, password: "secret123", role: "common" });
      return cy.apiToken(author, "secret123").then((authorToken) =>
        cy
          .seedPost(authorToken, { title: `Post_${uid()}`, category: "Filmes" })
          .then((postId) => ({ postId, authorToken })),
      );
    });
  }

  it("upvotes a comment and toggles the vote off again", () => {
    seedPostByCommonUser().then(({ postId, authorToken }) => {
      cy.seedComment(authorToken, postId, "Legal!");

      cy.loginAs(ROOT.username, ROOT.password);
      cy.visit(`/forum/${postId}`);

      const comment = '[data-cy="comment-Legal!"]';
      // Starts at zero, not yet voted.
      cy.get(`${comment} [data-cy=comment-upvote-count]`).should("have.text", "0");
      cy.get(`${comment} [data-cy=comment-upvote]`).should("not.have.class", "active");

      // Upvote -> count 1, button active.
      cy.get(`${comment} [data-cy=comment-upvote]`).click();
      cy.get(`${comment} [data-cy=comment-upvote-count]`).should("have.text", "1");
      cy.get(`${comment} [data-cy=comment-upvote]`).should("have.class", "active");

      // Click again -> vote removed (toggle), back to 0.
      cy.get(`${comment} [data-cy=comment-upvote]`).click();
      cy.get(`${comment} [data-cy=comment-upvote-count]`).should("have.text", "0");
      cy.get(`${comment} [data-cy=comment-upvote]`).should("not.have.class", "active");
    });
  });

  it("orders comments by upvotes (most upvoted first) after reload", () => {
    seedPostByCommonUser().then(({ postId, authorToken }) => {
      cy.seedComment(authorToken, postId, "primeiro");
      cy.seedComment(authorToken, postId, "segundo");

      cy.loginAs(ROOT.username, ROOT.password);
      cy.visit(`/forum/${postId}`);

      // Upvote the *second* comment, then reload so the backend re-orders.
      cy.get('[data-cy="comment-segundo"] [data-cy=comment-upvote]').click();
      cy.get('[data-cy="comment-segundo"] [data-cy=comment-upvote-count]').should("have.text", "1");
      cy.reload();

      // The most-upvoted comment ("segundo") now renders before "primeiro".
      cy.get(".comment").first().should("contain", "segundo");
    });
  });

  it("disables the upvote button for logged-out visitors (reading stays public)", () => {
    seedPostByCommonUser().then(({ postId, authorToken }) => {
      cy.seedComment(authorToken, postId, "Legal!");

      // No login: visit the public post page.
      cy.visit(`/forum/${postId}`);

      cy.get('[data-cy="comment-Legal!"] [data-cy=comment-upvote-count]').should("have.text", "0");
      cy.get('[data-cy="comment-Legal!"] [data-cy=comment-upvote]').should("be.disabled");
    });
  });
});
