"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Ban,
  RotateCcw,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { api, ApiError, type User } from "@/lib/api";
import { isSuperadmin } from "@/lib/auth";
import { formatRole, formatStatus, translateError } from "@/lib/copy";
import { PageHeader } from "@/components/ui";

const ROLES = ["common", "admin", "superadmin"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [superadmin, setSuperadmin] = useState(false);

  // create form
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "common" });

  // filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // modals
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [toEdit, setToEdit] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState("");

  const load = useCallback(async () => {
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.message) : "Falha ao carregar usuários");
    }
  }, []);

  useEffect(() => {
    setSuperadmin(isSuperadmin());
    load();
  }, [load]);

  function flash(msg: string) {
    setSuccess(msg);
    setError(null);
  }
  function fail(err: unknown) {
    setError(err instanceof ApiError ? translateError(err.message) : "Falha na requisição");
    setSuccess(null);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createUser({
        username: form.username,
        email: form.email || undefined,
        password: form.password,
        role: form.role,
      });
      flash(`Usuário "${form.username}" criado.`);
      setForm({ username: "", email: "", password: "", role: "common" });
      await load();
    } catch (err) {
      fail(err);
    }
  }

  async function ban(u: User) {
    try {
      await api.banUser(u.id, "violação das regras da comunidade");
      flash(`"${u.username}" foi banido.`);
      await load();
    } catch (err) {
      fail(err);
    }
  }

  async function unban(u: User) {
    try {
      await api.unbanUser(u.id);
      flash(`"${u.username}" foi desbanido.`);
      await load();
    } catch (err) {
      fail(err);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await api.deleteUser(toDelete.id);
      flash(`"${toDelete.username}" e o conteúdo vinculado foram excluídos permanentemente.`);
      setToDelete(null);
      await load();
    } catch (err) {
      setToDelete(null);
      fail(err);
    }
  }

  async function saveEmail() {
    if (!toEdit) return;
    try {
      await api.updateUser(toEdit.id, { email: editEmail });
      flash(`E-mail atualizado para "${toEdit.username}".`);
      setToEdit(null);
      await load();
    } catch (err) {
      setToEdit(null);
      fail(err);
    }
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search && !u.username.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <div data-cy="users-page">
      <div className="stagger">
      <PageHeader
        eyebrow="Comunidade"
        title="Usuários"
        description="Gerencie contas, respeite a hierarquia de superadministradores e modere a comunidade."
      />

      {error && (
        <div className="alert error" data-cy="users-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}
      {success && (
        <div className="alert success" data-cy="users-success">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      <div className="card">
        <h3>
          <UserPlus size={18} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
          Criar usuário
        </h3>
        <form onSubmit={createUser}>
          <div className="grid">
            <div>
              <label htmlFor="cu-username">Usuário</label>
              <input
                id="cu-username"
                data-cy="user-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="cu-email">E-mail</label>
              <input
                id="cu-email"
                data-cy="user-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="cu-password">Senha</label>
              <input
                id="cu-password"
                type="password"
                data-cy="user-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="cu-role">Papel</label>
              <select
                id="cu-role"
                data-cy="user-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} disabled={r !== "common" && !superadmin}>
                    {formatRole(r)}
                    {r !== "common" && !superadmin ? " 🔒 (apenas superadministrador)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!superadmin && form.role !== "common" && (
            <div className="alert error" data-cy="hierarchy-warning">
              <ShieldAlert size={17} />
              Apenas superadministradores podem criar ou excluir administradores.
            </div>
          )}
          <button type="submit" data-cy="user-create" disabled={!form.username || !form.password}>
            <UserPlus size={16} />
            Criar usuário
          </button>
        </form>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: "0.9rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              className="muted"
              style={{ position: "absolute", left: "0.7rem", top: "0.7rem", pointerEvents: "none" }}
            />
            <input
              placeholder="Buscar por usuário…"
              data-cy="user-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 0, paddingLeft: "2.1rem" }}
            />
          </div>
          <select
            data-cy="filter-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: 170, marginBottom: 0 }}
          >
            <option value="">Todos os papéis</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {formatRole(r)}
              </option>
            ))}
          </select>
          <select
            data-cy="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 170, marginBottom: 0 }}
          >
            <option value="">Todos os status</option>
            <option value="active">ativo</option>
            <option value="banned">banido</option>
          </select>
        </div>

        <div className="table-wrap">
          <table data-cy="users-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const privileged = u.role === "admin" || u.role === "superadmin";
                const lockedTarget = privileged && !superadmin;
                return (
                  <tr key={u.id} data-cy={`user-row-${u.username}`}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td className="muted">{u.email ?? "—"}</td>
                    <td>
                      <span className="badge role">{formatRole(u.role)}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.status}`} data-cy="user-status">
                        {formatStatus(u.status)}
                      </span>
                    </td>
                    <td>
                      <div className="row" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                        <button
                          className="secondary btn-sm"
                          data-cy={`edit-${u.username}`}
                          onClick={() => {
                            setToEdit(u);
                            setEditEmail(u.email ?? "");
                          }}
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                        {u.status === "active" ? (
                          <button
                            className="secondary btn-sm"
                            data-cy={`ban-${u.username}`}
                            onClick={() => ban(u)}
                            disabled={privileged}
                            title={privileged ? "A moderação se aplica apenas a usuários comuns" : ""}
                          >
                            <Ban size={14} />
                            Banir
                          </button>
                        ) : (
                          <button
                            className="secondary btn-sm"
                            data-cy={`unban-${u.username}`}
                            onClick={() => unban(u)}
                          >
                            <RotateCcw size={14} />
                            Desbanir
                          </button>
                        )}
                        <button
                          className="danger-soft btn-sm"
                          data-cy={`delete-${u.username}`}
                          onClick={() => setToDelete(u)}
                          disabled={lockedTarget}
                          title={
                            lockedTarget
                              ? "🔒 Apenas superadministradores podem excluir administradores"
                              : ""
                          }
                        >
                          {lockedTarget ? <Lock size={14} /> : <Trash2 size={14} />}
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      <Users size={28} style={{ display: "block", margin: "0 auto 0.5rem", opacity: 0.5 }} />
                      Nenhum usuário encontrado.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {toEdit && (
        <div className="modal-backdrop" onClick={() => setToEdit(null)}>
          <div className="modal" data-cy="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              <Pencil size={18} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
              Editar {toEdit.username}
            </h3>
            <label htmlFor="edit-email">E-mail</label>
            <input
              id="edit-email"
              data-cy="edit-email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
            <div className="row">
              <button data-cy="edit-save" onClick={saveEmail}>
                <CheckCircle2 size={16} />
                Salvar
              </button>
              <button className="secondary" onClick={() => setToEdit(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {toDelete && (
        <div className="modal-backdrop" onClick={() => setToDelete(null)}>
          <div className="modal" data-cy="cascade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon danger">
              <AlertTriangle size={22} />
            </div>
            <h3 style={{ marginTop: 0 }}>Excluir conta e conteúdo vinculado?</h3>
            <p className="muted">
              Esta ação remove a conta de <strong>{toDelete.username}</strong> e os conteúdos
              associados a ela (avaliações, posts e comentários). A operação será registrada na
              auditoria e não pode ser desfeita.
            </p>
            <div className="row">
              <button className="danger" data-cy="cascade-confirm" onClick={confirmDelete}>
                <Trash2 size={16} />
                Excluir permanentemente
              </button>
              <button className="secondary" data-cy="cascade-cancel" onClick={() => setToDelete(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
