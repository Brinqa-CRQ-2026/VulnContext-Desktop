import React from "react";
import { Button } from "../ui/button";

type AppPage = "dashboard" | "findings" | "integrations";

interface HeaderProps {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
}

export function Header({ page, onNavigate }: HeaderProps) {
  const pageLabel =
    page === "dashboard" ? "Dashboard" : page === "findings" ? "Findings" : "Integrations";

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-slate-100">
      <div className="flex h-14 w-full items-center justify-between px-4 md:px-6">
        <a
          href="#"
          className="text-xs font-semibold tracking-[0.2em] text-slate-200"
        >
          VULNCONTEXT
        </a>

        <div className="hidden items-center gap-2 md:flex">
          <span className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
            {pageLabel}
          </span>
          <span className="text-xs text-slate-400">Local</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
            onClick={() => onNavigate("dashboard")}
          >
            Home
          </Button>
        </div>
      </div>
    </header>
  );
}
