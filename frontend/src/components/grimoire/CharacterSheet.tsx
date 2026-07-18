import { useLayoutEffect, useRef, useState } from "react";
import { normalizeFeatures, type Character } from "@/lib/campaign";
import { ContentDetail } from "./ContentDetail";
import { Eye, Shield, Heart, Zap, ArrowLeft, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useContentIndex, type ContentKind, type IndexEntry } from "@/lib/content";
import { cn } from "@/lib/utils";

export function Stat({ label, value, icon, highlight }: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md py-1 px-1 bg-black/30 border border-border/50 text-center">
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

const FEATURE_GROUPS: [string, string][] = [
  ["class", "Class"],
  ["subclass", "Subclass"],
  ["species", "Species"],
  ["background", "Background"],
  ["feat", "Feats"],
  ["other", "Other"],
];

const mod = (score: number) => Math.floor((score - 10) / 2);
const fmt = (v: number) => (v >= 0 ? `+${v}` : `−${-v}`);

/** Find an SRD entry matching a character-sheet label. Cleans qualifiers
 * ("Potion of Healing ×2", "Warhammer +1", "Sneak Attack (4d6)") and falls
 * back to dropping leading adjectives ("Silvered Dagger" → "Dagger"). */
export function findEntry(
  index: IndexEntry[],
  label: string,
  preferKinds: ContentKind[] = [],
): IndexEntry | null {
  const clean = label
    .replace(/^Focus:\s*/i, "")
    .replace(/\s*×\d+\s*$/, "")
    .replace(/\s*\+\d+\s*$/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
  const words = clean.split(" ");
  const candidates = [clean, ...words.slice(1, 3).map((_, i) => words.slice(i + 1).join(" "))];
  for (const cand of candidates) {
    if (!cand) continue;
    const matches = index.filter((e) => e.name.toLowerCase() === cand);
    if (matches.length > 0) {
      for (const k of preferKinds) {
        const m = matches.find((e) => e.kind === k);
        if (m) return m;
      }
      return matches[0];
    }
  }
  return null;
}

export function CharacterSheet({
  c,
  onEdit,
  onDelete,
}: {
  c: Character;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [detail, setDetail] = useState<{ kind: ContentKind; id: string; name: string } | null>(null);
  const index = useContentIndex();
  const rootRef = useRef<HTMLDivElement>(null);
  const savedScroll = useRef(0);
  const ab = c.abilities;
  const saveProficient = new Set(c.saves.map((s) => ABILITY_NAMES[s]));
  const features = normalizeFeatures(c.features);

  // The sheet's scroll container is the SheetContent parent; remember where
  // we were before showing a detail so Back lands on the same spot.
  const openDetail = (target: { kind: ContentKind; id: string; name: string }) => {
    savedScroll.current = rootRef.current?.parentElement?.scrollTop ?? 0;
    setDetail(target);
  };

  useLayoutEffect(() => {
    const container = rootRef.current?.parentElement;
    if (!container) return;
    container.scrollTo({ top: detail ? 0 : savedScroll.current });
  }, [detail]);

  const tryOpen = (label: string, preferKinds: ContentKind[]) => {
    const e = findEntry(index, label, preferKinds);
    if (e) openDetail({ kind: e.kind, id: e.id, name: e.name });
  };

  return (
    <div ref={rootRef}>
      {/* Detail overlays the sheet; the sheet stays MOUNTED (just hidden) so
          collapse state and content survive navigating away and back. */}
      {detail && (
        <div>
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
        </div>
      )}

      <div className={cn(detail && "hidden")}>
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle className="font-display text-2xl text-gold tracking-wider">{c.name}</SheetTitle>
          <SheetDescription className="uppercase tracking-widest text-xs">
            {c.race} · {c.class} · Level {c.level} · Played by {c.player}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-6">
          {(onEdit || onDelete) && (
            <div className="flex gap-2">
              {onEdit && (
                <Button size="sm" variant="outline" className="gap-1.5 border-primary/40" onClick={onEdit}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              )}
              {onDelete && (
                <Button size="sm" variant="outline" className="gap-1.5 border-[var(--blood)]/50 text-[var(--blood)] hover:bg-[var(--blood)]/10" onClick={onDelete}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              )}
            </div>
          )}

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
                  <div key={key} className="ornate-frame p-2 text-center" title={full}>
                    <div className="text-[10px] tracking-widest text-muted-foreground uppercase whitespace-nowrap">
                      {key}
                      {isSave && <span className="text-gold"> (Prof)</span>}
                    </div>
                    <div className="font-display text-xl text-gold">{fmt(mod(score))}</div>
                    <div className="text-[10px] text-muted-foreground">{score}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <CollapsibleSection title="Skills" defaultOpen={false}>
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
          </CollapsibleSection>

          <CollapsibleSection title="Spells & Cantrips">
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
                          const entry = findEntry(index, s.name, ["spell"]);
                          return (
                            <button
                              key={s.name}
                              onClick={() => entry && openDetail({ kind: entry.kind, id: entry.id, name: entry.name })}
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
          </CollapsibleSection>

          <CollapsibleSection title="Features">
            {features.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2 italic">No features listed.</p>
            )}
            {FEATURE_GROUPS.filter(([source]) => features.some((f) => f.source === source)).map(
              ([source, label]) => (
                <div key={source} className="mt-2">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-gold-soft mb-1">{label}</div>
                  <ul className="space-y-1 text-sm">
                    {features
                      .filter((f) => f.source === source)
                      .map((f) => {
                        const entry = findEntry(index, f.name, ["feature", "spell", "rule"]);
                        return (
                          <li key={f.name} className="flex gap-2">
                            <span className="text-gold">◆</span>
                            {entry ? (
                              <button
                                onClick={() => openDetail({ kind: entry.kind, id: entry.id, name: entry.name })}
                                className="underline decoration-dotted underline-offset-4 hover:text-gold text-left"
                              >
                                {f.name}
                              </button>
                            ) : (
                              f.name
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </div>
              ),
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Inventory">
            <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
              {c.inventory.map((i) => {
                const entry = findEntry(index, i, ["item", "gear"]);
                return (
                  <li key={i}>
                    <button
                      onClick={() => tryOpen(i, ["item", "gear"])}
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
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 group">
        <div className="rune-divider flex-1" />
        <h3 className="font-display text-xs uppercase tracking-[0.3em] text-gold-soft group-hover:text-gold transition flex items-center gap-1.5">
          {title}
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", !open && "-rotate-90")} />
        </h3>
        <div className="rune-divider flex-1" />
      </button>
      {open && children}
    </div>
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
