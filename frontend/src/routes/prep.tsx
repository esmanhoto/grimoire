import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/grimoire/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, Zap, Map as MapIcon, Sparkles, Eye, UserPlus, Skull, Gem, Plus, X, ScrollText, Minus,
} from "lucide-react";
import { useCampaignEntity, useCampaignIndex, useCampaignMutations, useParty } from "@/lib/campaign";
import { useSessionList, useSessionMutations, parseSession, newId, type SessionData } from "@/lib/session";
import { useContentIndex, fuzzySearch } from "@/lib/content";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prep")({
  component: PrepPage,
});

function PrepPage() {
  const sessions = useSessionList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const armed = sessions.find((s) => s.fields.status === "armed");

  useEffect(() => {
    if (!selectedId && sessions.length > 0) setSelectedId((armed ?? sessions[sessions.length - 1]).id);
  }, [sessions, armed, selectedId]);

  const entity = useCampaignEntity(selectedId);
  const session = entity ? parseSession(entity) : null;
  const { arm } = useSessionMutations();

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
        <div className="flex items-center gap-2">
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className="bg-black/30 text-sm border border-border/60 rounded-md px-3 py-2 hover:border-primary/40 cursor-pointer max-w-64"
          >
            {sessions.length === 0 && <option value="">No sessions yet</option>}
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.fields.status === "armed" ? " ⚔" : ""}
              </option>
            ))}
          </select>
          <NewSessionDialog onCreated={setSelectedId} count={sessions.length} />
          {session && (
            <Button
              size="lg"
              disabled={session.status === "armed" || arm.isPending}
              onClick={() => arm.mutate(session.id)}
              className={cn(
                "gap-2 font-semibold tracking-wide",
                session.status === "armed"
                  ? "bg-secondary text-gold border border-[var(--gold)]/40"
                  : "bg-arcane text-primary-foreground shadow-arcane",
              )}
            >
              <ScrollText className="w-5 h-5" />
              {session.status === "armed" ? "Armed · Live on Dashboard" : "Arm This Session"}
            </Button>
          )}
        </div>
      </div>

      {session ? (
        <SessionEditor key={session.id} session={session} />
      ) : (
        <p className="text-sm text-muted-foreground italic py-16 text-center">
          Create a session to start prepping.
        </p>
      )}
    </div>
  );
}

function NewSessionDialog({ onCreated, count }: { onCreated: (id: string) => void; count: number }) {
  const { create } = useCampaignMutations();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName(`Session ${count + 13} - `);
  }, [open, count]);
  const submit = async () => {
    if (!name.trim()) return;
    const created = await create.mutateAsync({
      type: "session",
      name: name.trim(),
      fields: { status: "draft", date: new Date().toISOString().slice(0, 10) },
    });
    setOpen(false);
    onCreated(created.id);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/40"><Plus className="w-4 h-4" /> New</Button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-gold tracking-wider">New Session</DialogTitle>
          <DialogDescription>Creates a Markdown file under campaign/sessions.</DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="bg-black/30"
        />
        <Button onClick={submit} disabled={create.isPending || !name.trim()} className="w-full bg-arcane text-primary-foreground shadow-arcane">
          Create
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function SessionEditor({ session }: { session: SessionData }) {
  const { update } = useCampaignMutations();
  const save = (fields: Record<string, unknown>) => update.mutate({ id: session.id, fields });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <StepPanel index={1} title="Review Characters" icon={<Users className="w-4 h-4" />} accent="gold"
        blurb="Refresh the arcs, hooks, and bonds each PC is chasing.">
        <PartyStrip />
        <DraftTextarea
          initial={session.reviewNotes}
          placeholder="What does each PC want right now?"
          onCommit={(v) => save({ reviewNotes: v })}
        />
      </StepPanel>

      <StepPanel index={2} title="Strong Start" icon={<Zap className="w-4 h-4" />} accent="ember"
        blurb="Open with momentum. A scene that demands a decision.">
        <DraftTextarea
          initial={session.strongStart}
          placeholder="The night begins with…"
          onCommit={(v) => save({ strongStart: v })}
          rows={5}
        />
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-widest text-gold-soft mb-1">
            Looming — shown on the dashboard plotline
          </div>
          <DraftTextarea
            initial={session.looming}
            placeholder="What's coming if the party stalls…"
            onCommit={(v) => save({ looming: v })}
            rows={2}
          />
        </div>
      </StepPanel>

      <StepPanel index={3} title="Potential Scenes" icon={<Sparkles className="w-4 h-4" />} accent="purple"
        blurb="A handful of possibilities. Prep less; improvise more.">
        <ItemList
          items={session.scenes.map((s) => ({ id: s.id, text: s.text, dim: s.done }))}
          onAdd={(t) => save({ scenes: [...session.scenes, { id: newId(), text: t, done: false }] })}
          onRemove={(id) => save({ scenes: session.scenes.filter((s) => s.id !== id) })}
        />
      </StepPanel>

      <StepPanel index={4} title="Secrets & Clues" icon={<Eye className="w-4 h-4" />} accent="purple"
        blurb="Reveals to sprinkle. Any can land anywhere.">
        <ItemList
          items={session.secrets.map((s) => ({ id: s.id, text: s.text, dim: s.revealed }))}
          onAdd={(t) => save({ secrets: [...session.secrets, { id: newId(), text: t, revealed: false }] })}
          onRemove={(id) => save({ secrets: session.secrets.filter((s) => s.id !== id) })}
        />
      </StepPanel>

      <StepPanel index={5} title="Fantastic Locations" icon={<MapIcon className="w-4 h-4" />} accent="emerald"
        blurb="Sensory anchors. What do they smell, hear, remember?">
        <EntityNameList
          type="location"
          names={session.locations}
          onChange={(names) => save({ locations: names })}
        />
      </StepPanel>

      <StepPanel index={6} title="Important NPCs" icon={<UserPlus className="w-4 h-4" />} accent="gold"
        blurb="Voices, wants, quirks. Give each a single verb.">
        <EntityNameList
          type="npc"
          names={session.npcs}
          onChange={(names) => save({ npcs: names })}
        />
      </StepPanel>

      <StepPanel index={7} title="Relevant Monsters" icon={<Skull className="w-4 h-4" />} accent="ember"
        blurb="Foes the fiction points toward — one click to the tracker.">
        <MonsterPicker
          monsters={session.monsters}
          onChange={(monsters) => save({ monsters })}
        />
      </StepPanel>

      <StepPanel index={8} title="Treasure" icon={<Gem className="w-4 h-4" />} accent="gold"
        blurb="Bones for the hoard: coin, magic, and story hooks.">
        <ItemList
          items={session.treasure.map((t, i) => ({ id: String(i), text: t }))}
          onAdd={(t) => save({ treasure: [...session.treasure, t] })}
          onRemove={(id) => save({ treasure: session.treasure.filter((_, i) => String(i) !== id) })}
        />
      </StepPanel>
    </div>
  );
}

function StepPanel({ index, title, icon, accent, blurb, children }: {
  index: number;
  title: string;
  icon: React.ReactNode;
  accent: "gold" | "ember" | "purple" | "emerald";
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <Panel
      title={title}
      icon={icon}
      accent={accent}
      actions={<span className="text-[10px] uppercase tracking-widest text-gold-soft">Step {index}</span>}
    >
      <p className="text-xs text-muted-foreground italic mb-3">{blurb}</p>
      {children}
    </Panel>
  );
}

function PartyStrip() {
  const party = useParty();
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {party.map((p) => (
        <span key={p.id} className="text-xs px-2 py-1 rounded-full bg-black/30 border border-border/50 text-foreground">
          {p.name.split(" ")[0]} <span className="text-muted-foreground">{p.class} {p.level}</span>
        </span>
      ))}
    </div>
  );
}

function DraftTextarea({ initial, placeholder, onCommit, rows = 5 }: {
  initial: string;
  placeholder: string;
  onCommit: (v: string) => void;
  rows?: number;
}) {
  const [v, setV] = useState(initial);
  return (
    <Textarea
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== initial && onCommit(v)}
      placeholder={placeholder}
      rows={rows}
      className="bg-black/30 text-sm"
    />
  );
}

function ItemList({ items, onAdd, onRemove }: {
  items: { id: string; text: string; dim?: boolean }[];
  onAdd: (t: string) => void;
  onRemove: (id: string) => void;
}) {
  const [v, setV] = useState("");
  const submit = () => {
    if (v.trim()) {
      onAdd(v.trim());
      setV("");
    }
  };
  return (
    <>
      <ul className="space-y-1 mb-3 max-h-64 overflow-y-auto pr-1">
        {items.map((i) => (
          <li key={i.id} className="group flex items-start gap-2 px-2.5 py-1.5 rounded bg-black/25 border border-border/40 hover:border-primary/30">
            <span className={cn("text-sm flex-1", i.dim && "line-through text-muted-foreground")}>{i.text}</span>
            <button onClick={() => onRemove(i.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-[var(--blood)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Add…" className="h-8 text-sm bg-black/30" />
        <Button size="sm" onClick={submit} className="h-8 px-2"><Plus className="w-4 h-4" /></Button>
      </div>
    </>
  );
}

/** Names of campaign entities (NPCs or locations) with suggestions from the wiki. */
function EntityNameList({ type, names, onChange }: {
  type: "npc" | "location";
  names: string[];
  onChange: (names: string[]) => void;
}) {
  const [v, setV] = useState("");
  const index = useCampaignIndex();
  const pool = useMemo(() => index.filter((e) => e.type === type), [index, type]);
  const suggestions = v.trim()
    ? fuzzySearch(pool, v, 5).filter((s) => !names.includes(s.name))
    : [];
  const add = (name: string) => {
    if (name.trim() && !names.includes(name.trim())) onChange([...names, name.trim()]);
    setV("");
  };
  const known = new Set(pool.map((p) => p.name));
  return (
    <>
      <ul className="space-y-1 mb-3 max-h-56 overflow-y-auto pr-1">
        {names.map((n) => (
          <li key={n} className="group flex items-center gap-2 px-2.5 py-1.5 rounded bg-black/25 border border-border/40 hover:border-primary/30">
            <span className="text-sm flex-1">
              {n}
              {!known.has(n) && <span className="ml-1.5 text-[10px] text-muted-foreground italic">(no wiki entry yet)</span>}
            </span>
            <button onClick={() => onChange(names.filter((x) => x !== n))} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-[var(--blood)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add(v)} placeholder={`Add ${type}…`} className="h-8 text-sm bg-black/30" />
        <Button size="sm" onClick={() => add(v)} className="h-8 px-2"><Plus className="w-4 h-4" /></Button>
      </div>
      {suggestions.length > 0 && (
        <ul className="mt-1 border border-primary/30 rounded-md overflow-hidden bg-black/40">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button onClick={() => add(s.name)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary/60">
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function MonsterPicker({ monsters, onChange }: {
  monsters: { ref: string; name: string; count: number }[];
  onChange: (m: { ref: string; name: string; count: number }[]) => void;
}) {
  const [v, setV] = useState("");
  const index = useContentIndex();
  const pool = useMemo(() => index.filter((e) => e.kind === "monster"), [index]);
  const suggestions = v.trim() ? fuzzySearch(pool, v, 6) : [];
  const add = (ref: string, name: string) => {
    const existing = monsters.find((m) => m.ref === ref);
    onChange(
      existing
        ? monsters.map((m) => (m.ref === ref ? { ...m, count: m.count + 1 } : m))
        : [...monsters, { ref, name, count: 1 }],
    );
    setV("");
  };
  const setCount = (ref: string, count: number) =>
    onChange(count <= 0 ? monsters.filter((m) => m.ref !== ref) : monsters.map((m) => (m.ref === ref ? { ...m, count } : m)));
  return (
    <>
      <ul className="space-y-1 mb-3 max-h-56 overflow-y-auto pr-1">
        {monsters.map((m) => (
          <li key={m.ref} className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-black/25 border border-border/40">
            <span className="text-sm flex-1 truncate">{m.name}</span>
            <button onClick={() => setCount(m.ref, m.count - 1)} className="p-0.5 rounded hover:bg-secondary/60 text-muted-foreground"><Minus className="w-3.5 h-3.5" /></button>
            <span className="text-sm font-display text-gold w-5 text-center tabular-nums">{m.count}</span>
            <button onClick={() => setCount(m.ref, m.count + 1)} className="p-0.5 rounded hover:bg-secondary/60 text-muted-foreground"><Plus className="w-3.5 h-3.5" /></button>
            <button onClick={() => setCount(m.ref, 0)} className="p-0.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-[var(--blood)]"><X className="w-3.5 h-3.5" /></button>
          </li>
        ))}
      </ul>
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="Search the bestiary…" className="h-8 text-sm bg-black/30" />
      {suggestions.length > 0 && (
        <ul className="mt-1 border border-primary/30 rounded-md overflow-hidden bg-black/40">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button onClick={() => add(s.id, s.name)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary/60 flex justify-between gap-2">
                <span className="truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{s.meta}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
