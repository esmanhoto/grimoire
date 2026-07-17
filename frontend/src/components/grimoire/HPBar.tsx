import { cn } from "@/lib/utils";

export function HPBar({
  hp,
  maxHp,
  tempHp = 0,
  className,
}: {
  hp: number;
  maxHp: number;
  tempHp?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const tempPct = Math.max(0, Math.min(100 - pct, (tempHp / maxHp) * 100));
  const color =
    pct > 66
      ? "bg-[var(--emerald-arcane)]"
      : pct > 33
      ? "bg-[var(--gold)]"
      : "bg-[var(--blood)]";
  return (
    <div className={cn("h-2 w-full rounded-full bg-black/40 overflow-hidden ring-1 ring-border/60 flex", className)}>
      <div className={cn("h-full transition-all duration-300", color)} style={{ width: `${pct}%` }} />
      {tempPct > 0 && (
        <div className="h-full bg-[var(--purple-arcane)] opacity-80" style={{ width: `${tempPct}%` }} />
      )}
    </div>
  );
}

export function statusFromHp(hp: number, maxHp: number): "Healthy" | "Bloodied" | "Down" {
  if (hp <= 0) return "Down";
  if (hp / maxHp <= 0.5) return "Bloodied";
  return "Healthy";
}
