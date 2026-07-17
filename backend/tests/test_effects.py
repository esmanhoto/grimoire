from grimoire.combat import CombatEngine

PARTY = [
    {"name": "Ilyana", "kind": "pc", "ac": 14, "hp": 46, "maxHp": 52, "initiativeBonus": 2},
    {"name": "Kaervek", "kind": "pc", "ac": 20, "hp": 68, "maxHp": 72, "initiativeBonus": 0},
]


def started() -> CombatEngine:
    e = CombatEngine()
    e.apply("start_combat", {"combatants": PARTY}, "dm")
    e.apply("set_initiative", {"id": cid(e, "Ilyana"), "value": 20}, "dm")
    e.apply("set_initiative", {"id": cid(e, "Kaervek"), "value": 10}, "dm")
    return e


def cid(e: CombatEngine, name: str) -> str:
    return next(c.id for c in e.state.combatants if c.name.startswith(name))


def effects(e: CombatEngine, name: str):
    return next(c for c in e.state.combatants if c.name.startswith(name)).effects


def test_rounds_effect_ticks_at_end_of_targets_turn():
    e = started()
    ilyana = cid(e, "Ilyana")
    e.apply("add_effect", {"id": ilyana, "effect": {"label": "Stunned", "kind": "condition", "durationType": "rounds", "rounds": 1}}, "dm")
    # Ilyana acts first; ending her turn expires the 1-round effect
    e.apply("next_turn", {}, "dm")
    assert effects(e, "Ilyana") == []


def test_rounds_effect_survives_other_turns():
    e = started()
    kaervek = cid(e, "Kaervek")
    e.apply("add_effect", {"id": kaervek, "effect": {"label": "Bane", "kind": "spell", "durationType": "rounds", "rounds": 2}}, "dm")
    e.apply("next_turn", {}, "dm")  # end of Ilyana's turn — Kaervek's effect untouched
    assert effects(e, "Kaervek")[0].rounds == 2
    e.apply("next_turn", {}, "dm")  # end of Kaervek's turn — ticks to 1
    assert effects(e, "Kaervek")[0].rounds == 1
    e.apply("next_turn", {}, "dm")
    e.apply("next_turn", {}, "dm")  # second Kaervek end — expires
    assert effects(e, "Kaervek") == []


def test_save_ends_prompts_and_resolves():
    e = started()
    ilyana = cid(e, "Ilyana")
    e.apply("add_effect", {"id": ilyana, "effect": {"label": "Poisoned", "kind": "condition", "durationType": "save-ends", "save": "CON 13"}}, "dm")
    e.apply("next_turn", {}, "dm")
    eff = effects(e, "Ilyana")[0]
    assert eff.pending_save is True
    # failed: lingers, prompt cleared until next round
    e.apply("resolve_save", {"id": ilyana, "effectId": eff.id, "passed": False}, "dm")
    assert effects(e, "Ilyana")[0].pending_save is False
    # passed: gone
    e.apply("next_turn", {}, "dm")
    e.apply("next_turn", {}, "dm")
    eff = effects(e, "Ilyana")[0]
    assert eff.pending_save is True
    e.apply("resolve_save", {"id": ilyana, "effectId": eff.id, "passed": True}, "dm")
    assert effects(e, "Ilyana") == []


def test_next_attack_consumed_by_hand():
    e = started()
    ilyana = cid(e, "Ilyana")
    e.apply("add_effect", {"id": ilyana, "effect": {"label": "Guiding Bolt", "kind": "spell", "durationType": "next-attack"}}, "player")
    e.apply("next_turn", {}, "dm")  # one-shots never expire on their own
    eff = effects(e, "Ilyana")[0]
    e.apply("consume_effect", {"id": ilyana, "effectId": eff.id}, "player")
    assert effects(e, "Ilyana") == []


def test_concentration_links_and_breaks():
    e = started()
    ilyana, kaervek = cid(e, "Ilyana"), cid(e, "Kaervek")
    e.apply("set_concentration", {"id": kaervek, "spell": "Bless"}, "player")
    # applying a Bless effect auto-links to the concentrating caster
    e.apply("add_effect", {"id": ilyana, "effect": {"label": "Bless", "kind": "spell", "durationType": "concentration"}}, "dm")
    assert effects(e, "Ilyana")[0].source_id == kaervek
    e.apply("break_concentration", {"id": kaervek}, "dm")
    assert effects(e, "Ilyana") == []


def test_new_concentration_drops_previous_spells_effects():
    e = started()
    ilyana, kaervek = cid(e, "Ilyana"), cid(e, "Kaervek")
    e.apply("set_concentration", {"id": kaervek, "spell": "Bless"}, "player")
    e.apply("add_effect", {"id": ilyana, "effect": {"label": "Bless", "kind": "spell", "durationType": "concentration"}}, "dm")
    e.apply("set_concentration", {"id": kaervek, "spell": "Hold Person"}, "player")
    assert effects(e, "Ilyana") == []
