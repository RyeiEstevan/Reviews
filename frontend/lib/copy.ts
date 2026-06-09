// Display-label layer (pt-BR). Internal values sent to/received from the API stay
// in English — these helpers only translate what the user SEES. Unknown values fall
// back to the raw string so nothing ever renders blank.

const ROLE_LABELS: Record<string, string> = {
  common: "comum",
  admin: "administrador",
  superadmin: "superadministrador",
};

const STATUS_LABELS: Record<string, string> = {
  active: "ativo",
  banned: "banido",
};

const CONTRIBUTOR_ROLE_LABELS: Record<string, string> = {
  artist: "artista",
  author: "autor(a)",
  "voice-actor": "dublador(a)",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  user: "usuário",
  artist: "contribuidor",
  news: "notícia",
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  create_user: "Usuário criado",
  update_user: "Usuário atualizado",
  delete_user: "Usuário excluído",
  ban_user: "Usuário banido",
  unban_user: "Usuário desbanido",
  create_artist: "Contribuidor cadastrado",
  create_news: "Notícia publicada",
};

// Backend messages arrive in English (the API contract is unchanged). We translate
// them at the display boundary; anything unmapped passes through verbatim.
const ERROR_LABELS: Record<string, string> = {
  "invalid credentials": "credenciais inválidas",
  "admin access required": "acesso de administrador necessário",
  "not authenticated": "não autenticado",
  "invalid token": "sessão inválida",
  "only superadmin can create admin accounts":
    "apenas superadministradores podem criar administradores",
  "only superadmin can delete admin accounts":
    "apenas superadministradores podem excluir administradores",
  "username already exists": "este usuário já existe",
  "user not found": "usuário não encontrado",
  "name is required": "o nome é obrigatório",
  // Fórum
  "title is required": "o título é obrigatório",
  "comment cannot be empty": "o comentário não pode estar vazio",
  "invalid category": "categoria inválida",
  "post not found": "post não encontrado",
  "comment not found": "comentário não encontrado",
  "not allowed to delete this post": "você não tem permissão para excluir este post",
  "not allowed to delete this comment": "você não tem permissão para excluir este comentário",
  "post content too long": "o conteúdo do post deve ter no máximo 100 caracteres",
  "comment too long": "o comentário deve ter no máximo 100 caracteres",
};

export const formatRole = (role: string): string => ROLE_LABELS[role] ?? role;
export const formatStatus = (status: string): string => STATUS_LABELS[status] ?? status;
export const formatContributorRole = (role: string): string =>
  CONTRIBUTOR_ROLE_LABELS[role] ?? role;
export const formatAuditAction = (action: string): string =>
  AUDIT_ACTION_LABELS[action] ?? action;
export const formatTargetType = (targetType: string): string =>
  TARGET_TYPE_LABELS[targetType] ?? targetType;

const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Always present errors with a capitalized first letter, whether the message was
// mapped from a backend string or passed through unchanged.
export const translateError = (message: string): string =>
  capitalize(ERROR_LABELS[message] ?? message);

const DATE_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : DATE_FMT.format(d);
}
