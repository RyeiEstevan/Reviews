// Critical flow: publish a tagged news post and see it on the public, unauthenticated feed
// (scenarios #14, #15).

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ROOT = { username: "RootAdmin", password: "rootpass" };

describe("news + public feed", () => {
  it("publishes tagged news that appears on the public feed", () => {
    const title = `News_${uid()}`;

    cy.loginAs(ROOT.username, ROOT.password);
    cy.visit("/news");

    cy.get("[data-cy=news-title]").type(title);
    cy.get("[data-cy=news-body]").type("In theaters this weekend.");
    cy.get("[data-cy=news-tags]").type("anime, release");
    cy.get("[data-cy=news-publish]").click();

    cy.get("[data-cy=news-success]").should("be.visible").and("contain", "anime"); // #14

    // #15 — visible to an unauthenticated visitor (no token in localStorage).
    cy.clearLocalStorage();
    cy.visit("/feed");
    cy.get(`[data-cy=feed-item-${title}]`).should("contain", title);
    cy.get(`[data-cy=feed-item-${title}]`).find("[data-cy=feed-tag]").should("contain", "anime");
  });
});
