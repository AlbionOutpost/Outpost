-- Additive private-store upgrade: each team's own roles and who holds them. Existing teams get
-- the old fixed roles as editable ones with the same rights (Postgres 20261107180000_team_roles).
CREATE TABLE IF NOT EXISTS "GroupCustomRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'muted',
    "position" INTEGER NOT NULL,
    "permissions" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupCustomRole_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "GroupRoleAssignment" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    PRIMARY KEY ("roleId", "userId"),
    CONSTRAINT "GroupRoleAssignment_roleId_groupId_fkey" FOREIGN KEY ("roleId", "groupId") REFERENCES "GroupCustomRole" ("id", "groupId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupRoleAssignment_groupId_userId_fkey" FOREIGN KEY ("groupId", "userId") REFERENCES "GroupMember" ("groupId", "userId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "GroupCustomRole_groupId_position_idx" ON "GroupCustomRole"("groupId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "GroupCustomRole_id_groupId_key" ON "GroupCustomRole"("id", "groupId");
CREATE INDEX IF NOT EXISTS "GroupRoleAssignment_groupId_userId_idx" ON "GroupRoleAssignment"("groupId", "userId");
CREATE TRIGGER IF NOT EXISTS "GroupCustomRole_domain_insert" BEFORE INSERT ON "GroupCustomRole"
WHEN NOT (length(NEW."name") BETWEEN 1 AND 32 AND NEW."color" IN ('muted','ember','gold','green','teal','blue','violet','red') AND NEW."permissions" BETWEEN 0 AND 511)
BEGIN SELECT RAISE(ABORT, 'GroupCustomRole_domain'); END;
CREATE TRIGGER IF NOT EXISTS "GroupCustomRole_domain_update" BEFORE UPDATE ON "GroupCustomRole"
WHEN NOT (length(NEW."name") BETWEEN 1 AND 32 AND NEW."color" IN ('muted','ember','gold','green','teal','blue','violet','red') AND NEW."permissions" BETWEEN 0 AND 511)
BEGIN SELECT RAISE(ABORT, 'GroupCustomRole_domain'); END;
INSERT OR IGNORE INTO "GroupCustomRole" ("id", "groupId", "name", "color", "position", "permissions", "isDefault", "updatedAt")
SELECT 'role-' || s."key" || '-' || g."id", g."id", s."name", s."color", s."position", s."permissions", s."isDefault", CURRENT_TIMESTAMP
FROM "Group" g
CROSS JOIN (
    SELECT 'admin' AS "key", 'Admin' AS "name", 'ember' AS "color", 3 AS "position", 509 AS "permissions", false AS "isDefault"
    UNION ALL SELECT 'officer', 'Officer', 'blue', 2, 484, false
    UNION ALL SELECT 'member', 'Member', 'muted', 1, 0, true
) s;
INSERT OR IGNORE INTO "GroupRoleAssignment" ("groupId", "userId", "roleId")
SELECT m."groupId", m."userId",
       'role-' || CASE m."role" WHEN 'OFFICER' THEN 'officer' WHEN 'MEMBER' THEN 'member' ELSE 'admin' END || '-' || m."groupId"
FROM "GroupMember" m
JOIN "Group" g ON g."id" = m."groupId"
WHERE m."userId" <> g."ownerId";
