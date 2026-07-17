from fastapi.testclient import TestClient

import grimoire.main as main

client = TestClient(main.app)


def test_content_counts():
    counts = main.content.counts()
    assert counts["spell"] >= 300
    assert counts["monster"] >= 300
    assert counts["item"] >= 200
    assert counts["rule"] >= 100


def test_index_and_detail_roundtrip():
    index = client.get("/api/content/index").json()["entries"]
    fireball = next(e for e in index if e["name"] == "Fireball")
    assert fireball["kind"] == "spell"
    assert fireball["meta"] == "Lvl 3 · Evocation"

    detail = client.get(f"/api/content/spell/{fireball['id']}").json()
    assert detail["concentration"] is False
    assert "20-foot-radius" in detail["body"]


def test_monster_detail_has_tracker_fields():
    gob = client.get("/api/content/monster/monster-goblin-warrior").json()
    assert (gob["ac"], gob["hp"], gob["initiativeBonus"], gob["cr"]) == (15, 10, 2, "1/4")


def test_missing_entry_404():
    assert client.get("/api/content/spell/spell-nope").status_code == 404
