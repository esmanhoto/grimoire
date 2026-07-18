"""First-run sample campaign.

If the campaign directory doesn't exist yet, write a small sample campaign
(the Havenmoor arc the UI prototype shipped with) so the app works out of
the box. Never touches an existing campaign directory.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .campaign import CampaignStore


def _pc(
    name: str,
    player: str,
    klass: str,
    race: str,
    color: str,
    stats: dict[str, Any],
    body: str,
) -> tuple[str, str, dict[str, Any], str]:
    fields = {"player": player, "class": klass, "race": race, "level": 7, "color": color, **stats}
    return ("pc", name, fields, body)


SAMPLE: list[tuple[str, str, dict[str, Any], str]] = [
    # -- party ---------------------------------------------------------------
    _pc(
        "Ilyana Duskweaver", "Sam", "Warlock", "Half-Elf", "purple",
        {
            "ac": 14, "hp": 46, "maxHp": 52, "speed": 30, "initiativeBonus": 2,
            "passivePerception": 13, "passiveInsight": 15,
            "abilities": {"str": 8, "dex": 14, "con": 14, "int": 12, "wis": 12, "cha": 18},
            "saves": ["Wisdom", "Charisma"],
            "skills": [
                {"name": "Arcana", "mod": 4}, {"name": "Deception", "mod": 7},
                {"name": "Persuasion", "mod": 7}, {"name": "Insight", "mod": 5},
            ],
            "spells": [
                {"name": "Eldritch Blast", "level": 0}, {"name": "Minor Illusion", "level": 0},
                {"name": "Prestidigitation", "level": 0}, {"name": "Hex", "level": 1},
                {"name": "Charm Person", "level": 1}, {"name": "Misty Step", "level": 2},
                {"name": "Darkness", "level": 2}, {"name": "Counterspell", "level": 3},
                {"name": "Fear", "level": 3}, {"name": "Banishment", "level": 4},
                {"name": "Dimension Door", "level": 4},
            ],
            "features": [{"name": "Pact of the Tome", "source": "class"}, {"name": "Agonizing Blast", "source": "class"}, {"name": "Devil's Sight", "source": "class"}],
            "inventory": ["Grimoire of the Pale Court", "Silvered Dagger", "Potion of Healing ×2", "Focus: Obsidian Idol"],
        },
        "Her patron is the sworn rival of [[The Hollow King]] — and knows it.",
    ),
    _pc(
        "Kaervek Thornhold", "Jordan", "Paladin", "Dwarf", "gold",
        {
            "ac": 20, "hp": 68, "maxHp": 72, "speed": 25, "initiativeBonus": 0,
            "passivePerception": 12, "passiveInsight": 14,
            "abilities": {"str": 18, "dex": 10, "con": 16, "int": 10, "wis": 12, "cha": 16},
            "saves": ["Wisdom", "Charisma"],
            "skills": [
                {"name": "Athletics", "mod": 7}, {"name": "Religion", "mod": 3},
                {"name": "Intimidation", "mod": 6},
            ],
            "spells": [
                {"name": "Bless", "level": 1}, {"name": "Cure Wounds", "level": 1},
                {"name": "Aid", "level": 2}, {"name": "Daylight", "level": 3},
            ],
            "features": [{"name": "Divine Smite", "source": "class"}, {"name": "Aura of Protection", "source": "class"}, {"name": "Lay on Hands (35 HP)", "source": "class"}],
            "inventory": ["Plate Armor", "Warhammer +1", "Shield of the Dawnwatch", "Holy Symbol"],
        },
        "Sworn to [[The Dawnwatch]]. [[The Hollow King]] is his great-uncle, presumed dead in the last war.",
    ),
    _pc(
        "Sable Vex", "Riley", "Rogue", "Tiefling", "emerald",
        {
            "ac": 16, "hp": 42, "maxHp": 47, "speed": 30, "initiativeBonus": 4,
            "passivePerception": 17, "passiveInsight": 13,
            "abilities": {"str": 10, "dex": 18, "con": 14, "int": 12, "wis": 12, "cha": 14},
            "saves": ["Dexterity", "Intelligence"],
            "skills": [
                {"name": "Stealth", "mod": 9}, {"name": "Sleight of Hand", "mod": 7},
                {"name": "Perception", "mod": 7}, {"name": "Acrobatics", "mod": 7},
            ],
            "spells": [],
            "features": [{"name": "Sneak Attack (4d6)", "source": "class"}, {"name": "Cunning Action", "source": "class"}, {"name": "Uncanny Dodge", "source": "class"}, {"name": "Assassinate", "source": "class"}],
            "inventory": ["Shortsword +1", "Hand Crossbow", "Thieves' Tools", "Poisoner's Kit"],
        },
        "Her contact 'The Widow' in [[The Undermarket]] is a Shadow wearing her old face.",
    ),
    _pc(
        "Brannoc Emberfell", "Alex", "Wizard", "Human", "ember",
        {
            "ac": 12, "hp": 38, "maxHp": 44, "speed": 30, "initiativeBonus": 2,
            "passivePerception": 11, "passiveInsight": 14,
            "abilities": {"str": 8, "dex": 14, "con": 14, "int": 18, "wis": 12, "cha": 10},
            "saves": ["Intelligence", "Wisdom"],
            "skills": [
                {"name": "Arcana", "mod": 7}, {"name": "History", "mod": 7},
                {"name": "Investigation", "mod": 7},
            ],
            "spells": [
                {"name": "Fire Bolt", "level": 0}, {"name": "Ray of Frost", "level": 0},
                {"name": "Light", "level": 0}, {"name": "Mage Hand", "level": 0},
                {"name": "Prestidigitation", "level": 0}, {"name": "Mage Armor", "level": 1},
                {"name": "Magic Missile", "level": 1}, {"name": "Shield", "level": 1},
                {"name": "Detect Magic", "level": 1}, {"name": "Identify", "level": 1},
                {"name": "Misty Step", "level": 2}, {"name": "Mirror Image", "level": 2},
                {"name": "Scorching Ray", "level": 2}, {"name": "Fireball", "level": 3},
                {"name": "Counterspell", "level": 3}, {"name": "Dispel Magic", "level": 3},
                {"name": "Fly", "level": 3}, {"name": "Wall of Fire", "level": 4},
                {"name": "Greater Invisibility", "level": 4},
            ],
            "features": [{"name": "Arcane Recovery", "source": "class"}, {"name": "Evocation Savant", "source": "class"}, {"name": "Sculpt Spells", "source": "class"}],
            "inventory": ["Spellbook", "Component Pouch", "Wand of Magic Missiles", "Robe of the Ember Weave"],
        },
        "Keeps meticulous notes on the black sap of [[The Weeping Wood]].",
    ),
    # -- NPCs ----------------------------------------------------------------
    ("npc", "Mara Ashfield", {"role": "Innkeep, The Salted Crow", "location": "Havenmoor"},
     "Widow of a sailor. Knows every rumor on the coast, tells none for free.\n\nRuns the Salted Crow in [[Havenmoor]]. She buried the previous adventuring party — and admitted it."),
    ("npc", "Brother Isen", {"role": "Cleric of the Dawnwatch", "location": "Havenmoor Chapel"},
     "Kind, gouty, and terrified of the crypt beneath his own church.\n\nMember of [[The Dawnwatch]]. His chapel in [[Havenmoor]] is built over the antechamber of [[The Pale Court]]."),
    ("npc", "Vex Corvo", {"role": "Fence & Rumor Broker", "location": "The Undermarket"},
     "One eye, three names. Sells locations of things that shouldn't exist.\n\nOperates out of [[The Undermarket]]. Already sold the party's names to the cult of [[The Pale Court]]."),
    ("npc", "Lady Serine Vale", {"role": "Magistrate", "location": "Havenmoor Keep"},
     "Politely corrupt. Would rather negotiate than swing a sword.\n\nHolds court in [[Havenmoor]]. The party returned her stolen seal — for a price."),
    ("npc", "The Hollow King", {"role": "Antagonist", "location": "The Pale Court"},
     "Was once a hero. Now a hunger with a crown.\n\nVhaelor rules [[The Pale Court]] beneath [[The Weeping Wood]]. Crowned in tarnished silver; his laughter freezes the marrow. Kin to [[Kaervek Thornhold]]."),
    # -- locations -----------------------------------------------------------
    ("location", "Havenmoor", {"region": "The Sundered Coast"},
     "A salt-stained fishing town clinging to a cliff. Half its people are hiding from someone.\n\nHome of [[Mara Ashfield]], [[Brother Isen]], and [[Lady Serine Vale]]."),
    ("location", "The Weeping Wood", {"region": "Northern Havenmoor"},
     "A forest where the trees drip with black sap. Compasses spin. Animals stopped coming here.\n\n[[The Pale Court]] lies beneath its roots."),
    ("location", "The Pale Court", {"region": "Beneath the Weeping Wood"},
     "An underground palace of bleached bone and blue flame. The throne room of [[The Hollow King]]."),
    ("location", "The Undermarket", {"region": "Havenmoor cellars"},
     "A weekly black market held in a collapsed cathedral. Coin is welcome; questions are not.\n\nRun in practice by [[Vex Corvo]]."),
    # -- factions ------------------------------------------------------------
    ("faction", "The Dawnwatch", {"alignment": "Order · Faith"},
     "A militant order of clerics sworn to keep the dead in their graves.\n\n[[Brother Isen]] serves here; [[Kaervek Thornhold]] carries their shield."),
    ("faction", "The Pale Court", {"alignment": "Chaos · Undeath"},
     "[[The Hollow King]] and his court of bleached-bone nobility."),
    ("faction", "The Undermarket Guild", {"alignment": "Neutral · Coin"},
     "Thieves who prefer contracts to knives, but keep the knives close.\n\nFronted by [[Vex Corvo]] in [[The Undermarket]]."),
    # -- quests --------------------------------------------------------------
    ("quest", "The Salted Crow's Ledger", {"status": "Active"},
     "Recover [[Mara Ashfield]]'s missing account book from [[Vex Corvo]]."),
    ("quest", "Silence the Bells", {"status": "Active"},
     "Something rings the chapel bells at night. [[Brother Isen]] begs for help."),
    ("quest", "The Hollow Crown", {"status": "Main Arc"},
     "End [[The Hollow King]] before his court walks the surface at midwinter."),
    ("quest", "A Debt Repaid", {"status": "Complete"},
     "The party returned [[Lady Serine Vale]]'s stolen seal — for a price."),
    # -- prep: next session, armed ------------------------------------------
    ("session", "Session 13 - Into the Pale Court", {
        "status": "armed",
        "date": "2026-07-18",
        "strongStart": "A dying courier collapses at the tavern door, clutching Kaervek's family sigil.",
        "reviewNotes": "Ilyana wants leverage over her patron. Kaervek chases family ghosts. Sable owes Vex a death. Brannoc wants a sample of the black sap.",
        "scenes": [
            {"id": "sc-1", "text": "The corpse on the beach — a body washes up wearing the Hollow King's sigil", "done": False},
            {"id": "sc-2", "text": "Ambush at Blackfen Bridge — cultists spring from the reeds", "done": False},
            {"id": "sc-3", "text": "The Innkeep's confession — Mara reveals she buried the previous party", "done": False},
            {"id": "sc-4", "text": "The throne of bone — Vhaelor waits, patient and amused", "done": False},
        ],
        "secrets": [
            {"id": "sec-1", "text": "The Dawnwatch chapel is built over the Pale Court's antechamber.", "revealed": False},
            {"id": "sec-2", "text": "Vex Corvo already sold the party's names to the cult.", "revealed": False},
            {"id": "sec-3", "text": "The Hollow King is Kaervek's great-uncle, presumed dead in the last war.", "revealed": False},
            {"id": "sec-4", "text": "Ilyana's patron IS the Hollow King's rival — and knows it.", "revealed": False},
            {"id": "sec-5", "text": "One villager per night vanishes; no one in town remembers them.", "revealed": False},
            {"id": "sec-6", "text": "Sable's contact 'The Widow' is a Shadow wearing her old face.", "revealed": False},
        ],
        "npcs": ["Mara Ashfield", "Brother Isen", "Vex Corvo"],
        "locations": ["Havenmoor", "The Weeping Wood", "The Pale Court"],
        "monsters": [
            {"ref": "monster-goblin-warrior", "name": "Goblin Warrior", "count": 3},
            {"ref": "monster-hobgoblin-warrior", "name": "Hobgoblin Warrior", "count": 1},
        ],
        "treasure": [
            "Sepulchral Cameo — 250 gp, silver-set",
            "Scroll of Counterspell",
            "The Hollow Sigil — quest key",
        ],
        "notes": [],
    },
     "Prep bundle for the descent into [[The Pale Court]]."),
    # -- recaps --------------------------------------------------------------
    ("recap", "Session 12 - The Weeping Wood Opens", {"date": "2026-07-04", "session": 12},
     "The party found the sap-slick path into [[The Weeping Wood]] and heard the choir of [[The Pale Court]] beneath the roots."),
    ("recap", "Session 11 - Blood at the Undermarket", {"date": "2026-06-27", "session": 11},
     "[[Sable Vex]] killed the wrong fence. [[Vex Corvo]] is now hunting the party."),
    ("recap", "Session 10 - Brother Isen's Confession", {"date": "2026-06-20", "session": 10},
     "The foundation of the chapel in [[Havenmoor]] is not stone. It's teeth."),
]


def seed_if_missing(root: Path) -> bool:
    """Create the sample campaign if `root` doesn't exist. Returns True if seeded."""
    if root.exists():
        return False
    store = CampaignStore(root)
    for etype, name, fields, body in SAMPLE:
        store.create(etype, name, fields, body)
    (root / "README.md").write_text(
        "# Campaign\n\nThis folder is your campaign wiki - one Markdown file per entity,\n"
        "organized by type, cross-referenced with [[wikilinks]]. It was seeded with\n"
        "a sample campaign; edit or delete freely. It is also a valid Obsidian\n"
        "vault, and can be turned into a private git repo for backup.\n",
        encoding="utf-8",
    )
    return True
