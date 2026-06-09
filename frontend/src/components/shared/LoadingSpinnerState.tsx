import type { ReactNode } from "react";

import { Spinner } from "../ui/spinner";

export function LoadingSpinnerState({
  message = "Loading...",
  className = "",
}: {
  message?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-[22rem] items-center justify-center ${className}`.trim()}>
      <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
        <Spinner className="size-5 text-slate-700" />
        <span>{message}</span>
      </div>
    </div>
  );
}
