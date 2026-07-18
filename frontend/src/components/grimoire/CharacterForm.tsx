import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Plus, X } from "lucide-react";
import {
  normalizeFeatures, useCampaignMutations,
  type CampaignEntity, type Character, type FeatureRef,
} from "@/lib/campaign";
import {
  fetchContentEntry, fuzzySearch, useContentIndex, type FeatureEntry, type IndexEntry,
} from "@/lib/content";
import { cn } from "@/lib/utils";

const FEATURE_SOURCES: [string, string][] = [
  ["class", "Class"],
  ["subclass", "Subclass"],
  ["species", "Species"],
  ["background", "Background"],
  ["feat", "Feat"],
  ["other", "Other"],
];

/** Spell level from an index meta line ("Cantrip · Evocation", "Lvl 3 · …"). */
function levelFromMeta(meta: string): number {
  if (meta.startsWith("Cantrip")) return 0;
  const m = meta.match(/Lvl (\d)/);
  return m ? Number(m[1]) : 0;
}

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
const ABILITY_FULL: Record<(typeof ABILITIES)[number], string> = {
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma",
};
const SKILLS: [string, (typeof ABILITIES)[number]][] = [
  ["Acrobatics", "dex"], ["Animal Handling", "wis"], ["Arcana", "int"], ["Athletics", "str"],
  ["Deception", "cha"], ["History", "int"], ["Insight", "wis"], ["Intimidation", "cha"],
  ["Investigation", "int"], ["Medicine", "wis"], ["Nature", "int"], ["Perception", "wis"],
  ["Performance", "cha"], ["Persuasion", "cha"], ["Religion", "int"],
  ["Sleight of Hand", "dex"], ["Stealth", "dex"], ["Survival", "wis"],
];
const COLORS = ["gold", "purple", "emerald", "ember"];

const mod = (v: number) => Math.floor((v - 10) / 2);
const fmt = (v: number) => (v >= 0 ? `+${v}` : `−${-v}`);

type FormState = {
  name: string;
  player: string;
  klass: string;
  race: string;
  level: number;
  color: string;
  ac: number;
  hp: number;
  maxHp: number;
  speed: number;
  initiativeBonus: number;
  passivePerception: number;
  passiveInsight: number;
  abilities: Record<(typeof ABILITIES)[number], number>;
  saves: string[];
  skills: string[];
  spells: { name: string; level: number }[];
  features: FeatureRef[];
  inventory: string;
  body: string;
};

function fromEntity(e: CampaignEntity | null): FormState {
  const f = (e?.fields ?? {}) as Partial<Character> & Record<string, unknown>;
  return {
    name: e?.name ?? "",
    player: String(f.player ?? ""),
    klass: String(f.class ?? ""),
    race: String(f.race ?? ""),
    level: Number(f.level ?? 1),
    color: String(f.color ?? "gold"),
    ac: Number(f.ac ?? 10),
    hp: Number(f.hp ?? 10),
    maxHp: Number(f.maxHp ?? 10),
    speed: Number(f.speed ?? 30),
    initiativeBonus: Number(f.initiativeBonus ?? 0),
    passivePerception: Number(f.passivePerception ?? 10),
    passiveInsight: Number(f.passiveInsight ?? 10),
    abilities: {
      str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
      ...(f.abilities as Record<string, number> | undefined),
    },
    saves: (f.saves as string[]) ?? [],
    skills: ((f.skills as { name: string }[]) ?? []).map((s) => s.name),
    spells: (f.spells as { name: string; level: number }[]) ?? [],
    features: normalizeFeatures(f.features as (string | FeatureRef)[] | undefined),
    inventory: ((f.inventory as string[]) ?? []).join("\n"),
    body: e?.body ?? "",
  };
}

export function CharacterForm({
  entity,
  open,
  onClose,
}: {
  entity: CampaignEntity | null; // null = new character
  open: boolean;
  onClose: (savedId?: string) => void;
}) {
  const { create, update } = useCampaignMutations();
  const contentIndex = useContentIndex();
  const [form, setForm] = useState<FormState>(() => fromEntity(entity));
  const [error, setError] = useState<string | null>(null);
  const [spellName, setSpellName] = useState("");
  const [spellLevel, setSpellLevel] = useState(0);
  const [featName, setFeatName] = useState("");
  const [featSource, setFeatSource] = useState("other");

  const spellSuggestions = spellName.trim()
    ? fuzzySearch(contentIndex.filter((e) => e.kind === "spell"), spellName, 6).filter(
        (s) => !form.spells.some((x) => x.name.toLowerCase() === s.name.toLowerCase()),
      )
    : [];
  const featureSuggestions = featName.trim()
    ? fuzzySearch(contentIndex.filter((e) => e.kind === "feature"), featName, 6).filter(
        (s) => !form.features.some((x) => x.name.toLowerCase() === s.name.toLowerCase()),
      )
    : [];

  useEffect(() => {
    if (open) {
      setForm(fromEntity(entity));
      setError(null);
    }
  }, [entity, open]);

  const pb = Math.ceil(form.level / 4) + 1;
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: "saves" | "skills", value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
    }));

  const addSpell = (name: string, level: number) => {
    if (name.trim() && !form.spells.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())) {
      set("spells", [...form.spells, { name: name.trim(), level }]);
    }
    setSpellName("");
  };

  const addFeature = (ref: FeatureRef) => {
    if (ref.name.trim() && !form.features.some((f) => f.name.toLowerCase() === ref.name.trim().toLowerCase())) {
      set("features", [...form.features, { name: ref.name.trim(), source: ref.source }]);
    }
    setFeatName("");
  };

  // SRD feature entries know their real source (class/species/feat/…)
  const addFeatureFromSrd = async (entry: IndexEntry) => {
    try {
      const full = await fetchContentEntry<FeatureEntry>("feature", entry.id);
      addFeature({ name: full.name, source: full.source });
    } catch {
      addFeature({ name: entry.name, source: featSource });
    }
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("A name is required.");
      return;
    }
    const fields = {
      player: form.player,
      class: form.klass,
      race: form.race,
      level: form.level,
      color: form.color,
      ac: form.ac,
      hp: form.hp,
      maxHp: form.maxHp,
      speed: form.speed,
      initiativeBonus: form.initiativeBonus,
      passivePerception: form.passivePerception,
      passiveInsight: form.passiveInsight,
      abilities: form.abilities,
      saves: form.saves,
      skills: SKILLS.filter(([n]) => form.skills.includes(n)).map(([n, a]) => ({
        name: n,
        mod: mod(form.abilities[a]) + pb,
      })),
      spells: form.spells,
      features: form.features,
      inventory: form.inventory.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    setError(null);
    try {
      const saved = entity
        ? await update.mutateAsync({ id: entity.id, name: form.name.trim(), fields, body: form.body })
        : await create.mutateAsync({ type: "pc", name: form.name.trim(), fields, body: form.body });
      onClose(saved.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl glass-panel border-l-primary/30 overflow-y-auto">
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle className="font-display text-2xl text-gold tracking-wider">
            {entity ? `Edit · ${entity.name}` : "New Character"}
          </SheetTitle>
          <SheetDescription className="uppercase tracking-widest text-xs">
            Saved as Markdown in campaign/pcs
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Character name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="bg-black/30" />
            </Field>
            <Field label="Player">
              <Input value={form.player} onChange={(e) => set("player", e.target.value)} className="bg-black/30" />
            </Field>
            <Field label="Class">
              <Input value={form.klass} onChange={(e) => set("klass", e.target.value)} className="bg-black/30" />
            </Field>
            <Field label="Species / race">
              <Input value={form.race} onChange={(e) => set("race", e.target.value)} className="bg-black/30" />
            </Field>
            <Field label={`Level (PB +${pb})`}>
              <Input type="number" min={1} max={20} value={form.level} onChange={(e) => set("level", Number(e.target.value) || 1)} className="bg-black/30" />
            </Field>
            <Field label="Card color">
              <div className="flex gap-1.5 pt-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => set("color", c)}
                    title={c}
                    className={cn(
                      "w-7 h-7 rounded-full border-2",
                      c === "gold" && "bg-[var(--gold)]/60",
                      c === "purple" && "bg-[var(--purple-arcane)]/60",
                      c === "emerald" && "bg-[var(--emerald-arcane)]/60",
                      c === "ember" && "bg-[var(--blood)]/60",
                      form.color === c ? "border-foreground" : "border-transparent",
                    )}
                  />
                ))}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Field label="AC"><NumInput value={form.ac} onChange={(v) => set("ac", v)} /></Field>
            <Field label="Current HP"><NumInput value={form.hp} onChange={(v) => set("hp", v)} /></Field>
            <Field label="Max HP"><NumInput value={form.maxHp} onChange={(v) => set("maxHp", v)} /></Field>
            <Field label="Speed"><NumInput value={form.speed} onChange={(v) => set("speed", v)} /></Field>
            <Field label="Init bonus"><NumInput value={form.initiativeBonus} onChange={(v) => set("initiativeBonus", v)} /></Field>
            <Field label="PP"><NumInput value={form.passivePerception} onChange={(v) => set("passivePerception", v)} /></Field>
            <Field label="P. Insight"><NumInput value={form.passiveInsight} onChange={(v) => set("passiveInsight", v)} /></Field>
          </div>

          <div>
            <SectionLabel>Ability scores — check the box for saving-throw proficiency</SectionLabel>
            <div className="grid grid-cols-6 gap-2">
              {ABILITIES.map((a) => (
                <div key={a} className="ornate-frame p-2 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{a}</div>
                  <Input
                    type="number"
                    value={form.abilities[a]}
                    onChange={(e) =>
                      set("abilities", { ...form.abilities, [a]: Number(e.target.value) || 10 })
                    }
                    className="h-8 text-center bg-black/30 mt-1"
                  />
                  <div className="text-[11px] text-gold mt-1">{fmt(mod(form.abilities[a]))}</div>
                  <label className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.saves.includes(ABILITY_FULL[a])}
                      onChange={() => toggle("saves", ABILITY_FULL[a])}
                      className="accent-[var(--gold)]"
                    />
                    save
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Skill proficiencies (bonus computed from ability + PB)</SectionLabel>
            <div className="grid grid-cols-3 gap-1">
              {SKILLS.map(([n, a]) => {
                const checked = form.skills.includes(n);
                return (
                  <label
                    key={n}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer",
                      checked ? "bg-primary/15 text-foreground" : "bg-black/20 text-muted-foreground",
                    )}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle("skills", n)} className="accent-[var(--gold)]" />
                    <span className="flex-1">{n}</span>
                    <span className={checked ? "text-gold" : ""}>{fmt(mod(form.abilities[a]) + (checked ? pb : 0))}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <SectionLabel>Spells</SectionLabel>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.spells.map((s) => (
                <span key={s.name} className="text-xs px-2 py-0.5 rounded-full bg-[var(--purple-arcane)]/20 border border-[var(--purple-arcane)]/40 inline-flex items-center gap-1">
                  {s.name} <span className="opacity-60">L{s.level}</span>
                  <button onClick={() => set("spells", form.spells.filter((x) => x.name !== s.name))} className="hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={spellName}
                onChange={(e) => setSpellName(e.target.value)}
                placeholder="Search the SRD, or type a homebrew name…"
                className="h-8 text-sm bg-black/30"
                onKeyDown={(e) => e.key === "Enter" && addSpell(spellName, spellLevel)}
              />
              <select
                value={spellLevel}
                onChange={(e) => setSpellLevel(Number(e.target.value))}
                className="bg-black/30 text-sm border border-border/60 rounded px-2"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                  <option key={l} value={l}>{l === 0 ? "Cantrip" : `Level ${l}`}</option>
                ))}
              </select>
              <Button size="sm" className="h-8 px-2" onClick={() => addSpell(spellName, spellLevel)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {spellSuggestions.length > 0 && (
              <ul className="mt-1 border border-primary/30 rounded-md overflow-hidden bg-black/40">
                {spellSuggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => addSpell(s.name, levelFromMeta(s.meta))}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary/60 flex justify-between gap-2"
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{s.meta}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <SectionLabel>Features — grouped by where they come from</SectionLabel>
            {FEATURE_SOURCES.filter(([s]) => form.features.some((f) => f.source === s)).map(([s, label]) => (
              <div key={s} className="mb-1.5">
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mr-2">{label}</span>
                {form.features
                  .filter((f) => f.source === s)
                  .map((f) => (
                    <span key={f.name} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 mr-1 mb-1 rounded-full bg-primary/15 border border-primary/30">
                      {f.name}
                      <button onClick={() => set("features", form.features.filter((x) => x.name !== f.name))} className="hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={featName}
                onChange={(e) => setFeatName(e.target.value)}
                placeholder="Search SRD features/traits/feats, or type your own…"
                className="h-8 text-sm bg-black/30"
                onKeyDown={(e) => e.key === "Enter" && addFeature({ name: featName, source: featSource })}
              />
              <select
                value={featSource}
                onChange={(e) => setFeatSource(e.target.value)}
                title="Source used when adding a custom (non-SRD) feature"
                className="bg-black/30 text-sm border border-border/60 rounded px-2"
              >
                {FEATURE_SOURCES.map(([s, label]) => (
                  <option key={s} value={s}>{label}</option>
                ))}
              </select>
              <Button size="sm" className="h-8 px-2" onClick={() => addFeature({ name: featName, source: featSource })}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {featureSuggestions.length > 0 && (
              <ul className="mt-1 border border-primary/30 rounded-md overflow-hidden bg-black/40">
                {featureSuggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => void addFeatureFromSrd(s)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary/60 flex justify-between gap-2"
                    >
                      <span className="truncate">{s.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{s.meta}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Field label="Inventory (one per line)">
            <Textarea rows={5} value={form.inventory} onChange={(e) => set("inventory", e.target.value)} className="bg-black/30 text-sm" />
          </Field>

          <Field label="Notes (markdown, [[wikilinks]] welcome)">
            <Textarea rows={4} value={form.body} onChange={(e) => set("body", e.target.value)} className="bg-black/30 text-sm" />
          </Field>

          {error && <p className="text-sm text-[var(--blood)]">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy} className="bg-arcane text-primary-foreground shadow-arcane">
              {busy ? "Saving…" : entity ? "Save Character" : "Create Character"}
            </Button>
            <Button variant="outline" onClick={() => onClose()} className="border-border/60">Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs uppercase tracking-widest text-gold-soft space-y-1">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="bg-black/30"
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-widest text-gold-soft mb-2">{children}</div>;
}
