"""Campaign wiki: plain Markdown files on disk.

Each entity (NPC, location, faction, quest, session recap, PC) is one
Markdown file with YAML frontmatter, organized in per-type folders under
the campaign directory. Bodies may reference other entities with
[[wikilinks]]; links and backlinks are resolved by entity name. The folder
is a valid Obsidian vault and can be git-backed — the app never needs a
database and the data stays portable.

The campaign directory is gitignored (personal content); set
GRIMOIRE_CAMPAIGN_DIR to point somewhere else (e.g. a private repo).
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Any

import yaml

TYPE_DIRS = {
    "npc": "npcs",
    "location": "locations",
    "faction": "factions",
    "quest": "quests",
    "recap": "recaps",
    "pc": "pcs",
    "session": "sessions",
    "lore": "lore",
}

WIKILINK = re.compile(r"\[\[([^\]|]+)(?:\|[^\]]*)?\]\]")
FRONTMATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*\n?", re.S)


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "untitled"


class CampaignError(ValueError):
    pass


class CampaignStore:
    def __init__(self, root: Path) -> None:
        self.root = root

    # -- file access --------------------------------------------------------

    def _dir(self, etype: str) -> Path:
        if etype not in TYPE_DIRS:
            raise CampaignError(f"unknown entity type '{etype}'")
        return self.root / TYPE_DIRS[etype]

    def _path(self, entity_id: str) -> tuple[str, Path]:
        etype, _, slug = entity_id.partition("-")
        path = self._dir(etype) / f"{slug}.md"
        return etype, path

    def _parse(self, etype: str, path: Path) -> dict[str, Any]:
        text = path.read_text(encoding="utf-8")
        fields: dict[str, Any] = {}
        body = text
        if m := FRONTMATTER.match(text):
            fields = yaml.safe_load(m.group(1)) or {}
            body = text[m.end() :]
        name = fields.pop("name", None) or path.stem.replace("-", " ").title()
        fields.pop("type", None)
        return {
            "id": f"{etype}-{path.stem}",
            "type": etype,
            "name": name,
            "fields": fields,
            "body": body.strip(),
        }

    def _write(self, etype: str, path: Path, name: str, fields: dict[str, Any], body: str) -> None:
        front = {"name": name, "type": etype, **{k: v for k, v in fields.items() if v is not None}}
        text = "---\n" + yaml.safe_dump(front, sort_keys=False, allow_unicode=True) + "---\n\n" + body.strip() + "\n"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def _all(self) -> list[dict[str, Any]]:
        entities = []
        for etype, dirname in TYPE_DIRS.items():
            d = self.root / dirname
            if not d.is_dir():
                continue
            for path in sorted(d.glob("*.md")):
                try:
                    entities.append(self._parse(etype, path))
                except Exception as e:  # a malformed file shouldn't take down the wiki
                    entities.append(
                        {
                            "id": f"{etype}-{path.stem}",
                            "type": etype,
                            "name": path.stem,
                            "fields": {"error": str(e)},
                            "body": path.read_text(encoding="utf-8", errors="replace"),
                        }
                    )
        return entities

    # -- queries ------------------------------------------------------------

    @staticmethod
    def _excerpt(body: str) -> str:
        for line in body.splitlines():
            line = WIKILINK.sub(r"\1", line).strip()
            if line and not line.startswith("#"):
                return line[:160]
        return ""

    def index(self) -> list[dict[str, Any]]:
        return [
            {
                "id": e["id"],
                "type": e["type"],
                "name": e["name"],
                "fields": e["fields"],
                "excerpt": self._excerpt(e["body"]),
            }
            for e in self._all()
        ]

    def get(self, entity_id: str) -> dict[str, Any] | None:
        etype, path = self._path(entity_id)
        if not path.is_file():
            return None
        entity = self._parse(etype, path)
        every = self._all()
        by_name = {e["name"].lower(): e for e in every}

        links = []
        for target in dict.fromkeys(WIKILINK.findall(entity["body"])):
            match = by_name.get(target.strip().lower())
            links.append({"name": target.strip(), "id": match["id"] if match else None})

        backlinks = [
            {"id": e["id"], "name": e["name"], "type": e["type"]}
            for e in every
            if e["id"] != entity["id"]
            and any(t.strip().lower() == entity["name"].lower() for t in WIKILINK.findall(e["body"]))
        ]
        return {**entity, "links": links, "backlinks": backlinks}

    def party(self) -> list[dict[str, Any]]:
        return [e for e in self._all() if e["type"] == "pc"]

    def active_session(self) -> dict[str, Any] | None:
        armed = [e for e in self._all() if e["type"] == "session" and e["fields"].get("status") == "armed"]
        return self.get(armed[0]["id"]) if armed else None

    def arm_session(self, entity_id: str) -> dict[str, Any]:
        target = self.get(entity_id)
        if target is None or target["type"] != "session":
            raise CampaignError(f"'{entity_id}' is not a session")
        for e in self._all():
            if e["type"] == "session" and e["fields"].get("status") == "armed" and e["id"] != entity_id:
                self.update(e["id"], fields={"status": "draft"})
        return self.update(entity_id, fields={"status": "armed"})

    # -- mutations -----------------------------------------------------------

    def create(self, etype: str, name: str, fields: dict[str, Any], body: str) -> dict[str, Any]:
        path = self._dir(etype) / f"{slugify(name)}.md"
        if path.exists():
            raise CampaignError(f"'{name}' already exists in {TYPE_DIRS[etype]}")
        self._write(etype, path, name, fields, body)
        return self.get(f"{etype}-{path.stem}")  # type: ignore[return-value]

    def update(
        self,
        entity_id: str,
        name: str | None = None,
        fields: dict[str, Any] | None = None,
        body: str | None = None,
    ) -> dict[str, Any]:
        etype, path = self._path(entity_id)
        if not path.is_file():
            raise CampaignError(f"no entity '{entity_id}'")
        current = self._parse(etype, path)
        self._write(
            etype,
            path,
            name if name is not None else current["name"],
            {**current["fields"], **(fields or {})},
            body if body is not None else current["body"],
        )
        return self.get(entity_id)  # type: ignore[return-value]

    def delete(self, entity_id: str) -> None:
        _, path = self._path(entity_id)
        if not path.is_file():
            raise CampaignError(f"no entity '{entity_id}'")
        path.unlink()
