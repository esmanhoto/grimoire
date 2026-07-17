import { useState } from "react";
import { party as defaultParty, type Character } from "@/lib/mock-data";
import { HPBar } from "./HPBar";
import { Panel } from "./Panel";
import { Users, Eye, Shield, Heart, Zap, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const colorRing: Record<string, string> = {
  purple: "ring-[var(--purple-arcane)]/40 from-[var(--purple-arcane)]/30",
  emerald: "ring-[var(--emerald-arcane)]/40 from-[var(--emerald-arcane)]/30",
  gold: "ring-[var(--gold)]/40 from-[var(--gold)]/20",
  ember: "ring-[var(--blood)]/40 from-[var(--blood)]/25",
};

export function PartyPanel({
  party = defaultParty,
  onSelectMember,
  scopedTo,
}: {
  party?: Character[];
  onSelectMember?: (id: string | null) => void;
  scopedTo?: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = party.find((p) => p.id === openId) ?? null;

  return (
    <>
      <Panel title="The Party" icon={<Users className="w-4 h-4" />} bodyClassName="p-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {party.map((c) => {
            const isScoped = scopedTo === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setOpenId(c.id)}
                onDoubleClick={() => onSelectMember?.(isScoped ? null : c.id)}
                className={cn(
                  "text-left ornate-frame p-3 bg-gradient-to-br to-transparent hover:scale-[1.01] transition-all group",
                  colorRing[c.color] ?? colorRing.gold,
                  isScoped && "ring-2 ring-primary shadow-gold glow-gold",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-base leading-tight text-gold truncate">
                      {c.name}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {c.race} · {c.class} {c.level}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-md bg-arcane grid place-items-center shrink-0 shadow-arcane">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                  <Stat label="AC" value={c.ac} icon={<Shield className="w-3 h-3" />} />
                  <Stat label="HP" value={`${c.hp}/${c.maxHp}`} icon={<Heart className="w-3 h-3" />} highlight />
                  <Stat label="Spd" value={c.speed} icon={<Zap className="w-3 h-3" />} />
                </div>
                <div className="mt-2">
                  <HPBar hp={c.hp} maxHp={c.maxHp} tempHp={c.tempHp} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>PP {c.passivePerception}</span>
                  <span>PI {c.passiveInsight}</span>
                  <span className="text-muted-foreground/70">{c.player}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl glass-panel border-l-primary/30 overflow-y-auto">
          {active && <CharacterSheet c={active} onScope={() => { onSelectMember?.(active.id); setOpenId(null); }} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Stat({ label, value, icon, highlight }: { label: string; value: React.ReactNode; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn("rounded-md py-1 px-1 bg-black/30 border border-border/50", highlight && "border-primary/40")}>
      <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("text-sm font-semibold", highlight ? "text-gold" : "text-foreground")}>{value}</div>
    </div>
  );
}

function CharacterSheet({ c, onScope }: { c: Character; onScope: () => void }) {
  const ab = c.abilities;
  const scoreEntries: [string, number][] = [
    ["STR", ab.str], ["DEX", ab.dex], ["CON", ab.con], ["INT", ab.int], ["WIS", ab.wis], ["CHA", ab.cha],
  ];
  return (
    <>
      <SheetHeader className="border-b border-border/60 pb-4">
        <SheetTitle className="font-display text-2xl text-gold tracking-wider">{c.name}</SheetTitle>
        <SheetDescription className="uppercase tracking-widest text-xs">
          {c.race} · {c.class} · Level {c.level} · Played by {c.player}
        </SheetDescription>
      </SheetHeader>
      <div className="py-4 space-y-6">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="AC" value={c.ac} icon={<Shield className="w-3 h-3" />} />
          <Stat label="HP" value={`${c.hp}/${c.maxHp}`} icon={<Heart className="w-3 h-3" />} highlight />
          <Stat label="Speed" value={`${c.speed} ft`} icon={<Zap className="w-3 h-3" />} />
          <Stat label="PP" value={c.passivePerception} icon={<Eye className="w-3 h-3" />} />
          <Stat label="PI" value={c.passiveInsight} icon={<Eye className="w-3 h-3" />} />
          <Stat label="Init" value={`+${c.initiativeBonus}`} icon={<Zap className="w-3 h-3" />} />
        </div>

        <div>
          <SectionTitle>Ability Scores</SectionTitle>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {scoreEntries.map(([k, v]) => (
              <div key={k} className="ornate-frame p-2 text-center">
                <div className="text-[10px] tracking-widest text-muted-foreground">{k}</div>
                <div className="font-display text-xl text-gold">{v}</div>
                <div className="text-[10px] text-muted-foreground">{v >= 10 ? "+" : ""}{Math.floor((v - 10) / 2)}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>Saving Throws</SectionTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {c.saves.map((s) => (
              <Badge key={s} variant="outline" className="border-primary/40 text-gold">{s}</Badge>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>Skills</SectionTitle>
          <div className="grid grid-cols-2 gap-1.5 mt-2 text-sm">
            {c.skills.map((s) => (
              <div key={s.name} className="flex justify-between px-2 py-1 rounded bg-black/20">
                <span className={s.proficient ? "text-foreground" : "text-muted-foreground"}>{s.name}</span>
                <span className="text-gold">+{s.mod}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <SectionTitle>Spells & Cantrips</SectionTitle>
          {c.spells.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2 italic">No spells prepared.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {c.spells.map((s) => (
                <Badge key={s.name} variant="secondary" className="bg-[var(--purple-arcane)]/20 border border-[var(--purple-arcane)]/40 text-foreground">
                  {s.name} <span className="ml-1 opacity-70">L{s.level}</span>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionTitle>Features</SectionTitle>
          <ul className="mt-2 space-y-1 text-sm">
            {c.features.map((f) => (
              <li key={f} className="flex gap-2"><span className="text-gold">◆</span>{f}</li>
            ))}
          </ul>
        </div>

        <div>
          <SectionTitle>Inventory</SectionTitle>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
            {c.inventory.map((i) => (
              <li key={i} className="px-2 py-1 rounded bg-black/20">{i}</li>
            ))}
          </ul>
        </div>

        <button
          onClick={onScope}
          className="w-full mt-2 py-2 rounded-md bg-arcane text-primary-foreground font-medium tracking-wide shadow-arcane hover:brightness-110 transition"
        >
          Scope Search to {c.name.split(" ")[0]}
        </button>
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rune-divider flex-1" />
      <h3 className="font-display text-xs uppercase tracking-[0.3em] text-gold-soft">{children}</h3>
      <div className="rune-divider flex-1" />
    </div>
  );
}
