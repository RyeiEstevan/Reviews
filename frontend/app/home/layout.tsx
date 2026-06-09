"use client";

import { type ReactNode } from "react";
import { HomeSidebar } from "@/components/HomeSidebar";
import { HomeHeader } from "@/components/HomeHeader";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <HomeSidebar />

      {/* Right column: header + scrollable content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <HomeHeader />
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
