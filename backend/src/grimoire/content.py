"""SRD + homebrew content store.

Loads the committed SRD 5.2.1 JSON (content/srd/) and any local homebrew
files (content/homebrew/, gitignored) at startup. Homebrew files mirror the
SRD filenames (spells.json, monsters.json, magic-items.json, rules.json)
and are treated identically — no second-class content.

Served two ways: a lightweight index the frontend fuzzy-searches locally
(instant, offline), and full entries fetched by id on demand.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

KIND_FILES = {
    "spell": "spells.json",
    "monster": "monsters.json",
    "item": "magic-items.json",
    "rule": "rules.json",
    "feature": "features.json",
    "gear": "equipment.json",
}


def _meta_line(kind: str, e: dict[str, Any]) -> str:
    if kind == "spell":
        lvl = "Cantrip" if e["level"] == 0 else f"Lvl {e['level']}"
        return f"{lvl} · {e['school']}"
    if kind == "monster":
        return f"CR {e['cr']} · {e['type']}"
    if kind == "item":
        return f"{e['itemType']} · {e['rarity']}"
    if kind == "feature":
        origin = e.get("origin") or "Feature"
        if e.get("source") == "class" and e.get("level"):
            return f"{origin} {e['level']}"
        if e.get("source") == "species":
            return f"{origin} trait"
        return origin
    if kind == "gear":
        return e.get("category") or "Gear"
    return e.get("tag") or "Rule"


class ContentStore:
    def __init__(self, content_dir: Path) -> None:
        self.entries: dict[str, dict[str, dict[str, Any]]] = {k: {} for k in KIND_FILES}
        self.index: list[dict[str, str]] = []
        for source in ("srd", "homebrew"):
            base = content_dir / source
            for kind, fname in KIND_FILES.items():
                path = base / fname
                if not path.is_file():
                    continue
                for e in json.loads(path.read_text(encoding="utf-8")):
                    # provenance (srd vs homebrew) — must not clobber an
                    # entry's own "source" field (feature classification)
                    e["contentSource"] = source
                    self.entries[kind][e["id"]] = e
        for kind, by_id in self.entries.items():
            for e in by_id.values():
                self.index.append(
                    {"id": e["id"], "name": e["name"], "kind": kind, "meta": _meta_line(kind, e)}
                )

    def get(self, kind: str, entry_id: str) -> dict[str, Any] | None:
        return self.entries.get(kind, {}).get(entry_id)

    def counts(self) -> dict[str, int]:
        return {k: len(v) for k, v in self.entries.items()}
