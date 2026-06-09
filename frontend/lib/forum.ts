// Shared fórum constants. The category values match the backend whitelist
// exactly — the stored value IS the pt-BR label, so there is no translation
// layer to keep in sync (unlike roles/status in copy.ts).
export const FORUM_CATEGORIES = ["Filmes", "Séries", "Livros"] as const;
export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

// Max length for post content and comments. Mirrors the backend limit.
export const FORUM_MAX_CONTENT_LENGTH = 100;

const MODERATOR_ROLES = ["moderador", "admin", "superadmin"];
export function isModerator(role: string | null): boolean {
  return role != null && MODERATOR_ROLES.includes(role);
}
