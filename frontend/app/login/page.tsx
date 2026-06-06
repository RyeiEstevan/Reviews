"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, ShieldCheck, Users, ScrollText, AlertCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { translateError } from "@/lib/copy";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(username, password);
      setSession({ token: res.access_token, role: res.role, username: res.username });
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof ApiError ? translateError(err.message) : "Não foi possível conectar ao servidor";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split">
      <aside className="auth-aside">
        <div className="brand">
          <span className="brand-mark">
            <Clapperboard size={19} />
          </span>
          <span className="brand-text">
            <b>Reviews</b>
            <span>Painel Administrativo</span>
          </span>
        </div>

        <div className="auth-hero">
          <h2>
            Modere a comunidade
            <br />e organize o <span className="accent">catálogo</span>.
          </h2>
          <p>
            Um módulo para administrar usuários, contribuidores, notícias e auditoria da
            plataforma Reviews.
          </p>
          <div className="auth-points">
            <div>
              <Users size={18} /> Contas, papéis e moderação
            </div>
            <div>
              <ShieldCheck size={18} /> Hierarquia de superadministradores
            </div>
            <div>
              <ScrollText size={18} /> Registro de auditoria das ações
            </div>
          </div>
        </div>

        <div className="muted" style={{ fontSize: "0.78rem" }}>
          ESS · Reviews — módulo administrativo
        </div>
      </aside>

      <main className="auth-main">
        <div className="card auth-card" data-cy="login-card">
          <div className="eyebrow" style={{ color: "var(--accent-2)" }}>
            Acesso administrativo
          </div>
          <h1 style={{ fontSize: "1.6rem" }}>Entrar no painel</h1>
          <p className="muted">Use suas credenciais de administrador para continuar.</p>

          {error && (
            <div className="alert error" data-cy="login-error">
              <AlertCircle size={17} />
              {error}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <label htmlFor="username">Usuário ou e-mail</label>
            <input
              id="username"
              data-cy="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="RootAdmin"
            />

            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              data-cy="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />

            <button
              type="submit"
              data-cy="login-submit"
              disabled={loading}
              style={{ width: "100%", marginTop: "0.3rem" }}
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <div className="demo-creds">
            Demonstração: <b>RootAdmin</b> / <b>rootpass</b>
          </div>
        </div>
      </main>
    </div>
  );
}
