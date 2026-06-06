// Critical flow: ban then unban a common user, asserting the visible status badge
// (scenarios #8, #9). The public-feed post-hiding side of #8 is covered by the backend
// integration tests — there is no post-creation API to seed a post from the UI.

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ROOT = { username: "RootAdmin", password: "rootpass" };

describe("ban / unban", () => {
  it("bans and unbans a common user, reflecting the status badge", () => {
    const name = `Ban_${uid()}`;

    cy.apiLogin(ROOT.username, ROOT.password).then((root) => {
      cy.seedUser(root.access_token, { username: name, password: "p", role: "common" });
    });

    cy.loginAs(ROOT.username, ROOT.password);
    cy.visit("/users");

    cy.get(`[data-cy=user-row-${name}] [data-cy=user-status]`).should("contain", "active");

    cy.get(`[data-cy=ban-${name}]`).click();
    cy.get("[data-cy=users-success]").should("be.visible");
    cy.get(`[data-cy=user-row-${name}] [data-cy=user-status]`).should("contain", "banned"); // #8

    cy.get(`[data-cy=unban-${name}]`).click();
    cy.get(`[data-cy=user-row-${name}] [data-cy=user-status]`).should("contain", "active"); // #9
  });
});
