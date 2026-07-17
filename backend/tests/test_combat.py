from grimoire.combat import CombatEngine, CombatError

import pytest


PARTY = [
    {"name": "Ilyana", "kind": "pc", "ac": 14, "hp": 46, "maxHp": 52, "initiativeBonus": 2},
    {"name": "Kaervek", "kind": "pc", "ac": 20, "hp": 68, "maxHp": 72, "initiativeBonus": 0},
]
GOBLIN = {"name": "Goblin", "ref": "m-goblin", "ac": 15, "hp": 7, "maxHp": 7, "initiativeBonus": 2}


def started() -> CombatEngine:
    e = CombatEngine()
    e.apply("start_combat", {"combatants": PARTY}, "dm")
    return e


def cid(e: CombatEngine, name: str) -> str:
    return next(c.id for c in e.state.combatants if c.name.startswith(name))


def test_start_and_end_combat():
    e = started()
    assert e.state.active and len(e.state.combatants) == 2
    e.apply("end_combat", {}, "dm")
    assert not e.state.active and e.state.combatants == []


def test_monster_autonumbering_and_initiative_roll():
    e = started()
    e.apply("add_monster", {"monster": GOBLIN}, "dm")
    e.apply("add_monster", {"monster": GOBLIN}, "dm")
    names = sorted(c.name for c in e.state.combatants if c.kind == "monster")
    assert names == ["Goblin 1", "Goblin 2"]
    assert all(c.initiative >= 3 for c in e.state.combatants if c.kind == "monster")
    # removing one collapses numbering back to the base name
    e.apply("remove_combatant", {"id": cid(e, "Goblin 1")}, "dm")
    names = [c.name for c in e.state.combatants if c.kind == "monster"]
    assert names == ["Goblin"]


def test_hp_delta_temp_absorbs_and_concentration_dc():
    e = started()
    ilyana = cid(e, "Ilyana")
    e.apply("set_concentration", {"id": ilyana, "spell": "Hex"}, "player")
    e.apply("set_temp_hp", {"id": ilyana, "value": 5}, "player")
    e.apply("apply_hp_delta", {"id": ilyana, "delta": -12}, "dm")
    c = e.state.combatants[0]
    assert c.temp_hp == 0
    assert c.hp == 46 - 7
    assert c.concentration_save_dc == 10  # max(10, 12 // 2)
    e.apply("apply_hp_delta", {"id": ilyana, "delta": -30}, "dm")
    assert e.state.combatants[0].concentration_save_dc == 15
    e.apply("break_concentration", {"id": ilyana}, "dm")
    assert e.state.combatants[0].concentrating is None
    assert e.state.combatants[0].concentration_save_dc is None


def test_heal_caps_at_max_and_no_conc_dc():
    e = started()
    ilyana = cid(e, "Ilyana")
    e.apply("apply_hp_delta", {"id": ilyana, "delta": +99}, "player")
    assert e.state.combatants[0].hp == 52
    assert e.state.combatants[0].concentration_save_dc is None


def test_turn_order_and_round_advance():
    e = started()
    e.apply("set_initiative", {"id": cid(e, "Ilyana"), "value": 18}, "player")
    e.apply("set_initiative", {"id": cid(e, "Kaervek"), "value": 5}, "player")
    order = [c.name for c in e.sorted_combatants()]
    assert order == ["Ilyana", "Kaervek"]
    e.apply("next_turn", {}, "dm")  # from implicit first -> Kaervek
    assert e.state.turn_id == cid(e, "Kaervek")
    e.apply("next_turn", {}, "dm")  # wraps -> round 2
    assert e.state.turn_id == cid(e, "Ilyana")
    assert e.state.round == 2


def test_player_permissions():
    e = started()
    e.apply("add_monster", {"monster": GOBLIN}, "dm")
    gob = cid(e, "Goblin")
    with pytest.raises(CombatError):
        e.apply("apply_hp_delta", {"id": gob, "delta": -3}, "player")
    with pytest.raises(CombatError):
        e.apply("next_turn", {}, "player")
    with pytest.raises(CombatError):
        e.apply("set_visibility", {"id": gob, "visible": False}, "player")


def test_player_projection_hides_monster_numbers_and_hidden_rows():
    e = started()
    e.apply("add_monster", {"monster": GOBLIN}, "dm")
    e.apply("add_monster", {"monster": {**GOBLIN, "name": "Ambusher", "ref": "m-amb"}}, "dm")
    amb = cid(e, "Ambusher")
    e.apply("set_visibility", {"id": amb, "visible": False}, "dm")
    e.apply("apply_hp_delta", {"id": cid(e, "Goblin"), "delta": -4}, "dm")

    view = e.player_view()
    names = [r["name"] for r in view["combatants"]]
    assert "Ambusher" not in names
    gob_row = next(r for r in view["combatants"] if r["name"] == "Goblin")
    assert "hp" not in gob_row and "ac" not in gob_row
    assert gob_row["status"] == "Bloodied"
    pc_row = next(r for r in view["combatants"] if r["name"] == "Ilyana")
    assert pc_row["hp"] == 46 and pc_row["ac"] == 14

    # reveal live
    e.apply("set_visibility", {"id": amb, "visible": True}, "dm")
    assert "Ambusher" in [r["name"] for r in e.player_view()["combatants"]]


def test_effects_add_remove():
    e = started()
    ilyana = cid(e, "Ilyana")
    e.apply("add_effect", {"id": ilyana, "effect": {"label": "Blessed", "duration": "1 min", "kind": "spell"}}, "player")
    assert e.state.combatants[0].effects[0].label == "Blessed"
    eid = e.state.combatants[0].effects[0].id
    e.apply("remove_effect", {"id": ilyana, "effectId": eid}, "player")
    assert e.state.combatants[0].effects == []
