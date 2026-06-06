import { getToken } from "./auth";

// Single typed gateway to the FastAPI backend. Every call injects the Bearer token
// (when present) and unwraps the `{ data: ... }` envelope the API returns.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = (body && (body.detail ?? body.message)) ?? `request failed (${res.status})`;
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return body as T;
}

export type User = {
  id: string;
  username: string;
  email: string | null;
  role: string;
  status: string;
  ban_reason: string | null;
};
export type Contributor = { id: string; name: string; role: string };
export type News = { id: string; title: string; body?: string; tags: string[] };
export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target_type: string;
  target: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
export type LoginResponse = {
  access_token: string;
  token_type: string;
  role: string;
  username: string;
};

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  listUsers: () => request<{ data: User[] }>("/admin/users").then((r) => r.data),
  createUser: (u: { username: string; email?: string; password: string; role: string }) =>
    request<{ data: User }>("/admin/users", { method: "POST", body: JSON.stringify(u) }).then(
      (r) => r.data,
    ),
  updateUser: (id: string, patch: { email?: string; username?: string }) =>
    request<{ data: User }>(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }).then((r) => r.data),
  deleteUser: (id: string) =>
    request<{ data: { deleted: boolean } }>(`/admin/users/${id}`, { method: "DELETE" }),
  banUser: (id: string, reason: string) =>
    request<{ data: User }>(`/admin/users/${id}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }).then((r) => r.data),
  unbanUser: (id: string) =>
    request<{ data: User }>(`/admin/users/${id}/unban`, { method: "POST" }).then((r) => r.data),

  listArtists: (q = "") =>
    request<{ data: Contributor[] }>(`/admin/artists?q=${encodeURIComponent(q)}`).then(
      (r) => r.data,
    ),
  createArtist: (c: { name: string; role: string }) =>
    request<{ data: Contributor }>("/admin/artists", {
      method: "POST",
      body: JSON.stringify(c),
    }).then((r) => r.data),

  createNews: (n: { title: string; body: string; tags: string[] }) =>
    request<{ data: News }>("/admin/news", { method: "POST", body: JSON.stringify(n) }).then(
      (r) => r.data,
    ),

  auditLog: (filters: { actor?: string; action?: string } = {}) => {
    const p = new URLSearchParams();
    if (filters.actor) p.set("actor", filters.actor);
    if (filters.action) p.set("action", filters.action);
    const qs = p.toString();
    return request<{ data: AuditEntry[] }>(`/admin/audit-log${qs ? `?${qs}` : ""}`).then(
      (r) => r.data,
    );
  },

  publicNews: () => request<{ data: News[] }>("/news").then((r) => r.data),
  publicPosts: () =>
    request<{ data: { id: string; owner: string; title: string }[] }>("/posts").then((r) => r.data),
};
