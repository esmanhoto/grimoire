"""Grimoire backend: serves the built SPA, the API, and the combat WebSocket.

Single trusted LAN table — no auth by design (see docs/plan.md). Role is
declared by the connecting client: the DM dashboard connects as "dm", player
phones as "player". Player connections only ever receive the projected view.
"""

from __future__ import annotations

import asyncio
import os
import socket
from datetime import datetime
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel

from .campaign import CampaignError, CampaignStore
from .combat import CombatEngine, CombatError
from .content import ContentStore
from .seed import seed_if_missing

REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"
CAMPAIGN_DIR = Path(os.environ.get("GRIMOIRE_CAMPAIGN_DIR", REPO_ROOT / "campaign"))

app = FastAPI(title="Grimoire")

engine = CombatEngine()
content = ContentStore(REPO_ROOT / "content")
seed_if_missing(CAMPAIGN_DIR)
campaign = CampaignStore(CAMPAIGN_DIR)


class Hub:
    """Tracks live WebSocket connections and broadcasts role-appropriate state."""

    def __init__(self) -> None:
        self.connections: dict[WebSocket, str] = {}
        self.lock = asyncio.Lock()

    async def join(self, ws: WebSocket, role: str) -> None:
        async with self.lock:
            self.connections[ws] = role

    async def leave(self, ws: WebSocket) -> None:
        async with self.lock:
            self.connections.pop(ws, None)

    async def broadcast_state(self) -> None:
        full = {"type": "state", "state": engine.full_view()}
        projected = {"type": "state", "state": engine.player_view()}
        async with self.lock:
            targets = list(self.connections.items())
        for ws, role in targets:
            try:
                await ws.send_json(full if role == "dm" else projected)
            except Exception:
                await self.leave(ws)


hub = Hub()


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "app": "grimoire"}


def _lan_ip() -> str:
    """The machine's LAN address — what phones on the same network dial."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # no packets sent; just picks the route
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


@app.get("/api/server-info")
async def server_info() -> dict:
    port = int(os.environ.get("GRIMOIRE_PORT", "8010"))
    return {"lanUrl": f"http://{_lan_ip()}:{port}"}


@app.get("/api/combat")
async def combat_state(view: str = "dm") -> dict:
    return engine.player_view() if view == "players" else engine.full_view()


@app.get("/api/content/index")
async def content_index() -> dict:
    return {"entries": content.index, "counts": content.counts()}


@app.get("/api/content/{kind}/{entry_id}")
async def content_entry(kind: str, entry_id: str) -> dict:
    entry = content.get(kind, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"no {kind} '{entry_id}'")
    return entry


# -- campaign wiki ----------------------------------------------------------


class EntityCreate(BaseModel):
    type: str
    name: str
    fields: dict = {}
    body: str = ""


class EntityUpdate(BaseModel):
    name: str | None = None
    fields: dict | None = None
    body: str | None = None


@app.get("/api/campaign")
async def campaign_index() -> dict:
    return {"entities": campaign.index()}


@app.get("/api/party")
async def party() -> dict:
    return {"party": campaign.party()}


@app.get("/api/campaign/{entity_id}")
async def campaign_entity(entity_id: str) -> dict:
    entity = campaign.get(entity_id)
    if entity is None:
        raise HTTPException(status_code=404, detail=f"no entity '{entity_id}'")
    return entity


@app.get("/api/session/active")
async def session_active() -> dict:
    return {"session": campaign.active_session()}


@app.post("/api/campaign/{entity_id}/arm")
async def session_arm(entity_id: str) -> dict:
    try:
        return campaign.arm_session(entity_id)
    except CampaignError as e:
        raise HTTPException(status_code=400, detail=str(e))


class NoteAdd(BaseModel):
    text: str


@app.post("/api/session/active/notes")
async def session_add_note(req: NoteAdd) -> dict:
    active = campaign.active_session()
    if active is None:
        raise HTTPException(status_code=400, detail="no armed session")
    notes = list(active["fields"].get("notes") or [])
    notes.append({"time": datetime.now().strftime("%H:%M"), "text": req.text.strip()})
    return campaign.update(active["id"], fields={"notes": notes})


class DdbImport(BaseModel):
    idOrUrl: str


@app.post("/api/import/dndbeyond")
def import_dndbeyond(req: DdbImport) -> dict:
    from .dndbeyond import (
        ImportError_, extract_id, fetch_character, fetch_official_source_ids, map_character,
    )

    try:
        data = fetch_character(extract_id(req.idOrUrl))
        name, fields, body = map_character(data, fetch_official_source_ids())
        return campaign.create("pc", name, fields, body)
    except (ImportError_, CampaignError) as e:
        raise HTTPException(status_code=400, detail=str(e))


class DdbResync(BaseModel):
    id: str


@app.post("/api/import/dndbeyond/resync")
def resync_dndbeyond(req: DdbResync) -> dict:
    """Re-fetch an imported PC from D&D Beyond and update its DDB-owned fields.

    Local-only state survives: color, temp HP, notes body, and the entity's
    id/name (combat and wikilinks reference them). Current HP carries damage
    taken across the sync; a max-HP increase raises current HP by the same
    amount.
    """
    from .dndbeyond import ImportError_, fetch_character, fetch_official_source_ids, map_character

    entity = campaign.get(req.id)
    if entity is None:
        raise HTTPException(status_code=404, detail=f"no entity '{req.id}'")
    old = entity.get("fields") or {}
    ddb_id = old.get("ddbId")
    if not ddb_id:
        raise HTTPException(status_code=400, detail="this PC wasn't imported from D&D Beyond")

    try:
        data = fetch_character(str(ddb_id))
        _name, fields, _body = map_character(data, fetch_official_source_ids())
        fields.pop("color", None)
        old_max, old_hp = old.get("maxHp"), old.get("hp")
        if isinstance(old_max, int) and isinstance(old_hp, int):
            fields["hp"] = max(0, min(fields["maxHp"], old_hp + (fields["maxHp"] - old_max)))
        return campaign.update(req.id, fields=fields)
    except (ImportError_, CampaignError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/campaign")
async def campaign_create(req: EntityCreate) -> dict:
    try:
        return campaign.create(req.type, req.name, req.fields, req.body)
    except CampaignError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/campaign/{entity_id}")
async def campaign_update(entity_id: str, req: EntityUpdate) -> dict:
    try:
        return campaign.update(entity_id, name=req.name, fields=req.fields, body=req.body)
    except CampaignError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/campaign/{entity_id}")
async def campaign_delete(entity_id: str) -> dict:
    try:
        campaign.delete(entity_id)
    except CampaignError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"deleted": entity_id}


@app.websocket("/ws/combat")
async def combat_ws(ws: WebSocket, role: str = "player") -> None:
    role = "dm" if role == "dm" else "player"
    await ws.accept()
    await hub.join(ws, role)
    try:
        state = engine.full_view() if role == "dm" else engine.player_view()
        await ws.send_json({"type": "state", "state": state})
        while True:
            msg = await ws.receive_json()
            if msg.get("type") != "action":
                continue
            try:
                engine.apply(msg.get("op", ""), msg.get("payload") or {}, role)
            except CombatError as e:
                await ws.send_json({"type": "error", "message": str(e)})
                continue
            await hub.broadcast_state()
    except WebSocketDisconnect:
        pass
    finally:
        await hub.leave(ws)


# -- SPA serving (production / at-the-table mode) ---------------------------

if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):  # noqa: ANN201 - starlette response types
        candidate = (FRONTEND_DIST / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(FRONTEND_DIST):
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
else:

    @app.get("/", include_in_schema=False)
    async def no_frontend() -> JSONResponse:
        return JSONResponse(
            {"detail": "frontend not built — run `bun run build` in frontend/, or use the Vite dev server"},
            status_code=503,
        )


def run() -> None:
    uvicorn.run(
        "grimoire.main:app",
        host=os.environ.get("GRIMOIRE_HOST", "0.0.0.0"),
        port=int(os.environ.get("GRIMOIRE_PORT", "8010")),
    )


if __name__ == "__main__":
    run()
