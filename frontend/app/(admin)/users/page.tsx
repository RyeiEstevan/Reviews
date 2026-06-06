"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError, type User } from "@/lib/api";
import { isSuperadmin } from "@/lib/auth";

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
      setError(err instanceof ApiError ? err.message : "failed to load users");
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
    setError(err instanceof ApiError ? err.message : "request failed");
    setSuccess(null);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createUser({
        username: form.username,
        email: form.email || undefined,
        password: form.password || "changeme",
        role: form.role,
      });
      flash(`User "${form.username}" created.`);
      setForm({ username: "", email: "", password: "", role: "common" });
      await load();
    } catch (err) {
      fail(err);
    }
  }

  async function ban(u: User) {
    try {
      await api.banUser(u.id, "violating community rules");
      flash(`"${u.username}" was banned.`);
      await load();
    } catch (err) {
      fail(err);
    }
  }

  async function unban(u: User) {
    try {
      await api.unbanUser(u.id);
      flash(`"${u.username}" was unbanned.`);
      await load();
    } catch (err) {
      fail(err);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await api.deleteUser(toDelete.id);
      flash(`"${toDelete.username}" and related content were permanently deleted.`);
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
      flash(`Email updated for "${toEdit.username}".`);
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
      <h1>Users</h1>

      {error && (
        <div className="alert error" data-cy="users-error">
          {error}
        </div>
      )}
      {success && (
        <div className="alert success" data-cy="users-success">
          {success}
        </div>
      )}

      <div className="card">
        <h3>Create user</h3>
        <form onSubmit={createUser}>
          <div className="grid">
            <div>
              <label htmlFor="cu-username">Username</label>
              <input
                id="cu-username"
                data-cy="user-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="cu-email">Email</label>
              <input
                id="cu-email"
                data-cy="user-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="cu-password">Password</label>
              <input
                id="cu-password"
                type="password"
                data-cy="user-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="cu-role">Role</label>
              <select
                id="cu-role"
                data-cy="user-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} disabled={r !== "common" && !superadmin}>
                    {r}
                    {r !== "common" && !superadmin ? " 🔒 (superadmin only)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!superadmin && form.role !== "common" && (
            <div className="alert error" data-cy="hierarchy-warning">
              Only a superadmin can create admin accounts (R1).
            </div>
          )}
          <button type="submit" data-cy="user-create" disabled={!form.username}>
            Create user
          </button>
        </form>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: "0.8rem" }}>
          <input
            placeholder="Search by username…"
            data-cy="user-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <select
            data-cy="filter-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: 160, marginBottom: 0 }}
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            data-cy="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 160, marginBottom: 0 }}
          >
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="banned">banned</option>
          </select>
        </div>

        <table data-cy="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const privileged = u.role === "admin" || u.role === "superadmin";
              const lockedTarget = privileged && !superadmin;
              return (
                <tr key={u.id} data-cy={`user-row-${u.username}`}>
                  <td>{u.username}</td>
                  <td>{u.email ?? "—"}</td>
                  <td>
                    <span className="badge role">{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.status}`} data-cy="user-status">
                      {u.status}
                    </span>
                  </td>
                  <td>
                    <div className="row">
                      <button
                        className="secondary"
                        data-cy={`edit-${u.username}`}
                        onClick={() => {
                          setToEdit(u);
                          setEditEmail(u.email ?? "");
                        }}
                      >
                        Edit
                      </button>
                      {u.status === "active" ? (
                        <button
                          className="secondary"
                          data-cy={`ban-${u.username}`}
                          onClick={() => ban(u)}
                          disabled={privileged}
                          title={privileged ? "Moderation applies to common users only" : ""}
                        >
                          Ban
                        </button>
                      ) : (
                        <button
                          className="secondary"
                          data-cy={`unban-${u.username}`}
                          onClick={() => unban(u)}
                        >
                          Unban
                        </button>
                      )}
                      <button
                        className="danger"
                        data-cy={`delete-${u.username}`}
                        onClick={() => setToDelete(u)}
                        disabled={lockedTarget}
                        title={lockedTarget ? "🔒 Only a superadmin can delete admin accounts" : ""}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No users match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toEdit && (
        <div className="modal-backdrop" onClick={() => setToEdit(null)}>
          <div className="modal" data-cy="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit {toEdit.username}</h3>
            <label htmlFor="edit-email">Email</label>
            <input
              id="edit-email"
              data-cy="edit-email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
            <div className="row">
              <button data-cy="edit-save" onClick={saveEmail}>
                Save
              </button>
              <button className="secondary" onClick={() => setToEdit(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toDelete && (
        <div className="modal-backdrop" onClick={() => setToDelete(null)}>
          <div className="modal" data-cy="cascade-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {toDelete.username}?</h3>
            <p className="muted">
              This permanently removes the account <strong>and cascades</strong> to the user&apos;s
              reviews, posts and comments. This cannot be undone.
            </p>
            <div className="row">
              <button className="danger" data-cy="cascade-confirm" onClick={confirmDelete}>
                Delete permanently
              </button>
              <button className="secondary" data-cy="cascade-cancel" onClick={() => setToDelete(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
