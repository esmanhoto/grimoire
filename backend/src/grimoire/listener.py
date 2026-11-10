"""D&D Listener integration: campaign-context export and session-digest import.

The contract (campaign-context.json out, session-digest.json in) is defined in
the listener's docs/integration-contract.md. The import is proposal-based:
`propose` turns a digest into concrete create/update operations that the user
reviews in the Post-Session page before anything is written.
"""

from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .campaign import CampaignStore, slugify

CLOSED_QUEST_STATUSES = {"completed", "done", "resolved", "failed", "abandoned"}


def build_context(entities: list[dict[str, Any]]) -> dict[str, Any]:
    pcs = [e for e in entities if e["type"] == "pc"]
    players: dict[str, list[str]] = {}
    for pc in pcs:
        player = str(pc["fields"].get("player") or "").strip() or pc["name"]
        players.setdefault(player, []).append(pc["name"])

    item_names: list[str] = []
    for pc in pcs:
        item_names += [str(i) for i in pc["fields"].get("inventory") or []]
    for e in entities:
        if e["type"] == "session":
            item_names += [str(t) for t in e["fields"].get("treasure") or []]
    seen: set[str] = set()
    unique_items = [i for i in item_names if not (i.lower() in seen or seen.add(i.lower()))]

    return {
        "version": 1,
        "exportedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "players": [{"name": p, "characters": cs} for p, cs in players.items()],
        "npcs": [
            {"name": e["name"], "aliases": [], "description": str(e["fields"].get("role") or "")}
            for e in entities
            if e["type"] == "npc"
        ],
        "locations": [{"name": e["name"], "aliases": []} for e in entities if e["type"] == "location"],
        "items": [{"name": i, "aliases": []} for i in unique_items],
        "openThreads": [
            {"title": e["name"], "notes": str(e["fields"].get("status") or "")}
            for e in entities
            if e["type"] == "quest"
            and str(e["fields"].get("status") or "").lower() not in CLOSED_QUEST_STATUSES
        ],
        "vocabulary": [e["name"] for e in entities if e["type"] == "faction"],
    }


def propose(digest: dict[str, Any], store: CampaignStore) -> list[dict[str, Any]]:
    entities = store._all()  # same package; propose needs bodies, which index() strips
    by_type_name = {(e["type"], e["name"].lower()): e for e in entities}
    existing_slugs = {(e["type"], e["id"].partition("-")[2]) for e in entities}

    date = str(digest.get("createdAt") or "")[:10] or datetime.now().strftime("%Y-%m-%d")
    proposals: list[dict[str, Any]] = []

    def add(
        action: str,
        etype: str,
        name: str,
        summary: str,
        fields: dict[str, Any] | None = None,
        body: str | None = None,
        entity_id: str | None = None,
    ) -> None:
        proposals.append(
            {
                "key": f"p{len(proposals) + 1}",
                "action": action,
                "type": etype,
                "id": entity_id,
                "name": name,
                "summary": summary,
                "fields": fields or {},
                "body": body,
            }
        )

    recap_name = f"Session {date}"
    suffix = 2
    while ("recap", slugify(recap_name)) in existing_slugs:
        recap_name = f"Session {date} ({suffix})"
        suffix += 1
    add(
        "create", "recap", recap_name,
        "New session recap page with summary, events, loot and quotes",
        {"date": date}, _recap_body(digest),
    )

    for kind, etype in (("npcs", "npc"), ("locations", "location")):
        for item in digest.get(kind) or []:
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            description = str(item.get("description") or "").strip()
            existing = by_type_name.get((etype, name.lower()))
            if existing:
                if description:
                    add(
                        "update", etype, existing["name"],
                        f"Append session {date} note",
                        body=existing["body"] + f"\n\n### Session {date}\n{description}",
                        entity_id=existing["id"],
                    )
            else:
                body = description or "Appeared in the session."
                if item.get("evidence"):
                    body += f"\n\n> “{item['evidence']}”"
                body += f"\n\n*First appeared in [[{recap_name}]].*"
                add("create", etype, name, f"New {etype} from the session", {}, body)

    for thread in digest.get("plotThreads") or []:
        title = str(thread.get("title") or "").strip()
        if not title:
            continue
        status = str(thread.get("status") or "").strip().lower()
        notes = str(thread.get("notes") or "").strip()
        existing = by_type_name.get(("quest", title.lower()))
        if existing:
            fields: dict[str, Any] = {}
            summary = f"Append session {date} update"
            if status == "resolved":
                fields["status"] = "Completed"
                summary = "Mark Completed and append the session update"
            add(
                "update", "quest", existing["name"], summary,
                fields,
                existing["body"] + f"\n\n### Session {date}\n{notes or status}",
                existing["id"],
            )
        else:
            body = notes or f"Surfaced in [[{recap_name}]]."
            add(
                "create", "quest", title, "New quest thread from the session",
                {"status": "Completed" if status == "resolved" else "Active"},
                body,
            )

    for loot in digest.get("loot") or []:
        item_name = str(loot.get("item") or "").strip()
        recipient = str(loot.get("recipient") or "").strip()
        if not item_name or not recipient:
            continue
        pc = by_type_name.get(("pc", recipient.lower()))
        if pc is None:
            continue
        inventory = [str(i) for i in pc["fields"].get("inventory") or []]
        if item_name.lower() in {i.lower() for i in inventory}:
            continue
        add(
            "update", "pc", pc["name"],
            f"Add “{item_name}” to inventory",
            {"inventory": inventory + [item_name]},
            entity_id=pc["id"],
        )

    return proposals


def _recap_body(digest: dict[str, Any]) -> str:
    parts: list[str] = [str(digest.get("summary") or "").strip()]

    events = digest.get("events") or []
    if events:
        lines = []
        for e in events:
            who = str(e.get("who") or "").strip()
            lines.append(f"- {'**' + who + ':** ' if who else ''}{e.get('what', '')}")
        parts.append("## Events\n" + "\n".join(lines))

    npcs = digest.get("npcs") or []
    if npcs:
        parts.append(
            "## NPCs\n"
            + "\n".join(
                f"- [[{n.get('name')}]]{' — ' + n['description'] if n.get('description') else ''}"
                for n in npcs
            )
        )

    locations = digest.get("locations") or []
    if locations:
        parts.append(
            "## Locations\n"
            + "\n".join(
                f"- [[{loc.get('name')}]]{' — ' + loc['description'] if loc.get('description') else ''}"
                for loc in locations
            )
        )

    loot = digest.get("loot") or []
    if loot:
        lines = []
        for item in loot:
            line = f"- {item.get('item', '')}"
            if item.get("recipient"):
                line += f" → [[{item['recipient']}]]"
            if item.get("notes"):
                line += f" ({item['notes']})"
            lines.append(line)
        parts.append("## Loot\n" + "\n".join(lines))

    quotes = digest.get("quotes") or []
    if quotes:
        parts.append(
            "## Quotes\n"
            + "\n\n".join(f"> “{q.get('quote', '')}”\n> — {q.get('speaker', '')}" for q in quotes)
        )

    recap = str(digest.get("recap") or "").strip()
    if recap:
        parts.append(f"## Previously on…\n*{recap}*")

    return "\n\n".join(p for p in parts if p)


def backup_campaign(root: Path) -> str | None:
    """Copy the campaign folder aside before a bulk apply (repo convention)."""
    if not root.is_dir():
        return None
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = root.parent / f"{root.name}.backup-{stamp}"
    shutil.copytree(root, target)
    return target.name
