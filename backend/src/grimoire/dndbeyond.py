"""Best-effort D&D Beyond character import.

Uses the public character-service JSON that community tools rely on. It is
UNOFFICIAL: the sheet must be set to public, the endpoint may change or
block requests at any time, and the mapping is deliberately best-effort —
the DM reviews and fixes the imported sheet afterwards. Imported data
stays local like everything else.
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Any

DDB_URL = "https://character-service.dndbeyond.com/character/v5/character/{id}"
CONFIG_URL = "https://www.dndbeyond.com/api/config/json"

# DDB source categories for official WotC rulebooks (from CONFIG_URL's
# sourceCategories): 1 = 5e Expanded, 24 = 5.5e Core, 26 = 5e Core,
# 38 = 5.5e Expanded. Partner publishers (Kobold Press, Avantris, ...) have
# their own categories; DDB attaches their optional campaign mechanics to
# every character as pseudo-feats, which we don't want on the sheet.
OFFICIAL_SOURCE_CATEGORIES = {1, 24, 26, 38}

ABILITIES = ["str", "dex", "con", "int", "wis", "cha"]
ABILITY_NAMES = {
    "str": "Strength", "dex": "Dexterity", "con": "Constitution",
    "int": "Intelligence", "wis": "Wisdom", "cha": "Charisma",
}
SKILLS: dict[str, str] = {
    "acrobatics": "dex", "animal-handling": "wis", "arcana": "int", "athletics": "str",
    "deception": "cha", "history": "int", "insight": "wis", "intimidation": "cha",
    "investigation": "int", "medicine": "wis", "nature": "int", "perception": "wis",
    "performance": "cha", "persuasion": "cha", "religion": "int",
    "sleight-of-hand": "dex", "stealth": "dex", "survival": "wis",
}
RACIAL_BOILERPLATE = {
    "ability score increases", "age", "alignment", "size", "speed", "languages", "creature type",
}
BOILERPLATE_FEATURES = {
    "hit points", "proficiencies", "equipment", "ability score improvement",
    "core barbarian traits", "core bard traits", "core cleric traits", "core druid traits",
    "core fighter traits", "core monk traits", "core paladin traits", "core ranger traits",
    "core rogue traits", "core sorcerer traits", "core warlock traits", "core wizard traits",
    "spellcasting", "epic boon",
}


class ImportError_(ValueError):
    pass


def extract_id(id_or_url: str) -> str:
    m = re.search(r"(\d{5,})", id_or_url)
    if not m:
        raise ImportError_("couldn't find a character id in that input")
    return m.group(1)


def fetch_character(char_id: str) -> dict[str, Any]:
    req = urllib.request.Request(
        DDB_URL.format(id=char_id),
        headers={"User-Agent": "Mozilla/5.0 (Grimoire local import)", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            payload = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code in (403, 404):
            raise ImportError_(
                f"D&D Beyond returned {e.code} — is the character set to Public? "
                "(The endpoint is unofficial and sometimes blocks requests.)"
            )
        raise ImportError_(f"D&D Beyond request failed ({e.code})")
    except (urllib.error.URLError, TimeoutError) as e:
        raise ImportError_(f"couldn't reach D&D Beyond: {e}")
    return payload.get("data", payload)


_official_sources: set[int] | None = None


def fetch_official_source_ids() -> set[int] | None:
    """Ids of sources in official WotC categories, from DDB's public config.

    Cached for the process lifetime. Returns None when the config can't be
    fetched — callers then keep all feats rather than guessing.
    """
    global _official_sources
    if _official_sources is not None:
        return _official_sources
    req = urllib.request.Request(
        CONFIG_URL,
        headers={"User-Agent": "Mozilla/5.0 (Grimoire local import)", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            cfg = json.loads(r.read().decode("utf-8"))
    except Exception:
        return None
    _official_sources = {
        s["id"]
        for s in cfg.get("sources") or []
        if s.get("id") and s.get("sourceCategoryId") in OFFICIAL_SOURCE_CATEGORIES
    }
    return _official_sources


def _is_official_feat(defn: dict[str, Any], official_sources: set[int] | None) -> bool:
    if official_sources is None:
        return True
    source_ids = [s.get("sourceId") for s in defn.get("sources") or [] if s.get("sourceId")]
    if not source_ids:
        return True  # no provenance on the feat — give it the benefit of the doubt
    return any(sid in official_sources for sid in source_ids)


def _mod(score: int) -> int:
    return (score - 10) // 2


def _modifiers(d: dict[str, Any]) -> list[dict[str, Any]]:
    mods = d.get("modifiers") or {}
    out: list[dict[str, Any]] = []
    for group in mods.values():
        if isinstance(group, list):
            out.extend(m for m in group if isinstance(m, dict))
    return out


def map_character(
    d: dict[str, Any], official_sources: set[int] | None = None
) -> tuple[str, dict[str, Any], str]:
    """Return (name, pc-entity fields, body) from a DDB character payload.

    official_sources filters the feats array down to official-rulebook feats
    (see fetch_official_source_ids); None keeps everything.
    """
    name = d.get("name") or "Imported Character"
    classes = d.get("classes") or []
    level = sum(c.get("level", 0) for c in classes) or 1
    class_names = "/".join(
        c.get("definition", {}).get("name", "?") for c in classes
    ) or "Adventurer"
    race = (d.get("race") or {}).get("fullName") or (d.get("race") or {}).get("baseName") or ""
    pb = 2 + max(0, (level - 1)) // 4

    # ability scores: base + bonus (or override), plus score-bonus modifiers
    base = {s.get("id"): s.get("value") or 10 for s in d.get("stats") or []}
    bonus = {s.get("id"): s.get("value") or 0 for s in d.get("bonusStats") or []}
    override = {s.get("id"): s.get("value") for s in d.get("overrideStats") or []}
    scores: dict[str, int] = {}
    for i, key in enumerate(ABILITIES, start=1):
        scores[key] = override.get(i) or (base.get(i, 10) + bonus.get(i, 0))
    for m in _modifiers(d):
        sub = (m.get("subType") or "").lower()
        for key, full in ABILITY_NAMES.items():
            if m.get("type") == "bonus" and sub == f"{full.lower()}-score":
                scores[key] += m.get("value") or 0

    # proficiencies from modifiers
    saves: list[str] = []
    skill_prof: set[str] = set()
    skill_expertise: set[str] = set()
    for m in _modifiers(d):
        sub = (m.get("subType") or "").lower()
        if m.get("type") == "proficiency":
            for key, full in ABILITY_NAMES.items():
                if sub == f"{full.lower()}-saving-throws" and full not in saves:
                    saves.append(full)
            if sub in SKILLS:
                skill_prof.add(sub)
        if m.get("type") == "expertise" and sub in SKILLS:
            skill_expertise.add(sub)

    def skill_mod(slug: str) -> int:
        m = _mod(scores[SKILLS[slug]])
        if slug in skill_expertise:
            return m + 2 * pb
        if slug in skill_prof:
            return m + pb
        return m

    skills = [
        {"name": slug.replace("-", " ").title().replace("Of", "of"), "mod": skill_mod(slug)}
        for slug in sorted(skill_prof | skill_expertise)
    ]

    # HP: DDB base excludes CON; override wins
    con_mod = _mod(scores["con"])
    max_hp = d.get("overrideHitPoints") or (
        (d.get("baseHitPoints") or 0) + (d.get("bonusHitPoints") or 0) + level * con_mod
    )
    max_hp = max(1, max_hp)
    removed = d.get("removedHitPoints") or 0
    hp = max(0, max_hp - removed)

    # AC: 10 + dex, improved by equipped armor/shield if we can see it
    dex_mod = _mod(scores["dex"])
    ac = 10 + dex_mod
    for item in d.get("inventory") or []:
        defn = item.get("definition") or {}
        if not item.get("equipped") or not defn.get("armorClass"):
            continue
        armor_type = (defn.get("type") or "").lower()
        base_ac = defn["armorClass"]
        if armor_type == "shield":
            ac += 2
        elif "heavy" in armor_type:
            ac = base_ac  # heavy armor: flat, no Dex
        elif "medium" in armor_type:
            ac = base_ac + min(2, dex_mod)
        else:  # light or unknown armor
            ac = base_ac + dex_mod

    # spells from class lists + other sources
    spells: list[dict[str, Any]] = []
    seen: set[str] = set()

    def add_spell(s: dict[str, Any]) -> None:
        defn = s.get("definition") or {}
        sname, slevel = defn.get("name"), defn.get("level")
        if sname and sname.lower() not in seen:
            seen.add(sname.lower())
            spells.append({"name": sname, "level": slevel or 0})

    for cs in d.get("classSpells") or []:
        for s in cs.get("spells") or []:
            add_spell(s)
    for group in (d.get("spells") or {}).values():
        if isinstance(group, list):
            for s in group:
                add_spell(s)
    spells.sort(key=lambda s: (s["level"], s["name"]))

    # features grouped by source: class, species traits, feats, background
    features: list[dict[str, str]] = []
    seen_features: set[str] = set()

    def add_feature(fname: str | None, source: str) -> None:
        if fname and fname.lower() not in seen_features:
            seen_features.add(fname.lower())
            features.append({"name": fname, "source": source})

    for c in classes:
        c_level = c.get("level", 0)
        for f in c.get("classFeatures") or []:
            defn = f.get("definition") or {}
            if (
                defn.get("requiredLevel", 0) <= c_level
                and (defn.get("name") or "").lower() not in BOILERPLATE_FEATURES
            ):
                add_feature(defn.get("name"), "class")
    for t in (d.get("race") or {}).get("racialTraits") or []:
        tname = (t.get("definition") or {}).get("name")
        if tname and tname.lower() not in RACIAL_BOILERPLATE:
            add_feature(tname, "species")
    for f in d.get("feats") or []:
        defn = f.get("definition") or {}
        if _is_official_feat(defn, official_sources):
            add_feature(defn.get("name"), "feat")
    bg_name = ((d.get("background") or {}).get("definition") or {}).get("name")
    add_feature(bg_name, "background")

    inventory = []
    for item in d.get("inventory") or []:
        iname = (item.get("definition") or {}).get("name")
        if iname:
            qty = item.get("quantity") or 1
            inventory.append(f"{iname} ×{qty}" if qty > 1 else iname)

    perception = 10 + skill_mod("perception")
    insight = 10 + skill_mod("insight")
    speed = ((d.get("race") or {}).get("weightSpeeds") or {}).get("normal", {}).get("walk") or 30

    fields = {
        "player": d.get("username") or "",
        "class": class_names,
        "race": race,
        "level": level,
        "color": "gold",
        "ac": ac,
        "hp": hp,
        "maxHp": max_hp,
        "speed": speed,
        "initiativeBonus": dex_mod,
        "passivePerception": perception,
        "passiveInsight": insight,
        "abilities": scores,
        "saves": saves,
        "skills": skills,
        "spells": spells,
        "features": features[:20],
        "inventory": inventory[:30],
        "ddbId": d.get("id"),
    }
    body = (
        f"Imported from D&D Beyond (character {d.get('id', '?')}). "
        "Best-effort mapping — review AC, HP, and features."
    )
    return name, fields, body
