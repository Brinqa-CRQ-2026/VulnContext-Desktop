// src/components/layout/Header.tsx
import React from "react";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
} from "../ui/menubar";

export function Header() {
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
            <MenubarTrigger>Dashboard</MenubarTrigger>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Findings</MenubarTrigger>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Integrations</MenubarTrigger>
          </MenubarMenu>
        </Menubar>

        <div className="text-xs text-slate-500">[local]</div>
      </div>
    </header>
  );
}