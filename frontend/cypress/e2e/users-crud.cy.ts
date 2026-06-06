// Critical flow: create, edit and delete a common user through the UI (scenarios #2, #7, #10).

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ROOT = { username: "RootAdmin", password: "rootpass" };

describe("users CRUD", () => {
  beforeEach(() => {
    cy.loginAs(ROOT.username, ROOT.password);
  });

  it("creates a common user and shows it in the table (#2)", () => {
    const name = `Maria_${uid()}`;
    cy.visit("/users");

    cy.get("[data-cy=user-username]").type(name);
    cy.get("[data-cy=user-email]").type(`${name}@reviews.dev`);
    cy.get("[data-cy=user-password]").type("secret123");
    cy.get("[data-cy=user-create]").click();

    cy.get("[data-cy=users-success]").should("be.visible");
    cy.get(`[data-cy=user-row-${name}]`).should("contain", name).and("contain", "common");
  });

  it("edits a user's email (#7)", () => {
    const name = `Edit_${uid()}`;
    const newEmail = `changed_${uid()}@reviews.dev`;
    cy.visit("/users");

    cy.get("[data-cy=user-username]").type(name);
    cy.get("[data-cy=user-create]").click();
    cy.get(`[data-cy=user-row-${name}]`).should("exist");

    cy.get(`[data-cy=edit-${name}]`).click();
    cy.get("[data-cy=edit-modal]").should("be.visible");
    cy.get("[data-cy=edit-email]").clear().type(newEmail);
    cy.get("[data-cy=edit-save]").click();

    cy.get("[data-cy=users-success]").should("be.visible");
    cy.get(`[data-cy=user-row-${name}]`).should("contain", newEmail);
  });

  it("deletes a common user after the cascade confirmation (#10)", () => {
    const name = `Del_${uid()}`;
    cy.visit("/users");

    cy.get("[data-cy=user-username]").type(name);
    cy.get("[data-cy=user-create]").click();
    cy.get(`[data-cy=user-row-${name}]`).should("exist");

    cy.get(`[data-cy=delete-${name}]`).click();
    cy.get("[data-cy=cascade-modal]").should("be.visible").and("contain", "cascades");
    cy.get("[data-cy=cascade-confirm]").click();

    cy.get("[data-cy=users-success]").should("be.visible");
    cy.get(`[data-cy=user-row-${name}]`).should("not.exist");
  });
});
