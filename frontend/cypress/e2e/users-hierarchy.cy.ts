// Critical flow: the superadmin hierarchy rule R1, both directions (scenarios #3, #4, #5, #6).

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ROOT = { username: "RootAdmin", password: "rootpass" };

describe("users hierarchy (R1)", () => {
  it("superadmin creates and then deletes an admin account (#3, #6)", () => {
    const adminName = `Admin_${uid()}`;
    cy.loginAs(ROOT.username, ROOT.password);
    cy.visit("/users");

    cy.get("[data-cy=user-username]").type(adminName);
    cy.get("[data-cy=user-password]").type("adminpass");
    cy.get("[data-cy=user-role]").select("admin");
    cy.get("[data-cy=user-create]").click();
    cy.get(`[data-cy=user-row-${adminName}]`).should("contain", "administrador"); // #3

    cy.get(`[data-cy=delete-${adminName}]`).click();
    cy.get("[data-cy=cascade-confirm]").click();
    cy.get(`[data-cy=user-row-${adminName}]`).should("not.exist"); // #6
  });

  it("a common admin is blocked from admin-on-admin actions (#4, #5)", () => {
    const plainAdmin = { username: `PlainAdmin_${uid()}`, password: "adminpass", role: "admin" };

    // Arrange as superadmin: create the plain admin and capture RootAdmin's id.
    cy.apiLogin(ROOT.username, ROOT.password).then((root) => {
      cy.seedUser(root.access_token, plainAdmin);
      cy.apiAs(root.access_token, "GET", "/admin/users").then((res) => {
        const list = res.body.data as Array<{ id: string; username: string }>;
        cy.wrap(list.find((u) => u.username === "RootAdmin")!.id).as("rootId");
      });
    });

    // Backend enforcement: a plain admin cannot create or delete an admin.
    cy.apiLogin(plainAdmin.username, plainAdmin.password).then((session) => {
      cy.apiAs(session.access_token, "POST", "/admin/users", {
        username: `x_${uid()}`,
        password: "p",
        role: "admin",
      }).then((res) => expect(res.status).to.eq(403)); // #4

      cy.get("@rootId").then((rootId) => {
        cy.apiAs(session.access_token, "DELETE", `/admin/users/${rootId}`).then((res) =>
          expect(res.status).to.eq(403),
        ); // #5
      });
    });

    // UX block in the UI: privileged role/target controls are disabled.
    cy.loginAs(plainAdmin.username, plainAdmin.password);
    cy.visit("/users");
    cy.get("[data-cy=user-role] option[value=admin]").should("be.disabled"); // #4 (UX)
    cy.get("[data-cy=delete-RootAdmin]").should("be.disabled"); // #5 (UX)
  });
});
