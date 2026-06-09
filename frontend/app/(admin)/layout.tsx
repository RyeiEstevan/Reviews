"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Star,
  LayoutDashboard,
  Users,
  Library,
  Film,
  Newspaper,
  ScrollText,
  LogOut,
} from "lucide-react";
import { clearSession, getRole, getUsername, isLoggedIn } from "@/lib/auth";
import { formatRole } from "@/lib/copy";

// `cy` is the stable English slug for the data-cy selector; `label` is the
// translated text shown to the user. They are kept separate on purpose so
// translating a label never changes a test selector.
const NAV = [
  { href: "/dashboard",       cy: "dashboard", label: "Visão geral", Icon: LayoutDashboard },
  { href: "/users",           cy: "users",     label: "Usuários",    Icon: Users           },
  { href: "/artists",         cy: "catalog",   label: "Catálogo",    Icon: Library         },
  { href: "/content-manage",  cy: "content",   label: "Conteúdo",    Icon: Film            },
  { href: "/news",            cy: "news",      label: "Notícias",    Icon: Newspaper       },
  { href: "/audit",           cy: "audit",     label: "Auditoria",   Icon: ScrollText      },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    setRole(getRole());
    setUsername(getUsername());
    setReady(true);
  }, [router]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  // Avoid flashing protected content before the session check resolves.
  if (!ready) return null;

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/home" className="brand" style={{ textDecoration: "none" }}>
          <span className="brand-mark">
            <Star size={17} fill="#fff" stroke="none" />
          </span>
          <span className="brand-text">
            <b>Reviews</b>
            <span>Painel Administrativo</span>
          </span>
        </Link>

        <div className="nav-label">Administração</div>
        <nav data-cy="sidebar">
          {NAV.map(({ href, cy, label, Icon }) => (
            <Link
              key={href}
              href={href}
              data-cy={`nav-${cy}`}
              className={pathname === href ? "active" : ""}
            >
              <Icon strokeWidth={1.9} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="spacer" />

        <Link href="/dashboard" className="session-card" style={{ textDecoration: "none" }} title="Ir para o painel">
          <span className="session-avatar">{(username ?? "?").charAt(0)}</span>
          <div className="session-meta">
            <div data-cy="session-username">{username}</div>
            <span className="badge role" data-cy="session-role">
              {role ? formatRole(role) : ""}
            </span>
          </div>
        </Link>
        <button className="secondary" data-cy="logout" onClick={logout}>
          <LogOut size={16} />
          Sair
        </button>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
