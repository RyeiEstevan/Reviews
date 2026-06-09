"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Library,
  Newspaper,
  ScrollText,
  Film,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, MetricCard } from "@/components/ui";

// `cy` keeps the data-cy selector stable while `title` is the translated label.
const CARDS = [
  { href: "/users",          cy: "users",    title: "Usuários",      desc: "Crie, edite, bana e exclua contas.",                         Icon: Users      },
  { href: "/artists",        cy: "catalog",  title: "Catálogo",      desc: "Cadastre e busque artistas, autores e dubladores.",           Icon: Library    },
  { href: "/content-manage", cy: "content",  title: "Conteúdo",      desc: "Gerencie filmes, séries e livros do catálogo.",               Icon: Film       },
  { href: "/news",           cy: "news",     title: "Notícias",      desc: "Publique notícias com tags no feed público.",                 Icon: Newspaper  },
  { href: "/audit",          cy: "audit",    title: "Auditoria",     desc: "Consulte o histórico das ações administrativas.",             Icon: ScrollText },
];

type Stats = { users: number; banned: number; contributors: number; news: number; content: number };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [users, artists, news, content] = await Promise.all([
        api.listUsers().catch(() => null),
        api.listArtists("").catch(() => null),
        api.publicNews().catch(() => null),
        api.listContent().catch(() => null),
      ]);
      if (!alive) return;
      setStats({
        users: users?.length ?? 0,
        banned: users?.filter((u) => u.status === "banned").length ?? 0,
        contributors: artists?.length ?? 0,
        news: news?.length ?? 0,
        content: content?.length ?? 0,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const metric = (v: number) =>
    stats ? v : (<span className="skeleton" style={{ display: "inline-block", width: "1.6em", height: "1.6rem" }} />);

  return (
    <div data-cy="dashboard">
      <PageHeader
        eyebrow="Visão geral"
        title="Painel"
        description="Acompanhe usuários, catálogo, notícias e auditoria em um só lugar."
      />

      <div className="grid stagger" style={{ marginBottom: "1.6rem" }}>
        <MetricCard icon={<Users size={20} />} value={metric(stats?.users ?? 0)} label="Contas de usuário" />
        <MetricCard icon={<ShieldAlert size={20} />} value={metric(stats?.banned ?? 0)} label="Usuários banidos" />
        <MetricCard icon={<Library size={20} />} value={metric(stats?.contributors ?? 0)} label="Contribuidores no catálogo" />
        <MetricCard icon={<Newspaper size={20} />} value={metric(stats?.news ?? 0)} label="Notícias publicadas" />
        <MetricCard icon={<Film size={20} />} value={metric(stats?.content ?? 0)} label="Obras cadastradas" />
      </div>

      <div className="nav-label" style={{ padding: "0 0 0.4rem" }}>
        Acesso rápido
      </div>
      <div className="grid-quick stagger">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="card" data-cy={`card-${c.cy}`}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.6rem" }}>
              <span className="metric-icon" style={{ marginBottom: 0 }}>
                <c.Icon size={19} />
              </span>
              <ArrowUpRight size={18} className="muted" />
            </div>
            <h3>{c.title}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {c.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
