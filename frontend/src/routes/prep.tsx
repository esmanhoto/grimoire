import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Panel } from "@/components/grimoire/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Zap, Map as MapIcon, Sparkles, Eye, UserPlus, Skull, Gem, Plus, X, ScrollText, Shield } from "lucide-react";
import { party, scenes, secrets, locations, npcs, monsters } from "@/lib/mock-data";

export const Route = createFileRoute("/prep")({
  head: () => ({
    meta: [
      { title: "Session Prep — Grimoire" },
      { name: "description", content: "Prep your next D&D session in eight focused steps." },
      { property: "og:title", content: "Session Prep — Grimoire" },
      { property: "og:description", content: "The Lazy DM's eight steps, beautifully organized." },
    ],
  }),
  component: PrepPage,
});

type Item = { id: string; text: string };

const initial: Record<string, Item[]> = {
  characters: party.map((p) => ({ id: p.id, text: `${p.name} — ${p.race} ${p.class} ${p.level}` })),
  strongStart: [{ id: "s1", text: "A dying courier collapses at the tavern door, clutching Kaervek's family sigil." }],
  scenes: scenes.map((s) => ({ id: s.id, text: s.title })),
  secrets: secrets.map((s) => ({ id: s.id, text: s.text })),
  locations: locations.map((l) => ({ id: l.id, text: `${l.name} — ${l.region}` })),
  npcs: npcs.map((n) => ({ id: n.id, text: `${n.name} — ${n.role}` })),
  monsters: monsters.slice(0, 4).map((m) => ({ id: m.id, text: `${m.name} (CR ${m.cr})` })),
  treasure: [
    { id: "t1", text: "Sepulchral Cameo — 250 gp, silver-set" },
    { id: "t2", text: "Scroll of Counterspell" },
    { id: "t3", text: "The Hollow Sigil — quest key" },
  ],
};

const stepDefs = [
  { key: "characters", title: "Review Characters", icon: Users, accent: "gold" as const, blurb: "Refresh the arcs, hooks, and bonds each PC is chasing." },
  { key: "strongStart", title: "Strong Start", icon: Zap, accent: "ember" as const, blurb: "Open with momentum. A scene that demands a decision." },
  { key: "scenes", title: "Potential Scenes", icon: Sparkles, accent: "purple" as const, blurb: "Ten to twelve possibilities. Prep less; improvise more." },
  { key: "secrets", title: "Secrets & Clues", icon: Eye, accent: "purple" as const, blurb: "Ten reveals to sprinkle. Any can land anywhere." },
  { key: "locations", title: "Fantastic Locations", icon: MapIcon, accent: "emerald" as const, blurb: "Sensory anchors. What do they smell, hear, remember?" },
  { key: "npcs", title: "Important NPCs", icon: UserPlus, accent: "gold" as const, blurb: "Voices, wants, quirks. Give each a single verb." },
  { key: "monsters", title: "Relevant Monsters", icon: Skull, accent: "ember" as const, blurb: "Foes the fiction points toward." },
  { key: "treasure", title: "Treasure", icon: Gem, accent: "gold" as const, blurb: "Bones for the hoard: coin, magic, and story hooks." },
] as const;

function PrepPage() {
  const [state, setState] = useState<Record<string, Item[]>>(initial);
  const add = (k: string, text: string) => {
    if (!text.trim()) return;
    setState((s) => ({ ...s, [k]: [...(s[k] ?? []), { id: crypto.randomUUID(), text: text.trim() }] }));
  };
  const remove = (k: string, id: string) => setState((s) => ({ ...s, [k]: s[k].filter((i) => i.id !== id) }));

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-soft">
            <div className="w-8 h-px bg-gold-gradient" /> Prep · The Lazy DM
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-gold tracking-wider">Session Prep</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Eight steps. Half an hour. Enough to run a night.</p>
        </div>
        <Button size="lg" className="bg-arcane text-primary-foreground shadow-arcane gap-2 font-semibold tracking-wide">
          <ScrollText className="w-5 h-5" /> Arm This Session
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stepDefs.map((def, i) => (
          <StepCard
            key={def.key}
            index={i + 1}
            def={def}
            items={state[def.key] ?? []}
            onAdd={(t) => add(def.key, t)}
            onRemove={(id) => remove(def.key, id)}
          />
        ))}
      </div>
    </div>
  );
}

function StepCard({ index, def, items, onAdd, onRemove }: {
  index: number;
  def: (typeof stepDefs)[number];
  items: Item[];
  onAdd: (t: string) => void;
  onRemove: (id: string) => void;
}) {
  const [v, setV] = useState("");
  const Icon = def.icon;
  return (
    <Panel
      title={def.title}
      icon={<Icon className="w-4 h-4" />}
      accent={def.accent}
      actions={<span className="text-[10px] uppercase tracking-widest text-gold-soft">Step {index}</span>}
    >
      <p className="text-xs text-muted-foreground italic mb-3">{def.blurb}</p>
      <ul className="space-y-1 mb-3 max-h-64 overflow-y-auto pr-1">
        {items.map((i) => (
          <li key={i.id} className="group flex items-start gap-2 px-2.5 py-1.5 rounded bg-black/25 border border-border/40 hover:border-primary/30">
            <Shield className="w-3 h-3 text-gold-soft mt-1 shrink-0" />
            <span className="text-sm flex-1">{i.text}</span>
            <button onClick={() => onRemove(i.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-[var(--blood)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onAdd(v); setV(""); } }}
          placeholder="Add…"
          className="h-8 text-sm bg-black/30"
        />
        <Button size="sm" onClick={() => { onAdd(v); setV(""); }} className="h-8 px-2"><Plus className="w-4 h-4" /></Button>
      </div>
    </Panel>
  );
}