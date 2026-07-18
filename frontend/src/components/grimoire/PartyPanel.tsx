import { useState } from "react";
import { useParty } from "@/lib/campaign";
import { Panel } from "./Panel";
import { CharacterSheet, Stat } from "./CharacterSheet";
import { Users, Eye, Shield, Heart, Zap } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const colorRing: Record<string, string> = {
  purple: "ring-[var(--purple-arcane)]/40 from-[var(--purple-arcane)]/30",
  emerald: "ring-[var(--emerald-arcane)]/40 from-[var(--emerald-arcane)]/30",
  gold: "ring-[var(--gold)]/40 from-[var(--gold)]/20",
  ember: "ring-[var(--blood)]/40 from-[var(--blood)]/25",
};

export function PartyPanel() {
  const party = useParty();
  const [openId, setOpenId] = useState<string | null>(null);
  const active = party.find((p) => p.id === openId) ?? null;

  return (
    <>
      <Panel title="The Party" icon={<Users className="w-4 h-4" />} bodyClassName="p-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {party.map((c) => (
            <button
              key={c.id}
              onClick={() => setOpenId(c.id)}
              className={cn(
                "text-left ornate-frame p-3 bg-gradient-to-br to-transparent hover:scale-[1.01] transition-all group",
                colorRing[c.color] ?? colorRing.gold,
              )}
            >
              <div className="min-w-0">
                <div className="font-display text-base leading-tight text-gold truncate">
                  {c.name} <span className="text-muted-foreground text-sm">({c.player})</span>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {c.race} · {c.class} {c.level}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                <Stat label="AC" value={c.ac} icon={<Shield className="w-3 h-3" />} />
                <Stat label="HP" value={`${c.hp}/${c.maxHp}`} icon={<Heart className="w-3 h-3" />} highlight />
                <Stat label="Spd" value={c.speed} icon={<Zap className="w-3 h-3" />} />
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> PP {c.passivePerception}</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Insight {c.passiveInsight}</span>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl glass-panel border-l-primary/30 overflow-y-auto">
          {active && <CharacterSheet c={active} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
