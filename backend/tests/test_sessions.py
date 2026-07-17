from pathlib import Path

import pytest

from grimoire.campaign import CampaignError, CampaignStore
from grimoire.seed import seed_if_missing


@pytest.fixture
def store(tmp_path: Path) -> CampaignStore:
    root = tmp_path / "campaign"
    seed_if_missing(root)
    return CampaignStore(root)


def test_seeded_session_is_armed(store: CampaignStore):
    active = store.active_session()
    assert active is not None
    assert active["name"].startswith("Session 13")
    assert len(active["fields"]["secrets"]) == 6
    assert active["fields"]["monsters"][0]["ref"] == "monster-goblin-warrior"


def test_arming_demotes_previous(store: CampaignStore):
    new = store.create("session", "Session 14 - Aftermath", {"status": "draft"}, "")
    store.arm_session(new["id"])
    active = store.active_session()
    assert active["id"] == new["id"]
    old = store.get("session-session-13-into-the-pale-court")
    assert old["fields"]["status"] == "draft"


def test_arm_rejects_non_sessions(store: CampaignStore):
    with pytest.raises(CampaignError):
        store.arm_session("npc-mara-ashfield")


def test_secret_toggle_roundtrip(store: CampaignStore):
    active = store.active_session()
    secrets = active["fields"]["secrets"]
    secrets[0]["revealed"] = True
    store.update(active["id"], fields={"secrets": secrets})
    again = store.active_session()
    assert again["fields"]["secrets"][0]["revealed"] is True
    # persisted as YAML in the markdown file
    text = (store.root / "sessions" / "session-13-into-the-pale-court.md").read_text()
    assert "revealed: true" in text
