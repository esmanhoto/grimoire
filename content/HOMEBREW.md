# Homebrew & non-SRD content

`content/homebrew/` is loaded at startup exactly like `content/srd/` — same
filenames, same schemas, no second-class treatment — but it is **gitignored
and never committed**. This is where content from books you own but that
isn't in the SRD belongs (2024 PHB subclasses and spells, Monster Manual
stat blocks, DMG magic items, adventure-specific monsters…), transcribed by
you for your own table.

Files (all optional, each a JSON array):

| file | shows up as |
|---|---|
| `spells.json` | Spells |
| `monsters.json` | Monsters (tracker-ready) |
| `magic-items.json` | Magic Items |
| `equipment.json` | Equipment |
| `features.json` | Features (class/subclass/species/background/feat) |
| `rules.json` | Rules |

Every entry needs a unique `id` with the right prefix (`spell-`, `monster-`,
`item-`, `gear-`, `feature-`, `rule-`). If a homebrew id matches an SRD id,
the homebrew entry **replaces** the SRD one — handy for house-ruled versions.
Restart the backend after editing files.

## Schemas by example

`spells.json`:

```json
[
  {
    "id": "spell-my-homebrew-bolt",
    "name": "My Homebrew Bolt",
    "level": 2,
    "school": "Evocation",
    "classes": ["Sorcerer", "Wizard"],
    "castingTime": "Action",
    "range": "90 feet",
    "components": "V, S",
    "duration": "Instantaneous",
    "concentration": false,
    "body": "Markdown rules text.\n\n_Using a Higher-Level Spell Slot._ …"
  }
]
```

`monsters.json` (numbers feed the combat tracker; `body` is markdown —
use `#### Actions` / `#### Bonus Actions` / `#### Reactions` headings):

```json
[
  {
    "id": "monster-example-lurker",
    "name": "Example Lurker",
    "size": "Medium",
    "type": "Medium Aberration",
    "alignment": "Neutral Evil",
    "ac": 15,
    "initiativeBonus": 3,
    "hp": 45,
    "hpRoll": "6d8+18",
    "speed": "30 ft.",
    "abilities": {"str": 14, "dex": 16, "con": 16, "int": 10, "wis": 12, "cha": 8},
    "saves": {"str": 2, "dex": 3, "con": 3, "int": 0, "wis": 1, "cha": -1},
    "cr": "2",
    "xp": 450,
    "pb": 2,
    "passivePerception": 13,
    "body": "Trait paragraphs here.\n\n#### Actions\n\n**_Claw._** _Melee Attack Roll:_ +5, reach 5 ft. _Hit:_ 10 (2d6 + 3) Slashing damage."
  }
]
```

Optional `"image": "images/monsters/example-lurker.jpg"` (a path under
`content/homebrew/`; the file must live in `content/homebrew/images/`)
shows the creature's art on its stat card.

`magic-items.json`:

```json
[{"id": "item-example-blade", "name": "Example Blade", "itemType": "Weapon", "rarity": "Rare (Requires Attunement)", "body": "Markdown description."}]
```

`equipment.json`:

```json
[{"id": "gear-example-tool", "name": "Example Tool", "category": "Adventuring Gear", "body": "**Cost:** 5 gp · 2 lb.\n\nWhat it does."}]
```

`features.json` (`source` groups it on character sheets — one of `class`,
`subclass`, `species`, `background`, `feat`; `origin` is the display line):

```json
[{"id": "feature-example-subclass-gift", "name": "Example Gift", "source": "subclass", "origin": "Path of Examples", "level": 3, "body": "Markdown rules text."}]
```

`rules.json`:

```json
[{"id": "rule-example-ruling", "name": "Example Ruling", "tag": "House Rule", "body": "Markdown text."}]
```

## Copyright note

Keep transcriptions of published books local — that's the entire reason
this folder is gitignored. Only share content you have the right to share.
