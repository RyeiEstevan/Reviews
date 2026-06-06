"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Filter, ScrollText, User, AlertCircle } from "lucide-react";
import { api, ApiError, type AuditEntry } from "@/lib/api";
import { formatAuditAction, formatTargetType, formatDateTime, translateError } from "@/lib/copy";
import { PageHeader } from "@/components/ui";

const ACTIONS = [
  "create_user",
  "update_user",
  "delete_user",
  "ban_user",
  "unban_user",
  "create_artist",
  "create_news",
];

// Colour the action chip by the intent of the mutation so destructive actions stand out.
function chipClass(action: string): string {
  if (action.startsWith("delete")) return "badge danger-chip";
  if (action.startsWith("ban")) return "badge warn-chip";
  return "badge role";
}

function formatMeta(meta: Record<string, unknown>): string {
  const entries = Object.entries(meta ?? {});
  if (entries.length === 0) return "—";
  return entries.map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join("  ");
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");

  const load = useCallback(async (filters: { actor?: string; action?: string }) => {
    try {
      setEntries(await api.auditLog(filters));
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.message) : "Falha ao carregar a auditoria");
    }
  }, []);

  useEffect(() => {
    load({});
  }, [load]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    load({ actor: actor || undefined, action: action || undefined });
  }

  // Only show the Details column when at least one row carries metadata,
  // otherwise it's a column full of "—".
  const hasDetails = entries.some((e) => Object.keys(e.metadata ?? {}).length > 0);

  return (
    <div data-cy="audit-page" className="stagger">
      <PageHeader
        eyebrow="Auditoria"
        title="Registro de auditoria"
        description="Toda ação administrativa bem-sucedida fica registrada aqui — ações de consulta não são registradas."
      />

      {error && (
        <div className="alert error" data-cy="audit-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      <div className="card">
        <form className="row" onSubmit={applyFilters}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              className="muted"
              style={{ position: "absolute", left: "0.7rem", top: "0.7rem", pointerEvents: "none" }}
            />
            <input
              placeholder="Filtrar por responsável…"
              data-cy="audit-actor"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              style={{ marginBottom: 0, paddingLeft: "2.1rem" }}
            />
          </div>
          <select
            data-cy="audit-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            style={{ width: 220, marginBottom: 0 }}
          >
            <option value="">Todas as ações</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {formatAuditAction(a)}
              </option>
            ))}
          </select>
          <button type="submit" data-cy="audit-apply">
            <Filter size={16} />
            Aplicar
          </button>
        </form>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table data-cy="audit-table">
            <thead>
              <tr>
                <th>Responsável</th>
                <th>Ação</th>
                <th>Tipo de alvo</th>
                <th>Alvo</th>
                <th>Data</th>
                {hasDetails && <th>Detalhes</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} data-cy={`audit-row-${e.action}`}>
                  <td>
                    <span className="row" style={{ gap: "0.4rem", flexWrap: "nowrap" }}>
                      <User size={14} className="muted" />
                      <span style={{ fontWeight: 600 }}>{e.actor}</span>
                    </span>
                  </td>
                  <td>
                    <span className={chipClass(e.action)}>{formatAuditAction(e.action)}</span>
                  </td>
                  <td className="muted">{formatTargetType(e.target_type)}</td>
                  <td className="mono">{e.target ?? "—"}</td>
                  <td className="mono muted" style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                    {formatDateTime(e.created_at)}
                  </td>
                  {hasDetails && (
                    <td className="mono muted" style={{ fontSize: "0.78rem" }}>
                      {formatMeta(e.metadata)}
                    </td>
                  )}
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={hasDetails ? 6 : 5}>
                    <div className="empty">
                      <ScrollText size={28} style={{ display: "block", margin: "0 auto 0.5rem", opacity: 0.5 }} />
                      Nenhum registro de auditoria encontrado.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
