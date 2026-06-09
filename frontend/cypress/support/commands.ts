/// <reference types="cypress" />

// Shared E2E helpers (Cypress best practices, PLAN §10.2):
//  * programmatic login via the API + cy.session (no UI login per test);
//  * API seeding so each spec arranges its own data.

const API = Cypress.env("apiUrl") as string;

type NewUser = { username: string; email?: string; password: string; role: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      apiLogin(username: string, password: string): Chainable<{ access_token: string; role: string; username: string }>;
      loginAs(username: string, password: string): Chainable<void>;
      apiAs(token: string, method: string, path: string, body?: unknown): Chainable<Cypress.Response<{ data?: unknown; detail?: string }>>;
      seedUser(token: string, user: NewUser): Chainable<string>;
      apiToken(username: string, password: string): Chainable<string>;
      seedPost(token: string, post: { title: string; content?: string; category: string }): Chainable<string>;
      seedComment(token: string, postId: string, content: string): Chainable<string>;
    }
  }
}

Cypress.Commands.add("apiLogin", (username: string, password: string) =>
  cy.request("POST", `${API}/auth/login`, { username, password }).its("body"),
);

Cypress.Commands.add("loginAs", (username: string, password: string) => {
  cy.session(
    [username, password],
    () => {
      cy.request("POST", `${API}/auth/login`, { username, password }).then(({ body }) => {
        cy.visit("/login");
        cy.window().then((win) => {
          win.localStorage.setItem("reviews_token", body.access_token);
          win.localStorage.setItem("reviews_role", body.role);
          win.localStorage.setItem("reviews_username", body.username);
        });
      });
    },
    { cacheAcrossSpecs: true },
  );
});

Cypress.Commands.add("apiAs", (token: string, method: string, path: string, body?: unknown) =>
  cy.request({
    method,
    url: `${API}${path}`,
    headers: { Authorization: `Bearer ${token}` },
    body: body as Cypress.RequestBody,
    failOnStatusCode: false,
  }),
);

// Create a user via the API; tolerate 409 so reruns stay green. Returns the id when created.
Cypress.Commands.add("seedUser", (token: string, user: NewUser) =>
  cy.apiAs(token, "POST", "/admin/users", user).then((res) => {
    expect([201, 409]).to.include(res.status);
    return (res.body?.data as { id?: string })?.id ?? "";
  }),
);

Cypress.Commands.add("apiToken", (username: string, password: string) =>
  cy.apiLogin(username, password).then((body) => body.access_token),
);

Cypress.Commands.add("seedPost", (token: string, post: { title: string; content?: string; category: string }) =>
  cy.apiAs(token, "POST", "/forum/posts", { content: "", ...post }).then((res) => {
    expect(res.status).to.eq(201);
    return (res.body?.data as { id?: string })?.id ?? "";
  }),
);

Cypress.Commands.add("seedComment", (token: string, postId: string, content: string) =>
  cy.apiAs(token, "POST", `/forum/posts/${postId}/comments`, { content }).then((res) => {
    expect(res.status).to.eq(201);
    return (res.body?.data as { id?: string })?.id ?? "";
  }),
);

export {};
