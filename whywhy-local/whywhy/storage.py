"""Local-only SQLite learning event journal for *synthetic demo* participants."""
from __future__ import annotations

import json
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    def __init__(self, db_path: str):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as conn:
            conn.executescript('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL,
                grade INTEGER NOT NULL, alias TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                kind TEXT NOT NULL, content TEXT NOT NULL,
                source TEXT NOT NULL DEFAULT 'student', created_at TEXT NOT NULL,
                UNIQUE(session_id, kind)
            );
            CREATE TABLE IF NOT EXISTS reviews (
                session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
                decision TEXT NOT NULL, note TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            ''')

    def connection(self):
        conn = sqlite3.connect(self.db_path, timeout=5)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def create_session(self, grade: int) -> dict:
        sid = secrets.token_urlsafe(14)
        with self.connection() as conn:
            conn.execute(
                "INSERT INTO sessions(id, lesson_id, grade, alias, created_at) VALUES(?,?,?,?,?)",
                (sid, "why-ask-001", grade, "체험 학생", now_iso()),
            )
            conn.commit()
        return self.get_session(sid)

    def get_session(self, sid: str) -> dict | None:
        with self.connection() as conn:
            s = conn.execute("SELECT * FROM sessions WHERE id=?", (sid,)).fetchone()
            if s is None:
                return None
            evs = conn.execute("SELECT kind, content, source, created_at FROM events WHERE session_id=? ORDER BY id", (sid,)).fetchall()
            r = conn.execute("SELECT decision, note, updated_at FROM reviews WHERE session_id=?", (sid,)).fetchone()
        return {**dict(s), "events": [dict(e) for e in evs], "review": dict(r) if r else None}

    def append_event(self, sid: str, kind: str, content: str) -> dict:
        with self.connection() as conn:
            conn.execute(
                "INSERT INTO events(session_id, kind, content, created_at) VALUES(?,?,?,?)",
                (sid, kind, content, now_iso()),
            )
            conn.commit()
        return self.get_session(sid)

    def list_sessions(self) -> list[dict]:
        with self.connection() as conn:
            rows = conn.execute('''
            SELECT s.id,s.lesson_id,s.grade,s.alias,s.created_at,
                   COUNT(e.id) AS event_count, r.decision
            FROM sessions s
            LEFT JOIN events e ON e.session_id=s.id
            LEFT JOIN reviews r ON r.session_id=s.id
            GROUP BY s.id ORDER BY s.created_at DESC
            ''').fetchall()
        return [dict(r) for r in rows]

    def review(self, sid: str, decision: str, note: str) -> dict:
        with self.connection() as conn:
            conn.execute('''
            INSERT INTO reviews(session_id,decision,note,updated_at) VALUES(?,?,?,?)
            ON CONFLICT(session_id) DO UPDATE SET
              decision=excluded.decision, note=excluded.note, updated_at=excluded.updated_at
            ''', (sid, decision, note, now_iso()))
            conn.commit()
        return self.get_session(sid)

    def delete(self, sid: str) -> bool:
        with self.connection() as conn:
            n = conn.execute("DELETE FROM sessions WHERE id=?", (sid,)).rowcount
            conn.commit()
        return bool(n)
