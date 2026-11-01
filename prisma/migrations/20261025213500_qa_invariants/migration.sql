-- Domain checks intentionally complement application validation.
ALTER TABLE "User" ADD CONSTRAINT "User_region_valid" CHECK (region IN ('europe','americas','asia'));
ALTER TABLE "Build" ADD CONSTRAINT "Build_region_valid" CHECK (region IN ('europe','americas','asia')),
 ADD CONSTRAINT "Build_playerCount_valid" CHECK ("playerCount" BETWEEN 1 AND 400),
 ADD CONSTRAINT "Build_recommendedIP_valid" CHECK ("recommendedIP" BETWEEN 0 AND 4000),
 ADD CONSTRAINT "Build_version_valid" CHECK (version >= 1),
 ADD CONSTRAINT "Build_title_length" CHECK (char_length(title) BETWEEN 3 AND 100);
ALTER TABLE "BuildEquipment" ADD CONSTRAINT "BuildEquipment_quality_valid" CHECK (quality BETWEEN 1 AND 5),
 ADD CONSTRAINT "BuildEquipment_slot_valid" CHECK (slot IN ('Main hand','Off hand','Helmet','Chest','Boots','Cape','Bag','Mount','Food','Potion')),
 ADD CONSTRAINT "BuildEquipment_itemId_valid" CHECK ("itemId" ~ '^[A-Z0-9_@]{3,100}$');
ALTER TABLE "BuildVersion" ADD CONSTRAINT "BuildVersion_version_valid" CHECK (version >= 1);
