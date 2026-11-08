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
db.executescript((root / "cloudflare/d1/migrations/0006_billing_checkout.sql").read_text())
db.executescript((root / "cloudflare/d1/migrations/0007_library_likes.sql").read_text())
db.executescript((root / "cloudflare/d1/migrations/0008_admin_controls.sql").read_text())
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
    assert db.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0] == 33
    assert db.execute("SELECT count(*) FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").fetchone()[0] == 47
check("33 application tables and 47 explicit indexes including staff access controls", counts)

def legacy_v2_upgrade():
    # A separate disposable in-memory database only. Remove its fresh, empty
    # new table to reproduce the exact previous29-application-table/v2 shape.
    legacy = sqlite3.connect(":memory:")
    try:
        legacy.executescript((root / "cloudflare/d1/migrations/0001_schema_candidate.sql").read_text())
        legacy.execute('DROP TABLE "GroupLootSplit"')
        legacy.execute('DROP INDEX "User_stripeCustomerId_key"')
        legacy.execute('DROP INDEX "User_stripeSubscriptionId_key"')
        for column in ["plan", "planStatus", "planRenewsAt", "stripeCustomerId", "stripeSubscriptionId"]:
            legacy.execute(f'ALTER TABLE "User" DROP COLUMN "{column}"')
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
        legacy.executescript((root / "cloudflare/d1/migrations/0005_supporter_plan.sql").read_text())
        legacy.execute('UPDATE _outpost_schema SET version=4 WHERE version IN (1,2,3)')
        assert legacy.execute('SELECT version FROM _outpost_schema').fetchone()[0] == 4
        assert legacy.execute('SELECT plan, stripeCustomerId FROM "User" WHERE id=?', ("legacy-owner",)).fetchone() == ("FREE", None)
        assert legacy.execute("SELECT count(*) FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").fetchone()[0] == 43
        assert not legacy.execute('PRAGMA foreign_key_check').fetchall()
    finally:
        legacy.close()
check("old29-table SQLite v2 upgrades to v3 and v4 without changing existing user/team/build/gear", legacy_v2_upgrade)

def billing_checkout_upgrade():
    legacy = sqlite3.connect(":memory:")
    backup = sqlite3.connect(":memory:")
    restored = sqlite3.connect(":memory:")
    try:
        legacy.executescript((root / "cloudflare/d1/migrations/0001_schema_candidate.sql").read_text())
        legacy.execute('CREATE TABLE _outpost_schema(version INTEGER NOT NULL PRIMARY KEY)')
        legacy.execute('INSERT INTO _outpost_schema VALUES(4)')
        legacy.execute('INSERT INTO "User"(id,name,updatedAt,plan,stripeCustomerId,stripeSubscriptionId) VALUES(?,?,?,?,?,?)', ("billing-owner", "Retained paid account", "2026-11-02T00:00:00Z", "SUPPORTER", "cus_fixture", "sub_fixture"))
        legacy.commit()
        before = legacy.execute('SELECT * FROM "User"').fetchall()
        legacy.backup(backup)
        migration = (root / "cloudflare/d1/migrations/0006_billing_checkout.sql").read_text()
        legacy.execute("BEGIN")
        legacy.execute(migration)
        legacy.rollback()
        assert "billingCheckout" not in [row[1] for row in legacy.execute('PRAGMA table_info("User")')]
        assert legacy.execute('SELECT * FROM "User"').fetchall() == before
        legacy.executescript(migration)
        legacy.execute('UPDATE _outpost_schema SET version=5 WHERE version=4')
        assert legacy.execute('SELECT version FROM _outpost_schema').fetchone() == (5,)
        assert [row[:-1] for row in legacy.execute('SELECT * FROM "User"')] == before
        assert legacy.execute('SELECT billingCheckout FROM "User"').fetchone() == (None,)
        legacy.execute('UPDATE "User" SET billingCheckout=?', ('{"key":"fixture"}',))
        assert json.loads(legacy.execute('SELECT billingCheckout FROM "User"').fetchone()[0]) == {"key": "fixture"}
        likes_migration = (root / "cloudflare/d1/migrations/0007_library_likes.sql").read_text()
        legacy.commit()
        retained = legacy.execute('SELECT * FROM "User"').fetchall()
        legacy.execute("BEGIN")
        for statement in "\n".join(line for line in likes_migration.splitlines() if not line.lstrip().startswith("--")).split(";"):
            if statement.strip(): legacy.execute(statement)
        legacy.rollback()
        assert not legacy.execute("SELECT name FROM sqlite_master WHERE name='LibraryLike'").fetchall()
        legacy.executescript(likes_migration)
        legacy.execute('UPDATE _outpost_schema SET version=6 WHERE version=5')
        assert legacy.execute('SELECT version FROM _outpost_schema').fetchone() == (6,)
        assert legacy.execute('SELECT * FROM "User"').fetchall() == retained
        assert legacy.execute('SELECT count(*) FROM "LibraryLike"').fetchone() == (0,)
        backup.backup(restored)
        assert restored.execute('SELECT * FROM "User"').fetchall() == before
        assert restored.execute('SELECT version FROM _outpost_schema').fetchone() == (4,)
    finally:
        restored.close()
        backup.close()
        legacy.close()
check("SQLite v4-v6 additive upgrades preserve billing rows, support rollback and restore", billing_checkout_upgrade)

def admin_controls_upgrade():
    old = sqlite3.connect(":memory:")
    backup = sqlite3.connect(":memory:")
    restored = sqlite3.connect(":memory:")
    try:
        for file in ["0001_schema_candidate.sql", "0003_domain_invariants.sql", "0004_team_loot_splits.sql", "0006_billing_checkout.sql", "0007_library_likes.sql"]:
            old.executescript((root / "cloudflare/d1/migrations" / file).read_text())
        old.execute('INSERT INTO "User"(id,name,updatedAt,plan,stripeCustomerId) VALUES(?,?,?,?,?)', ("admin-upgrade", "Retained fixture", "2026-11-05T00:00:00Z", "SUPPORTER", "cus_fixture"))
        old.execute('INSERT INTO "Account"(id,userId,type,provider,providerAccountId) VALUES(?,?,?,?,?)', ("admin-account", "admin-upgrade", "oauth", "discord", "123456789012345678"))
        old.execute('INSERT INTO "Session"(id,userId,sessionToken,expires) VALUES(?,?,?,?)', ("admin-session", "admin-upgrade", "local-fixture-only", "2027-01-01T00:00:00Z"))
        old.commit()
        names=["User", "Account", "Session"]
        before={name:old.execute(f'SELECT * FROM "{name}"').fetchall() for name in names}
        old.backup(backup)
        sql=(root / "cloudflare/d1/migrations/0008_admin_controls.sql").read_text()
        old.execute("BEGIN")
        for statement in "\n".join(line for line in sql.splitlines() if not line.lstrip().startswith("--")).split(";"):
            if statement.strip():old.execute(statement)
        old.rollback()
        assert "bannedAt" not in [r[1] for r in old.execute('PRAGMA table_info("User")')]
        assert {name:old.execute(f'SELECT * FROM "{name}"').fetchall() for name in names}==before
        old.executescript(sql)
        assert [r[:-4] for r in old.execute('SELECT * FROM "User"')]==before["User"]
        for name in ["Account","Session"]:assert old.execute(f'SELECT * FROM "{name}"').fetchall()==before[name]
        assert old.execute('SELECT supporterGiftUntil,supporterGiftPermanent,bannedAt,bannedUntil FROM "User"').fetchone()==(None,0,None,None)
        backup.backup(restored)
        assert {name:restored.execute(f'SELECT * FROM "{name}"').fetchall() for name in names}==before
        assert "bannedAt" not in [r[1] for r in restored.execute('PRAGMA table_info("User")')]
    finally:
        restored.close();backup.close();old.close()
check("Private admin upgrade preserves paid accounts, OAuth links and sessions, rolls back and restores", admin_controls_upgrade)

def current_schema_candidate():
    candidate = sqlite3.connect(":memory:")
    try:
        candidate.executescript((root / "cloudflare/d1/current-schema.sql").read_text())
        candidate.execute('INSERT INTO "User"(id,updatedAt) VALUES(?,?)', ("candidate", "2026-11-02T00:00:00Z"))
        assert candidate.execute('SELECT billingCheckout FROM "User"').fetchone() == (None,)
    finally:
        candidate.close()
check("regenerated current schema supports fresh accounts without rewriting migration history", current_schema_candidate)

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

def library_likes():
    db.execute('INSERT INTO "LibraryLike"(id,userId,kind,slug) VALUES(?,?,?,?)', ("like-1", "qa-d1-owner", "build", "battleaxe-mist-build"))
    denied('INSERT INTO "LibraryLike"(id,userId,kind,slug) VALUES(?,?,?,?)', ("like-2", "qa-d1-owner", "build", "battleaxe-mist-build"))
    denied('INSERT INTO "LibraryLike"(id,userId,kind,slug) VALUES(?,?,?,?)', ("like-3", "qa-d1-owner", "bad-kind", "battleaxe-mist-build"))
    denied('INSERT INTO "LibraryLike"(id,userId,kind,slug) VALUES(?,?,?,?)', ("like-4", "missing-owner", "build", "battleaxe-mist-build"))
check("account library like identity, kind and foreign-key constraints", library_likes)

def clear_oauth_tokens():
    db.execute('INSERT INTO "Account"(id,userId,type,provider,providerAccountId,access_token,refresh_token,id_token) VALUES(?,?,?,?,?,?,?,?)', ("acct-tokens", "qa-d1-owner", "oauth", "discord", "303585687460904970", "at", "rt", "it"))
    db.executescript((root / "cloudflare/d1/migrations/0009_clear_oauth_tokens.sql").read_text())
    assert db.execute('SELECT access_token, refresh_token, id_token, providerAccountId FROM "Account" WHERE id=?', ("acct-tokens",)).fetchone() == (None, None, None, "303585687460904970")
check("provider tokens are cleared while the account link is kept", clear_oauth_tokens)

def team_crest_upgrade():
    db.execute('INSERT INTO "Group"(id,name,slug,description,region,visibility,ownerId,updatedAt) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)', ("qa-crest-team", "Crest team", "crest-team", "", "europe", "PUBLIC", "qa-d1-owner"))
    db.executescript((root / "cloudflare/d1/migrations/0010_team_crest.sql").read_text())
    assert db.execute('SELECT name, crestItem, crestColor, activities, recruiting FROM "Group" WHERE id=?', ("qa-crest-team",)).fetchone() == ("Crest team", None, None, "", 1)
    db.execute('DELETE FROM "Group" WHERE id=?', ("qa-crest-team",))
check("team crest upgrade keeps teams, leaves crests unset and keeps them recruiting", team_crest_upgrade)

def avatar_frame_upgrade():
    db.execute('INSERT INTO "User"(id,name,updatedAt) VALUES(?,?,CURRENT_TIMESTAMP)', ("qa-frame-user", "Framed"))
    db.executescript((root / "cloudflare/d1/migrations/0011_avatar_frame.sql").read_text())
    assert db.execute('SELECT name, avatarFrame FROM "User" WHERE id=?', ("qa-frame-user",)).fetchone() == ("Framed", None)
    db.execute('DELETE FROM "User" WHERE id=?', ("qa-frame-user",))
check("avatar frame upgrade keeps players and leaves their frame unset", avatar_frame_upgrade)

def team_roles_upgrade():
    # Old fixed rights: editors (owner/admin/officer) shared content and invited; managers (owner/admin) ran the team.
    # The upgrade must give every existing member exactly those rights through the seeded roles.
    bits = ["manageTeam", "manageRoles", "inviteMembers", "manageRequests", "removeMembers", "manageEvents", "manageComps", "manageLoot", "manageBuilds"]
    editor = {"inviteMembers", "manageEvents", "manageComps", "manageLoot", "manageBuilds"}
    manager = editor | {"manageTeam", "manageRequests", "removeMembers"}
    old = {"ADMIN": manager, "OFFICER": editor, "MEMBER": set()}
    users = {"qa-role-owner": "OWNER", "qa-role-admin": "ADMIN", "qa-role-officer": "OFFICER", "qa-role-member": "MEMBER"}
    for user in users:
        db.execute('INSERT INTO "User"(id,updatedAt) VALUES(?,CURRENT_TIMESTAMP)', (user,))
    for team in ("qa-role-team", "qa-role-other"):
        db.execute('INSERT INTO "Group"(id,name,slug,description,region,ownerId,updatedAt) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)', (team, "Role team", team, "", "europe", "qa-role-owner"))
    for user, role in users.items():
        db.execute('INSERT INTO "GroupMember"(groupId,userId,role) VALUES(?,?,?)', ("qa-role-team", user, role))
    db.executescript((root / "cloudflare/d1/migrations/0012_team_roles.sql").read_text())
    roles = db.execute('SELECT name, position, isDefault FROM "GroupCustomRole" WHERE groupId=? ORDER BY position DESC', ("qa-role-team",)).fetchall()
    assert roles == [("Admin", 3, 0), ("Officer", 2, 0), ("Member", 1, 1)], roles
    assert db.execute('SELECT count(*) FROM "GroupCustomRole" WHERE groupId=?', ("qa-role-other",)).fetchone()[0] == 3
    for user, role in users.items():
        mask = db.execute('SELECT coalesce(sum(r.permissions),0) FROM "GroupRoleAssignment" a JOIN "GroupCustomRole" r ON r.id=a.roleId WHERE a.groupId=? AND a.userId=?', ("qa-role-team", user)).fetchone()[0]
        held = {key for i, key in enumerate(bits) if mask & (1 << i)}
        if role == "OWNER":
            assert mask == 0  # the Leader holds no role rows: ownership itself grants every right
        else:
            assert held == old[role], (user, held)
    # The managers' old ranking holds: admins above officers above members.
    rank = lambda user: db.execute('SELECT max(r.position) FROM "GroupRoleAssignment" a JOIN "GroupCustomRole" r ON r.id=a.roleId WHERE a.userId=?', (user,)).fetchone()[0]
    assert rank("qa-role-admin") > rank("qa-role-officer") > rank("qa-role-member")
    denied('UPDATE "GroupCustomRole" SET color=? WHERE id=?', ("#ff0000", "role-admin-qa-role-team"))
    denied('UPDATE "GroupCustomRole" SET name=? WHERE id=?', ("x" * 33, "role-admin-qa-role-team"))
    denied('UPDATE "GroupCustomRole" SET permissions=? WHERE id=?', (512, "role-admin-qa-role-team"))
    # A role of one team can never be held in another, and only by a member.
    denied('INSERT INTO "GroupRoleAssignment"(groupId,userId,roleId) VALUES(?,?,?)', ("qa-role-other", "qa-role-admin", "role-admin-qa-role-team"))
    denied('INSERT INTO "GroupRoleAssignment"(groupId,userId,roleId) VALUES(?,?,?)', ("qa-role-other", "qa-role-admin", "role-admin-qa-role-other"))
    db.execute('DELETE FROM "GroupMember" WHERE groupId=? AND userId=?', ("qa-role-team", "qa-role-officer"))
    assert db.execute('SELECT count(*) FROM "GroupRoleAssignment" WHERE userId=?', ("qa-role-officer",)).fetchone()[0] == 0
    db.execute('DELETE FROM "Group" WHERE id IN (?,?)', ("qa-role-team", "qa-role-other"))
    assert db.execute('SELECT count(*) FROM "GroupCustomRole"').fetchone()[0] == 0
    assert db.execute('SELECT count(*) FROM "GroupRoleAssignment"').fetchone()[0] == 0
    for user in users:
        db.execute('DELETE FROM "User" WHERE id=?', (user,))
check("team roles upgrade gives every existing member the same rights, keeps rank and stays inside its team", team_roles_upgrade)

def team_economy_upgrade():
    # Manage wallet (bit 512) goes to exactly the roles that held Manage loot splits (bit 128).
    for user in ("qa-eco-owner", "qa-eco-officer", "qa-eco-member", "qa-eco-out"):
        db.execute('INSERT INTO "User"(id,name,updatedAt) VALUES(?,?,CURRENT_TIMESTAMP)', (user, user))
    db.execute('INSERT INTO "Group"(id,name,slug,description,region,ownerId,updatedAt) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)', ("qa-eco-team", "Economy team", "qa-eco-team", "", "europe", "qa-eco-owner"))
    for user, role in (("qa-eco-owner", "OWNER"), ("qa-eco-officer", "OFFICER"), ("qa-eco-member", "MEMBER")):
        db.execute('INSERT INTO "GroupMember"(groupId,userId,role) VALUES(?,?,?)', ("qa-eco-team", user, role))
    db.executescript((root / "cloudflare/d1/migrations/0012_team_roles.sql").read_text())
    before = dict(db.execute('SELECT name, permissions FROM "GroupCustomRole" WHERE groupId=?', ("qa-eco-team",)).fetchall())
    sql = (root / "cloudflare/d1/migrations/0013_team_economy.sql").read_text()
    db.executescript(sql)
    db.executescript(sql)  # applying it again changes nothing
    after = dict(db.execute('SELECT name, permissions FROM "GroupCustomRole" WHERE groupId=?', ("qa-eco-team",)).fetchall())
    for name, mask in before.items():
        assert after[name] == (mask | 512 if mask & 128 else mask), (name, mask, after[name])
        assert after[name] & ~512 == mask  # nothing else changed
    assert after == {"Admin": 1021, "Officer": 996, "Member": 0}, after
    db.execute('UPDATE "GroupCustomRole" SET permissions=? WHERE id=?', (1023, "role-admin-qa-eco-team"))
    denied('UPDATE "GroupCustomRole" SET permissions=? WHERE id=?', (1024, "role-admin-qa-eco-team"))
    # Ledger: whole, non-zero, bounded silver of a known kind; append-only.
    entry = 'INSERT INTO "GroupWalletEntry"(id,groupId,userId,amount,kind,reason,sourceId,createdById) VALUES(?,?,?,?,?,?,?,?)'
    db.execute(entry, ("qa-eco-1", "qa-eco-team", "qa-eco-member", 1500, "credit", "Fixture", "op:qa-eco-1", "qa-eco-owner"))
    db.execute(entry, ("qa-eco-2", "qa-eco-team", None, 250, "credit", "Fixture pot", "op:qa-eco-2", "qa-eco-owner"))
    db.execute(entry, ("qa-eco-3", "qa-eco-team", "qa-eco-member", -500, "payout", "Paid", "op:qa-eco-3", "qa-eco-owner"))
    for bad in ((0, "credit"), (1.5, "credit"), (10**13, "credit"), (5, "gift"), (5, "flip")):
        denied(entry, ("qa-eco-bad", "qa-eco-team", "qa-eco-member", bad[0], bad[1], "Bad", "op:qa-eco-bad", None))
    denied(entry, ("qa-eco-dup", "qa-eco-team", "qa-eco-member", 1, "credit", "Again", "op:qa-eco-1", None))
    denied('UPDATE "GroupWalletEntry" SET amount=? WHERE id=?', (9999, "qa-eco-1"))
    assert db.execute('SELECT sum(amount) FROM "GroupWalletEntry" WHERE groupId=? AND userId=?', ("qa-eco-team", "qa-eco-member")).fetchone()[0] == 1000
    # Flips: every flip carries its drawn side, calls have no tails player, and there is no stake.
    assert "stake" not in [r[1] for r in db.execute('PRAGMA table_info("GroupCoinFlip")')]
    flip = 'INSERT INTO "GroupCoinFlip"(id,groupId,key,headsId,tailsId,call,outcome) VALUES(?,?,?,?,?,?,?)'
    db.execute(flip, ("qa-flip-1", "qa-eco-team", "qa-flip-key-1", "qa-eco-owner", "qa-eco-member", None, "heads"))
    db.execute(flip, ("qa-flip-2", "qa-eco-team", "qa-flip-key-2", "qa-eco-member", None, "tails", "heads"))
    denied(flip, ("qa-flip-x", "qa-eco-team", "qa-flip-key-1", "qa-eco-owner", "qa-eco-member", None, "tails"))
    denied(flip, ("qa-flip-x", "qa-eco-team", "qa-flip-key-x", "qa-eco-owner", "qa-eco-member", None, None))
    denied(flip, ("qa-flip-x", "qa-eco-team", "qa-flip-key-x", "qa-eco-owner", "qa-eco-member", None, "edge"))
    denied(flip, ("qa-flip-x", "qa-eco-team", "qa-flip-key-x", "qa-eco-owner", "qa-eco-owner", None, "heads"))
    denied(flip, ("qa-flip-x", "qa-eco-team", "qa-flip-key-x", "qa-eco-owner", "qa-eco-member", "heads", "heads"))
    denied(entry, ("qa-eco-flip", "qa-eco-team", "qa-eco-member", 100, "flip", "Stake", "flip:qa-flip-1", None))
    # Rolls: one roll per member, 1-100.
    db.execute('INSERT INTO "GroupLootRoll"(id,groupId,key,title,silver) VALUES(?,?,?,?,?)', ("qa-roll", "qa-eco-team", "qa-roll-key-1", "Bloodletter drop", 90000))
    denied('INSERT INTO "GroupLootRoll"(id,groupId,key,title,silver) VALUES(?,?,?,?,?)', ("qa-roll-2", "qa-eco-team", "qa-roll-key-2", "Bad", -1))
    db.execute('INSERT INTO "GroupLootRollEntry"(rollId,userId,value) VALUES(?,?,?)', ("qa-roll", "qa-eco-member", 77))
    denied('INSERT INTO "GroupLootRollEntry"(rollId,userId,value) VALUES(?,?,?)', ("qa-roll", "qa-eco-member", 12))
    denied('INSERT INTO "GroupLootRollEntry"(rollId,userId,value) VALUES(?,?,?)', ("qa-roll", "qa-eco-owner", 101))
    denied('INSERT INTO "GroupLootRollEntry"(rollId,userId,value) VALUES(?,?,?)', ("qa-roll", "qa-eco-owner", 0))
    # Account deletion takes a player's own entries, flips and rolls; the team takes the rest.
    db.execute('DELETE FROM "User" WHERE id=?', ("qa-eco-member",))
    assert db.execute('SELECT count(*) FROM "GroupWalletEntry" WHERE userId IS NULL').fetchone()[0] == 1
    assert db.execute('SELECT count(*) FROM "GroupLootRollEntry"').fetchone()[0] == 0
    assert db.execute('SELECT count(*) FROM "GroupCoinFlip"').fetchone()[0] == 0
    db.execute('DELETE FROM "Group" WHERE id=?', ("qa-eco-team",))
    for table in ("GroupWalletEntry", "GroupCoinFlip", "GroupLootRoll", "GroupLootRollEntry", "GroupCustomRole"):
        assert db.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0] == 0, table
    for user in ("qa-eco-owner", "qa-eco-officer", "qa-eco-out"):
        db.execute('DELETE FROM "User" WHERE id=?', (user,))
    assert not db.execute("PRAGMA foreign_key_check").fetchall()
check("team economy upgrade gives Manage wallet to Manage loot holders only and enforces ledger, stake-free flip and roll rules", team_economy_upgrade)

def team_guild_tax_upgrade():
    db.execute('INSERT INTO "User"(id,name,updatedAt) VALUES(?,?,CURRENT_TIMESTAMP)', ("qa-tax-owner", "Tax owner"))
    db.execute('INSERT INTO "Group"(id,name,slug,description,region,ownerId,updatedAt) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)', ("qa-tax-team", "Tax team", "qa-tax-team", "Kept", "europe", "qa-tax-owner"))
    db.executescript((root / "cloudflare/d1/migrations/0014_team_guild_tax.sql").read_text())
    # Existing teams keep everything and start with no tax.
    assert db.execute('SELECT name, description, guildTaxPercent FROM "Group" WHERE id=?', ("qa-tax-team",)).fetchone() == ("Tax team", "Kept", 0)
    for ok in (0, 0.1, 0.7, 12.5, 99.9, 100):
        db.execute('UPDATE "Group" SET guildTaxPercent=? WHERE id=?', (ok, "qa-tax-team"))
    for bad in (-0.1, 100.1, 12.34, 0.05):
        denied('UPDATE "Group" SET guildTaxPercent=? WHERE id=?', (bad, "qa-tax-team"))
    denied('INSERT INTO "Group"(id,name,slug,description,region,ownerId,updatedAt,guildTaxPercent) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP,?)', ("qa-tax-bad", "Bad", "qa-tax-bad", "", "europe", "qa-tax-owner", 101))
    # Other columns still update freely.
    db.execute('UPDATE "Group" SET name=? WHERE id=?', ("Tax team renamed", "qa-tax-team"))
    db.execute('DELETE FROM "Group" WHERE id=?', ("qa-tax-team",))
    db.execute('DELETE FROM "User" WHERE id=?', ("qa-tax-owner",))
check("team guild tax upgrade keeps teams at 0% and enforces 0-100 with one decimal", team_guild_tax_upgrade)

def giveaways_upgrade():
    # Manage giveaways (bit 1024) goes to exactly the roles that held Manage team (bit 1).
    for user in ("qa-gw-owner", "qa-gw-admin", "qa-gw-member", "qa-gw-player", "qa-gw-staff"):
        db.execute('INSERT INTO "User"(id,name,updatedAt) VALUES(?,?,CURRENT_TIMESTAMP)', (user, user))
    db.execute('INSERT INTO "Group"(id,name,slug,description,region,ownerId,updatedAt) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)', ("qa-gw-team", "Giveaway team", "qa-gw-team", "", "europe", "qa-gw-owner"))
    for user, role in (("qa-gw-owner", "OWNER"), ("qa-gw-admin", "ADMIN"), ("qa-gw-member", "MEMBER")):
        db.execute('INSERT INTO "GroupMember"(groupId,userId,role) VALUES(?,?,?)', ("qa-gw-team", user, role))
    db.executescript((root / "cloudflare/d1/migrations/0012_team_roles.sql").read_text())  # seeds this team's roles
    before = dict(db.execute('SELECT name, permissions FROM "GroupCustomRole" WHERE groupId=?', ("qa-gw-team",)).fetchall())
    sql = (root / "cloudflare/d1/migrations/0016_giveaways.sql").read_text()
    db.executescript(sql)
    db.executescript(sql)  # applying it again changes nothing
    after = dict(db.execute('SELECT name, permissions FROM "GroupCustomRole" WHERE groupId=?', ("qa-gw-team",)).fetchall())
    for name, mask in before.items():
        assert after[name] == (mask | 1024 if mask & 1 else mask), (name, mask, after[name])
    assert after["Admin"] & 1024 and not after["Officer"] & 1024 and after["Member"] == 0, after
    db.execute('UPDATE "GroupCustomRole" SET permissions=? WHERE id=?', (2047, "role-admin-qa-gw-team"))
    denied('UPDATE "GroupCustomRole" SET permissions=? WHERE id=?', (2048, "role-admin-qa-gw-team"))
    # Domain: bounded text, 1-50 winners, a real server, a known state that matches its timestamps.
    giveaway = 'INSERT INTO "Giveaway"(id,groupId,title,prize,region,winnerCount,closesAt,createdById,updatedAt,status,drawnAt,cancelledAt,image) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?,?,?,?)'
    ok = ("qa-gw-site", None, "Weekend mount", "One T8 Swiftclaw", "europe", 2, "2026-11-10T00:00:00Z", "qa-gw-staff", "OPEN", None, None, "trophy-gold")
    db.execute(giveaway, ok)
    db.execute(giveaway, ("qa-gw-teamone", "qa-gw-team", "Team raffle", "A bag of silver", "europe", 1, "2026-11-10T00:00:00Z", "qa-gw-admin", "OPEN", None, None, None))
    for bad in ({2: "ab"}, {3: ""}, {3: "x" * 501}, {4: "mars"}, {5: 0}, {5: 51}, {8: "WON"}, {8: "DRAWN"}, {8: "CANCELLED"}, {8: "OPEN", 9: "2026-11-10T00:00:00Z"}, {11: "x" * 41}):
        row = list(ok)
        row[0] = "qa-gw-bad"
        for index, value in bad.items():
            row[index] = value
        denied(giveaway, tuple(row))
    denied('INSERT INTO "Giveaway"(id,groupId,title,prize,region,winnerCount,closesAt,updatedAt) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)', ("qa-gw-orphan", "missing-team", "Orphan", "None", "europe", 1, "2026-11-10T00:00:00Z"))
    # One entry per player per giveaway, never entered as a winner.
    entry = 'INSERT INTO "GiveawayEntry"(giveawayId,userId) VALUES(?,?)'
    for user in ("qa-gw-player", "qa-gw-member", "qa-gw-admin"):
        db.execute(entry, ("qa-gw-site", user))
    denied(entry, ("qa-gw-site", "qa-gw-player"))
    denied('INSERT INTO "GiveawayEntry"(giveawayId,userId,winnerPosition) VALUES(?,?,?)', ("qa-gw-site", "qa-gw-owner", 1))
    denied(entry, ("qa-gw-site", "missing-user"))
    # The draw: places are unique and 1-50, marked while open, then the giveaway closes.
    win = 'UPDATE "GiveawayEntry" SET winnerPosition=? WHERE giveawayId=? AND userId=?'
    denied(win, (0, "qa-gw-site", "qa-gw-player"))
    denied(win, (51, "qa-gw-site", "qa-gw-player"))
    db.execute(win, (1, "qa-gw-site", "qa-gw-player"))
    denied(win, (1, "qa-gw-site", "qa-gw-member"))
    db.execute(win, (2, "qa-gw-site", "qa-gw-member"))
    denied(win, (3, "qa-gw-site", "qa-gw-player"))  # a place once drawn never moves
    denied('UPDATE "Giveaway" SET status=? WHERE id=?', ("DRAWN", "qa-gw-site"))  # needs its draw time
    db.execute('UPDATE "Giveaway" SET status=?, drawnAt=?, drawnById=? WHERE id=?', ("DRAWN", "2026-11-10T00:01:00Z", "qa-gw-staff", "qa-gw-site"))
    # After the draw the winner list and the giveaway are final.
    denied(win, (3, "qa-gw-site", "qa-gw-admin"))
    denied(win, (None, "qa-gw-site", "qa-gw-player"))
    denied(entry, ("qa-gw-site", "qa-gw-owner"))
    for change in (("status", "OPEN"), ("title", "Changed"), ("winnerCount", 5), ("drawnAt", "2026-11-11T00:00:00Z"), ("drawnById", "qa-gw-player")):
        denied(f'UPDATE "Giveaway" SET {change[0]}=? WHERE id=?', (change[1], "qa-gw-site"))
    assert db.execute('SELECT userId, winnerPosition FROM "GiveawayEntry" WHERE giveawayId=? AND winnerPosition IS NOT NULL ORDER BY winnerPosition', ("qa-gw-site",)).fetchall() == [("qa-gw-player", 1), ("qa-gw-member", 2)]
    db.execute(entry, ("qa-gw-teamone", "qa-gw-member"))
    # A cancelled giveaway is final too.
    db.execute('UPDATE "Giveaway" SET status=?, cancelledAt=? WHERE id=?', ("CANCELLED", "2026-11-09T00:00:00Z", "qa-gw-teamone"))
    denied('UPDATE "Giveaway" SET status=?, cancelledAt=NULL WHERE id=?', ("OPEN", "qa-gw-teamone"))
    denied(entry, ("qa-gw-teamone", "qa-gw-member"))
    # Account deletion takes a player's entries and clears who created or drew; the result stands.
    db.execute('DELETE FROM "User" WHERE id=?', ("qa-gw-staff",))
    assert db.execute('SELECT status, createdById, drawnById FROM "Giveaway" WHERE id=?', ("qa-gw-site",)).fetchone() == ("DRAWN", None, None)
    db.execute('DELETE FROM "User" WHERE id=?', ("qa-gw-player",))
    assert db.execute('SELECT count(*) FROM "GiveawayEntry" WHERE giveawayId=?', ("qa-gw-site",)).fetchone()[0] == 2
    # Deleting a team takes its giveaways and their entries; site-wide giveaways stay.
    db.execute('DELETE FROM "Group" WHERE id=?', ("qa-gw-team",))
    assert db.execute('SELECT id FROM "Giveaway"').fetchall() == [("qa-gw-site",)]
    assert db.execute('SELECT count(*) FROM "GiveawayEntry" WHERE giveawayId=?', ("qa-gw-teamone",)).fetchone()[0] == 0
    db.execute('DELETE FROM "Giveaway" WHERE id=?', ("qa-gw-site",))
    assert db.execute('SELECT count(*) FROM "GiveawayEntry"').fetchone()[0] == 0
    for user in ("qa-gw-owner", "qa-gw-admin", "qa-gw-member"):
        db.execute('DELETE FROM "User" WHERE id=?', (user,))
    assert not db.execute("PRAGMA foreign_key_check").fetchall()
check("giveaways upgrade gives Manage giveaways to Manage team holders, keeps one entry each and freezes the draw", giveaways_upgrade)

def cascade():
    db.execute('DELETE FROM "User" WHERE id=?', ("qa-d1-owner",))
    assert db.execute('SELECT count(*) FROM "Build"').fetchone()[0] == 0
    assert db.execute('SELECT count(*) FROM "BuildEquipment"').fetchone()[0] == 0
    assert db.execute('SELECT count(*) FROM "LibraryLike"').fetchone()[0] == 0
    assert not db.execute("PRAGMA foreign_key_check").fetchall()
check("ownership cascade removes dependent gear without foreign-key errors", cascade)
report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "status": "PASS", "checks": checks, "scope": "In-memory SQLite migration constraints and round-trips only; not Prisma D1 transactions, authorization or production restore evidence"}
(root / ".qa/cloudflare-launch").mkdir(parents=True, exist_ok=True)
(root / ".qa/cloudflare-launch/d1-schema-qa.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report))
