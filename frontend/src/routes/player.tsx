import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HPBar } from "@/components/grimoire/HPBar";
import { CommitNumberInput } from "@/components/grimoire/CommitNumberInput";
import { Shield, Heart, Zap, Skull, X, Check, ShieldAlert } from "lucide-react";
import { usePlayerCombat, playerCombat, type PlayerRow } from "@/lib/combat-store";
import { useParty } from "@/lib/campaign";
import { classIcon } from "@/lib/class-icons";
import { durationBadge } from "@/lib/effect-presets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/player")({
  component: PlayerView,
});

function PlayerView() {
  const state = usePlayerCombat();
  const party = useParty();
  const rows = state.combatants;
  const activeId = state.turnId ?? rows[0]?.id ?? null;
  const activeRow = rows.find((r) => r.id === activeId);

  const send = (op: string, payload: Record<string, unknown> = {}) => playerCombat.send(op, payload);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-primary/30">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <img
            src="/logo-mark.png"
            alt="DM Grimoire"
            className="w-10 h-10 rounded-lg object-cover ring-1 ring-[var(--gold)]/50 glow-gold"
          />
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl text-gold tracking-widest leading-none">DM GRIMOIRE</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5">Table View</div>
          </div>
          {state.active && (
            <div className="ornate-frame px-3 py-1.5 text-center">
              <div className="text-[9px] uppercase tracking-widest text-gold-soft leading-none">Round</div>
              <div className="font-display text-lg text-gold leading-none mt-0.5">{state.round}</div>
            </div>
          )}
        </div>
      </header>

      {!state.active ? (
        <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
          <img
            src="/logo.png"
            alt="DM Grimoire"
            className="w-44 h-44 mx-auto rounded-full ring-1 ring-[var(--gold)]/40 glow-gold"
          />
          <div className="font-display text-2xl text-gold tracking-wider">No combat right now</div>
          <p className="text-sm text-muted-foreground">
            When the DM starts combat, initiative order will appear here. Keep this page open.
          </p>
        </div>
      ) : (
        <div className="max-w-md mx-auto px-4 py-4 space-y-3">
          <div className="ornate-frame p-4 bg-arcane text-primary-foreground shadow-arcane">
            <div className="text-[10px] uppercase tracking-[0.3em] opacity-80">Now Acting</div>
            <div className="font-display text-2xl tracking-wider leading-tight mt-0.5">
              {activeRow?.name ?? "A hidden threat…"}
            </div>
          </div>

          <ul className="space-y-2 pt-2">
            {rows.map((r) => {
              const isActive = r.id === activeId;
              const isPc = r.kind === "pc";
              return (
                <li key={r.id} className={cn("ornate-frame p-3 transition-all", isActive ? "bg-arcane/20 border-primary shadow-arcane" : "bg-black/30")}>
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    {isPc ? (
                      <CommitNumberInput
                        value={r.initiative}
                        onCommit={(v) => send("set_initiative", { id: r.id, value: v })}
                        aria-label="Initiative"
                        className={cn(
                          "w-11 h-11 text-center rounded-md font-display text-lg focus:outline-none focus:ring-1 focus:ring-primary",
                          isActive ? "bg-arcane text-primary-foreground shadow-arcane" : "bg-black/50 text-gold border border-primary/30",
                        )}
                      />
                    ) : (
                      <div className={cn("w-11 h-11 rounded-md grid place-items-center font-display text-lg", isActive ? "bg-arcane text-primary-foreground shadow-arcane" : "bg-black/50 text-gold border border-primary/30")}>
                        {r.initiative}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isPc ? (
                          (() => {
                            const Icon = classIcon(party.find((p) => p.id === r.ref)?.class);
                            return <Icon className="w-4 h-4 text-[var(--emerald-arcane)]" />;
                          })()
                        ) : (
                          <Skull className="w-4 h-4 text-[var(--blood)]" />
                        )}
                        <span className={cn("font-display truncate", isActive ? "text-gold text-lg" : "text-base")}>{r.name}</span>
                      </div>
                      {isPc ? (
                        <div className="mt-1.5 flex items-center gap-3 text-xs flex-wrap">
                          <span className="flex items-center gap-1 text-muted-foreground"><Shield className="w-3 h-3" /> {r.ac}</span>
                          <span className="flex items-center gap-1 text-gold tabular-nums"><Heart className="w-3 h-3" /> {r.hp}/{r.maxHp}{r.tempHp ? <span className="text-[var(--purple-arcane)]"> +{r.tempHp}</span> : null}</span>
                          {r.concentrating && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--purple-arcane)]/15 border border-[var(--purple-arcane)]/50 text-[var(--purple-arcane)]"><Zap className="w-2.5 h-2.5 inline" /> Conc</span>}
                        </div>
                      ) : (
                        <div className="mt-1.5">
                          <span className={cn("text-[11px] px-2 py-0.5 rounded-full border",
                            r.status === "Healthy" && "border-[var(--emerald-arcane)]/60 text-[var(--emerald-arcane)] bg-[var(--emerald-arcane)]/10",
                            r.status === "Bloodied" && "border-[var(--gold)]/60 text-gold bg-primary/10",
                            r.status === "Down" && "border-[var(--blood)]/60 text-[var(--blood)] bg-[var(--blood)]/10")}>{r.status}</span>
                        </div>
                      )}
                      {r.effects.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {r.effects.map((e) => (
                            <span
                              key={e.id}
                              title={e.reminder || undefined}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 border border-primary/30 text-gold-soft inline-flex items-center gap-1"
                            >
                              {e.label}
                              {durationBadge(e) && <span className="opacity-60">· {durationBadge(e)}</span>}
                              {isPc && e.durationType === "next-attack" && (
                                <button onClick={() => send("consume_effect", { id: r.id, effectId: e.id })} title="Used it" className="hover:text-foreground">
                                  <Check className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {isPc && (
                                <button onClick={() => send("remove_effect", { id: r.id, effectId: e.id })} className="hover:text-foreground">
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      {isPc && r.maxHp != null && (<div className="mt-2"><HPBar hp={r.hp ?? 0} maxHp={r.maxHp} tempHp={r.tempHp} /></div>)}
                    </div>
                    <div className="flex flex-col justify-center">
                      {isPc && (
                        <HpDeltaBox onDelta={(d) => send("apply_hp_delta", { id: r.id, delta: d })} />
                      )}
                    </div>
                  </div>
                  {isPc && <PcEditRow row={r} send={send} />}
                </li>
              );
            })}
          </ul>

          <div className="text-center text-[10px] text-muted-foreground tracking-widest uppercase pt-4">
            Grimoire · Table Companion
          </div>
        </div>
      )}
    </div>
  );
}

function PcEditRow({ row, send }: { row: PlayerRow; send: (op: string, payload: Record<string, unknown>) => void }) {
  const [effect, setEffect] = useState("");
  return (
    <>
      {row.concentrationSaveDc != null && (
        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--purple-arcane)] px-2 py-1.5 rounded bg-[var(--purple-arcane)]/10 border border-[var(--purple-arcane)]/40">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          Concentration save — CON DC {row.concentrationSaveDc}
          <button
            onClick={() => send("clear_concentration_reminder", { id: row.id })}
            className="ml-auto text-muted-foreground hover:text-foreground underline underline-offset-2"
          >held it</button>
          <button
            onClick={() => send("set_concentration", { id: row.id, spell: null })}
            className="text-[var(--blood)] hover:text-foreground underline underline-offset-2"
          >broken</button>
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <MiniField label="AC" value={row.ac ?? 10} onChange={(v) => send("set_ac", { id: row.id, value: v })} />
        <MiniField label="Temp HP" value={row.tempHp ?? 0} onChange={(v) => send("set_temp_hp", { id: row.id, value: v })} />
        <button
          onClick={() => send("set_concentration", { id: row.id, spell: row.concentrating ? null : "—" })}
          className={cn("rounded-md text-[10px] uppercase tracking-widest px-1 py-1",
            row.concentrating ? "bg-[var(--purple-arcane)] text-primary-foreground" : "bg-black/40 border border-border/60 text-muted-foreground")}
        >
          Conc
        </button>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <input
          value={effect}
          onChange={(e) => setEffect(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && effect.trim()) {
              send("add_effect", { id: row.id, effect: { label: effect.trim(), kind: "condition", durationType: "indefinite" } });
              setEffect("");
            }
          }}
          placeholder="Add condition… (Enter)"
          className="flex-1 h-8 px-2 rounded-md bg-black/40 border border-border/60 text-xs focus:border-primary/60 focus:outline-none"
        />
      </div>
    </>
  );
}

/** Same delta entry as the DM tracker: type -7 to damage, +5 to heal. */
function HpDeltaBox({ onDelta }: { onDelta: (d: number) => void }) {
  const [v, setV] = useState("");
  const submit = () => {
    const n = parseInt(v.trim(), 10);
    if (!Number.isNaN(n) && n !== 0) onDelta(n);
    setV("");
  };
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && submit()}
      onBlur={submit}
      placeholder="±HP"
      inputMode="numeric"
      title="Type -7 to damage, +5 to heal"
      className="w-16 h-11 text-center rounded-md bg-black/50 border border-border/60 text-base placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none"
    />
  );
}

function MiniField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="rounded-md bg-black/40 border border-border/60 px-1.5 py-1 flex flex-col items-center">
      <span className="text-[9px] uppercase tracking-widest text-gold-soft">{label}</span>
      <CommitNumberInput
        value={value}
        onCommit={onChange}
        className="w-full bg-transparent text-center font-display text-sm text-gold focus:outline-none"
      />
    </label>
  );
}
