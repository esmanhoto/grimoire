import pytest

from grimoire.dndbeyond import ImportError_, extract_id, map_character

# A synthetic payload shaped like the DDB character-service v5 response
# (heavily trimmed): a level 5 dwarf fighter with chain mail and a shield.
FIXTURE = {
    "id": 12345678,
    "name": "Thrain Oathkeeper",
    "username": "jordan",
    "race": {
        "fullName": "Mountain Dwarf",
        "weightSpeeds": {"normal": {"walk": 25}},
        "racialTraits": [
            {"definition": {"name": "Ability Score Increases"}},
            {"definition": {"name": "Darkvision"}},
            {"definition": {"name": "Dwarven Resilience"}},
        ],
    },
    "feats": [{"definition": {"name": "Tough"}}],
    "background": {"definition": {"name": "Soldier"}},
    "classes": [
        {
            "level": 5,
            "definition": {"name": "Fighter"},
            "classFeatures": [
                {"definition": {"name": "Hit Points", "requiredLevel": 1}},
                {"definition": {"name": "Second Wind", "requiredLevel": 1}},
                {"definition": {"name": "Action Surge", "requiredLevel": 2}},
                {"definition": {"name": "Extra Attack", "requiredLevel": 5}},
                {"definition": {"name": "Indomitable", "requiredLevel": 9}},
            ],
        }
    ],
    "stats": [
        {"id": 1, "value": 16}, {"id": 2, "value": 12}, {"id": 3, "value": 14},
        {"id": 4, "value": 10}, {"id": 5, "value": 12}, {"id": 6, "value": 8},
    ],
    "bonusStats": [{"id": i, "value": None} for i in range(1, 7)],
    "overrideStats": [{"id": i, "value": None} for i in range(1, 7)],
    "baseHitPoints": 34,  # DDB stores HP without CON
    "removedHitPoints": 6,
    "modifiers": {
        "race": [{"type": "bonus", "subType": "strength-score", "value": 2}],
        "class": [
            {"type": "proficiency", "subType": "strength-saving-throws"},
            {"type": "proficiency", "subType": "constitution-saving-throws"},
            {"type": "proficiency", "subType": "athletics"},
            {"type": "proficiency", "subType": "perception"},
        ],
        "background": [{"type": "expertise", "subType": "athletics"}],
    },
    "inventory": [
        {"equipped": True, "quantity": 1, "definition": {"name": "Chain Mail", "type": "Heavy Armor", "armorClass": 16}},
        {"equipped": True, "quantity": 1, "definition": {"name": "Shield", "type": "Shield", "armorClass": 2}},
        {"equipped": False, "quantity": 3, "definition": {"name": "Javelin", "type": "Weapon"}},
    ],
    "classSpells": [],
    "spells": {"race": [], "class": [], "item": [], "feat": []},
}


def test_extract_id():
    assert extract_id("https://www.dndbeyond.com/characters/12345678") == "12345678"
    assert extract_id("12345678") == "12345678"
    with pytest.raises(ImportError_):
        extract_id("not a character")


def test_map_character_core_stats():
    name, fields, body = map_character(FIXTURE)
    assert name == "Thrain Oathkeeper"
    assert fields["class"] == "Fighter"
    assert fields["level"] == 5
    assert fields["abilities"]["str"] == 18  # 16 base + 2 racial modifier
    assert fields["saves"] == ["Strength", "Constitution"]
    # HP: 34 base + 5 levels × +2 CON = 44 max, 6 damage taken
    assert (fields["maxHp"], fields["hp"]) == (44, 38)
    # AC: chain mail 16 flat + shield 2
    assert fields["ac"] == 18
    assert fields["speed"] == 25
    # athletics has expertise: +4 STR mod + 2×3 PB = +10
    athletics = next(s for s in fields["skills"] if s["name"] == "Athletics")
    assert athletics["mod"] == 10
    assert fields["passivePerception"] == 14  # 10 + 1 WIS + 3 PB
    # features are sourced; boilerplate and out-of-level entries filtered
    by_name = {f["name"]: f["source"] for f in fields["features"]}
    assert by_name["Second Wind"] == "class"
    assert by_name["Darkvision"] == "species"
    assert by_name["Tough"] == "feat"
    assert by_name["Soldier"] == "background"
    assert "Hit Points" not in by_name
    assert "Ability Score Increases" not in by_name
    assert "Indomitable" not in by_name
    assert "Javelin ×3" in fields["inventory"]
    assert "review" in body.lower()


def test_feat_source_filter():
    # PHB feat (145, official), third-party pseudo-feat (239), one with no
    # source info at all — only the third-party one is dropped, and only when
    # an official-source set is provided.
    payload = {
        **FIXTURE,
        "feats": [
            {"definition": {"name": "Tough", "sources": [{"sourceId": 145}]}},
            {"definition": {"name": "Runestones", "sources": [{"sourceId": 239}]}},
            {"definition": {"name": "Mystery Feat"}},
        ],
    }
    _, fields, _ = map_character(payload, official_sources={145, 148})
    feats = [f["name"] for f in fields["features"] if f["source"] == "feat"]
    assert feats == ["Tough", "Mystery Feat"]

    # without the set (config fetch failed) everything is kept
    _, fields, _ = map_character(payload, official_sources=None)
    feats = [f["name"] for f in fields["features"] if f["source"] == "feat"]
    assert feats == ["Tough", "Runestones", "Mystery Feat"]


def test_resync_endpoint_preserves_local_state(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from grimoire.campaign import CampaignStore
    import grimoire.main as main

    monkeypatch.setattr(main, "campaign", CampaignStore(tmp_path / "campaign"))
    monkeypatch.setattr("grimoire.dndbeyond.fetch_character", lambda cid: FIXTURE)
    monkeypatch.setattr("grimoire.dndbeyond.fetch_official_source_ids", lambda: None)
    client = TestClient(main.app)

    # import once, then give the PC local-only state: color, damage, notes
    r = client.post("/api/import/dndbeyond", json={"idOrUrl": "12345678"})
    assert r.status_code == 200
    pc = r.json()
    main.campaign.update(
        pc["id"],
        fields={"color": "purple", "hp": 20, "tempHp": 5},
        body="My table notes.",
    )

    r = client.post("/api/import/dndbeyond/resync", json={"id": pc["id"]})
    assert r.status_code == 200
    synced = r.json()["fields"]
    assert synced["maxHp"] == 44  # DDB-owned fields refreshed
    assert synced["color"] == "purple"  # local-only fields survive
    assert synced["tempHp"] == 5
    assert synced["hp"] == 20  # damage taken carries over (maxHp unchanged)
    assert r.json()["body"] == "My table notes."

    # a PC without a ddbId can't be re-synced
    plain = main.campaign.create("pc", "Handmade Hero", {"maxHp": 10}, "")
    r = client.post("/api/import/dndbeyond/resync", json={"id": plain["id"]})
    assert r.status_code == 400
