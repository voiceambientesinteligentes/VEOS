"""Persistencia local em SQLite (runtime/, ignorado pelo git).

Cada sala tem historico proprio (coluna room). Nenhuma consulta mistura salas:
toda leitura de mensagens exige a sala explicitamente."""
import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    job_id TEXT,
    meta TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_messages_room ON messages(room, id);
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    room TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'done', 'failed')),
    request TEXT NOT NULL,
    progress TEXT NOT NULL DEFAULT '[]',
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    participants TEXT NOT NULL,
    status TEXT NOT NULL,
    job_id TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS integration_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL CHECK (kind IN ('health', 'probe')),
    target TEXT NOT NULL,
    ok INTEGER NOT NULL,
    evidence TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_integration_checks ON integration_checks(kind, target, id);
CREATE TABLE IF NOT EXISTS cfo_decisions (
    seq INTEGER PRIMARY KEY,
    evento TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    prev TEXT NOT NULL,
    hash TEXT NOT NULL UNIQUE
);
CREATE TRIGGER IF NOT EXISTS cfo_decisions_sem_update BEFORE UPDATE ON cfo_decisions
BEGIN SELECT RAISE(ABORT, 'registro de decisoes e append-only'); END;
CREATE TRIGGER IF NOT EXISTS cfo_decisions_sem_delete BEFORE DELETE ON cfo_decisions
BEGIN SELECT RAISE(ABORT, 'registro de decisoes e append-only'); END;
"""


def now_iso():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


class Store:
    def __init__(self, path):
        self.path = str(path)
        self._lock = threading.RLock()
        self._db = sqlite3.connect(self.path, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        with self._lock:
            if self.path != ":memory:":
                self._db.execute("PRAGMA journal_mode=WAL")
            self._db.execute("PRAGMA foreign_keys=ON")
            self._db.executescript(SCHEMA)
            self._db.commit()

    def close(self):
        with self._lock:
            self._db.close()

    def _exec(self, sql, args=()):
        with self._lock:
            try:
                cur = self._db.execute(sql, args)
            except BaseException:
                self._db.rollback()  # nunca deixa transacao aberta apos erro
                raise
            self._db.commit()
            return cur

    def _all(self, sql, args=()):
        with self._lock:
            return [dict(r) for r in self._db.execute(sql, args).fetchall()]

    # ------------------------------------------------------------ mensagens
    def add_message(self, room, role, author, content, job_id=None, meta=None):
        cur = self._exec(
            "INSERT INTO messages(room, role, author, content, job_id, meta, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (room, role, author, content, job_id, json.dumps(meta or {}, ensure_ascii=False),
             now_iso()))
        return cur.lastrowid

    def messages(self, room, after_id=0, limit=200):
        rows = self._all("SELECT * FROM messages WHERE room = ? AND id > ? ORDER BY id LIMIT ?",
                         (room, int(after_id), int(limit)))
        for r in rows:
            r["meta"] = json.loads(r["meta"])
        return rows

    def recent_messages(self, room, limit):
        rows = self._all("SELECT * FROM messages WHERE room = ? ORDER BY id DESC LIMIT ?",
                         (room, int(limit)))
        rows.reverse()
        for r in rows:
            r["meta"] = json.loads(r["meta"])
        return rows

    def room_counts(self):
        return {r["room"]: r["n"] for r in
                self._all("SELECT room, COUNT(*) AS n FROM messages GROUP BY room")}

    def last_message_at(self):
        return {r["room"]: r["t"] for r in
                self._all("SELECT room, MAX(created_at) AS t FROM messages GROUP BY room")}

    # ------------------------------------------------------------ jobs
    def create_job(self, kind, room, request):
        jid = uuid.uuid4().hex
        t = now_iso()
        self._exec("INSERT INTO jobs(id, kind, room, status, request, created_at, updated_at) "
                   "VALUES (?, ?, ?, 'queued', ?, ?, ?)",
                   (jid, kind, room, json.dumps(request, ensure_ascii=False), t, t))
        return jid

    def job(self, jid):
        rows = self._all("SELECT * FROM jobs WHERE id = ?", (jid,))
        if not rows:
            return None
        j = rows[0]
        j["request"] = json.loads(j["request"])
        j["progress"] = json.loads(j["progress"])
        return j

    def set_job_status(self, jid, status, error=None):
        self._exec("UPDATE jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?",
                   (status, error, now_iso(), jid))

    def add_job_progress(self, jid, step):
        with self._lock:
            j = self.job(jid)
            prog = j["progress"] + [dict(step, at=now_iso())]
            self._exec("UPDATE jobs SET progress = ?, updated_at = ? WHERE id = ?",
                       (json.dumps(prog, ensure_ascii=False), now_iso(), jid))

    def job_counts(self):
        return {r["status"]: r["n"] for r in
                self._all("SELECT status, COUNT(*) AS n FROM jobs GROUP BY status")}

    def fail_interrupted_jobs(self):
        """Jobs que estavam em fila/execucao quando o servidor parou nao sao
        retomados nem respondidos: ficam registrados como falha."""
        cur = self._exec("UPDATE jobs SET status = 'failed', error = ?, updated_at = ? "
                         "WHERE status IN ('queued', 'running')",
                         ("interrompido: servidor reiniciado antes da conclusao", now_iso()))
        self._exec("UPDATE meetings SET status = 'interrompida' WHERE status = 'em andamento'")
        return cur.rowcount

    # ------------------------------------------------------------ reunioes
    def create_meeting(self, topic, participants, job_id):
        mid = uuid.uuid4().hex
        self._exec("INSERT INTO meetings(id, topic, participants, status, job_id, created_at) "
                   "VALUES (?, ?, ?, 'em andamento', ?, ?)",
                   (mid, topic, json.dumps(participants), job_id, now_iso()))
        return mid

    def set_meeting_status(self, mid, status):
        self._exec("UPDATE meetings SET status = ? WHERE id = ?", (status, mid))

    def meetings(self, limit=30):
        rows = self._all("SELECT * FROM meetings ORDER BY created_at DESC LIMIT ?", (int(limit),))
        for r in rows:
            r["participants"] = json.loads(r["participants"])
        return rows

    # ------------------------------------------------------------ configuracoes
    def get_setting(self, key):
        rows = self._all("SELECT value, updated_at FROM settings WHERE key = ?", (key,))
        if not rows:
            return None, None
        return json.loads(rows[0]["value"]), rows[0]["updated_at"]

    def put_setting(self, key, value):
        t = now_iso()
        self._exec("INSERT INTO settings(key, value, updated_at) VALUES (?, ?, ?) "
                   "ON CONFLICT(key) DO UPDATE SET value = excluded.value, "
                   "updated_at = excluded.updated_at",
                   (key, json.dumps(value, ensure_ascii=False), t))
        return t

    def delete_setting(self, key):
        self._exec("DELETE FROM settings WHERE key = ?", (key,))

    # ------------------------------------------------------------ integracoes (evidencia sanitizada)
    def add_integration_check(self, kind, target, ok, evidence):
        cur = self._exec("INSERT INTO integration_checks(kind, target, ok, evidence, created_at) "
                         "VALUES (?, ?, ?, ?, ?)",
                         (kind, target, 1 if ok else 0,
                          json.dumps(evidence, ensure_ascii=False, sort_keys=True), now_iso()))
        return cur.lastrowid

    def latest_integration_checks(self, kind):
        rows = self._all("SELECT c.* FROM integration_checks c JOIN (SELECT target, MAX(id) AS m "
                         "FROM integration_checks WHERE kind = ? GROUP BY target) u "
                         "ON c.id = u.m ORDER BY c.target", (kind,))
        for r in rows:
            r["evidence"] = json.loads(r["evidence"])
            r["ok"] = bool(r["ok"])
        return rows

    # ------------------------------------------------------------ decisoes (append-only)
    def decision_rows(self):
        return self._all("SELECT * FROM cfo_decisions ORDER BY seq")

    def append_decision(self, build):
        """Transacao unica: le a cadeia, chama build(rows) -> (seq, evento, snapshot, prev, hash)
        e insere. Qualquer excecao desfaz tudo."""
        with self._lock:
            self._db.execute("BEGIN IMMEDIATE")
            try:
                rows = [dict(r) for r in
                        self._db.execute("SELECT * FROM cfo_decisions ORDER BY seq").fetchall()]
                row = build(rows)
                self._db.execute("INSERT INTO cfo_decisions(seq, evento, snapshot, prev, hash) "
                                 "VALUES (?, ?, ?, ?, ?)", row)
                self._db.commit()
            except BaseException:
                self._db.rollback()
                raise
            return row
