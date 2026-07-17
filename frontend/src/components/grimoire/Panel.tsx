import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  icon,
  children,
  actions,
  className,
  bodyClassName,
  accent = "gold",
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: "gold" | "emerald" | "purple" | "ember";
}) {
  const accentBar =
    accent === "emerald"
      ? "bg-[var(--emerald-arcane)]"
      : accent === "purple"
      ? "bg-[var(--purple-arcane)]"
      : accent === "ember"
      ? "bg-[var(--blood)]"
      : "bg-gold-gradient";
  return (
    <section className={cn("glass-panel flex flex-col overflow-hidden relative", className)}>
      <div className={cn("absolute inset-x-0 top-0 h-px opacity-70", accentBar)} />
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-gold shrink-0">{icon}</span>}
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-gold-soft truncate">
            {title}
          </h2>
        </div>
        {actions && <div className="shrink-0 flex items-center gap-1.5">{actions}</div>}
      </header>
      <div className={cn("flex-1 min-h-0", bodyClassName ?? "p-4")}>{children}</div>
    </section>
  );
}
