from pathlib import Path

import pytest

from grimoire.campaign import CampaignError, CampaignStore
from grimoire.seed import seed_if_missing


@pytest.fixture
def store(tmp_path: Path) -> CampaignStore:
    s = CampaignStore(tmp_path / "campaign")
    s.create("location", "Havenmoor", {"region": "The Sundered Coast"}, "A salt-stained town.")
    s.create(
        "npc",
        "Mara Ashfield",
        {"role": "Innkeep"},
        "Runs the Salted Crow in [[Havenmoor]].\n\nKnows every rumor.",
    )
    return s


def test_files_on_disk_are_plain_markdown(store: CampaignStore):
    path = store.root / "npcs" / "mara-ashfield.md"
    text = path.read_text()
    assert text.startswith("---\n")
    assert "name: Mara Ashfield" in text
    assert "[[Havenmoor]]" in text


def test_index_and_excerpt(store: CampaignStore):
    idx = store.index()
    assert {e["id"] for e in idx} == {"location-havenmoor", "npc-mara-ashfield"}
    mara = next(e for e in idx if e["type"] == "npc")
    assert mara["excerpt"] == "Runs the Salted Crow in Havenmoor."


def test_links_and_backlinks(store: CampaignStore):
    mara = store.get("npc-mara-ashfield")
    assert mara["links"] == [{"name": "Havenmoor", "id": "location-havenmoor"}]
    haven = store.get("location-havenmoor")
    assert haven["backlinks"] == [{"id": "npc-mara-ashfield", "name": "Mara Ashfield", "type": "npc"}]


def test_unresolved_wikilink(store: CampaignStore):
    store.update("npc-mara-ashfield", body="She fears [[The Hollow King]].")
    assert store.get("npc-mara-ashfield")["links"] == [{"name": "The Hollow King", "id": None}]


def test_update_preserves_unspecified_parts(store: CampaignStore):
    store.update("npc-mara-ashfield", fields={"location": "Havenmoor"})
    e = store.get("npc-mara-ashfield")
    assert e["fields"] == {"role": "Innkeep", "location": "Havenmoor"}
    assert "[[Havenmoor]]" in e["body"]


def test_create_duplicate_and_delete(store: CampaignStore):
    with pytest.raises(CampaignError):
        store.create("npc", "Mara Ashfield", {}, "")
    store.delete("npc-mara-ashfield")
    assert store.get("npc-mara-ashfield") is None


def test_seed_only_when_missing(tmp_path: Path):
    root = tmp_path / "campaign"
    assert seed_if_missing(root) is True
    store = CampaignStore(root)
    assert len(store.party()) == 4
    types = {e["type"] for e in store.index()}
    assert types == {"pc", "npc", "location", "faction", "quest", "recap", "session"}
    # never reseeds or touches an existing campaign
    store.delete("npc-mara-ashfield")
    assert seed_if_missing(root) is False
    assert store.get("npc-mara-ashfield") is None


def test_pc_roundtrip_keeps_structured_stats(tmp_path: Path):
    root = tmp_path / "campaign"
    seed_if_missing(root)
    store = CampaignStore(root)
    ilyana = next(p for p in store.party() if p["name"] == "Ilyana Duskweaver")
    assert ilyana["fields"]["abilities"]["cha"] == 18
    assert {"name": "Hex", "level": 1} in ilyana["fields"]["spells"]


def test_image_paths_stay_inside_images_dir(store: CampaignStore):
    (store.root / "images" / "npcs").mkdir(parents=True)
    (store.root / "images" / "npcs" / "mara.jpg").write_bytes(b"\xff\xd8")
    assert store.image("images/npcs/mara.jpg") == (store.root / "images/npcs/mara.jpg").resolve()
    assert store.image("npcs/mara-ashfield.md") is None
    assert store.image("images/../npcs/mara-ashfield.md") is None
    assert store.image("images/npcs/missing.jpg") is None


def test_image_endpoint(store: CampaignStore, monkeypatch: pytest.MonkeyPatch):
    from fastapi.testclient import TestClient

    import grimoire.main as main

    (store.root / "images").mkdir()
    (store.root / "images" / "mara.png").write_bytes(b"\x89PNG")
    monkeypatch.setattr(main, "campaign", store)
    client = TestClient(main.app)
    assert client.get("/api/campaign-files/images/mara.png").content == b"\x89PNG"
    assert client.get("/api/campaign-files/npcs/mara-ashfield.md").status_code == 404
