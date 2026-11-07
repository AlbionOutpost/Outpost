-- Additive private-store upgrade: Team guild tax (Postgres 20261109090000_team_guild_tax). The share
-- of a loot split's pool a team takes for its pot first, in percent with one decimal. Every
-- existing team starts at 0 (no tax). SQLite cannot add a CHECK to an existing table, so
-- BEFORE triggers enforce the same 0–100, one-decimal rule.
ALTER TABLE "Group" ADD COLUMN "guildTaxPercent" REAL NOT NULL DEFAULT 0;
CREATE TRIGGER IF NOT EXISTS "Group_guildTaxPercent_valid_insert" BEFORE INSERT ON "Group"
WHEN NOT (NEW."guildTaxPercent" BETWEEN 0 AND 100 AND abs(NEW."guildTaxPercent" * 10 - round(NEW."guildTaxPercent" * 10)) < 0.000001)
BEGIN SELECT RAISE(ABORT, 'Group_guildTaxPercent_valid'); END;
CREATE TRIGGER IF NOT EXISTS "Group_guildTaxPercent_valid_update" BEFORE UPDATE OF "guildTaxPercent" ON "Group"
WHEN NOT (NEW."guildTaxPercent" BETWEEN 0 AND 100 AND abs(NEW."guildTaxPercent" * 10 - round(NEW."guildTaxPercent" * 10)) < 0.000001)
BEGIN SELECT RAISE(ABORT, 'Group_guildTaxPercent_valid'); END;
