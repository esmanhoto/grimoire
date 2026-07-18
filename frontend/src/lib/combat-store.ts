// Live combat state shared with the backend over WebSocket.
// The server (backend/src/grimoire/combat.py) is the source of truth; this
// store just mirrors the last broadcast state and sends action messages.

import { useSyncExternalStore } from "react";
import type { Character } from "./campaign";

export type EffectKind = "condition" | "spell" | "custom";
export type DurationType = "indefinite" | "rounds" | "save-ends" | "next-attack" | "concentration";
export type Effect = {
  id: string;
  label: string;
  kind: EffectKind;
  durationType: DurationType;
  rounds: number;
  save: string;
  reminder: string;
  sourceId: string | null;
  pendingSave: boolean;
};

export type Combatant = {
  id: string;
  name: string;
  kind: "pc" | "monster";
  initiative: number;
  initiativeBonus: number;
  ac: number;
  hp: number;
  maxHp: number;
  tempHp: number;
  effects: Effect[];
  concentrating: { spell: string; dc?: number | null } | null;
  concentrationSaveDc: number | null;
  visibleToPlayers: boolean;
  ref: string | null;
};

export type CombatState = {
  active: boolean;
  round: number;
  turnId: string | null;
  combatants: Combatant[];
};

export type CombatantStatus = "Healthy" | "Bloodied" | "Down";

export type PlayerRow = {
  id: string;
  name: string;
  kind: "pc" | "monster";
  initiative: number;
  effects: Effect[];
  // PCs only:
  ref?: string | null;
  ac?: number;
  hp?: number;
  maxHp?: number;
  tempHp?: number;
  concentrating?: boolean;
  concentrationSaveDc?: number | null;
  // visible monsters only:
  status?: CombatantStatus;
};

export type PlayerCombatState = {
  active: boolean;
  round: number;
  turnId: string | null;
  combatants: PlayerRow[];
};

const EMPTY_DM: CombatState = { active: false, round: 1, turnId: null, combatants: [] };
const EMPTY_PLAYER: PlayerCombatState = { active: false, round: 1, turnId: null, combatants: [] };

// Mirrors _sort_key in backend/src/grimoire/combat.py — keep in sync.
export function sortCombatants<
  T extends { initiative: number; initiativeBonus?: number; name: string; id: string },
>(cs: T[]): T[] {
  return [...cs].sort(
    (a, b) =>
      b.initiative - a.initiative ||
      (b.initiativeBonus ?? 0) - (a.initiativeBonus ?? 0) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
}

export function statusFromHp(hp: number, maxHp: number): CombatantStatus {
  if (hp <= 0) return "Down";
  if (hp <= maxHp / 2) return "Bloodied";
  return "Healthy";
}

// Mirrors CombatEngine.player_view() — used for the DM's "Players" preview toggle.
export function projectForPlayers(state: CombatState): PlayerCombatState {
  const rows: PlayerRow[] = [];
  for (const c of sortCombatants(state.combatants)) {
    if (c.kind === "monster" && !c.visibleToPlayers) continue;
    if (c.kind === "pc") {
      rows.push({
        id: c.id,
        name: c.name,
        kind: c.kind,
        initiative: c.initiative,
        effects: c.effects,
        ac: c.ac,
        hp: c.hp,
        maxHp: c.maxHp,
        tempHp: c.tempHp,
        concentrating: c.concentrating != null,
        concentrationSaveDc: c.concentrationSaveDc,
      });
    } else {
      rows.push({
        id: c.id,
        name: c.name,
        kind: c.kind,
        initiative: c.initiative,
        effects: c.effects,
        status: statusFromHp(c.hp, c.maxHp),
      });
    }
  }
  return { active: state.active, round: state.round, turnId: state.turnId, combatants: rows };
}

type Role = "dm" | "player";

class CombatSocket<S> {
  private ws: WebSocket | null = null;
  private listeners = new Set<() => void>();
  private state: S;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private role: Role,
    empty: S,
  ) {
    this.state = empty;
  }

  subscribe = (onChange: () => void): (() => void) => {
    this.listeners.add(onChange);
    this.ensureConnected();
    return () => {
      this.listeners.delete(onChange);
    };
  };

  getSnapshot = (): S => this.state;

  send(op: string, payload: Record<string, unknown> = {}): void {
    this.ensureConnected();
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "action", op, payload }));
    }
  }

  private ensureConnected(): void {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/combat?role=${this.role}`);
    this.ws = ws;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "state") {
        this.state = msg.state as S;
        this.listeners.forEach((fn) => fn());
      }
    };
    ws.onclose = () => {
      if (this.listeners.size > 0 && !this.retryTimer) {
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this.ensureConnected();
        }, 1500);
      }
    };
  }
}

export const dmCombat = new CombatSocket<CombatState>("dm", EMPTY_DM);
export const playerCombat = new CombatSocket<PlayerCombatState>("player", EMPTY_PLAYER);

export function useDmCombat(): CombatState {
  return useSyncExternalStore(dmCombat.subscribe, dmCombat.getSnapshot);
}

export function usePlayerCombat(): PlayerCombatState {
  return useSyncExternalStore(playerCombat.subscribe, playerCombat.getSnapshot);
}

function pcCombatant(p: Character) {
  return {
    name: p.name,
    kind: "pc",
    ac: p.ac,
    hp: p.hp,
    maxHp: p.maxHp,
    tempHp: p.tempHp ?? 0,
    initiativeBonus: p.initiativeBonus,
    ref: p.id,
  };
}

/** Start combat with the whole party in the tracker; players type their own
 * initiative from their phones, monsters get added (and auto-rolled) ad hoc. */
export function startCombatWithParty(party: Character[]): void {
  dmCombat.send("start_combat", { combatants: party.map(pcCombatant) });
}

/** Start combat from the armed session's prep: party + prepped monsters.
 * Monster stats come from the content store; the server rolls initiative
 * and auto-numbers duplicates. */
export async function startPreppedCombat(
  party: Character[],
  monsters: { ref: string; name: string; count: number }[],
): Promise<void> {
  const { fetchContentEntry } = await import("./content");
  const combatants: Record<string, unknown>[] = party.map(pcCombatant);
  for (const m of monsters) {
    try {
      const full = await fetchContentEntry<{
        name: string;
        ac: number;
        hp: number;
        initiativeBonus: number;
        id: string;
      }>("monster", m.ref);
      for (let i = 0; i < m.count; i++) {
        combatants.push({
          name: full.name,
          kind: "monster",
          ac: full.ac,
          hp: full.hp,
          maxHp: full.hp,
          initiativeBonus: full.initiativeBonus,
          ref: full.id,
        });
      }
    } catch {
      // prepped monster no longer resolvable (homebrew removed etc.) — skip it
    }
  }
  dmCombat.send("start_combat", { combatants });
}
