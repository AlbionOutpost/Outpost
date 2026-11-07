-- Team guild tax: the share of a loot split's pool a team takes for its pot first, in percent
-- with one decimal. Additive; every existing team starts at 0 (no tax), so old splits are unchanged.
ALTER TABLE "Group" ADD COLUMN "guildTaxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Group" ADD CONSTRAINT "Group_guildTaxPercent_valid" CHECK (
  "guildTaxPercent" >= 0 AND "guildTaxPercent" <= 100
  AND abs("guildTaxPercent" * 10 - round("guildTaxPercent" * 10)) < 0.000001
);
