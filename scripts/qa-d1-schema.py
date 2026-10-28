"""Isolated SQLite contract evidence for the generated D1 migration candidate, not app parity."""
import json
import pathlib
import sqlite3
from datetime import datetime, timezone

root = pathlib.Path(__file__).resolve().parents[1]
db = sqlite3.connect(":memory:")
db.executescript((root / "cloudflare/d1/migrations/0001_schema_candidate.sql").read_text())
db.executescript((root / "cloudflare/d1/migrations/0003_domain_invariants.sql").read_text())
checks = []

def check(name, fn):
    fn()
    checks.append({"name": name, "status": "PASS"})

def denied(sql, parameters=()):
    try:
        db.execute(sql, parameters)
    except sqlite3.IntegrityError:
        return
    raise AssertionError("Expected database integrity denial")

def counts():
    assert db.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0] == 29
    assert db.execute("SELECT count(*) FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").fetchone()[0] == 40
check("29 application tables and 40 explicit indexes", counts)

db.execute('INSERT INTO "User"(id,updatedAt) VALUES(?,?)', ("qa-d1-owner", "2026-10-28T00:00:00Z"))
build = 'INSERT INTO "Build"(id,authorId,title,description,contentType,region,strategy,patchNotes,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)'
parameters = ("qa-d1-build", "qa-d1-owner", "Fixture", "", "Other", "europe", "", "", "2026-10-28T00:00:00Z")
db.execute(build, parameters)

def defaults():
    row = db.execute('SELECT visibility,version,equipmentSets FROM "Build" WHERE id=?', ("qa-d1-build",)).fetchone()
    assert row == ("PRIVATE", 1, "[]"), row
check("new builds default to private and retain JSON equipment sets", defaults)
check("foreign author references rejected", lambda: denied(build, ("qa-orphan", "missing-user", *parameters[2:])))
check("unknown visibility rejected", lambda: denied('UPDATE "Build" SET visibility=? WHERE id=?', ("UNKNOWN", "qa-d1-build")))
check("malformed JSON rejected", lambda: denied('UPDATE "Build" SET equipmentSets=? WHERE id=?', ("{broken", "qa-d1-build")))

gear = 'INSERT INTO "BuildEquipment"(id,buildId,slot,itemId,quality,abilities,alternatives) VALUES(?,?,?,?,?,?,?)'
db.execute(gear, ("qa-gear", "qa-d1-build", "Main hand", "T4_MAIN_AXE", 1, "", ""))
check("scalar alternatives require JSON arrays", lambda: denied('UPDATE "BuildEquipment" SET alternativeItemIds=? WHERE id=?', ('{"wrong":"object"}', "qa-gear")))

def independent_sets():
    value = [{"id": "spare", "name": "Helmet swap", "equipment": [{"slot": "HELMET", "itemId": "T4_HEAD_CLOTH_SET1", "skills": "recorded-spells"}]}]
    db.execute('UPDATE "Build" SET equipmentSets=? WHERE id=?', (json.dumps(value), "qa-d1-build"))
    assert json.loads(db.execute('SELECT equipmentSets FROM "Build" WHERE id=?', ("qa-d1-build",)).fetchone()[0]) == value
check("independent gear sets and spell data survive JSON round-trip", independent_sets)
check("unique build-slot identity enforced", lambda: denied(gear, ("qa-duplicate", "qa-d1-build", "Main hand", "T4_MAIN_SWORD", 1, "", "")))

def cascade():
    db.execute('DELETE FROM "User" WHERE id=?', ("qa-d1-owner",))
    assert db.execute('SELECT count(*) FROM "Build"').fetchone()[0] == 0
    assert db.execute('SELECT count(*) FROM "BuildEquipment"').fetchone()[0] == 0
    assert not db.execute("PRAGMA foreign_key_check").fetchall()
check("ownership cascade removes dependent gear without foreign-key errors", cascade)
report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "status": "PASS", "checks": checks, "scope": "In-memory SQLite migration constraints and round-trips only; not Prisma D1 transactions, authorization or production restore evidence"}
(root / ".qa/cloudflare-launch").mkdir(parents=True, exist_ok=True)
(root / ".qa/cloudflare-launch/d1-schema-qa.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report))
