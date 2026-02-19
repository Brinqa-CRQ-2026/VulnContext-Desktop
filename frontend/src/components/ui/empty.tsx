import * as React from "react";

import { cn } from "@/lib/utils";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-[18rem] w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center",
        className
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3 className={cn("text-lg font-semibold text-slate-900", className)} {...props} />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-slate-500", className)} {...props} />;
}

function EmptyActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex w-full max-w-xl flex-col gap-3", className)} {...props} />
  );
}

function EmptyIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600",
        className
      )}
      {...props}
    />
  );
}

export { Empty, EmptyActions, EmptyDescription, EmptyHeader, EmptyIcon, EmptyTitle };
