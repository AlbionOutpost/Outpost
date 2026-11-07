-- Team roles: each team's own ordered roles with permission flags, and who holds them.
CREATE TABLE "GroupCustomRole" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'muted',
    "position" INTEGER NOT NULL,
    "permissions" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupCustomRole_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GroupCustomRole_name_length" CHECK (length("name") BETWEEN 1 AND 32),
    CONSTRAINT "GroupCustomRole_color_valid" CHECK ("color" IN ('muted','ember','gold','green','teal','blue','violet','red')),
    CONSTRAINT "GroupCustomRole_permissions_valid" CHECK ("permissions" BETWEEN 0 AND 511)
);

CREATE TABLE "GroupRoleAssignment" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "GroupRoleAssignment_pkey" PRIMARY KEY ("roleId","userId")
);

CREATE INDEX "GroupCustomRole_groupId_position_idx" ON "GroupCustomRole"("groupId", "position");
CREATE UNIQUE INDEX "GroupCustomRole_id_groupId_key" ON "GroupCustomRole"("id", "groupId");
CREATE INDEX "GroupRoleAssignment_groupId_userId_idx" ON "GroupRoleAssignment"("groupId", "userId");

ALTER TABLE "GroupCustomRole" ADD CONSTRAINT "GroupCustomRole_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupRoleAssignment" ADD CONSTRAINT "GroupRoleAssignment_roleId_groupId_fkey" FOREIGN KEY ("roleId", "groupId") REFERENCES "GroupCustomRole"("id", "groupId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupRoleAssignment" ADD CONSTRAINT "GroupRoleAssignment_groupId_userId_fkey" FOREIGN KEY ("groupId", "userId") REFERENCES "GroupMember"("groupId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every existing team gets the old fixed roles as editable ones with the same rights:
-- Admin (everything but managing roles, which only the owner did), Officer and the default Member.
INSERT INTO "GroupCustomRole" ("id", "groupId", "name", "color", "position", "permissions", "isDefault", "updatedAt")
SELECT 'role-' || s."key" || '-' || g."id", g."id", s."name", s."color", s."position", s."permissions", s."isDefault", CURRENT_TIMESTAMP
FROM "Group" g
CROSS JOIN (
    SELECT 'admin' AS "key", 'Admin' AS "name", 'ember' AS "color", 3 AS "position", 509 AS "permissions", false AS "isDefault"
    UNION ALL SELECT 'officer', 'Officer', 'blue', 2, 484, false
    UNION ALL SELECT 'member', 'Member', 'muted', 1, 0, true
) s;

-- Each member keeps their old role; the owner needs none (the Leader has every right).
INSERT INTO "GroupRoleAssignment" ("groupId", "userId", "roleId")
SELECT m."groupId", m."userId",
       'role-' || CASE m."role" WHEN 'OFFICER' THEN 'officer' WHEN 'MEMBER' THEN 'member' ELSE 'admin' END || '-' || m."groupId"
FROM "GroupMember" m
JOIN "Group" g ON g."id" = m."groupId"
WHERE m."userId" <> g."ownerId";
