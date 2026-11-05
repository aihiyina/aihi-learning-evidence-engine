"""WHYWHY 0.1 local development server. Do not expose publicly or use real pupils."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .core import LESSON, STEPS, ValidationError, evidence_summary, expected_kind, prompt_for, validate_entry
from .storage import Store

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB = str(BASE_DIR / ".demo" / "whywhy.sqlite3")


class StartRequest(BaseModel):
    grade: int = Field(ge=3, le=4)


class EventRequest(BaseModel):
    kind: str
    content: str


class ReviewRequest(BaseModel):
    decision: str
    note: str = ""


def create_app(db_path: str | None = None) -> FastAPI:
    app = FastAPI(title="WHYWHY Development Prototype", version="0.1.0")
    store = Store(db_path or os.environ.get("WHYWHY_DB", DEFAULT_DB))

    def require_session(sid: str):
        s = store.get_session(sid)
        if not s:
            raise HTTPException(404, "해당 체험 기록을 찾을 수 없어.")
        return s

    def details(s: dict) -> dict:
        return {**s, "next": prompt_for(s["events"]), "evidence": evidence_summary(s["events"])}

    @app.get("/")
    def index():
        return FileResponse(str(BASE_DIR / "static" / "index.html"))

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon():
        raise HTTPException(404)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "mode": "DEMO_ONLY", "live_model": False, "version": "0.1.0"}

    @app.get("/api/lesson")
    def lesson():
        return {**LESSON, "steps": [{"kind": kind, "label": label} for kind, label, *_ in STEPS]}

    @app.post("/api/sessions", status_code=201)
    def create(request: StartRequest):
        return details(store.create_session(request.grade))

    @app.get("/api/sessions")
    def all_sessions():
        # Deliberately unauthenticated DEMO ONLY. Production requires teacher role checks.
        return store.list_sessions()

    @app.get("/api/sessions/{sid}")
    def get(sid: str):
        return details(require_session(sid))

    @app.post("/api/sessions/{sid}/events")
    def event(sid: str, request: EventRequest):
        s = require_session(sid)
        expected = expected_kind(s["events"])
        if expected is None:
            raise HTTPException(409, "이미 끝낸 활동이야. 기록을 선생님과 살펴보자.")
        if request.kind != expected:
            raise HTTPException(409, "첫 생각부터 차근차근 진행해보자.")
        try:
            cleaned = validate_entry(request.content)
        except ValidationError as exc:
            raise HTTPException(422, exc.message) from exc
        try:
            return details(store.append_event(sid, request.kind, cleaned))
        except Exception as exc:
            if "UNIQUE constraint failed" in str(exc):
                raise HTTPException(409, "이미 기록된 단계야.") from exc
            raise

    @app.post("/api/sessions/{sid}/review")
    def review(sid: str, request: ReviewRequest):
        require_session(sid)
        if request.decision not in {"approve", "revise", "reject"}:
            raise HTTPException(422, "승인·수정·반려 중 하나를 선택해줘.")
        try:
            note = validate_entry(request.note) if request.note.strip() else "교사 검토 완료"
        except ValidationError as exc:
            raise HTTPException(422, exc.message) from exc
        return details(store.review(sid, request.decision, note))

    @app.delete("/api/sessions/{sid}", status_code=204)
    def delete(sid: str):
        if not store.delete(sid):
            raise HTTPException(404, "기록이 없어.")

    return app


app = create_app()
