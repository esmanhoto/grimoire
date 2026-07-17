import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HPBar } from "@/components/grimoire/HPBar";
import { CommitNumberInput } from "@/components/grimoire/CommitNumberInput";
import { Sparkles, Shield, Heart, Zap, Skull, Plus, Minus, Swords, X } from "lucide-react";
import { usePlayerCombat, playerCombat, type PlayerRow } from "@/lib/combat-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/player")({
  component: PlayerView,
});

function PlayerView() {
  const state = usePlayerCombat();
  const rows = state.combatants;
  const activeId = state.turnId ?? rows[0]?.id ?? null;
  const activeRow = rows.find((r) => r.id === activeId);

  const send = (op: string, payload: Record<string, unknown> = {}) => playerCombat.send(op, payload);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-primary/30">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-arcane grid place-items-center glow-arcane">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl text-gold tracking-widest leading-none">GRIMOIRE</div>
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
          <div className="w-16 h-16 mx-auto rounded-2xl bg-arcane grid place-items-center glow-arcane">
            <Swords className="w-8 h-8 text-primary-foreground" />
          </div>
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
                    <div className={cn("w-11 h-11 rounded-md grid place-items-center font-display text-lg", isActive ? "bg-arcane text-primary-foreground shadow-arcane" : "bg-black/50 text-gold border border-primary/30")}>
                      {r.initiative}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isPc ? <Sparkles className="w-4 h-4 text-[var(--emerald-arcane)]" /> : <Skull className="w-4 h-4 text-[var(--blood)]" />}
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
                            <span key={e.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 border border-primary/30 text-gold-soft inline-flex items-center gap-1">
                              {e.label}
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
                    <div className="flex flex-col gap-1">
                      {isPc && (
                        <>
                          <button onClick={() => send("apply_hp_delta", { id: r.id, delta: -1 })} className="w-9 h-9 rounded bg-[var(--blood)]/20 border border-[var(--blood)]/40 text-[var(--blood)] grid place-items-center hover:bg-[var(--blood)]/30">
                            <Minus className="w-4 h-4" />
                          </button>
                          <button onClick={() => send("apply_hp_delta", { id: r.id, delta: +1 })} className="w-9 h-9 rounded bg-[var(--emerald-arcane)]/20 border border-[var(--emerald-arcane)]/40 text-[var(--emerald-arcane)] grid place-items-center hover:bg-[var(--emerald-arcane)]/30">
                            <Plus className="w-4 h-4" />
                          </button>
                        </>
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
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <MiniField label="Init" value={row.initiative} onChange={(v) => send("set_initiative", { id: row.id, value: v })} />
        <MiniField label="AC" value={row.ac ?? 10} onChange={(v) => send("set_ac", { id: row.id, value: v })} />
        <MiniField label="Temp" value={row.tempHp ?? 0} onChange={(v) => send("set_temp_hp", { id: row.id, value: v })} />
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
              send("add_effect", { id: row.id, effect: { label: effect.trim(), duration: "", kind: "condition" } });
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
