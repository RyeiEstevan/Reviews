"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Contributor } from "@/lib/api";

const ROLES = ["artist", "author", "voice-actor"];

export default function ArtistsPage() {
  const [results, setResults] = useState<Contributor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("artist");
  const [query, setQuery] = useState("");

  const search = useCallback(async (term: string) => {
    try {
      setResults(await api.listArtists(term));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "search failed");
    }
  }, []);

  useEffect(() => {
    search("");
  }, [search]);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!name.trim()) {
      setError("name is required");
      return;
    }
    try {
      await api.createArtist({ name: name.trim(), role });
      setSuccess(`Registered "${name.trim()}" as ${role}.`);
      setName("");
      await search(query);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "could not register contributor");
    }
  }

  return (
    <div data-cy="artists-page">
      <h1>Catalog</h1>
      <p className="muted">Register artists, authors and voice actors, then search by name.</p>

      {error && (
        <div className="alert error" data-cy="artists-error">
          {error}
        </div>
      )}
      {success && (
        <div className="alert success" data-cy="artists-success">
          {success}
        </div>
      )}

      <div className="card">
        <h3>Register contributor</h3>
        <form onSubmit={register}>
          <div className="grid">
            <div>
              <label htmlFor="ar-name">Name</label>
              <input
                id="ar-name"
                data-cy="artist-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ar-role">Role</label>
              <select id="ar-role" data-cy="artist-role" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" data-cy="artist-create">
            Register
          </button>
        </form>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: "0.8rem" }}>
          <input
            placeholder="Search by partial name…"
            data-cy="artist-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
            style={{ flex: 1, marginBottom: 0 }}
          />
        </div>
        <table data-cy="artists-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {results.map((c) => (
              <tr key={c.id} data-cy={`artist-row-${c.name}`}>
                <td>{c.name}</td>
                <td>
                  <span className="badge role">{c.role}</span>
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={2} className="muted">
                  No contributors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
