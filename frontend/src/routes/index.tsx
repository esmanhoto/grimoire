import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel } from "@/components/grimoire/Panel";
import { PartyPanel } from "@/components/grimoire/PartyPanel";
import { SearchPanel } from "@/components/grimoire/SearchPanel";
import { CombatTracker } from "@/components/grimoire/CombatTracker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, Swords, Landmark, Users, ScrollText, StickyNote, MapPin, Eye, Skull, Sparkles, Shield, Heart } from "lucide-react";
import { npcs } from "@/lib/mock-data";
import { useDmCombat, startCombatWithParty, sortCombatants } from "@/lib/combat-store";
import { useCampaignIndex, useCampaignMutations, useParty } from "@/lib/campaign";
import { useActiveSession, useSessionMutations } from "@/lib/session";
import { Link, useNavigate } from "@tanstack/react-router";
import { useContentEntry, type MonsterEntry } from "@/lib/content";
import { MonsterDetail } from "@/components/grimoire/ContentDetail";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

type Mode = "exploration" | "combat";

function Dashboard() {
  const [mode, setMode] = useState<Mode>("exploration");
  const [playerView, setPlayerView] = useState<"dm" | "players">("dm");
  const combat = useDmCombat();
  const party = useParty();
  const session = useActiveSession();

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
      <PageHeader
        title="Session Board"
        subtitle={session ? `Armed: ${session.name}` : "No session armed — prep one to fill this board"}
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
          <SecretsPanel />
          <QuickNotesPanel />
          <PlotlinePanel />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
          <div className="space-y-6">
            <CombatTracker
              view={playerView}
              onViewChange={setPlayerView}
              onEnded={() => setMode("exploration")}
            />
            <QuickNotesPanel />
          </div>
          <div className="space-y-6">
            <MonsterSheetPanel />
            <NPCSheetPanel />
          </div>
        </div>
      )}
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

function MiniStat({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="ornate-frame py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("font-display text-lg", highlight ? "text-gold" : "text-foreground")}>{value}</div>
    </div>
  );
}

function ActiveSessionPanel() {
  const session = useActiveSession();
  const index = useCampaignIndex();
  const { update } = useCampaignMutations();
  const navigate = useNavigate();

  if (!session) {
    return (
      <Panel title="This Session" icon={<ScrollText className="w-4 h-4" />} accent="emerald">
        <p className="text-sm text-muted-foreground italic py-6 text-center">
          No session armed.{" "}
          <Link to="/prep" className="text-gold underline underline-offset-4">Prep one</Link>{" "}
          and it appears here — NPCs, locations, scenes, secrets.
        </p>
      </Panel>
    );
  }

  const openEntity = (name: string, type: "npc" | "location") => {
    const match = index.find((e) => e.type === type && e.name.toLowerCase() === name.toLowerCase());
    if (match) navigate({ to: "/campaign", search: { open: match.id } });
  };
  const toggleScene = (id: string) =>
    update.mutate({
      id: session.id,
      fields: { scenes: session.scenes.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) },
    });

  return (
    <Panel title="This Session" icon={<ScrollText className="w-4 h-4" />} accent="emerald">
      <div className="space-y-4 text-sm">
        {session.strongStart && (
          <div className="px-3 py-2 rounded bg-arcane/15 border border-primary/30 text-sm">
            <span className="text-[10px] uppercase tracking-[0.25em] text-gold-soft block mb-0.5">Strong Start</span>
            {session.strongStart}
          </div>
        )}
        <ListBlock icon={<Users className="w-3.5 h-3.5" />} label="NPCs on stage">
          {session.npcs.map((n) => (
            <ItemRow key={n} title={n} onClick={() => openEntity(n, "npc")} />
          ))}
        </ListBlock>
        <ListBlock icon={<MapPin className="w-3.5 h-3.5" />} label="Locations">
          {session.locations.map((l) => (
            <ItemRow key={l} title={l} onClick={() => openEntity(l, "location")} />
          ))}
        </ListBlock>
        <ListBlock icon={<Sparkles className="w-3.5 h-3.5" />} label="Scenes">
          {session.scenes.map((s) => (
            <li key={s.id}>
              <label className="flex items-start gap-2 px-3 py-1.5 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-primary/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!s.done}
                  onChange={() => toggleScene(s.id)}
                  className="mt-1 accent-[var(--emerald-arcane)]"
                />
                <span className={cn("text-sm", s.done && "line-through text-muted-foreground")}>{s.text}</span>
              </label>
            </li>
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

function ItemRow({ title, sub, onClick }: { title: string; sub?: string; onClick?: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-1.5 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-primary/30 cursor-pointer"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{title}</span>
          {sub && <span className="text-[11px] text-muted-foreground truncate max-w-[60%] text-right">{sub}</span>}
        </div>
      </button>
    </li>
  );
}

function SecretsPanel() {
  const session = useActiveSession();
  const { update } = useCampaignMutations();
  const secrets = session?.secrets ?? [];
  const revealed = secrets.filter((s) => s.revealed).length;
  const toggle = (id: string) => {
    if (!session) return;
    update.mutate({
      id: session.id,
      fields: { secrets: secrets.map((s) => (s.id === id ? { ...s, revealed: !s.revealed } : s)) },
    });
  };
  return (
    <Panel
      title="Secrets & Clues"
      icon={<Eye className="w-4 h-4" />}
      accent="purple"
      actions={<span className="text-[11px] text-muted-foreground tabular-nums">{revealed}/{secrets.length}</span>}
    >
      {secrets.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-4 text-center">
          Secrets from the armed session appear here.
        </p>
      )}
      <ul className="space-y-1.5">
        {secrets.map((s) => (
          <li key={s.id}>
            <label className="flex items-start gap-2 px-3 py-2 rounded bg-black/20 hover:bg-black/40 border border-transparent hover:border-primary/30 cursor-pointer">
              <input
                type="checkbox"
                checked={!!s.revealed}
                onChange={() => toggle(s.id)}
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

function QuickNotesPanel() {
  const session = useActiveSession();
  const { addNote } = useSessionMutations();
  const [v, setV] = useState("");
  const notes = [...(session?.notes ?? [])].reverse();
  const submit = () => {
    if (v.trim() && session) {
      addNote.mutate(v.trim());
      setV("");
    }
  };
  return (
    <Panel title="Quick Notes" icon={<StickyNote className="w-4 h-4" />}>
      <div className="flex gap-2">
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={session ? "One-line note… (Enter to save)" : "Arm a session to take notes"}
          disabled={!session}
          className="flex-1 h-10 px-3 rounded-md bg-black/30 border border-border/60 focus:border-primary/60 focus:outline-none text-sm disabled:opacity-50"
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={!session || addNote.isPending}
          className="bg-gold-gradient text-primary-foreground"
        >
          Add
        </Button>
      </div>
      <ul className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {notes.map((n, i) => (
          <li key={`${n.time}-${i}`} className="text-sm flex gap-2 px-3 py-1.5 rounded bg-black/20 border border-border/40">
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

/** Stat blocks for every monster in the tracker, as tabs. The tab follows
 * the initiative order — when a monster's turn comes up its sheet shows —
 * but the DM can flip to any other tab at will. */
function MonsterSheetPanel() {
  const state = useDmCombat();
  const [picked, setPicked] = useState<string | null>(null);
  const sorted = sortCombatants(state.combatants);
  const activeId = state.turnId ?? sorted[0]?.id ?? null;

  // unique resolvable stat-block refs, in initiative order
  const tabs: { ref: string; label: string }[] = [];
  for (const c of sorted) {
    if (c.kind === "monster" && c.ref?.startsWith("monster-") && !tabs.some((t) => t.ref === c.ref)) {
      tabs.push({ ref: c.ref, label: c.name.replace(/\s+\d+$/, "") });
    }
  }

  // follow the turn: when a monster becomes active, its tab takes over
  const active = sorted.find((c) => c.id === activeId);
  const activeRef = active?.kind === "monster" && active.ref?.startsWith("monster-") ? active.ref : null;
  useEffect(() => {
    if (activeRef) setPicked(activeRef);
  }, [activeRef]);

  const current = picked && tabs.some((t) => t.ref === picked) ? picked : tabs[0]?.ref ?? null;
  const monster = useContentEntry<MonsterEntry>("monster", current);

  return (
    <Panel title="Monster · Stat Block" icon={<Skull className="w-4 h-4" />} accent="ember">
      {tabs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-6 text-center">
          Add monsters to the tracker and their stat blocks appear here.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 mb-3">
            {tabs.map((t) => (
              <button
                key={t.ref}
                onClick={() => setPicked(t.ref)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition",
                  t.ref === current
                    ? "bg-primary/20 border-[var(--gold)]/60 text-gold"
                    : "bg-black/20 border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40",
                  activeRef === t.ref && "ring-1 ring-[var(--gold)]/50",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {monster ? (
            <div className="space-y-3">
              <div className="font-display text-xl text-gold">{monster.name}</div>
              <MonsterDetail monster={monster} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-4 text-center">Loading stat block…</p>
          )}
        </>
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

