from pathlib import Path

import pytest

from grimoire.campaign import CampaignStore
from grimoire.listener import build_context, propose

DIGEST = {
    "version": 1,
    "createdAt": "2026-11-07T22:30:00Z",
    "summary": "The party met Old Marta and calmed the wraith.",
    "events": [{"who": "Staffan", "what": "Brom shielded the caster.", "evidence": "x"}],
    "loot": [
        {"item": "Silver sparrow locket", "recipient": "Kaelen", "evidence": "x"},
        {"item": "34 gold", "recipient": "Nobody Known", "evidence": "x"},
    ],
    "npcs": [
        {"name": "Old Marta", "description": "Scavenger, lost her sister.", "evidence": "x"},
        {"name": "The Bell Ringer", "description": "Marta's dead sister.", "evidence": "x"},
    ],
    "locations": [{"name": "Saltcellar Row", "description": "Drowned archive below.", "evidence": "x"}],
    "plotThreads": [
        {"title": "The Queen's Men", "status": "advanced", "notes": "A patrol logged the party.", "evidence": "x"},
        {"title": "Marta's Locket", "status": "resolved", "notes": "Returned to Marta.", "evidence": "x"},
    ],
    "quotes": [{"speaker": "Henna", "quote": "Best ending."}],
    "recap": "You calmed the dead with a locket.",
}


@pytest.fixture()
def store(tmp_path: Path) -> CampaignStore:
    s = CampaignStore(tmp_path / "campaign")
    s.create("pc", "Kaelen", {"player": "Chrystian", "inventory": ["Dagger"]}, "")
    s.create("pc", "Mirelle", {"player": "Henna"}, "")
    s.create("npc", "Old Marta", {"role": "Scavenger"}, "Waits in the chapel.")
    s.create("location", "Ashen Ward", {"region": "Drakenheim"}, "")
    s.create("faction", "Queen's Men", {}, "")
    s.create("quest", "The Queen's Men", {"status": "Active"}, "Who watches the party?")
    s.create("quest", "Old Business", {"status": "Completed"}, "")
    s.create("session", "Session 12", {"treasure": ["Rope of Climbing"]}, "")
    return s


def test_build_context(store: CampaignStore) -> None:
    ctx = build_context(store.index())
    players = {p["name"]: p["characters"] for p in ctx["players"]}
    assert players == {"Chrystian": ["Kaelen"], "Henna": ["Mirelle"]}
    assert {n["name"] for n in ctx["npcs"]} == {"Old Marta"}
    assert {loc["name"] for loc in ctx["locations"]} == {"Ashen Ward"}
    assert {i["name"] for i in ctx["items"]} == {"Dagger", "Rope of Climbing"}
    # closed quests are excluded from open threads
    assert [t["title"] for t in ctx["openThreads"]] == ["The Queen's Men"]
    assert ctx["vocabulary"] == ["Queen's Men"]


def test_propose_matches_and_creates(store: CampaignStore) -> None:
    proposals = propose(DIGEST, store)
    by = {(p["action"], p["type"], p["name"]): p for p in proposals}

    recap = by[("create", "recap", "Session 2026-11-07")]
    assert "Old Marta" in recap["body"] and "Best ending." in recap["body"]
    assert recap["fields"]["date"] == "2026-11-07"

    # existing NPC -> update appending a dated note; new NPC -> create
    marta = by[("update", "npc", "Old Marta")]
    assert marta["id"] == "npc-old-marta"
    assert marta["body"].startswith("Waits in the chapel.")
    assert "### Session 2026-11-07" in marta["body"]
    assert ("create", "npc", "The Bell Ringer") in by
    assert ("create", "location", "Saltcellar Row") in by

    # existing quest advanced -> update; resolved+new -> created as Completed
    queens = by[("update", "quest", "The Queen's Men")]
    assert "A patrol logged the party." in queens["body"]
    assert "status" not in queens["fields"]
    locket = by[("create", "quest", "Marta's Locket")]
    assert locket["fields"]["status"] == "Completed"

    # loot routed to the recipient PC's inventory; unknown recipient skipped
    kaelen = by[("update", "pc", "Kaelen")]
    assert kaelen["fields"]["inventory"] == ["Dagger", "Silver sparrow locket"]
    assert not any(p["type"] == "pc" and p["name"] != "Kaelen" for p in proposals)


def test_propose_resolved_existing_quest_completes(store: CampaignStore) -> None:
    digest = {"createdAt": "2026-11-07", "plotThreads": [
        {"title": "The Queen's Men", "status": "resolved", "notes": "Over.", "evidence": "x"}
    ]}
    proposals = propose(digest, store)
    quest = next(p for p in proposals if p["type"] == "quest")
    assert quest["action"] == "update"
    assert quest["fields"]["status"] == "Completed"


def test_recap_name_avoids_slug_collision(store: CampaignStore) -> None:
    store.create("recap", "Session 2026-11-07", {"date": "2026-11-07"}, "earlier digest")
    proposals = propose(DIGEST, store)
    recap = next(p for p in proposals if p["type"] == "recap")
    assert recap["name"] == "Session 2026-11-07 (2)"


def test_listener_session_browsing(tmp_path: Path) -> None:
    import json

    from grimoire.listener import list_listener_sessions, load_listener_digest

    root = tmp_path / "sessions"
    (root / "2026-11-07-1900").mkdir(parents=True)
    (root / "2026-11-07-1900" / "session.session-digest.json").write_text(
        json.dumps({"summary": "Marta night", "createdAt": "2026-11-07T22:00:00Z", "model": "qwen3:32b"})
    )
    (root / "2026-11-01-1900").mkdir()  # recorded but not digested
    (root / "junk").mkdir()
    (root / "junk" / "session.session-digest.json").write_text("{not json")

    sessions = list_listener_sessions(root)
    assert [s["folder"] for s in sessions] == ["2026-11-07-1900"]
    assert sessions[0]["summary"] == "Marta night"

    assert load_listener_digest(root, "2026-11-07-1900")["summary"] == "Marta night"
    assert load_listener_digest(root, "../outside") is None
    assert load_listener_digest(root, "2026-11-01-1900") is None
    assert list_listener_sessions(tmp_path / "missing") == []


def test_digest_endpoints(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from fastapi.testclient import TestClient

    import grimoire.main as main

    store = CampaignStore(tmp_path / "campaign")
    store.create("npc", "Old Marta", {"role": "Scavenger"}, "Waits.")
    monkeypatch.setattr(main, "campaign", store)
    client = TestClient(main.app)

    ctx = client.get("/api/export/context").json()
    assert ctx["version"] == 1
    assert ctx["npcs"][0]["name"] == "Old Marta"

    preview = client.post("/api/import/digest/preview", json={"digest": DIGEST}).json()
    assert preview["proposals"]

    accepted = [p for p in preview["proposals"] if p["type"] in {"recap", "npc"}]
    applied = client.post("/api/import/digest/apply", json={"proposals": accepted}).json()
    assert all(r["ok"] for r in applied["results"])
    assert applied["backup"] and applied["backup"].startswith("campaign.backup-")
    assert (tmp_path / applied["backup"]).is_dir()

    index = {e["name"]: e for e in store.index()}
    assert "Session 2026-11-07" in index
    assert "The Bell Ringer" in index
