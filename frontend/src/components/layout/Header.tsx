// src/components/layout/Header.tsx
import React from "react";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
} from "../ui/menubar";

type AppPage = "dashboard" | "integrations";

interface HeaderProps {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
}

export function Header({ page, onNavigate }: HeaderProps) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <a
          href="#"
          className="text-xs font-semibold tracking-[0.2em] text-sky-700"
        >
          VULNERABILITY DASHBOARD
        </a>

        <Menubar>
          <MenubarMenu>
            <MenubarTrigger
              onClick={() => onNavigate("dashboard")}
              className={page === "dashboard" ? "bg-accent text-accent-foreground" : ""}
            >
              Dashboard
            </MenubarTrigger>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger
              onClick={() => onNavigate("dashboard")}
            >
              Findings
            </MenubarTrigger>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger
              onClick={() => onNavigate("integrations")}
              className={page === "integrations" ? "bg-accent text-accent-foreground" : ""}
            >
              Integrations
            </MenubarTrigger>
          </MenubarMenu>
        </Menubar>

        <div className="text-xs text-slate-500">[local]</div>
      </div>
    </header>
  );
}
