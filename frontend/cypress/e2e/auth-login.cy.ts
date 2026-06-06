// Critical flow: admin login + non-admin is blocked from admin endpoints (service scenario #1).

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ROOT = { username: "RootAdmin", password: "rootpass" };

describe("auth / login", () => {
  it("logs an admin in through the UI and lands on the dashboard", () => {
    cy.visit("/login");
    cy.get("[data-cy=login-username]").type(ROOT.username);
    cy.get("[data-cy=login-password]").type(ROOT.password);
    cy.get("[data-cy=login-submit]").click();

    cy.location("pathname").should("eq", "/dashboard");
    cy.get("[data-cy=dashboard]").should("be.visible");
    cy.get("[data-cy=session-role]").should("contain", "superadministrador");
  });

  it("rejects wrong credentials with a visible error", () => {
    cy.visit("/login");
    cy.get("[data-cy=login-username]").type(ROOT.username);
    cy.get("[data-cy=login-password]").type("wrong-password");
    cy.get("[data-cy=login-submit]").click();

    cy.get("[data-cy=login-error]").should("be.visible").and("contain", "Credenciais inválidas");
    cy.location("pathname").should("eq", "/login");
  });

  it("blocks a non-admin from admin endpoints (scenario #1)", () => {
    const common = { username: `common_${uid()}`, password: "secret123", role: "common" };

    // Arrange: create a common user via the API (as the seeded superadmin).
    cy.apiLogin(ROOT.username, ROOT.password).then((root) => {
      cy.seedUser(root.access_token, common);

      // The common user's own token must be refused by /admin/* (403).
      cy.apiLogin(common.username, common.password).then((session) => {
        cy.apiAs(session.access_token, "GET", "/admin/users").then((res) => {
          expect(res.status).to.eq(403);
          expect(res.body).to.not.have.property("data");
        });
      });
    });

    // And through the UI: a common session sees the admin error, not the data.
    cy.loginAs(common.username, common.password);
    cy.visit("/users");
    cy.get("[data-cy=users-error]").should("be.visible").and("contain", "Acesso de administrador necessário");
  });
});
