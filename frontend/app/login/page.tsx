"use client";

import { useState } from "react";
import React from 'react';
import { useRouter } from "next/navigation";
import { Clapperboard, ShieldCheck, Users, ScrollText, AlertCircle, Star, Film, BookOpen } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { translateError } from "@/lib/copy";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  
  // Estado para controlar se é login de admin ou usuário comum
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Aqui usamos a função do seu amigo. 
      // IMPORTANTE: garanta que a api.login envia os dados como JSON {"email": email, "password": password}
      const res = await api.login(email, password);
      
      // Salva a sessão
      setSession({ 
        token: res.access_token, 
        role: res.role || "user", 
        username: res.username || email.split('@')[0] 
      });
      
      // Redireciona com base no papel (role) ou no modo selecionado
      if (isAdminMode || res.role === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/feed");
      }
    } catch (err) {
      const msg = err instanceof ApiError ? translateError(err.message) : "Não foi possível conectar ao servidor";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-split" style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      
      {/* LADO ESQUERDO - Muda dinamicamente */}
      <aside className="auth-aside" style={{ flex: 1, padding: '40px', background: isAdminMode ? 'var(--surface)' : 'linear-gradient(135deg, #0d0f14 0%, #1a1040 40%, #0f0d20 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="brand" style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="brand-mark" style={{ color: 'var(--accent)' }}>
            {isAdminMode ? <Clapperboard size={24} /> : <Star size={24} fill="currentColor" />}
          </span>
          <span className="brand-text" style={{ fontSize: '20px' }}>
            <b style={{ color: 'var(--text)' }}>Reviews</b>
            {isAdminMode && <span style={{ color: 'var(--muted)', fontSize: '14px', marginLeft: '8px' }}>Painel Administrativo</span>}
          </span>
        </div>

        <div className="auth-hero">
          {isAdminMode ? (
            <>
              <h2 style={{ fontSize: '32px', color: 'var(--text)', marginBottom: '16px' }}>
                Modere a comunidade <br />e organize o <span style={{ color: 'var(--accent)' }}>catálogo</span>.
              </h2>
              <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
                Um módulo para administrar usuários, contribuidores, notícias e auditoria da plataforma Reviews.
              </p>
              <div className="auth-points" style={{ color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}><Users size={18} /> Contas, papéis e moderação</div>
                <div style={{ display: 'flex', gap: '8px' }}><ShieldCheck size={18} /> Hierarquia de superadministradores</div>
                <div style={{ display: 'flex', gap: '8px' }}><ScrollText size={18} /> Registro de auditoria das ações</div>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '42px', color: 'var(--text)', marginBottom: '16px', fontWeight: 900, letterSpacing: '-1px' }}>
                Descubra, Avalie <br /><span style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>& Compartilhe</span>
              </h2>
              <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '16px', lineHeight: '1.6' }}>
                Sua central definitiva para filmes, séries e livros. Encontre o que está em alta e compartilhe sua opinião.
              </p>
              <div className="auth-points" style={{ color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}><Film size={18} /> Acompanhe seus filmes e séries</div>
                <div style={{ display: 'flex', gap: '8px' }}><BookOpen size={18} /> Organize suas leituras</div>
                <div style={{ display: 'flex', gap: '8px' }}><Users size={18} /> Conecte-se com amigos</div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* LADO DIREITO - Formulário */}
      <main className="auth-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div className="card auth-card" data-cy="login-card" style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', padding: '40px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          
          {/* TOGGLE ADMIN / USUÁRIO */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', background: 'var(--surface2)', padding: '4px', borderRadius: '8px' }}>
            <button 
              onClick={() => setIsAdminMode(false)} 
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', background: !isAdminMode ? 'var(--surface)' : 'transparent', color: !isAdminMode ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
            >
              Usuário
            </button>
            <button 
              onClick={() => setIsAdminMode(true)} 
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', background: isAdminMode ? 'var(--surface)' : 'transparent', color: isAdminMode ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
            >
              Admin
            </button>
          </div>

          <div className="eyebrow" style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            {isAdminMode ? 'Acesso administrativo' : 'Bem-vindo de volta'}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
            {isAdminMode ? 'Entrar no painel' : 'Faça seu login'}
          </h1>
          <p className="muted" style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
            {isAdminMode ? 'Use suas credenciais de administrador para continuar.' : 'Entre para avaliar e compartilhar.'}
          </p>

          {error && (
            <div className="alert error" data-cy="login-error" style={{ display: 'flex', gap: '8px', padding: '12px', background: 'rgba(255,101,132,.15)', color: 'var(--accent2)', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', alignItems: 'center' }}>
              <AlertCircle size={17} />
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>E-mail</label>
              <input
                id="email"
                type="email"
                data-cy="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder={isAdminMode ? "admin@reviews.com" : "seu@email.com"}
                style={{ width: '100%', padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
                required
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>Senha</label>
              <input
                id="password"
                type="password"
                data-cy="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                style={{ width: '100%', padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
                required
              />
            </div>

            <button
              type="submit"
              data-cy="login-submit"
              disabled={loading}
              style={{ width: "100%", padding: '14px', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '8px', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>

          {!isAdminMode && (
            <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
              Não tem uma conta? <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Cadastre-se</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}