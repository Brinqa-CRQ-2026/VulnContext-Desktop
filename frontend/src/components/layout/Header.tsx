import React from "react";
import { Button } from "../ui/button";

type AppPage = "findings" | "integrations" | "business-services";

interface HeaderProps {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  onShutdown: () => void;
  logoutPending?: boolean;
  shutdownPending?: boolean;
}

export function Header({
  page,
  onNavigate,
  onLogout,
  onShutdown,
  logoutPending = false,
  shutdownPending = false,
}: HeaderProps) {
  const pageLabel =
    page === "findings"
      ? "Findings"
      : page === "integrations"
        ? "Sources"
        : "Business Services";

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-slate-100">
      <div className="flex h-14 w-full items-center justify-between px-4 md:px-6">
        <a
          href="/business-services"
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
            onClick={() => onNavigate("business-services")}
          >
            Business Services
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
            disabled={logoutPending || shutdownPending}
            onClick={onLogout}
          >
            {logoutPending ? "Logging out..." : "Log Out"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-rose-700 bg-rose-950 text-rose-100 hover:bg-rose-900 hover:text-white"
            disabled={logoutPending || shutdownPending}
            onClick={onShutdown}
          >
            {shutdownPending ? "Shutting down..." : "Shut Down"}
          </Button>
        </div>
      </div>
    </header>
  );
}
