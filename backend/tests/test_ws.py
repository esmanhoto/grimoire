from fastapi.testclient import TestClient

import grimoire.main as main


def fresh_client() -> TestClient:
    main.engine.state = type(main.engine.state)()  # reset singleton state between tests
    return TestClient(main.app)


def test_health():
    client = fresh_client()
    assert client.get("/api/health").json()["ok"] is True


def test_ws_two_way_sync_with_projection():
    client = fresh_client()
    with client.websocket_connect("/ws/combat?role=dm") as dm, client.websocket_connect(
        "/ws/combat?role=player"
    ) as player:
        assert dm.receive_json()["type"] == "state"
        assert player.receive_json()["type"] == "state"

        dm.send_json(
            {
                "type": "action",
                "op": "start_combat",
                "payload": {
                    "combatants": [
                        {"name": "Ilyana", "kind": "pc", "ac": 14, "hp": 46, "maxHp": 52},
                        {"name": "Goblin", "kind": "monster", "ref": "m-goblin", "ac": 15, "hp": 7, "maxHp": 7},
                    ]
                },
            }
        )
        dm_state = dm.receive_json()["state"]
        player_state = player.receive_json()["state"]
        assert dm_state["active"] and player_state["active"]

        gob_dm = next(c for c in dm_state["combatants"] if c["name"] == "Goblin")
        assert gob_dm["hp"] == 7  # DM sees numbers
        gob_pl = next(c for c in player_state["combatants"] if c["name"] == "Goblin")
        assert "hp" not in gob_pl and gob_pl["status"] == "Healthy"

        # player edits their PC; DM sees it live
        pc_id = next(c["id"] for c in player_state["combatants"] if c["kind"] == "pc")
        player.send_json(
            {"type": "action", "op": "apply_hp_delta", "payload": {"id": pc_id, "delta": -7}}
        )
        dm_state = dm.receive_json()["state"]
        player.receive_json()
        assert next(c for c in dm_state["combatants"] if c["id"] == pc_id)["hp"] == 39

        # player may not touch the monster
        gob_id = gob_pl["id"]
        player.send_json(
            {"type": "action", "op": "apply_hp_delta", "payload": {"id": gob_id, "delta": -5}}
        )
        assert player.receive_json()["type"] == "error"
