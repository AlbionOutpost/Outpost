-- Generated additive equivalents of PostgreSQL QA/community/personal/watchlist invariants.
-- Regenerate: node scripts/cloudflare-domain-constraints.mjs
CREATE TRIGGER IF NOT EXISTS "User_region_valid_insert" BEFORE INSERT ON "User"
WHEN NOT (NEW."region" IN ('europe','americas','asia'))
BEGIN SELECT RAISE(ABORT, 'User_region_valid'); END;

CREATE TRIGGER IF NOT EXISTS "User_region_valid_update" BEFORE UPDATE ON "User"
WHEN NOT (NEW."region" IN ('europe','americas','asia'))
BEGIN SELECT RAISE(ABORT, 'User_region_valid'); END;

CREATE TRIGGER IF NOT EXISTS "Build_region_valid_insert" BEFORE INSERT ON "Build"
WHEN NOT (NEW."region" IN ('europe','americas','asia'))
BEGIN SELECT RAISE(ABORT, 'Build_region_valid'); END;

CREATE TRIGGER IF NOT EXISTS "Build_region_valid_update" BEFORE UPDATE ON "Build"
WHEN NOT (NEW."region" IN ('europe','americas','asia'))
BEGIN SELECT RAISE(ABORT, 'Build_region_valid'); END;

CREATE TRIGGER IF NOT EXISTS "Build_playerCount_valid_insert" BEFORE INSERT ON "Build"
WHEN NOT (NEW."playerCount" BETWEEN 1 AND 400)
BEGIN SELECT RAISE(ABORT, 'Build_playerCount_valid'); END;

CREATE TRIGGER IF NOT EXISTS "Build_playerCount_valid_update" BEFORE UPDATE ON "Build"
WHEN NOT (NEW."playerCount" BETWEEN 1 AND 400)
BEGIN SELECT RAISE(ABORT, 'Build_playerCount_valid'); END;

CREATE TRIGGER IF NOT EXISTS "Build_recommendedIP_valid_insert" BEFORE INSERT ON "Build"
WHEN NOT (NEW."recommendedIP" BETWEEN 0 AND 4000)
BEGIN SELECT RAISE(ABORT, 'Build_recommendedIP_valid'); END;

CREATE TRIGGER IF NOT EXISTS "Build_recommendedIP_valid_update" BEFORE UPDATE ON "Build"
WHEN NOT (NEW."recommendedIP" BETWEEN 0 AND 4000)
BEGIN SELECT RAISE(ABORT, 'Build_recommendedIP_valid'); END;

CREATE TRIGGER IF NOT EXISTS "Build_version_valid_insert" BEFORE INSERT ON "Build"
WHEN NOT (NEW."version">=1)
BEGIN SELECT RAISE(ABORT, 'Build_version_valid'); END;

CREATE TRIGGER IF NOT EXISTS "Build_version_valid_update" BEFORE UPDATE ON "Build"
WHEN NOT (NEW."version">=1)
BEGIN SELECT RAISE(ABORT, 'Build_version_valid'); END;

CREATE TRIGGER IF NOT EXISTS "Build_title_length_insert" BEFORE INSERT ON "Build"
WHEN NOT (length(NEW."title") BETWEEN 3 AND 100)
BEGIN SELECT RAISE(ABORT, 'Build_title_length'); END;

CREATE TRIGGER IF NOT EXISTS "Build_title_length_update" BEFORE UPDATE ON "Build"
WHEN NOT (length(NEW."title") BETWEEN 3 AND 100)
BEGIN SELECT RAISE(ABORT, 'Build_title_length'); END;

CREATE TRIGGER IF NOT EXISTS "BuildEquipment_quality_valid_insert" BEFORE INSERT ON "BuildEquipment"
WHEN NOT (NEW."quality" BETWEEN 1 AND 5)
BEGIN SELECT RAISE(ABORT, 'BuildEquipment_quality_valid'); END;

CREATE TRIGGER IF NOT EXISTS "BuildEquipment_quality_valid_update" BEFORE UPDATE ON "BuildEquipment"
WHEN NOT (NEW."quality" BETWEEN 1 AND 5)
BEGIN SELECT RAISE(ABORT, 'BuildEquipment_quality_valid'); END;

CREATE TRIGGER IF NOT EXISTS "BuildEquipment_slot_valid_insert" BEFORE INSERT ON "BuildEquipment"
WHEN NOT (NEW."slot" IN ('Main hand','Off hand','Helmet','Chest','Boots','Cape','Bag','Mount','Food','Potion'))
BEGIN SELECT RAISE(ABORT, 'BuildEquipment_slot_valid'); END;

CREATE TRIGGER IF NOT EXISTS "BuildEquipment_slot_valid_update" BEFORE UPDATE ON "BuildEquipment"
WHEN NOT (NEW."slot" IN ('Main hand','Off hand','Helmet','Chest','Boots','Cape','Bag','Mount','Food','Potion'))
BEGIN SELECT RAISE(ABORT, 'BuildEquipment_slot_valid'); END;

CREATE TRIGGER IF NOT EXISTS "BuildEquipment_itemId_valid_insert" BEFORE INSERT ON "BuildEquipment"
WHEN NOT (length(NEW."itemId") BETWEEN 3 AND 100 AND NEW."itemId" NOT GLOB '*[^A-Z0-9_@]*')
BEGIN SELECT RAISE(ABORT, 'BuildEquipment_itemId_valid'); END;

CREATE TRIGGER IF NOT EXISTS "BuildEquipment_itemId_valid_update" BEFORE UPDATE ON "BuildEquipment"
WHEN NOT (length(NEW."itemId") BETWEEN 3 AND 100 AND NEW."itemId" NOT GLOB '*[^A-Z0-9_@]*')
BEGIN SELECT RAISE(ABORT, 'BuildEquipment_itemId_valid'); END;

CREATE TRIGGER IF NOT EXISTS "BuildVersion_version_valid_insert" BEFORE INSERT ON "BuildVersion"
WHEN NOT (NEW."version">=1)
BEGIN SELECT RAISE(ABORT, 'BuildVersion_version_valid'); END;

CREATE TRIGGER IF NOT EXISTS "BuildVersion_version_valid_update" BEFORE UPDATE ON "BuildVersion"
WHEN NOT (NEW."version">=1)
BEGIN SELECT RAISE(ABORT, 'BuildVersion_version_valid'); END;

CREATE TRIGGER IF NOT EXISTS "Comment_exactly_one_target_insert" BEFORE INSERT ON "ContentComment"
WHEN NOT ((NEW."buildId" IS NOT NULL) + (NEW."compositionId" IS NOT NULL) = 1)
BEGIN SELECT RAISE(ABORT, 'Comment_exactly_one_target'); END;

CREATE TRIGGER IF NOT EXISTS "Comment_exactly_one_target_update" BEFORE UPDATE ON "ContentComment"
WHEN NOT ((NEW."buildId" IS NOT NULL) + (NEW."compositionId" IS NOT NULL) = 1)
BEGIN SELECT RAISE(ABORT, 'Comment_exactly_one_target'); END;

CREATE TRIGGER IF NOT EXISTS "Comment_valid_body_version_insert" BEFORE INSERT ON "ContentComment"
WHEN NOT (length(NEW."body") BETWEEN 3 AND 3000 AND NEW."version">0)
BEGIN SELECT RAISE(ABORT, 'Comment_valid_body_version'); END;

CREATE TRIGGER IF NOT EXISTS "Comment_valid_body_version_update" BEFORE UPDATE ON "ContentComment"
WHEN NOT (length(NEW."body") BETWEEN 3 AND 3000 AND NEW."version">0)
BEGIN SELECT RAISE(ABORT, 'Comment_valid_body_version'); END;

CREATE TRIGGER IF NOT EXISTS "CommentRevision_valid_body_version_insert" BEFORE INSERT ON "CommentRevision"
WHEN NOT (length(NEW."body") BETWEEN 3 AND 3000 AND NEW."version">0)
BEGIN SELECT RAISE(ABORT, 'CommentRevision_valid_body_version'); END;

CREATE TRIGGER IF NOT EXISTS "CommentRevision_valid_body_version_update" BEFORE UPDATE ON "CommentRevision"
WHEN NOT (length(NEW."body") BETWEEN 3 AND 3000 AND NEW."version">0)
BEGIN SELECT RAISE(ABORT, 'CommentRevision_valid_body_version'); END;

CREATE TRIGGER IF NOT EXISTS "Report_exactly_one_target_insert" BEFORE INSERT ON "ContentReport"
WHEN NOT ((NEW."buildId" IS NOT NULL) + (NEW."compositionId" IS NOT NULL) + (NEW."commentId" IS NOT NULL) = 1)
BEGIN SELECT RAISE(ABORT, 'Report_exactly_one_target'); END;

CREATE TRIGGER IF NOT EXISTS "Report_exactly_one_target_update" BEFORE UPDATE ON "ContentReport"
WHEN NOT ((NEW."buildId" IS NOT NULL) + (NEW."compositionId" IS NOT NULL) + (NEW."commentId" IS NOT NULL) = 1)
BEGIN SELECT RAISE(ABORT, 'Report_exactly_one_target'); END;

CREATE TRIGGER IF NOT EXISTS "Report_valid_state_insert" BEFORE INSERT ON "ContentReport"
WHEN NOT (NEW."status" IN ('OPEN','RESOLVED','DISMISSED') AND NEW."version">0 AND length(NEW."reason") BETWEEN 10 AND 2000)
BEGIN SELECT RAISE(ABORT, 'Report_valid_state'); END;

CREATE TRIGGER IF NOT EXISTS "Report_valid_state_update" BEFORE UPDATE ON "ContentReport"
WHEN NOT (NEW."status" IN ('OPEN','RESOLVED','DISMISSED') AND NEW."version">0 AND length(NEW."reason") BETWEEN 10 AND 2000)
BEGIN SELECT RAISE(ABORT, 'Report_valid_state'); END;

CREATE TRIGGER IF NOT EXISTS "Timer_domain_insert" BEFORE INSERT ON "Timer"
WHEN NOT (NEW."durationMs" BETWEEN 60000 AND 1800000000 AND NEW."version">0 AND NEW."category" IN ('CROP','ANIMAL','LABORER','FOCUS','REMINDER','CUSTOM') AND length(NEW."title") BETWEEN 1 AND 100)
BEGIN SELECT RAISE(ABORT, 'Timer_domain'); END;

CREATE TRIGGER IF NOT EXISTS "Timer_domain_update" BEFORE UPDATE ON "Timer"
WHEN NOT (NEW."durationMs" BETWEEN 60000 AND 1800000000 AND NEW."version">0 AND NEW."category" IN ('CROP','ANIMAL','LABORER','FOCUS','REMINDER','CUSTOM') AND length(NEW."title") BETWEEN 1 AND 100)
BEGIN SELECT RAISE(ABORT, 'Timer_domain'); END;

CREATE TRIGGER IF NOT EXISTS "Timer_state_insert" BEFORE INSERT ON "Timer"
WHEN NOT ((NEW."status"='RUNNING' AND NEW."dueAt" IS NOT NULL AND NEW."remainingMs" IS NULL) OR (NEW."status"='PAUSED' AND NEW."dueAt" IS NULL AND NEW."remainingMs" IS NOT NULL AND NEW."remainingMs">=0) OR (NEW."status"='COMPLETED' AND NEW."dueAt" IS NULL AND NEW."remainingMs" IS NOT NULL AND NEW."remainingMs"=0))
BEGIN SELECT RAISE(ABORT, 'Timer_state'); END;

CREATE TRIGGER IF NOT EXISTS "Timer_state_update" BEFORE UPDATE ON "Timer"
WHEN NOT ((NEW."status"='RUNNING' AND NEW."dueAt" IS NOT NULL AND NEW."remainingMs" IS NULL) OR (NEW."status"='PAUSED' AND NEW."dueAt" IS NULL AND NEW."remainingMs" IS NOT NULL AND NEW."remainingMs">=0) OR (NEW."status"='COMPLETED' AND NEW."dueAt" IS NULL AND NEW."remainingMs" IS NOT NULL AND NEW."remainingMs"=0))
BEGIN SELECT RAISE(ABORT, 'Timer_state'); END;

CREATE TRIGGER IF NOT EXISTS "Metadata_identity_insert" BEFORE INSERT ON "ItemMetadata"
WHEN NOT (NEW."id" GLOB 'T[1-8]_*' AND length((CASE WHEN instr(NEW."id", '@')=0 THEN substr(NEW."id",4) ELSE substr(NEW."id",4,instr(NEW."id", '@')-4) END))>0 AND (CASE WHEN instr(NEW."id", '@')=0 THEN substr(NEW."id",4) ELSE substr(NEW."id",4,instr(NEW."id", '@')-4) END) NOT GLOB '*[^A-Z0-9_]*' AND (instr(NEW."id", '@')=0 OR (instr(NEW."id", '@')=length(NEW."id")-1 AND substr(NEW."id",-1) GLOB '[1-4]')) AND CAST(substr(NEW."id",2,1) AS INTEGER)=NEW."tier" AND (CASE WHEN instr(NEW."id",'@')=0 THEN 0 ELSE CAST(substr(NEW."id",-1) AS INTEGER) END)=NEW."enchantment")
BEGIN SELECT RAISE(ABORT, 'Metadata_identity'); END;

CREATE TRIGGER IF NOT EXISTS "Metadata_identity_update" BEFORE UPDATE ON "ItemMetadata"
WHEN NOT (NEW."id" GLOB 'T[1-8]_*' AND length((CASE WHEN instr(NEW."id", '@')=0 THEN substr(NEW."id",4) ELSE substr(NEW."id",4,instr(NEW."id", '@')-4) END))>0 AND (CASE WHEN instr(NEW."id", '@')=0 THEN substr(NEW."id",4) ELSE substr(NEW."id",4,instr(NEW."id", '@')-4) END) NOT GLOB '*[^A-Z0-9_]*' AND (instr(NEW."id", '@')=0 OR (instr(NEW."id", '@')=length(NEW."id")-1 AND substr(NEW."id",-1) GLOB '[1-4]')) AND CAST(substr(NEW."id",2,1) AS INTEGER)=NEW."tier" AND (CASE WHEN instr(NEW."id",'@')=0 THEN 0 ELSE CAST(substr(NEW."id",-1) AS INTEGER) END)=NEW."enchantment")
BEGIN SELECT RAISE(ABORT, 'Metadata_identity'); END;

CREATE TRIGGER IF NOT EXISTS "Metadata_power_insert" BEFORE INSERT ON "ItemMetadata"
WHEN NOT (NEW."itemPower" IS NULL OR NEW."itemPower" BETWEEN 0 AND 5000)
BEGIN SELECT RAISE(ABORT, 'Metadata_power'); END;

CREATE TRIGGER IF NOT EXISTS "Metadata_power_update" BEFORE UPDATE ON "ItemMetadata"
WHEN NOT (NEW."itemPower" IS NULL OR NEW."itemPower" BETWEEN 0 AND 5000)
BEGIN SELECT RAISE(ABORT, 'Metadata_power'); END;

CREATE TRIGGER IF NOT EXISTS "MarketWatchItem_region_check_insert" BEFORE INSERT ON "MarketWatchItem"
WHEN NOT (NEW."region" IN ('europe','americas','asia'))
BEGIN SELECT RAISE(ABORT, 'MarketWatchItem_region_check'); END;

CREATE TRIGGER IF NOT EXISTS "MarketWatchItem_region_check_update" BEFORE UPDATE ON "MarketWatchItem"
WHEN NOT (NEW."region" IN ('europe','americas','asia'))
BEGIN SELECT RAISE(ABORT, 'MarketWatchItem_region_check'); END;

CREATE TRIGGER IF NOT EXISTS "MarketWatchItem_quality_check_insert" BEFORE INSERT ON "MarketWatchItem"
WHEN NOT (NEW."quality" BETWEEN 1 AND 5)
BEGIN SELECT RAISE(ABORT, 'MarketWatchItem_quality_check'); END;

CREATE TRIGGER IF NOT EXISTS "MarketWatchItem_quality_check_update" BEFORE UPDATE ON "MarketWatchItem"
WHEN NOT (NEW."quality" BETWEEN 1 AND 5)
BEGIN SELECT RAISE(ABORT, 'MarketWatchItem_quality_check'); END;

CREATE TRIGGER IF NOT EXISTS "MarketWatchItem_itemId_check_insert" BEFORE INSERT ON "MarketWatchItem"
WHEN NOT (length(NEW."itemId")<=100 AND NEW."itemId" GLOB 'T[1-8]_*' AND length((CASE WHEN instr(NEW."itemId", '@')=0 THEN substr(NEW."itemId",4) ELSE substr(NEW."itemId",4,instr(NEW."itemId", '@')-4) END))>0 AND (CASE WHEN instr(NEW."itemId", '@')=0 THEN substr(NEW."itemId",4) ELSE substr(NEW."itemId",4,instr(NEW."itemId", '@')-4) END) NOT GLOB '*[^A-Z0-9_]*' AND (instr(NEW."itemId", '@')=0 OR (instr(NEW."itemId", '@')=length(NEW."itemId")-1 AND substr(NEW."itemId",-1) GLOB '[1-4]')))
BEGIN SELECT RAISE(ABORT, 'MarketWatchItem_itemId_check'); END;

CREATE TRIGGER IF NOT EXISTS "MarketWatchItem_itemId_check_update" BEFORE UPDATE ON "MarketWatchItem"
WHEN NOT (length(NEW."itemId")<=100 AND NEW."itemId" GLOB 'T[1-8]_*' AND length((CASE WHEN instr(NEW."itemId", '@')=0 THEN substr(NEW."itemId",4) ELSE substr(NEW."itemId",4,instr(NEW."itemId", '@')-4) END))>0 AND (CASE WHEN instr(NEW."itemId", '@')=0 THEN substr(NEW."itemId",4) ELSE substr(NEW."itemId",4,instr(NEW."itemId", '@')-4) END) NOT GLOB '*[^A-Z0-9_]*' AND (instr(NEW."itemId", '@')=0 OR (instr(NEW."itemId", '@')=length(NEW."itemId")-1 AND substr(NEW."itemId",-1) GLOB '[1-4]')))
BEGIN SELECT RAISE(ABORT, 'MarketWatchItem_itemId_check'); END;
