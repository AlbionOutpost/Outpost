"""Isolated SQLite contract evidence for the generated D1 migration candidate, not app parity."""
import json
import pathlib
import sqlite3
from datetime import datetime, timezone

root = pathlib.Path(__file__).resolve().parents[1]
db = sqlite3.connect(":memory:")
db.executescript((root / "cloudflare/d1/migrations/0001_schema_candidate.sql").read_text())
db.executescript((root / "cloudflare/d1/migrations/0003_domain_invariants.sql").read_text())
db.executescript((root / "cloudflare/d1/migrations/0004_team_loot_splits.sql").read_text())
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
    assert db.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0] == 30
    assert db.execute("SELECT count(*) FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").fetchone()[0] == 41
check("30 application tables and 41 explicit indexes including team loot", counts)

def legacy_v2_upgrade():
    # A separate disposable in-memory database only. Remove its fresh, empty
    # new table to reproduce the exact previous29-application-table/v2 shape.
    legacy = sqlite3.connect(":memory:")
    try:
        legacy.executescript((root / "cloudflare/d1/migrations/0001_schema_candidate.sql").read_text())
        legacy.execute('DROP TABLE "GroupLootSplit"')
        legacy.executescript((root / "cloudflare/d1/migrations/0003_domain_invariants.sql").read_text())
        assert legacy.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0] == 29
        assert legacy.execute("SELECT count(*) FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").fetchone()[0] == 40
        legacy.execute('CREATE TABLE _outpost_schema (version INTEGER NOT NULL PRIMARY KEY)')
        legacy.execute('INSERT INTO _outpost_schema(version) VALUES (2)')
        legacy.execute('INSERT INTO "User"(id,name,updatedAt) VALUES(?,?,?)', ("legacy-owner", "Existing owner", "2026-10-28T00:00:00Z"))
        legacy.execute('INSERT INTO "Group"(id,name,slug,description,region,ownerId,updatedAt) VALUES(?,?,?,?,?,?,?)', ("legacy-team", "Existing team", "legacy-team", "Preserved team notes", "europe", "legacy-owner", "2026-10-28T00:00:00Z"))
        legacy.execute('INSERT INTO "Build"(id,authorId,title,description,contentType,region,strategy,patchNotes,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)', ("legacy-build", "legacy-owner", "Existing build", "Preserved description", "Other", "europe", "Original strategy", "Original revision", "2026-10-28T00:00:00Z"))
        legacy.execute('INSERT INTO "BuildEquipment"(id,buildId,slot,itemId,quality,abilities,alternatives) VALUES(?,?,?,?,?,?,?)', ("legacy-gear", "legacy-build", "Main hand", "T4_MAIN_AXE", 3, "Preserved notes", ""))
        before = {table: legacy.execute(f'SELECT * FROM "{table}" ORDER BY id').fetchall() for table in ["User", "Group", "Build", "BuildEquipment"]}
        assert legacy.execute('SELECT version FROM _outpost_schema').fetchone()[0] == 2
        legacy.executescript((root / "cloudflare/d1/migrations/0004_team_loot_splits.sql").read_text())
        legacy.execute('UPDATE _outpost_schema SET version=3 WHERE version IN (1,2)')
        assert legacy.execute('SELECT version FROM _outpost_schema').fetchone()[0] == 3
        assert legacy.execute('SELECT count(*) FROM "GroupLootSplit"').fetchone()[0] == 0
        for table, rows in before.items():
            assert legacy.execute(f'SELECT * FROM "{table}" ORDER BY id').fetchall() == rows
        assert not legacy.execute('PRAGMA foreign_key_check').fetchall()
    finally:
        legacy.close()
check("old29-table SQLite v2 upgrades to v3 without changing existing user/team/build/gear", legacy_v2_upgrade)

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

def team_loot_upgrade():
    db.execute('INSERT INTO "Group"(id,name,slug,description,region,ownerId,updatedAt) VALUES(?,?,?,?,?,?,?)', ("qa-loot-team", "Loot team", "qa-loot-team", "", "europe", "qa-d1-owner", "2026-10-29T00:00:00Z"))
    config = json.dumps({"pool": 100, "expenses": [], "participants": [{"userId": "qa-d1-owner", "shares": 1}], "notes": ""})
    db.execute('INSERT INTO "GroupLootSplit"(id,groupId,title,configuration,createdById,updatedAt) VALUES(?,?,?,?,?,?)', ("qa-loot", "qa-loot-team", "Loot fixture", config, "qa-d1-owner", "2026-10-29T00:00:00Z"))
    # Applying the additive upgrade twice retains the exact existing row/data.
    db.executescript((root / "cloudflare/d1/migrations/0004_team_loot_splits.sql").read_text())
    assert db.execute('SELECT configuration,version FROM "GroupLootSplit" WHERE id=?', ("qa-loot",)).fetchone() == (config, 1)
    denied('UPDATE "GroupLootSplit" SET version=0 WHERE id=?', ("qa-loot",))
    denied('UPDATE "GroupLootSplit" SET title=? WHERE id=?', ("x", "qa-loot"))
    denied('UPDATE "GroupLootSplit" SET configuration=? WHERE id=?', ("{broken", "qa-loot"))
    db.execute('DELETE FROM "Group" WHERE id=?', ("qa-loot-team",))
    assert db.execute('SELECT count(*) FROM "GroupLootSplit" WHERE id=?', ("qa-loot",)).fetchone()[0] == 0
check("team loot additive upgrade retains rows, enforces constraints and cascades by team", team_loot_upgrade)
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
