import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Panel } from "@/components/grimoire/Panel";
import { PartyPanel } from "@/components/grimoire/PartyPanel";
import { SearchPanel } from "@/components/grimoire/SearchPanel";
import { CombatTracker } from "@/components/grimoire/CombatTracker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, Swords, Landmark, Users, ScrollText, StickyNote, MapPin, Eye, Skull, Sparkles, Shield, Heart, Search } from "lucide-react";
import { npcs, locations, scenes, secrets as initialSecrets } from "@/lib/mock-data";
import { useDmCombat, startCombatWithParty } from "@/lib/combat-store";
import { useParty } from "@/lib/campaign";
import { useContentEntry, type MonsterEntry } from "@/lib/content";
import { ContentDetail, MonsterDetail } from "@/components/grimoire/ContentDetail";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

type Mode = "exploration" | "combat";
type Note = { id: string; time: string; text: string };

function Dashboard() {
  const [mode, setMode] = useState<Mode>("exploration");
  const [notes, setNotes] = useState<Note[]>([
    { id: "n1", time: "19:42", text: "Mara admitted she buried the last party." },
    { id: "n2", time: "20:11", text: "Sable palmed the sigil ring off Vex — nobody noticed." },
  ]);
  const [secrets, setSecrets] = useState(initialSecrets);
  const [playerView, setPlayerView] = useState<"dm" | "players">("dm");
  const [openMonsterId, setOpenMonsterId] = useState<string | null>(null);
  const combat = useDmCombat();
  const party = useParty();

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <PageHeader
        title="Session Board"
        subtitle="Session 13 · The Weeping Wood · Chapter III"
        right={
          <div className="flex items-center gap-2">
            <SegmentedMode mode={mode} onChange={setMode} />
            {mode === "exploration" && (
              <Button
                onClick={() => {
                  if (!combat.active) startCombatWithParty(party);
                  setMode("combat");
                }}
                className="bg-arcane text-primary-foreground shadow-arcane gap-2 font-semibold tracking-wide"
              >
                <Swords className="w-4 h-4" /> {combat.active ? "Resume Combat" : "Start Combat"}
              </Button>
            )}
          </div>
        }
      />

      <SearchPanel />

      <PartyPanel />

      {mode === "exploration" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ActiveSessionPanel />
          <SecretsPanel secrets={secrets} onToggle={(id) => setSecrets((s) => s.map((x) => x.id === id ? { ...x, revealed: !x.revealed } : x))} />
          <QuickNotesPanel notes={notes} onAdd={(t) => setNotes((n) => [{ id: crypto.randomUUID(), time: nowHm(), text: t }, ...n])} />
          <PlotlinePanel />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
          <div className="space-y-6">
            <CombatTracker
              onOpenMonster={setOpenMonsterId}
              view={playerView}
              onViewChange={setPlayerView}
              onEnded={() => setMode("exploration")}
            />
            <QuickNotesPanel notes={notes} onAdd={(t) => setNotes((n) => [{ id: crypto.randomUUID(), time: nowHm(), text: t }, ...n])} />
          </div>
          <div className="space-y-6">
            <MonsterSheetPanel monsterId={openMonsterId} />
            <NPCSheetPanel />
          </div>
        </div>
      )}

      <Sheet open={!!openMonsterId && mode !== "combat"} onOpenChange={(o) => !o && setOpenMonsterId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg glass-panel border-l-primary/30 overflow-y-auto">
          {openMonsterId && (
            <>
              <SheetHeader className="border-b border-border/60 pb-4">
                <SheetTitle className="font-display text-2xl text-gold tracking-wider">Stat Block</SheetTitle>
                <SheetDescription>Monster · SRD 5.2.1</SheetDescription>
              </SheetHeader>
              <div className="py-4">
                <ContentDetail kind="monster" id={openMonsterId} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold-soft">
          <div className="w-8 h-px bg-gold-gradient" />
          Grimoire
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-gold tracking-wider truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

function SegmentedMode({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="inline-flex ornate-frame overflow-hidden">
      {(["exploration", "combat"] as const).map((m) => {
        const active = mode === m;
        const Icon = m === "exploration" ? Compass : Swords;
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={cn(
              "px-4 py-2 text-sm font-medium tracking-wide flex items-center gap-2 transition capitalize",
              active ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground hover:text-gold",
            )}
          >
            <Icon className="w-4 h-4" /> {m}
          </button>
        );
      })}
    </div>
  );
}

function nowHm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function MiniStat({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="ornate-frame py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("font-display text-lg", highlight ? "text-gold" : "text-foreground")}>{value}</div>
    </div>
  );
}

function ActiveSessionPanel() {
  return (
    <Panel title="This Session" icon={<ScrollText className="w-4 h-4" />} accent="emerald">
      <div className="space-y-4 text-sm">
        <ListBlock icon={<Users className="w-3.5 h-3.5" />} label="NPCs on stage">
          {npcs.slice(0, 3).map((n) => (
            <ItemRow key={n.id} title={n.name} sub={n.role} />
          ))}
        </ListBlock>
        <ListBlock icon={<MapPin className="w-3.5 h-3.5" />} label="Locations">
          {locations.slice(0, 3).map((l) => (
            <ItemRow key={l.id} title={l.name} sub={l.region} />
          ))}
        </ListBlock>
        <ListBlock icon={<Sparkles className="w-3.5 h-3.5" />} label="Scenes">
          {scenes.map((s) => (
            <ItemRow key={s.id} title={s.title} sub={s.blurb} />
          ))}
        </ListBlock>
      </div>
    </Panel>
  );
}

function ListBlock({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-gold-soft">{icon}</span>
        <span className="text-[10px] uppercase tracking-[0.25em] text-gold-soft">{label}</span>
        <div className="rune-divider flex-1" />
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function ItemRow({ title, sub }: { title: string; sub?: string }) {
  return (
    <li className="px-3 py-1.5 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-primary/30 cursor-pointer">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        {sub && <span className="text-[11px] text-muted-foreground truncate max-w-[60%] text-right">{sub}</span>}
      </div>
    </li>
  );
}

function SecretsPanel({ secrets, onToggle }: { secrets: typeof initialSecrets; onToggle: (id: string) => void }) {
  const revealed = secrets.filter((s) => s.revealed).length;
  return (
    <Panel
      title="Secrets & Clues"
      icon={<Eye className="w-4 h-4" />}
      accent="purple"
      actions={<span className="text-[11px] text-muted-foreground tabular-nums">{revealed}/{secrets.length}</span>}
    >
      <ul className="space-y-1.5">
        {secrets.map((s) => (
          <li key={s.id}>
            <label className="flex items-start gap-2 px-3 py-2 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-primary/30 cursor-pointer">
              <input
                type="checkbox"
                checked={!!s.revealed}
                onChange={() => onToggle(s.id)}
                className="mt-1 accent-[var(--purple-arcane)]"
              />
              <span className={cn("text-sm", s.revealed && "line-through text-muted-foreground")}>{s.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function QuickNotesPanel({ notes, onAdd }: { notes: Note[]; onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <Panel title="Quick Notes" icon={<StickyNote className="w-4 h-4" />}>
      <div className="flex gap-2">
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && v.trim()) {
              onAdd(v.trim());
              setV("");
            }
          }}
          placeholder="One-line note… (Enter to save)"
          className="flex-1 h-10 px-3 rounded-md bg-black/30 border border-border/60 focus:border-primary/60 focus:outline-none text-sm"
        />
        <Button
          size="sm"
          onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(""); } }}
          className="bg-gold-gradient text-primary-foreground"
        >
          Add
        </Button>
      </div>
      <ul className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {notes.map((n) => (
          <li key={n.id} className="text-sm flex gap-2 px-3 py-1.5 rounded bg-black/20 border border-border/40">
            <span className="text-[10px] font-mono text-gold-soft mt-0.5 tabular-nums">{n.time}</span>
            <span>{n.text}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function PlotlinePanel() {
  const beats = [
    { t: "Session 11", text: "Party discovered the corpse on the beach." },
    { t: "Session 12", text: "Weeping Wood opened; heard the Court's choir." },
    { t: "Now", text: "The party stands at the mouth of the Pale Court." },
    { t: "Looming", text: "Vhaelor's midwinter walk in 6 in-world days." },
  ];
  return (
    <Panel title="Plotline" icon={<Landmark className="w-4 h-4" />} accent="ember">
      <ol className="relative border-l border-primary/30 ml-3 space-y-4">
        {beats.map((b, i) => (
          <li key={i} className="pl-5 relative">
            <span className={cn(
              "absolute -left-[7px] top-1.5 w-3 h-3 rounded-full",
              i === 2 ? "bg-arcane glow-arcane" : "bg-primary/60",
            )} />
            <div className="text-[10px] uppercase tracking-widest text-gold-soft">{b.t}</div>
            <div className="text-sm">{b.text}</div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function MonsterSheetPanel({ monsterId }: { monsterId: string | null }) {
  const monster = useContentEntry<MonsterEntry>("monster", monsterId);
  return (
    <Panel title="Monster · Stat Block" icon={<Skull className="w-4 h-4" />} accent="ember">
      {monster ? (
        <div className="space-y-3">
          <div className="font-display text-xl text-gold">{monster.name}</div>
          <MonsterDetail monster={monster} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic py-6 text-center">
          Tap the <Search className="w-3.5 h-3.5 inline mx-0.5" /> icon on a monster in the tracker
          to open its stat block here.
        </p>
      )}
    </Panel>
  );
}

function NPCSheetPanel() {
  const n = npcs[0];
  return (
    <Panel title="NPC · Reference" icon={<Users className="w-4 h-4" />}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-lg bg-arcane grid place-items-center shrink-0 shadow-arcane">
          <Users className="w-7 h-7 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-lg text-gold">{n.name}</div>
          <div className="text-xs text-muted-foreground">{n.role} · {n.location}</div>
          <p className="text-sm mt-2">{n.blurb}</p>
          <div className="mt-3 flex gap-1.5 flex-wrap">
            <Badge variant="outline" className="border-primary/40 text-gold gap-1"><Shield className="w-3 h-3" />Neutral</Badge>
            <Badge variant="outline" className="border-[var(--emerald-arcane)]/50 text-[var(--emerald-arcane)] gap-1"><Heart className="w-3 h-3" />Ally-leaning</Badge>
          </div>
        </div>
      </div>
    </Panel>
  );
}

