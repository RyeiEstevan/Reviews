"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Star,
  LayoutGrid,
  Library,
  LogOut,
  UserRound,
} from "lucide-react";
import { clearSession, getRole, getUsername, isLoggedIn } from "@/lib/auth";
import { formatRole } from "@/lib/copy";

const NAV = [
  { href: "/home",    cy: "feed",     label: "Feed",     Icon: LayoutGrid },
  { href: "/content", cy: "catalog",  label: "Catálogo", Icon: Library    },
];

export function HomeSidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const loggedIn  = isLoggedIn();
  const username  = getUsername() ?? "?";
  const role      = getRole() ?? "";
  const isAdmin   = role === "admin" || role === "superadmin";

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <aside className="sidebar" data-cy="home-sidebar">
      {/* Brand — clicking goes to /home */}
      <Link href="/home" className="brand" style={{ textDecoration: "none" }}>
        <span className="brand-mark">
          <Star size={16} fill="#fff" stroke="none" />
        </span>
        <span className="brand-text">
          <b>Reviews</b>
          <span>Plataforma</span>
        </span>
      </Link>

      <div className="nav-label">Navegação</div>

      <nav>
        {NAV.map(({ href, cy, label, Icon }) => (
          <Link
            key={href}
            href={href}
            data-cy={`home-nav-${cy}`}
            className={pathname === href ? "active" : ""}
          >
            <Icon strokeWidth={1.9} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="spacer" />

      {loggedIn ? (
        <>
          {/* Session card — links to /dashboard for admin/superadmin */}
          <Link
            href={isAdmin ? "/dashboard" : "/home"}
            className="session-card"
            data-cy="home-session-card"
            style={{ textDecoration: "none" }}
            title={isAdmin ? "Ir para o painel" : undefined}
          >
            <span className="session-avatar" data-cy="home-session-avatar">
              {username.charAt(0).toUpperCase()}
            </span>
            <div className="session-meta">
              <div data-cy="home-session-username">{username}</div>
              <span className="badge role" data-cy="home-session-role">
                {formatRole(role)}
              </span>
            </div>
          </Link>
          <button className="secondary" data-cy="home-logout" onClick={logout}>
            <LogOut size={16} />
            Sair
          </button>
        </>
      ) : (
        <Link
          href="/login"
          data-cy="home-login-link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.55rem 0.65rem",
            borderRadius: "var(--r-sm)",
            background: "var(--accent-soft)",
            color: "var(--accent-2)",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          <UserRound size={16} />
          Entrar
        </Link>
      )}
    </aside>
  );
}
