"""Ingest the SRD 5.2.1 (D&D 2024 rules, CC-BY-4.0) into content/srd/*.json.

Source: https://github.com/downfallx/dnd-5e-srd-markdown — the SRD 5.2.1
converted to consistently-formatted Markdown. This script parses that
Markdown into the structured JSON the app serves. Re-run to refresh:

    uv run --project backend python scripts/ingest_srd.py

Both this script and its JSON output are committed; the network fetch only
happens when regenerating.
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

REPO_RAW = "https://raw.githubusercontent.com/downfallx/dnd-5e-srd-markdown/master"
FILES = ["spells.md", "monsters-A-Z.md", "animals.md", "magic-items.md", "rules-glossary.md"]

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "content" / "srd"
CACHE_DIR = ROOT / "content" / ".srd-cache"


def fetch(name: str) -> str:
    cached = CACHE_DIR / name
    if cached.exists():
        return cached.read_text(encoding="utf-8-sig")
    print(f"downloading {name}…")
    with urllib.request.urlopen(f"{REPO_RAW}/{name}") as r:
        text = r.read().decode("utf-8-sig")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cached.write_text(text, encoding="utf-8")
    return text


def slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def split_entries(text: str, heading: str) -> list[tuple[str, str]]:
    """Split on `heading` markdown headings; return (title, body) pairs.
    Body runs until the next heading of the same or higher level."""
    level = heading.count("#")
    pattern = re.compile(rf"^{heading} +(.+?)\s*$", re.M)
    stops = re.compile(rf"^#{{1,{level}}} ", re.M)
    entries = []
    for m in pattern.finditer(text):
        start = m.end()
        nxt = stops.search(text, start)
        entries.append((m.group(1).strip(), text[start : nxt.start() if nxt else len(text)].strip()))
    return entries


def norm_int(s: str) -> int:
    return int(s.replace("−", "-").replace("+", ""))


# -- spells -----------------------------------------------------------------

SPELL_META = re.compile(r"^_(?:Level (\d+) )?(\w+)(?: Cantrip)? \(([^)]+)\)_", re.M)
FIELD = lambda label: re.compile(rf"\*\*{label}:?\*\*:? +(.+?) *(?:<br>)? *$", re.M)


def parse_spells(text: str) -> list[dict]:
    spells = []
    for name, body in split_entries(text, "####"):
        meta = SPELL_META.search(body)
        if not meta:
            continue  # prose section, not a spell entry
        level = int(meta.group(1)) if meta.group(1) else 0
        school = meta.group(2)
        classes = [c.strip() for c in meta.group(3).split(",")]
        get = lambda lbl: (m.group(1).strip() if (m := FIELD(lbl).search(body)) else "")
        duration = get("Duration")
        desc = body[meta.end() :]
        # drop the stat-line block, keep the rules text
        m = FIELD("Duration").search(desc)
        if m:
            desc = desc[m.end() :]
        spells.append(
            {
                "id": f"spell-{slug(name)}",
                "name": name,
                "level": level,
                "school": school,
                "classes": classes,
                "castingTime": get("Casting Time"),
                "range": get("Range"),
                "components": get("Components"),
                "duration": duration,
                "concentration": "Concentration" in duration,
                "body": desc.strip(),
            }
        )
    return spells


# -- monsters ---------------------------------------------------------------

MONSTER_META = re.compile(r"^_(Tiny|Small|Medium|Large|Huge|Gargantuan)([^,_]*), ([^_]+)_", re.M)
AC_RE = re.compile(r"\*\*AC\*\* +(\d+)")
INIT_RE = re.compile(r"\*\*Initiative\*\* +([+−-]\d+)")
HP_RE = re.compile(r"\*\*HP\*\* +(\d+)(?: \(([^)]+)\))?")
SPEED_RE = re.compile(r"\*\*Speed\*\* +(.+?) *(?:<br>)? *$", re.M)
CR_RE = re.compile(r"\*\*CR\*\* +([\d/]+) \(XP ([\d,]+)(?: or [\d,]+)?; PB (\+\d+)\)")
PP_RE = re.compile(r"Passive Perception (\d+)")
ABILITY_ROW = re.compile(
    r"<strong>(STR|DEX|CON|INT|WIS|CHA)</strong></td>\s*<td>(\d+)</td>\s*<td>([+−-]\d+)</td>\s*<td>([+−-]\d+)</td>",
)


def parse_monsters(text: str, heading: str = "###") -> list[dict]:
    monsters = []
    for name, body in split_entries(text, heading):
        meta = MONSTER_META.search(body)
        ac = AC_RE.search(body)
        hp = HP_RE.search(body)
        if not (meta and ac and hp):
            continue  # narrative section, not a stat block
        abilities, saves = {}, {}
        for row in ABILITY_ROW.finditer(body):
            abilities[row.group(1).lower()] = int(row.group(2))
            saves[row.group(1).lower()] = norm_int(row.group(4))
        init = INIT_RE.search(body)
        cr = CR_RE.search(body)
        # rules text after the stat table/lines: traits + action sections
        tail = body[cr.end() :].strip() if cr else ""
        monsters.append(
            {
                "id": f"monster-{slug(name)}",
                "name": name,
                "size": meta.group(1),
                "type": (meta.group(1) + meta.group(2)).strip(),
                "alignment": meta.group(3).strip(),
                "ac": int(ac.group(1)),
                "initiativeBonus": norm_int(init.group(1)) if init else 0,
                "hp": int(hp.group(1)),
                "hpRoll": hp.group(2) or "",
                "speed": SPEED_RE.search(body).group(1) if SPEED_RE.search(body) else "",
                "abilities": abilities,
                "saves": saves,
                "cr": cr.group(1) if cr else "",
                "xp": int(cr.group(2).replace(",", "")) if cr else 0,
                "pb": norm_int(cr.group(3)) if cr else 2,
                "passivePerception": int(PP_RE.search(body).group(1)) if PP_RE.search(body) else 10,
                "body": tail,
            }
        )
    return monsters


# -- magic items ------------------------------------------------------------

ITEM_META = re.compile(
    r"^_(Armor|Potion|Ring|Rod|Scroll|Staff|Wand|Weapon|Wondrous Item)([^,_]*), +([^_]+)_", re.M
)


def parse_items(text: str) -> list[dict]:
    items = []
    for name, body in split_entries(text, "####"):
        meta = ITEM_META.search(body)
        if not meta:
            continue
        items.append(
            {
                "id": f"item-{slug(name)}",
                "name": name,
                "itemType": (meta.group(1) + meta.group(2)).strip(),
                "rarity": meta.group(3).strip(),
                "body": body[meta.end() :].strip(),
            }
        )
    return items


# -- rules glossary ---------------------------------------------------------

RULE_TAG = re.compile(r"^(.*?) \[(.+)\]$")


def parse_rules(text: str) -> list[dict]:
    rules = []
    for title, body in split_entries(text, "####"):
        m = RULE_TAG.match(title)
        name = m.group(1) if m else title
        tag = m.group(2) if m else ""
        rules.append(
            {
                "id": f"rule-{slug(name)}",
                "name": name,
                "tag": tag,
                "body": body.strip(),
            }
        )
    return rules


ATTRIBUTION = """\
# SRD 5.2.1 Attribution

This directory contains material from the System Reference Document 5.2.1
("SRD 5.2.1") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.

The JSON files here were generated by `scripts/ingest_srd.py` from the
Markdown conversion at https://github.com/downfallx/dnd-5e-srd-markdown
(itself CC-BY-4.0). Changes were made: conversion to structured JSON.
"""


def main() -> None:
    texts = {name: fetch(name) for name in FILES}

    spells = parse_spells(texts["spells.md"])
    # animals.md nests stat blocks one heading level higher than monsters-A-Z.md
    monsters = parse_monsters(texts["monsters-A-Z.md"]) + parse_monsters(texts["animals.md"], "##")
    items = parse_items(texts["magic-items.md"])
    rules = parse_rules(texts["rules-glossary.md"])

    # de-dupe by id, keeping first occurrence
    for lst in (spells, monsters, items, rules):
        seen: set[str] = set()
        lst[:] = [e for e in lst if not (e["id"] in seen or seen.add(e["id"]))]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for fname, data in [
        ("spells.json", spells),
        ("monsters.json", monsters),
        ("magic-items.json", items),
        ("rules.json", rules),
    ]:
        (OUT_DIR / fname).write_text(
            json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print(f"{fname}: {len(data)} entries")
    (OUT_DIR / "ATTRIBUTION.md").write_text(ATTRIBUTION, encoding="utf-8")

    if len(spells) < 300 or len(monsters) < 300 or len(items) < 200 or len(rules) < 50:
        print("WARNING: entry counts lower than expected — check parser", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
