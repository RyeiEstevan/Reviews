"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessagesSquare, LogIn, LogOut, Home } from "lucide-react";
import { clearSession, getUsername, isLoggedIn } from "@/lib/auth";

// Layout for the whole /forum area. Deliberately NOT inside the (admin) group:
// reading the forum is public, so there is no session guard here. We only read
// the session to show "Entrar" vs. the logged-in user (UX, not security).
export default function ForumLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUsername(isLoggedIn() ? getUsername() : null);
    setReady(true);
  }, []);

  function logout() {
    clearSession();
    setUsername(null);
    router.refresh();
  }

  return (
    <div className="public-wrap" data-cy="forum-shell">
      <header className="forum-topbar">
        <Link href="/forum" className="forum-brand" data-cy="forum-home-link">
          <span className="brand-mark">
            <MessagesSquare size={18} />
          </span>
          <span>
            <b>Fórum</b> <span className="muted">Reviews</span>
          </span>
        </Link>

        <div className="row">
          <Link href="/home" className="btn secondary btn-sm" data-cy="forum-home-button">
            <Home size={15} />
            Início
          </Link>
          {ready &&
            (username ? (
              <>
                <span className="muted" data-cy="forum-session" style={{ fontSize: "0.85rem" }}>
                  Olá, {username}
                </span>
                <button className="ghost btn-sm" data-cy="forum-logout" onClick={logout}>
                  <LogOut size={15} />
                  Sair
                </button>
              </>
            ) : (
              <Link href="/login" className="btn secondary btn-sm" data-cy="forum-login">
                <LogIn size={15} />
                Entrar
              </Link>
            ))}
        </div>
      </header>

      {children}
    </div>
  );
}
