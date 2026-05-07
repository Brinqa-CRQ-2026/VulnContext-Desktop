import { cn } from "../../../lib/utils";

export function PageIntro({
  title,
  description,
  className,
}: {
  title: string;
  description?: string | null;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-none",
        className
      )}
    >
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </section>
  );
}
