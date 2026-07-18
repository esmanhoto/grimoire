"""Server-authoritative combat state.

The engine holds the single source of truth for live combat. Clients (the DM
dashboard and player phones) send small action messages over the WebSocket;
every accepted action mutates the state here and the new state is broadcast
back out. Players get a projected view: hidden monsters are omitted and
visible monsters show only a Healthy/Bloodied/Down status, never numbers.
"""

from __future__ import annotations

import random
import string
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


DurationType = Literal[
    "indefinite",     # until removed by hand
    "rounds",         # ticks down at the END of the target's turn; 1 = until end of next turn
    "save-ends",      # at the end of the target's turn, prompt a repeat save (non-blocking)
    "next-attack",    # one-shot: consumed by hand when it triggers
    "concentration",  # tied to a caster; drops when their concentration breaks
]


class Effect(CamelModel):
    id: str
    label: str
    kind: Literal["condition", "spell", "custom"] = "custom"
    duration_type: DurationType = "indefinite"
    rounds: int = 0
    save: str = ""  # display text for save-ends, e.g. "CON 14"
    reminder: str = ""
    source_id: Optional[str] = None  # concentrating caster for concentration-linked effects
    pending_save: bool = False


class Concentration(CamelModel):
    spell: str
    dc: Optional[int] = None


class Combatant(CamelModel):
    id: str
    name: str
    kind: Literal["pc", "monster"]
    initiative: int = 0
    initiative_bonus: int = 0
    ac: int = 10
    hp: int = 1
    max_hp: int = 1
    temp_hp: int = 0
    effects: list[Effect] = Field(default_factory=list)
    concentrating: Optional[Concentration] = None
    concentration_save_dc: Optional[int] = None
    visible_to_players: bool = True
    ref: Optional[str] = None


class CombatState(CamelModel):
    active: bool = False
    round: int = 1
    turn_id: Optional[str] = None
    combatants: list[Combatant] = Field(default_factory=list)


def _new_id(prefix: str = "c") -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"{prefix}-{suffix}"


def _sort_key(c: Combatant) -> tuple:
    # Mirrored in frontend/src/lib/combat-store.ts (sortCombatants) — keep in sync.
    return (-c.initiative, -c.initiative_bonus, c.name, c.id)


def status_from_hp(hp: int, max_hp: int) -> str:
    if hp <= 0:
        return "Down"
    if hp <= max_hp / 2:
        return "Bloodied"
    return "Healthy"


class CombatError(ValueError):
    pass


# Ops a player device may send, and only against a PC. Everything else is DM-only.
PLAYER_OPS = {
    "set_initiative",
    "apply_hp_delta",
    "set_temp_hp",
    "set_ac",
    "add_effect",
    "remove_effect",
    "consume_effect",
    "set_concentration",
    "clear_concentration_reminder",
}

DM_OPS = PLAYER_OPS | {
    "start_combat",
    "end_combat",
    "next_turn",
    "prev_turn",
    "add_monster",
    "remove_combatant",
    "set_visibility",
    "break_concentration",
    "resolve_save",
}


class CombatEngine:
    def __init__(self) -> None:
        self.state = CombatState()

    # -- queries ------------------------------------------------------------

    def sorted_combatants(self) -> list[Combatant]:
        return sorted(self.state.combatants, key=_sort_key)

    def full_view(self) -> dict[str, Any]:
        return self.state.model_dump(by_alias=True)

    def player_view(self) -> dict[str, Any]:
        """Projection for player devices: hidden monsters omitted, visible
        monsters status-only, PCs with their own numbers."""
        rows: list[dict[str, Any]] = []
        for c in self.sorted_combatants():
            if c.kind == "monster" and not c.visible_to_players:
                continue
            row: dict[str, Any] = {
                "id": c.id,
                "name": c.name,
                "kind": c.kind,
                "initiative": c.initiative,
                "effects": [e.model_dump(by_alias=True) for e in c.effects],
            }
            if c.kind == "pc":
                row.update(
                    ac=c.ac,
                    hp=c.hp,
                    maxHp=c.max_hp,
                    tempHp=c.temp_hp,
                    concentrating=c.concentrating is not None,
                    concentrationSaveDc=c.concentration_save_dc,
                )
            else:
                row["status"] = status_from_hp(c.hp, c.max_hp)
            rows.append(row)
        return {
            "active": self.state.active,
            "round": self.state.round,
            "turnId": self.state.turn_id,
            "combatants": rows,
        }

    # -- mutations ----------------------------------------------------------

    def apply(self, op: str, payload: dict[str, Any], role: str) -> None:
        allowed = DM_OPS if role == "dm" else PLAYER_OPS
        if op not in allowed:
            raise CombatError(f"op '{op}' not allowed for role '{role}'")
        handler = getattr(self, f"_op_{op}", None)
        if handler is None:
            raise CombatError(f"unknown op '{op}'")
        handler(payload, role)

    def _get(self, payload: dict[str, Any], role: str) -> Combatant:
        cid = payload.get("id")
        for c in self.state.combatants:
            if c.id == cid:
                if role == "player" and c.kind != "pc":
                    raise CombatError("players can only edit player characters")
                return c
        raise CombatError(f"no combatant '{cid}'")

    def _op_start_combat(self, payload: dict[str, Any], role: str) -> None:
        combatants: list[Combatant] = []
        for raw in payload.get("combatants", []):
            c = Combatant.model_validate({"id": _new_id(), **raw})
            if "id" in raw:
                c.id = raw["id"]
            if raw.get("initiative") is None and c.kind == "monster":
                c.initiative = random.randint(1, 20) + c.initiative_bonus
            combatants.append(c)
        self.state = CombatState(active=True, round=1, turn_id=None, combatants=combatants)
        self._renumber_all()

    def _op_end_combat(self, payload: dict[str, Any], role: str) -> None:
        self.state = CombatState()

    def _op_next_turn(self, payload: dict[str, Any], role: str) -> None:
        order = self.sorted_combatants()
        if not order:
            return
        ids = [c.id for c in order]
        current = self.state.turn_id if self.state.turn_id in ids else ids[0]
        self._end_of_turn_tick(current)
        idx = (ids.index(current) + 1) % len(ids)
        if idx == 0:
            self.state.round += 1
        self.state.turn_id = ids[idx]

    def _end_of_turn_tick(self, combatant_id: str) -> None:
        """Effects on the creature whose turn just ended: round durations tick
        down and expire; save-ends effects raise their non-blocking prompt."""
        c = next((x for x in self.state.combatants if x.id == combatant_id), None)
        if c is None:
            return
        kept: list[Effect] = []
        for e in c.effects:
            if e.duration_type == "rounds":
                e.rounds -= 1
                if e.rounds <= 0:
                    continue  # expired
            elif e.duration_type == "save-ends":
                e.pending_save = True
            kept.append(e)
        c.effects = kept

    def _op_prev_turn(self, payload: dict[str, Any], role: str) -> None:
        order = self.sorted_combatants()
        if not order:
            return
        ids = [c.id for c in order]
        current = self.state.turn_id if self.state.turn_id in ids else ids[0]
        i = ids.index(current)
        if i == 0 and self.state.round > 1:
            self.state.round -= 1
        self.state.turn_id = ids[(i - 1) % len(ids)]

    def _op_add_monster(self, payload: dict[str, Any], role: str) -> None:
        m = payload.get("monster", {})
        c = Combatant.model_validate({"id": _new_id(), "kind": "monster", **m})
        if m.get("initiative") is None:
            c.initiative = random.randint(1, 20) + c.initiative_bonus
        self.state.combatants.append(c)
        self._renumber_all()

    def _op_remove_combatant(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        self.state.combatants.remove(c)
        if self.state.turn_id == c.id:
            self.state.turn_id = None
        self._renumber_all()

    def _op_set_visibility(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        if c.kind == "pc":
            raise CombatError("PCs are always visible")
        c.visible_to_players = bool(payload.get("visible", True))

    def _op_set_initiative(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        c.initiative = int(payload.get("value", 0))

    def _op_set_ac(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        c.ac = max(0, int(payload.get("value", 0)))

    def _op_set_temp_hp(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        c.temp_hp = max(0, int(payload.get("value", 0)))

    def _op_apply_hp_delta(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        delta = int(payload.get("delta", 0))
        if delta < 0:
            dmg = -delta
            absorbed = min(c.temp_hp, dmg)
            c.temp_hp -= absorbed
            c.hp = max(0, c.hp - (dmg - absorbed))
            if c.concentrating is not None:
                # Non-blocking reminder: DC = max(10, floor(damage/2)).
                c.concentration_save_dc = max(10, dmg // 2)
        else:
            c.hp = min(c.max_hp, c.hp + delta)

    def _op_add_effect(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        e = payload.get("effect", {})
        effect = Effect.model_validate({"id": _new_id("e"), **{k: v for k, v in e.items() if k != "id"}})
        if effect.duration_type == "concentration" and effect.source_id is None:
            # link to whoever is concentrating on a spell of this name, if anyone
            caster = next(
                (x for x in self.state.combatants
                 if x.concentrating and x.concentrating.spell.lower() == effect.label.lower()),
                None,
            )
            effect.source_id = caster.id if caster else None
        c.effects.append(effect)

    def _op_remove_effect(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        eid = payload.get("effectId")
        c.effects = [e for e in c.effects if e.id != eid]

    def _op_consume_effect(self, payload: dict[str, Any], role: str) -> None:
        """A one-shot (on-next-attack) effect triggered — remove it."""
        self._op_remove_effect(payload, role)

    def _op_resolve_save(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        eid = payload.get("effectId")
        passed = bool(payload.get("passed"))
        if passed:
            c.effects = [e for e in c.effects if e.id != eid]
        else:
            for e in c.effects:
                if e.id == eid:
                    e.pending_save = False  # failed — it lingers; prompt again next round

    def _drop_linked_effects(self, caster_id: str) -> None:
        for c in self.state.combatants:
            c.effects = [
                e for e in c.effects
                if not (e.duration_type == "concentration" and e.source_id == caster_id)
            ]

    def _op_set_concentration(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        spell = payload.get("spell")
        if c.concentrating is not None:
            # starting a new concentration (or clearing) drops the old spell's effects
            self._drop_linked_effects(c.id)
        if spell is None:
            c.concentrating = None
            c.concentration_save_dc = None
        else:
            c.concentrating = Concentration(spell=str(spell))
            c.concentration_save_dc = None

    def _op_clear_concentration_reminder(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        c.concentration_save_dc = None

    def _op_break_concentration(self, payload: dict[str, Any], role: str) -> None:
        c = self._get(payload, role)
        c.concentrating = None
        c.concentration_save_dc = None
        self._drop_linked_effects(c.id)

    def _renumber_all(self) -> None:
        """Auto-number duplicate monsters that share a stat-block ref (Goblin 1, Goblin 2)."""
        groups: dict[str, list[Combatant]] = {}
        for c in self.state.combatants:
            if c.kind == "monster" and c.ref:
                groups.setdefault(c.ref, []).append(c)
        for group in groups.values():
            base = _base_name(group[0].name)
            if len(group) == 1:
                group[0].name = base
            else:
                for i, c in enumerate(group, start=1):
                    c.name = f"{base} {i}"


def _base_name(name: str) -> str:
    parts = name.rsplit(" ", 1)
    if len(parts) == 2 and parts[1].isdigit():
        return parts[0]
    return name
