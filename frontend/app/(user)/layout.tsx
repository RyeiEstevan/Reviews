// app/(user)/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import React from 'react';
import { getUsername, clearSession, getToken } from "@/lib/auth";
import { Clapperboard, ListVideo, Users, UserCog, LogOut } from "lucide-react";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); // Para sabermos qual menu deixar "ativo"
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
    } else {
      setUsername(getUsername() || "Usuário");
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  // Enquanto valida o token, não renderiza o layout para evitar piscar a tela
  if (loading) {
    return (
      <div className="shell centered">
        <div className="muted">Autenticando...</div>
      </div>
    );
  }

  return (
    <div className="shell">
      {/* BARRA LATERAL (Sidebar) */}
      <aside className="sidebar">
        
        {/* Logo */}
        <div className="brand">
          <span className="brand-mark">
            <Clapperboard size={19} />
          </span>
          <span className="brand-text">
            <b>Reviews</b>
            <span>Sua Conta</span>
          </span>
        </div>

        {/* Menu Principal */}
        <div className="nav-label">Biblioteca</div>
        <nav>
          <Link href="/lists" className={pathname?.startsWith("/lists") ? "active" : ""}>
            <ListVideo /> Minhas Listas
          </Link>
          <Link href="/social" className={pathname?.startsWith("/social") ? "active" : ""}>
            <Users /> Amigos & Rede
          </Link>
        </nav>

        {/* Menu de Configurações */}
        <div className="nav-label">Conta</div>
        <nav>
          <Link href="/profile" className={pathname?.startsWith("/profile") ? "active" : ""}>
            <UserCog /> Meu Perfil
          </Link>
        </nav>

        {/* Empurra o card de sessão lá pro final */}
        <div className="spacer"></div>

        {/* Card do Usuário Logado */}
        <div className="session-card">
          <div className="session-avatar">
            {username.substring(0, 2)}
          </div>
          <div className="session-meta">
            <div>{username}</div>
            <button 
              onClick={handleLogout} 
              className="ghost" 
              style={{ padding: 0, height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', marginTop: '2px' }}
            >
              <LogOut size={12} /> Sair
            </button>
          </div>
        </div>

      </aside>

      {/* CONTEÚDO PRINCIPAL (Renderiza as outras páginas aqui dentro) */}
      <main className="content">
        {children}
      </main>
    </div>
  );
}