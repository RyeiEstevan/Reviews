"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clapperboard,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Search,
  Star,
} from "lucide-react";
import {
  api,
  ApiError,
  type ContentItem,
  type ContentCreatePayload,
  type ContentUpdatePayload,
} from "@/lib/api";
import { PageHeader } from "@/components/ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "movie",  label: "Filme"  },
  { value: "series", label: "Série"  },
  { value: "book",   label: "Livro"  },
] as const;

function typeLabel(t: string) {
  return TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

function ScoreDot({ score }: { score: number }) {
  const color =
    score >= 8.5 ? "var(--ok)" : score >= 7 ? "var(--gold)" : "var(--danger)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        color,
        fontWeight: 700,
        fontSize: "0.82rem",
      }}
    >
      <Star size={12} fill={color} stroke="none" />
      {score.toFixed(1)}
    </span>
  );
}

// ─── Default form values ──────────────────────────────────────────────────────

const emptyCreate: ContentCreatePayload = {
  title: "",
  type: "movie",
  year: new Date().getFullYear(),
  poster_url: "",
  description: "",
  genre: [],
  director: "",
  platform: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentManagePage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Create panel
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<ContentCreatePayload>(emptyCreate);
  const [genreInput, setGenreInput] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [toEdit, setToEdit] = useState<ContentItem | null>(null);
  const [editForm, setEditForm] = useState<ContentUpdatePayload & { genreInput: string }>({
    genreInput: "",
  });
  const [editing, setEditing] = useState(false);

  // Delete confirm
  const [toDelete, setToDelete] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.listContent());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao carregar mídia");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(msg: string) { setSuccess(msg); setError(null); }
  function fail(err: unknown) {
    setError(err instanceof ApiError ? err.message : "Falha na requisição");
    setSuccess(null);
  }

  // ── Parse genre string "sci-fi, action" → ["sci-fi", "action"]
  function parseGenres(raw: string): string[] {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const payload: ContentCreatePayload = {
      ...form,
      genre: parseGenres(genreInput),
      poster_url: form.poster_url || null,
      description: form.description || null,
      director: form.director || null,
      platform: form.platform || null,
    };
    try {
      await api.createContent(payload);
      flash(`"${form.title}" cadastrado com sucesso.`);
      setForm(emptyCreate);
      setGenreInput("");
      setShowCreate(false);
      await load();
    } catch (err) { fail(err); } finally { setCreating(false); }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!toEdit) return;
    setEditing(true);
    const { genreInput: gi, ...rest } = editForm;
    const payload: ContentUpdatePayload = {
      ...rest,
      genre: parseGenres(gi),
    };
    try {
      await api.updateContent(toEdit.id, payload);
      flash(`"${toEdit.title}" atualizado.`);
      setToEdit(null);
      await load();
    } catch (err) { fail(err); } finally { setEditing(false); }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteContent(toDelete.id);
      flash(`"${toDelete.title}" removido.`);
      setToDelete(null);
      await load();
    } catch (err) { fail(err); } finally { setDeleting(false); }
  }

  function openEdit(item: ContentItem) {
    setToEdit(item);
    setEditForm({
      title: item.title,
      type: item.type,
      year: item.year,
      poster_url: item.poster_url ?? "",
      description: item.description ?? "",
      director: item.director ?? "",
      platform: item.platform ?? "",
      genreInput: item.genre.join(", "),
    });
  }

  const filtered = items.filter((item) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.genre.some((g) => g.toLowerCase().includes(q)) ||
      (item.platform ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div data-cy="content-manage">
      <PageHeader
        eyebrow="Catálogo"
        title="Conteúdo"
        description="Gerencie filmes, séries e livros do catálogo da plataforma."
        actions={
          <button
            onClick={() => setShowCreate(!showCreate)}
            data-cy="content-create-btn"
          >
            <Plus size={16} />
            Nova obra
          </button>
        }
      />

      {/* Alerts */}
      {error && (
        <div className="alert error" data-cy="content-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}
      {success && (
        <div className="alert success" data-cy="content-success">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {/* ── Create panel ── */}
      {showCreate && (
        <div className="card" style={{ marginBottom: "1.4rem" }} data-cy="content-create-panel">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>Nova obra</h3>
            <button className="ghost" style={{ padding: "0.3rem" }} onClick={() => setShowCreate(false)} aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreate}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="c-title">Título *</label>
                <input id="c-title" data-cy="content-title" value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="ex: Fallout" required />
              </div>
              <div>
                <label htmlFor="c-type">Tipo *</label>
                <select id="c-type" data-cy="content-type" value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as ContentCreatePayload["type"] }))}>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="c-year">Ano *</label>
                <input id="c-year" data-cy="content-year" type="number" value={form.year}
                  onChange={(e) => setForm((p) => ({ ...p, year: parseInt(e.target.value, 10) }))}
                  min={1888} max={new Date().getFullYear() + 5} required />
              </div>
              <div>
                <label htmlFor="c-platform">Plataforma</label>
                <input id="c-platform" data-cy="content-platform" value={form.platform ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                  placeholder="ex: Prime Video" />
              </div>
              <div>
                <label htmlFor="c-director">Diretor / Autor</label>
                <input id="c-director" data-cy="content-director" value={form.director ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, director: e.target.value }))}
                  placeholder="ex: Jonathan Nolan" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="c-genre">Gêneros (separados por vírgula)</label>
                <input id="c-genre" data-cy="content-genre" value={genreInput}
                  onChange={(e) => setGenreInput(e.target.value)}
                  placeholder="ex: sci-fi, action, drama" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="c-poster">URL do poster</label>
                <input id="c-poster" data-cy="content-poster" value={form.poster_url ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, poster_url: e.target.value }))}
                  placeholder="https://..." />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="c-desc">Descrição</label>
                <textarea id="c-desc" data-cy="content-description"
                  value={form.description ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Sinopse da obra…" />
              </div>
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button type="submit" data-cy="content-create-submit" disabled={creating}>
                {creating ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Search + count ── */}
      <div className="row" style={{ marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "360px" }}>
          <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--faint)", pointerEvents: "none" }} />
          <input placeholder="Buscar título, gênero ou plataforma…" data-cy="content-search"
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 0, paddingLeft: "2.2rem" }} />
        </div>
        <span className="muted" style={{ fontSize: "0.82rem" }}>
          {filtered.length} {filtered.length !== 1 ? "obras" : "obra"}
        </span>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: "44px", borderRadius: "var(--r-sm)" }} />
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Título</th>
                <th>Tipo</th>
                <th>Ano</th>
                <th>Plataforma</th>
                <th>Nota</th>
                <th>Reviews</th>
                <th></th>
              </tr>
            </thead>
            <tbody data-cy="content-table">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: "2rem" }}>
                    <Clapperboard size={24} style={{ opacity: 0.4, display: "block", margin: "0 auto 0.5rem" }} />
                    Nenhuma obra encontrada.
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} data-cy={`content-row-${item.id}`}>
                  {/* Poster thumbnail */}
                  <td style={{ width: "40px", padding: "0.5rem 0.85rem" }}>
                    <div style={{
                      width: "34px", height: "48px", borderRadius: "var(--r-xs)",
                      background: item.poster_url
                        ? `url(${item.poster_url}) center/cover no-repeat, var(--panel-2)`
                        : "var(--panel-3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {!item.poster_url && <Clapperboard size={14} style={{ opacity: 0.3 }} />}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.title}</td>
                  <td><span className="badge role no-dot">{typeLabel(item.type)}</span></td>
                  <td>{item.year}</td>
                  <td>{item.platform ?? <span className="muted">—</span>}</td>
                  <td><ScoreDot score={item.avg_score} /></td>
                  <td>{item.review_count.toLocaleString("pt-BR")}</td>
                  <td>
                    <div className="row" style={{ gap: "0.4rem", flexWrap: "nowrap" }}>
                      <button className="secondary btn-sm" data-cy={`content-edit-${item.id}`}
                        title="Editar" onClick={() => openEdit(item)}>
                        <Pencil size={14} />
                      </button>
                      <button className="danger-soft btn-sm" data-cy={`content-delete-${item.id}`}
                        title="Remover" onClick={() => setToDelete(item)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit modal ── */}
      {toEdit && (
        <div className="modal-backdrop" onClick={() => setToEdit(null)}>
          <div className="modal" style={{ width: "520px" }} onClick={(e) => e.stopPropagation()} data-cy="content-edit-modal">
            <h3>Editar obra</h3>
            <form onSubmit={handleUpdate}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="e-title">Título</label>
                  <input id="e-title" value={editForm.title ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="e-type">Tipo</label>
                  <select id="e-type" value={editForm.type ?? "movie"}
                    onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value as ContentUpdatePayload["type"] }))}>
                    {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="e-year">Ano</label>
                  <input id="e-year" type="number" value={editForm.year ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, year: parseInt(e.target.value, 10) }))}
                    min={1888} max={new Date().getFullYear() + 5} />
                </div>
                <div>
                  <label htmlFor="e-platform">Plataforma</label>
                  <input id="e-platform" value={editForm.platform ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, platform: e.target.value }))} />
                </div>
                <div>
                  <label htmlFor="e-director">Diretor / Autor</label>
                  <input id="e-director" value={editForm.director ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, director: e.target.value }))} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="e-genre">Gêneros (separados por vírgula)</label>
                  <input id="e-genre" value={editForm.genreInput}
                    onChange={(e) => setEditForm((p) => ({ ...p, genreInput: e.target.value }))}
                    placeholder="ex: sci-fi, action" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="e-poster">URL do poster</label>
                  <input id="e-poster" value={editForm.poster_url ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, poster_url: e.target.value }))} />
                </div>
              </div>
              <div className="row" style={{ marginTop: "1.2rem" }}>
                <button type="button" className="secondary" onClick={() => setToEdit(null)}>Cancelar</button>
                <button type="submit" disabled={editing} data-cy="content-edit-submit">
                  {editing ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      {toDelete && (
        <div className="modal-backdrop" onClick={() => setToDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} data-cy="content-delete-modal">
            <div className="modal-icon danger"><Trash2 size={20} /></div>
            <h3>Remover obra</h3>
            <p className="muted">
              Tem certeza que deseja remover{" "}
              <b style={{ color: "var(--text)" }}>{toDelete.title}</b>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="row" style={{ marginTop: "1.2rem" }}>
              <button className="secondary" onClick={() => setToDelete(null)}>Cancelar</button>
              <button className="danger" onClick={handleDelete} disabled={deleting} data-cy="content-delete-confirm">
                {deleting ? "Removendo…" : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
