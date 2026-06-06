// Audit log: a mutation shows up under the action filter (#17); a read creates no entry (#16).

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ROOT = { username: "RootAdmin", password: "rootpass" };

describe("audit log", () => {
  it("shows a mutation in the filtered audit log (#17)", () => {
    const artist = `AuditArt_${uid()}`;

    cy.apiLogin(ROOT.username, ROOT.password).then((root) => {
      cy.apiAs(root.access_token, "POST", "/admin/artists", { name: artist, role: "artist" }).then(
        (res) => expect(res.status).to.eq(201),
      );
    });

    cy.loginAs(ROOT.username, ROOT.password);
    cy.visit("/audit");
    cy.get("[data-cy=audit-action]").select("create_artist");
    cy.get("[data-cy=audit-apply]").click();

    cy.get("[data-cy=audit-table]").should("contain", "create_artist");
    cy.get("[data-cy=audit-row-create_artist]").should("exist");
  });

  it("a listing read creates no audit entry (#16 / RNF06)", () => {
    cy.apiLogin(ROOT.username, ROOT.password).then((root) => {
      const t = root.access_token;
      cy.apiAs(t, "GET", "/admin/audit-log").then((before) => {
        const count = (before.body.data as unknown[]).length;
        cy.apiAs(t, "GET", "/admin/users").then(() => {
          cy.apiAs(t, "GET", "/admin/audit-log").then((after) => {
            expect((after.body.data as unknown[]).length).to.eq(count);
          });
        });
      });
    });
  });
});
