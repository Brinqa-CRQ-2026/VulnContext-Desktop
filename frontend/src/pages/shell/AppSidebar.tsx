import { BriefcaseBusiness, ListFilter, PlugZap, ShieldCheck } from "lucide-react";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import type { BasePage } from "../../routing/appRoutes";

const navItems: Array<{
  id: BasePage;
  label: string;
  icon: typeof ListFilter;
}> = [
  { id: "business-services", label: "Companies", icon: BriefcaseBusiness },
  { id: "findings", label: "Findings", icon: ListFilter },
  { id: "controls", label: "Security Score", icon: ShieldCheck },
  { id: "integrations", label: "Sources", icon: PlugZap },
];

export function AppSidebar({
  page,
  onNavigate,
}: {
  page: BasePage;
  onNavigate: (page: BasePage) => void;
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-neutral-100 p-3 md:block">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "h-10 w-full justify-start gap-2 rounded-lg border border-transparent px-3 text-sm font-medium shadow-none",
                active
                  ? "bg-black text-white hover:bg-black hover:text-white"
                  : "text-slate-700 hover:bg-white hover:text-slate-900"
              )}
              onClick={() => onNavigate(item.id)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
