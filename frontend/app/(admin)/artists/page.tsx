"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, UserPlus, Library, CheckCircle2, AlertCircle } from "lucide-react";
import { api, ApiError, type Contributor } from "@/lib/api";
import { formatContributorRole, translateError } from "@/lib/copy";
import { PageHeader } from "@/components/ui";

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
      setError(err instanceof ApiError ? translateError(err.message) : "Falha na busca");
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
      setError("O nome é obrigatório");
      return;
    }
    try {
      await api.createArtist({ name: name.trim(), role });
      setSuccess(`"${name.trim()}" cadastrado(a) como ${formatContributorRole(role)}.`);
      setName("");
      await search(query);
    } catch (err) {
      setError(err instanceof ApiError ? translateError(err.message) : "Não foi possível cadastrar o contribuidor");
    }
  }

  return (
    <div data-cy="artists-page" className="stagger">
      <PageHeader
        eyebrow="Catálogo"
        title="Contribuidores"
        description="Cadastre artistas, autores e dubladores e busque no catálogo por nome."
      />

      {error && (
        <div className="alert error" data-cy="artists-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}
      {success && (
        <div className="alert success" data-cy="artists-success">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      <div className="card">
        <h3>
          <UserPlus size={18} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
          Cadastrar contribuidor
        </h3>
        <form onSubmit={register}>
          <div className="grid">
            <div>
              <label htmlFor="ar-name">Nome</label>
              <input
                id="ar-name"
                data-cy="artist-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ar-role">Papel</label>
              <select id="ar-role" data-cy="artist-role" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {formatContributorRole(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" data-cy="artist-create">
            <UserPlus size={16} />
            Cadastrar
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
              placeholder="Buscar por nome…"
              data-cy="artist-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                search(e.target.value);
              }}
              style={{ marginBottom: 0, paddingLeft: "2.1rem" }}
            />
          </div>
        </div>
        <div className="table-wrap">
          <table data-cy="artists-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Papel</th>
              </tr>
            </thead>
            <tbody>
              {results.map((c) => (
                <tr key={c.id} data-cy={`artist-row-${c.name}`}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>
                    <span className="badge role">{formatContributorRole(c.role)}</span>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={2}>
                    <div className="empty">
                      <Library size={28} style={{ display: "block", margin: "0 auto 0.5rem", opacity: 0.5 }} />
                      Nenhum contribuidor encontrado.
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
