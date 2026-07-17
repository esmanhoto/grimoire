import { useState } from "react";
import { party as defaultParty, type Character } from "@/lib/mock-data";
import { Panel } from "./Panel";
import { ContentDetail } from "./ContentDetail";
import { Users, Eye, Shield, Heart, Zap, ArrowLeft } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useContentIndex, type ContentKind, type IndexEntry } from "@/lib/content";
import { cn } from "@/lib/utils";

const colorRing: Record<string, string> = {
  purple: "ring-[var(--purple-arcane)]/40 from-[var(--purple-arcane)]/30",
  emerald: "ring-[var(--emerald-arcane)]/40 from-[var(--emerald-arcane)]/30",
  gold: "ring-[var(--gold)]/40 from-[var(--gold)]/20",
  ember: "ring-[var(--blood)]/40 from-[var(--blood)]/25",
};

export function PartyPanel({ party = defaultParty }: { party?: Character[] }) {
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

function Stat({ label, value, icon, highlight }: { label: string; value: React.ReactNode; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn("rounded-md py-1 px-1 bg-black/30 border border-border/50 text-center", highlight && "border-primary/40")}>
      <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("text-sm font-semibold", highlight ? "text-gold" : "text-foreground")}>{value}</div>
    </div>
  );
}

// Full 5e skill list with governing ability.
const SKILLS: [string, keyof Character["abilities"]][] = [
  ["Acrobatics", "dex"],
  ["Animal Handling", "wis"],
  ["Arcana", "int"],
  ["Athletics", "str"],
  ["Deception", "cha"],
  ["History", "int"],
  ["Insight", "wis"],
  ["Intimidation", "cha"],
  ["Investigation", "int"],
  ["Medicine", "wis"],
  ["Nature", "int"],
  ["Perception", "wis"],
  ["Performance", "cha"],
  ["Persuasion", "cha"],
  ["Religion", "int"],
  ["Sleight of Hand", "dex"],
  ["Stealth", "dex"],
  ["Survival", "wis"],
];

const ABILITY_NAMES: Record<string, keyof Character["abilities"]> = {
  Strength: "str",
  Dexterity: "dex",
  Constitution: "con",
  Intelligence: "int",
  Wisdom: "wis",
  Charisma: "cha",
};

const mod = (score: number) => Math.floor((score - 10) / 2);
const fmt = (v: number) => (v >= 0 ? `+${v}` : `−${-v}`);

/** Find an SRD entry matching a character-sheet label ("Potion of Healing ×2"). */
function findEntry(index: IndexEntry[], label: string, preferKind?: ContentKind): IndexEntry | null {
  const clean = label.replace(/\s*×\d+\s*$/, "").toLowerCase();
  const matches = index.filter((e) => e.name.toLowerCase() === clean);
  if (matches.length === 0) return null;
  return matches.find((e) => e.kind === preferKind) ?? matches[0];
}

function CharacterSheet({ c }: { c: Character }) {
  const [detail, setDetail] = useState<{ kind: ContentKind; id: string; name: string } | null>(null);
  const index = useContentIndex();
  const pb = Math.ceil(c.level / 4) + 1;
  const ab = c.abilities;
  const saveProficient = new Set(c.saves.map((s) => ABILITY_NAMES[s]));

  if (detail) {
    return (
      <>
        <SheetHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDetail(null)}
              className="p-2 rounded-md border border-border/60 text-muted-foreground hover:text-gold hover:border-primary/40 transition"
              title={`Back to ${c.name}`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <SheetTitle className="font-display text-2xl text-gold tracking-wider">{detail.name}</SheetTitle>
              <SheetDescription className="uppercase tracking-widest text-xs">
                From {c.name.split(" ")[0]}'s sheet · SRD 5.2.1
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="py-4">
          <ContentDetail kind={detail.kind} id={detail.id} />
        </div>
      </>
    );
  }

  const openEntry = (label: string, preferKind?: ContentKind) => {
    const e = findEntry(index, label, preferKind);
    if (e) setDetail({ kind: e.kind, id: e.id, name: e.name });
  };

  return (
    <>
      <SheetHeader className="border-b border-border/60 pb-4">
        <SheetTitle className="font-display text-2xl text-gold tracking-wider">{c.name}</SheetTitle>
        <SheetDescription className="uppercase tracking-widest text-xs">
          {c.race} · {c.class} · Level {c.level} · Played by {c.player}
        </SheetDescription>
      </SheetHeader>
      <div className="py-4 space-y-6">
        <div className="grid grid-cols-5 gap-2">
          <Stat label="AC" value={c.ac} icon={<Shield className="w-3 h-3" />} />
          <Stat label="HP" value={`${c.hp}/${c.maxHp}`} icon={<Heart className="w-3 h-3" />} highlight />
          <Stat label="Speed" value={`${c.speed} ft`} icon={<Zap className="w-3 h-3" />} />
          <Stat label="PP" value={c.passivePerception} icon={<Eye className="w-3 h-3" />} />
          <Stat label="Insight" value={c.passiveInsight} icon={<Eye className="w-3 h-3" />} />
        </div>

        <div>
          <SectionTitle>Ability Scores</SectionTitle>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {(Object.keys(ABILITY_NAMES) as (keyof typeof ABILITY_NAMES)[]).map((full) => {
              const key = ABILITY_NAMES[full];
              const score = ab[key];
              const isSave = saveProficient.has(key);
              return (
                <div
                  key={key}
                  className={cn(
                    "ornate-frame p-2 text-center",
                    isSave && "ring-1 ring-[var(--gold)]/50 shadow-gold",
                  )}
                  title={isSave ? `${full}: saving throw proficiency (${fmt(mod(score) + pb)})` : full}
                >
                  <div className="text-[10px] tracking-widest text-muted-foreground uppercase">{key}</div>
                  <div className="font-display text-xl text-gold">{fmt(mod(score))}</div>
                  <div className="text-[10px] text-muted-foreground">{score}</div>
                  {isSave && (
                    <div className="mt-1 text-[9px] uppercase tracking-wider rounded-full border border-[var(--gold)]/50 text-gold px-1 py-0.5 flex items-center justify-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" /> {fmt(mod(score) + pb)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground text-right">
            <Shield className="w-2.5 h-2.5 inline mr-0.5" />
            gold frame = saving-throw proficiency (bonus shown)
          </p>
        </div>

        <div>
          <SectionTitle>Skills</SectionTitle>
          <div className="grid grid-cols-2 gap-1.5 mt-2 text-sm">
            {SKILLS.map(([name, key]) => {
              const listed = c.skills.find((s) => s.name === name);
              const bonus = listed ? listed.mod : mod(ab[key]);
              return (
                <div key={name} className="flex justify-between px-2 py-1 rounded bg-black/20">
                  <span className={listed ? "text-foreground" : "text-muted-foreground"}>
                    {listed && <span className="text-gold mr-1">●</span>}
                    {name}
                    <span className="ml-1 text-[9px] uppercase text-muted-foreground/60">{key}</span>
                  </span>
                  <span className={listed ? "text-gold" : "text-muted-foreground"}>{fmt(bonus)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div>
          <SectionTitle>Spells & Cantrips</SectionTitle>
          {c.spells.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2 italic">No spells prepared.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
                .filter((lvl) => c.spells.some((s) => s.level === lvl))
                .map((lvl) => (
                  <div key={lvl} className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-gold-soft w-14 shrink-0">
                      {lvl === 0 ? "Cantrip" : `Level ${lvl}`}
                    </span>
                    {c.spells
                      .filter((s) => s.level === lvl)
                      .map((s) => {
                        const entry = findEntry(index, s.name, "spell");
                        return (
                          <button
                            key={s.name}
                            onClick={() => entry && setDetail({ kind: entry.kind, id: entry.id, name: entry.name })}
                            disabled={!entry}
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full bg-[var(--purple-arcane)]/20 border border-[var(--purple-arcane)]/40",
                              entry && "hover:bg-[var(--purple-arcane)]/40 hover:border-[var(--purple-arcane)] cursor-pointer",
                            )}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                  </div>
                ))}
            </div>
          )}
        </div>

        <div>
          <SectionTitle>Features</SectionTitle>
          <ul className="mt-2 space-y-1 text-sm">
            {c.features.map((f) => {
              const entry = findEntry(index, f);
              return (
                <li key={f} className="flex gap-2">
                  <span className="text-gold">◆</span>
                  {entry ? (
                    <button
                      onClick={() => setDetail({ kind: entry.kind, id: entry.id, name: entry.name })}
                      className="underline decoration-dotted underline-offset-4 hover:text-gold text-left"
                    >
                      {f}
                    </button>
                  ) : (
                    f
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <SectionTitle>Inventory</SectionTitle>
          <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
            {c.inventory.map((i) => {
              const entry = findEntry(index, i, "item");
              return (
                <li key={i}>
                  <button
                    onClick={() => openEntry(i, "item")}
                    disabled={!entry}
                    className={cn(
                      "w-full text-left px-2 py-1 rounded bg-black/20",
                      entry && "hover:bg-black/40 hover:text-gold underline decoration-dotted underline-offset-4",
                    )}
                  >
                    {i}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
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
