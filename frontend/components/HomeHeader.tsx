"use client";

import Link from "next/link";
import { Star } from "lucide-react";

export function HomeHeader() {
  return (
    <header
      data-cy="home-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        height: "56px",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0 1.5rem",
        background: "var(--panel)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Left column — empty, reserved for breadcrumbs/back button */}
      <div />

      {/* Center — Star logo, click goes to /home */}
      <Link
        href="/home"
        data-cy="home-logo"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          textDecoration: "none",
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: "30px",
            height: "30px",
            borderRadius: "8px",
            background: "linear-gradient(140deg, var(--accent), #5a63c8)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Star size={15} fill="#fff" stroke="none" />
        </span>
        <span
          style={{
            fontWeight: 700,
            fontSize: "0.95rem",
            letterSpacing: "-0.01em",
            color: "var(--text)",
          }}
        >
          Reviews
        </span>
      </Link>

      {/* Right column — intentionally empty; login/logout live in the sidebar */}
      <div />
    </header>
  );
}
