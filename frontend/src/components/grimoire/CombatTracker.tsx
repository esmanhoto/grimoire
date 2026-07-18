import { useState } from "react";
import { Panel } from "./Panel";
import { HPBar, statusFromHp } from "./HPBar";
import { CommitNumberInput } from "./CommitNumberInput";
import {
  Swords, ChevronRight, ChevronLeft, Eye, EyeOff, Plus, X, Check, Dices,
  Shield, Sparkles, Users, Skull, Zap, ShieldAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import {
  CONDITION_PRESETS, SPELL_PRESETS, durationBadge, type EffectPreset,
} from "@/lib/effect-presets";
import type { DurationType } from "@/lib/combat-store";
import {
  useDmCombat, dmCombat, startCombatWithParty, startPreppedCombat, sortCombatants, type Effect,
} from "@/lib/combat-store";
import { useParty } from "@/lib/campaign";
import { useActiveSession } from "@/lib/session";
import { classIcon } from "@/lib/class-icons";
import {
  useContentIndex, fuzzySearch, fetchContentEntry, type MonsterEntry,
} from "@/lib/content";
import { cn } from "@/lib/utils";

export function CombatTracker({
  view = "dm",
  onViewChange,
  onEnded,
}: {
  view?: "dm" | "players";
  onViewChange?: (v: "dm" | "players") => void;
  onEnded?: () => void;
}) {
  const state = useDmCombat();
  const party = useParty();
  const session = useActiveSession();
  const sorted = sortCombatants(state.combatants);
  const activeId = state.turnId ?? sorted[0]?.id ?? null;

  const send = (op: string, payload: Record<string, unknown> = {}) => dmCombat.send(op, payload);

  const addMonster = async (id: string) => {
    const m = await fetchContentEntry<MonsterEntry>("monster", id);
    send("add_monster", {
      monster: { name: m.name, ref: m.id, ac: m.ac, hp: m.hp, maxHp: m.hp, initiativeBonus: m.initiativeBonus },
    });
  };

  if (!state.active) {
    const prepped = session?.monsters ?? [];
    const preppedCount = prepped.reduce((n, m) => n + m.count, 0);
    return (
      <Panel title="Combat" icon={<Swords className="w-4 h-4" />} accent="ember">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground max-w-xs">
            No combat running. Pull the party into the tracker, then add monsters as they appear.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => startCombatWithParty(party)}
              className="bg-arcane text-primary-foreground shadow-arcane gap-2 font-semibold tracking-wide"
            >
              <Swords className="w-4 h-4" /> Roll Initiative
            </Button>
            {preppedCount > 0 && (
              <Button
                onClick={() => void startPreppedCombat(party, prepped)}
                variant="outline"
                className="gap-2 border-primary/40 text-gold hover:bg-primary/10"
              >
                <Skull className="w-4 h-4" /> Load Prepped Encounter ({preppedCount})
              </Button>
            )}
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title={`Combat · Round ${state.round}`}
      icon={<Swords className="w-4 h-4" />}
      accent="ember"
      actions={
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-md overflow-hidden border border-border/60 text-[11px]">
            <button
              onClick={() => onViewChange?.("dm")}
              className={cn("px-2.5 py-1", view === "dm" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >DM</button>
            <button
              onClick={() => onViewChange?.("players")}
              className={cn("px-2.5 py-1", view === "players" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >Players</button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => send("prev_turn")} className="h-7 w-7 p-0"><ChevronLeft className="w-4 h-4" /></Button>
          <Button size="sm" onClick={() => send("next_turn")} className="h-7 bg-arcane text-primary-foreground gap-1">Next <ChevronRight className="w-3.5 h-3.5" /></Button>
          <AddMonsterPopover onAdd={addMonster} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => { send("end_combat"); onEnded?.(); }}
            className="h-7 border-[var(--blood)]/50 text-[var(--blood)] hover:bg-[var(--blood)]/10"
          >
            End
          </Button>
        </div>
      }
      bodyClassName="p-2"
    >
      <ul className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
        {sorted.map((c) => {
          const active = c.id === activeId;
          const hidden = view === "players" && !c.visibleToPlayers;
          if (hidden) return null;
          return (
            <li
              key={c.id}
              className={cn(
                "grid grid-cols-[auto_1fr_auto] gap-3 items-center rounded-lg px-3 py-2 border transition-all",
                active
                  ? "bg-arcane/20 border-primary/60 shadow-arcane"
                  : "bg-black/30 border-border/50 hover:border-primary/30",
                c.hp <= 0 && "opacity-50 grayscale",
              )}
            >
              {/* Initiative editor */}
              <CommitNumberInput
                value={c.initiative}
                onCommit={(v) => send("set_initiative", { id: c.id, value: v })}
                className="w-12 h-10 text-center rounded-md bg-black/50 border border-primary/30 text-gold font-display text-lg focus-visible:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Initiative"
              />

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {c.kind === "pc" ? (
                    (() => {
                      const Icon = classIcon(party.find((p) => p.id === c.ref)?.class);
                      return <Icon className="w-3.5 h-3.5 text-[var(--emerald-arcane)] shrink-0" />;
                    })()
                  ) : (
                    <Skull className="w-3.5 h-3.5 text-[var(--blood)] shrink-0" />
                  )}
                  <span className={cn("font-medium truncate", active && "text-gold")}>{c.name}</span>

                  {c.concentrating && (
                    <Badge variant="outline" className="border-[var(--purple-arcane)]/60 text-[var(--purple-arcane)] gap-1 text-[10px] h-5">
                      <Zap className="w-3 h-3" /> Conc: {c.concentrating.spell}
                      {view === "dm" && (
                        <button
                          onClick={() => send("set_concentration", { id: c.id, spell: null })}
                          className="ml-1 hover:text-foreground"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </Badge>
                  )}

                  {c.effects.map((e) => (
                    <EffectBadge
                      key={e.id}
                      effect={e}
                      onClear={() => send("remove_effect", { id: c.id, effectId: e.id })}
                      onConsume={() => send("consume_effect", { id: c.id, effectId: e.id })}
                      showClear={view === "dm"}
                    />
                  ))}

                  {view === "dm" && (
                    <EffectPicker
                      onAdd={(eff) => send("add_effect", { id: c.id, effect: eff })}
                      onSetConc={(spell) => send("set_concentration", { id: c.id, spell })}
                    />
                  )}
                </div>

                <div className="mt-1 flex items-center gap-2">
                  {view === "dm" || c.kind === "pc" ? (
                    <>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                        <Shield className="w-3 h-3" /> {c.ac}
                      </span>
                      <div className="text-[11px] tabular-nums shrink-0">
                        <span className={cn(c.hp / c.maxHp <= 0.33 ? "text-[var(--blood)]" : "text-foreground")}>{c.hp}</span>
                        <span className="text-muted-foreground">/{c.maxHp}</span>
                        {c.tempHp > 0 && <span className="text-[var(--purple-arcane)]"> +{c.tempHp}</span>}
                      </div>
                      <HPBar hp={c.hp} maxHp={c.maxHp} tempHp={c.tempHp} className="max-w-[240px]" />
                    </>
                  ) : (
                    <StatusPill status={statusFromHp(c.hp, c.maxHp)} />
                  )}
                </div>

                {view === "dm" && c.concentrationSaveDc != null && (
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--purple-arcane)]">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Concentration save — CON DC {c.concentrationSaveDc}
                    <button
                      onClick={() => send("clear_concentration_reminder", { id: c.id })}
                      className="text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >dismiss</button>
                    <button
                      onClick={() => send("break_concentration", { id: c.id })}
                      className="text-[var(--blood)] hover:text-foreground underline underline-offset-2"
                    >Broken</button>
                  </div>
                )}

                {/* Save-ends repeat prompts — non-blocking, resolved by hand */}
                {view === "dm" && c.effects.filter((e) => e.pendingSave).map((e) => (
                  <div key={e.id} className="mt-1 flex items-center gap-2 text-[11px] text-gold">
                    <Dices className="w-3.5 h-3.5" />
                    {e.label} — save ends{e.save && ` (${e.save})`}:
                    <button
                      onClick={() => send("resolve_save", { id: c.id, effectId: e.id, passed: true })}
                      className="text-[var(--emerald-arcane)] hover:text-foreground underline underline-offset-2"
                    >passed</button>
                    <button
                      onClick={() => send("resolve_save", { id: c.id, effectId: e.id, passed: false })}
                      className="text-[var(--blood)] hover:text-foreground underline underline-offset-2"
                    >failed</button>
                  </div>
                ))}

                {/* Turn-start reminders: the active creature's effects, spelled out */}
                {view === "dm" && active && c.effects.some((e) => e.reminder) && (
                  <div className="mt-1.5 space-y-0.5">
                    {c.effects.filter((e) => e.reminder).map((e) => (
                      <div key={e.id} className="text-[11px] px-2 py-1 rounded bg-arcane/15 border border-primary/30 text-foreground/90">
                        <span className="text-gold font-medium">{e.label}:</span> {e.reminder}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {view === "dm" && (
                  <HpDeltaInput
                    onDelta={(d) => send("apply_hp_delta", { id: c.id, delta: d })}
                    onTempHp={(t) => send("set_temp_hp", { id: c.id, value: t })}
                  />
                )}
                {view === "dm" && c.kind === "monster" && (
                  <button
                    onClick={() => send("set_visibility", { id: c.id, visible: !c.visibleToPlayers })}
                    className="p-1.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-gold"
                    title={c.visibleToPlayers ? "Hide from players" : "Reveal to players"}
                  >
                    {c.visibleToPlayers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-[var(--blood)]" />}
                  </button>
                )}
                {view === "dm" && (
                  <button
                    onClick={() => send("remove_combatant", { id: c.id })}
                    className="p-1.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-[var(--blood)]"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function EffectBadge({ effect, onClear, onConsume, showClear }: {
  effect: Effect;
  onClear: () => void;
  onConsume: () => void;
  showClear: boolean;
}) {
  const tone =
    effect.kind === "condition"
      ? "border-[var(--blood)]/60 text-[var(--blood)] bg-[var(--blood)]/10"
      : effect.kind === "spell"
      ? "border-[var(--purple-arcane)]/60 text-[var(--purple-arcane)] bg-[var(--purple-arcane)]/10"
      : "border-gold/60 text-gold bg-primary/10";
  const hint = durationBadge(effect);
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 text-[10px] h-5", tone, effect.pendingSave && "ring-1 ring-[var(--gold)]")}
      title={effect.reminder || undefined}
    >
      {effect.label}
      {hint && <span className="opacity-60">· {hint}</span>}
      {showClear && effect.durationType === "next-attack" && (
        <button onClick={onConsume} title="Triggered — consume" className="ml-0.5 hover:text-foreground">
          <Check className="w-2.5 h-2.5" />
        </button>
      )}
      {showClear && (
        <button onClick={onClear} className="ml-0.5 hover:text-foreground"><X className="w-2.5 h-2.5" /></button>
      )}
    </Badge>
  );
}

function StatusPill({ status }: { status: "Healthy" | "Bloodied" | "Down" }) {
  const cls =
    status === "Healthy"
      ? "border-[var(--emerald-arcane)]/60 text-[var(--emerald-arcane)] bg-[var(--emerald-arcane)]/10"
      : status === "Bloodied"
      ? "border-[var(--gold)]/60 text-gold bg-primary/10"
      : "border-[var(--blood)]/60 text-[var(--blood)] bg-[var(--blood)]/10";
  return <Badge variant="outline" className={cn("h-5", cls)}>{status}</Badge>;
}

function HpDeltaInput({ onDelta, onTempHp }: { onDelta: (d: number) => void; onTempHp: (t: number) => void }) {
  const [val, setVal] = useState("");
  const submit = () => {
    const v = val.trim();
    if (!v) return;
    if (v.toLowerCase().startsWith("t")) {
      const n = parseInt(v.slice(1), 10);
      if (!Number.isNaN(n)) onTempHp(n);
    } else {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) onDelta(n);
    }
    setVal("");
  };
  return (
    <input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && submit()}
      onBlur={submit}
      placeholder="±HP"
      className="w-16 h-9 text-center rounded-md bg-black/50 border border-border/60 text-sm placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none"
      title="Type -7 to damage, +5 to heal, t10 to set 10 temp HP"
    />
  );
}

type EffectPayload = {
  label: string;
  kind: Effect["kind"];
  durationType: DurationType;
  rounds: number;
  save: string;
  reminder: string;
};

function EffectPicker({ onAdd, onSetConc }: { onAdd: (e: EffectPayload) => void; onSetConc: (spell: string) => void }) {
  const [custom, setCustom] = useState("");
  const [concSpell, setConcSpell] = useState("");
  const [dur, setDur] = useState<"preset" | DurationType>("preset");
  const [rounds, setRounds] = useState(2);
  const [save, setSave] = useState("");

  const build = (p: EffectPreset): EffectPayload => {
    const durationType = dur === "preset" ? p.durationType : dur;
    return {
      label: p.label,
      kind: p.kind,
      durationType,
      rounds: durationType === "rounds" ? (dur === "preset" ? (p.rounds ?? rounds) : rounds) : 0,
      save: durationType === "save-ends" ? save : "",
      reminder: p.reminder,
    };
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-0.5 rounded hover:bg-secondary/60 text-muted-foreground hover:text-gold">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 glass-panel border-primary/30">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-gold-soft">Duration</span>
            <select
              value={dur}
              onChange={(e) => setDur(e.target.value as typeof dur)}
              className="bg-black/30 text-xs border border-border/60 rounded px-2 py-1"
            >
              <option value="preset">Preset default</option>
              <option value="indefinite">Until removed</option>
              <option value="rounds">N rounds</option>
              <option value="save-ends">Save ends</option>
              <option value="next-attack">On next attack</option>
              <option value="concentration">Concentration</option>
            </select>
            {dur === "rounds" && (
              <input
                type="number"
                min={1}
                value={rounds}
                onChange={(e) => setRounds(Math.max(1, Number(e.target.value) || 1))}
                className="w-14 bg-black/30 text-xs border border-border/60 rounded px-2 py-1 text-center"
              />
            )}
            {dur === "save-ends" && (
              <Input
                value={save}
                onChange={(e) => setSave(e.target.value)}
                placeholder="e.g. CON 13"
                className="h-6 w-24 text-xs bg-black/30"
              />
            )}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-gold-soft mb-1.5">Conditions</div>
            <div className="flex flex-wrap gap-1">
              {CONDITION_PRESETS.map((p) => (
                <button
                  key={p.label}
                  title={p.reminder}
                  onClick={() => onAdd(build(p))}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--blood)]/10 border border-[var(--blood)]/40 text-[var(--blood)] hover:bg-[var(--blood)]/20"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gold-soft mb-1.5">Spells & Abilities</div>
            <div className="flex flex-wrap gap-1">
              {SPELL_PRESETS.map((p) => (
                <button
                  key={p.label}
                  title={p.reminder}
                  onClick={() => onAdd(build(p))}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--purple-arcane)]/10 border border-[var(--purple-arcane)]/40 text-[var(--purple-arcane)] hover:bg-[var(--purple-arcane)]/20"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gold-soft mb-1.5">Custom</div>
            <div className="flex gap-2">
              <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. disadvantage on next attack" className="h-8 text-xs" />
              <Button
                size="sm"
                className="h-8"
                onClick={() => {
                  if (custom.trim()) {
                    onAdd({
                      label: custom.trim(),
                      kind: "custom",
                      durationType: dur === "preset" ? "indefinite" : dur,
                      rounds: dur === "rounds" ? rounds : 0,
                      save: dur === "save-ends" ? save : "",
                      reminder: "",
                    });
                    setCustom("");
                  }
                }}
              >Add</Button>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-gold-soft mb-1.5">Concentrating on…</div>
            <div className="flex gap-2">
              <Input value={concSpell} onChange={(e) => setConcSpell(e.target.value)} placeholder="spell name" className="h-8 text-xs" />
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-[var(--purple-arcane)]/50 text-[var(--purple-arcane)]"
                onClick={() => {
                  onSetConc(concSpell.trim() || "—");
                  setConcSpell("");
                }}
              >Set</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddMonsterPopover({ onAdd }: { onAdd: (monsterId: string) => void }) {
  const [q, setQ] = useState("");
  const index = useContentIndex();
  const allMonsters = index.filter((e) => e.kind === "monster");
  const results = q.trim() ? fuzzySearch(allMonsters, q, 10) : allMonsters.slice(0, 8);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 border-primary/40"><Plus className="w-3.5 h-3.5" /> Add</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 glass-panel border-primary/30 p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search monsters…" className="h-8 mb-2" />
        <ul className="max-h-64 overflow-y-auto space-y-1">
          {results.map((m) => (
            <li key={m.id}>
              <button onClick={() => onAdd(m.id)} className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary/60">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{m.name}</span>
                  <span className="text-muted-foreground text-xs shrink-0">{m.meta}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3 h-3" /> Party is already in the tracker.
        </div>
      </PopoverContent>
    </Popover>
  );
}
