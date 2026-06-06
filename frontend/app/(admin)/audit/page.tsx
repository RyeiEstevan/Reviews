"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type AuditEntry } from "@/lib/api";

const ACTIONS = [
  "create_user",
  "update_user",
  "delete_user",
  "ban_user",
  "unban_user",
  "create_artist",
  "create_news",
];

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");

  const load = useCallback(async (filters: { actor?: string; action?: string }) => {
    try {
      setEntries(await api.auditLog(filters));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "failed to load audit log");
    }
  }, []);

  useEffect(() => {
    load({});
  }, [load]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    load({ actor: actor || undefined, action: action || undefined });
  }

  return (
    <div data-cy="audit-page">
      <h1>Audit log</h1>
      <p className="muted">Every successful administrative mutation is recorded here.</p>

      {error && (
        <div className="alert error" data-cy="audit-error">
          {error}
        </div>
      )}

      <div className="card">
        <form className="row" onSubmit={applyFilters}>
          <input
            placeholder="Filter by actor…"
            data-cy="audit-actor"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <select
            data-cy="audit-action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            style={{ width: 200, marginBottom: 0 }}
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button type="submit" data-cy="audit-apply">
            Apply
          </button>
        </form>
      </div>

      <div className="card">
        <table data-cy="audit-table">
          <thead>
            <tr>
              <th>Actor</th>
              <th>Action</th>
              <th>Target type</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} data-cy={`audit-row-${e.action}`}>
                <td>{e.actor}</td>
                <td>
                  <span className="badge role">{e.action}</span>
                </td>
                <td>{e.target_type}</td>
                <td>{e.target ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No audit entries match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
