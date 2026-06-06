// Critical flow: register a contributor, reject an empty name, search by partial name
// (scenarios #11, #12, #13).

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ROOT = { username: "RootAdmin", password: "rootpass" };

describe("catalog / artists", () => {
  beforeEach(() => {
    cy.loginAs(ROOT.username, ROOT.password);
  });

  it("registers a voice actor (#11)", () => {
    const name = `Wendel_${uid()}`;
    cy.visit("/artists");

    cy.get("[data-cy=artist-name]").type(name);
    cy.get("[data-cy=artist-role]").select("voice-actor");
    cy.get("[data-cy=artist-create]").click();

    cy.get("[data-cy=artists-success]").should("be.visible");
    cy.get(`[data-cy=artist-row-${name}]`).should("contain", name).and("contain", "voice-actor");
  });

  it("rejects an empty name (#12)", () => {
    cy.visit("/artists");
    cy.get("[data-cy=artist-name]").clear();
    cy.get("[data-cy=artist-create]").click();
    cy.get("[data-cy=artists-error]").should("be.visible").and("contain", "name is required");
  });

  it("finds a contributor by case-insensitive partial name (#13)", () => {
    const name = `Wendel_${uid()}`;
    cy.visit("/artists");

    cy.get("[data-cy=artist-name]").type(name);
    cy.get("[data-cy=artist-create]").click();
    cy.get(`[data-cy=artist-row-${name}]`).should("exist");

    // partial, lower-case substring of the (capitalised) name
    cy.get("[data-cy=artist-search]").clear().type("wendel");
    cy.get("[data-cy=artists-table]").should("contain", name);

    cy.get("[data-cy=artist-search]").clear().type("zzz-no-match");
    cy.get(`[data-cy=artist-row-${name}]`).should("not.exist");
  });
});
