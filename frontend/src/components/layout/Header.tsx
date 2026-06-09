import React from "react";
import { Button } from "../ui/button";
import BrinqaLogo from "../../assets/Brinqa.png";

type AppPage = "findings" | "integrations" | "business-services" | "controls";

interface HeaderProps {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
  onShutdown: () => void;
  shutdownPending?: boolean;
}

export function Header({
  page,
  onNavigate,
  onShutdown,
  shutdownPending = false,
}: HeaderProps) {
  return (
    <header className="border-b border-black bg-black text-slate-100">
      <div className="flex h-14 w-full items-center justify-between px-4 md:px-6">
        <a
          href="/business-services"
          className="flex items-center gap-3 text-sm font-semibold tracking-[0.08em] text-slate-100"
        >
          <img src={BrinqaLogo} alt="Brinqa" className="h-8 w-20 rounded-sm object-contain" />
          <span className="uppercase">Cyber Risk Quantification</span>
        </a>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
            disabled={shutdownPending}
            onClick={onShutdown}
          >
            {shutdownPending ? "Exiting..." : "Exit"}
          </Button>
        </div>
      </div>
    </header>
  );
}
