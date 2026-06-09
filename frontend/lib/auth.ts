"use client";

// Client-side session. The backend is the source of truth for authorization; the
// frontend only stores the JWT and the role claim to drive navigation and to hide
// 🔒 superadmin-only actions (UX only — never a security boundary).

const TOKEN_KEY = "reviews_token";
const ROLE_KEY = "reviews_role";
const USER_KEY = "reviews_username";

export type Session = { token: string; role: string; username: string };

export function setSession(s: Session): void {
  localStorage.setItem(TOKEN_KEY, s.token);
  localStorage.setItem(ROLE_KEY, s.role);
  localStorage.setItem(USER_KEY, s.username);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ROLE_KEY);
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function isSuperadmin(): boolean {
  return getRole() === "superadmin";
}