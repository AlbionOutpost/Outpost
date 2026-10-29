# Exact database reference

Generated from [prisma/schema.prisma](../../prisma/schema.prisma); SHA256 `874acc8518ead9bcfe5f0fa904aefd6adb6284671da9f0948a2a5a157dbb7a3c`. These are schema definitions, not a dump of anyone’s data. Execute the committed SQL migrations in order as well: migrations contain checks and compatibility details that Prisma declarations alone may not express. Do not use a schema push to replace migration history.

## User

```prisma
model User {
 marketWatchItems MarketWatchItem[]
 timers Timer[]
  id String @id @default(cuid())
  name String?
  email String? @unique
  emailVerified DateTime?
  image String?
  role String @default("USER")
  region String @default("europe")
  characterName String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  compositions Composition[]
  ownedGroups Group[]
  memberships GroupMember[]
  builds Build[]
  accounts Account[]
  sessions Session[]
  groupRequests GroupMembershipRequest[]
  groupRsvps EventRSVP[]

  authoredAnnouncements GroupAnnouncement[]
  authoredGroupEvents GroupEvent[]
  authoredGroupBuilds GroupBuild[]
  authoredLootSplits GroupLootSplit[]
  issuedGroupInvites GroupInvitation[]

  savedScenarios SavedScenario[]

  buildFavorites BuildFavorite[]
  compositionFavorites CompositionFavorite[]
  buildVotes BuildVote[]
  comments ContentComment[]
  reports ContentReport[] @relation("ReportAuthor")
  reviewedReports ContentReport[] @relation("ReportReviewer")
  moderationLogs ModerationLog[]

}
```

## Account

```prisma
model Account {
  id String @id @default(cuid())
  userId String
  type String
  provider String
  providerAccountId String
  refresh_token String? @db.Text
  access_token String? @db.Text
  expires_at Int?
  token_type String?
  scope String?
  id_token String? @db.Text
  session_state String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
  @@index([userId])
}
```

## Session

```prisma
model Session {
  id String @id @default(cuid())
  sessionToken String @unique
  userId String
  expires DateTime
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}
```

## VerificationToken

```prisma
model VerificationToken {
  identifier String
  token String @unique
  expires DateTime
  @@unique([identifier, token])
}
```

## BuildVisibility

```prisma
enum BuildVisibility {
  PUBLIC
  PRIVATE
  UNLISTED
}
```

## Build

```prisma
model Build {
  id String @id @default(cuid())
  authorId String
  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)
  title String
  description String @db.Text
  contentType String
  region String
  visibility BuildVisibility @default(PRIVATE)
  playerCount Int @default(1)
  recommendedIP Int @default(0)
  strategy String @db.Text
  patchNotes String @db.Text
  version Int @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  equipmentSets Json @default("[]")
  equipment BuildEquipment[]
  versions BuildVersion[]
  @@index([visibility, updatedAt])
  @@index([authorId, updatedAt])
  groupSnapshots GroupBuild[]

 hiddenAt DateTime?
 comments ContentComment[]
 reports ContentReport[]
 favorites BuildFavorite[]
 votes BuildVote[]

}
```

## BuildEquipment

```prisma
model BuildEquipment {
  id String @id @default(cuid())
  buildId String
  build Build @relation(fields: [buildId], references: [id], onDelete: Cascade)
  slot String
  itemId String
  quality Int
  abilities String @db.Text
  alternatives String @db.Text
  @@unique([buildId, slot])
  abilitySelections Json @default("{}")
  alternativeItemIds String[] @default([])

}
```

## BuildVersion

```prisma
model BuildVersion {
  id String @id @default(cuid())
  buildId String
  build Build @relation(fields: [buildId], references: [id], onDelete: Cascade)
  version Int
  snapshot Json
  createdAt DateTime @default(now())
  @@unique([buildId, version])
}
```

## GroupRole

```prisma
enum GroupRole {
 OWNER
 ADMIN
 OFFICER
 MEMBER
}
```

## ContentVisibility

```prisma
enum ContentVisibility {
 PUBLIC
 PRIVATE
 GROUP
}
```

## Group

```prisma
model Group {
 id String @id @default(cuid())
 name String
 slug String @unique
 description String @db.Text
 region String
 visibility String @default("PRIVATE")
 ownerId String
 owner User @relation(fields:[ownerId],references:[id],onDelete:Restrict)
 createdAt DateTime @default(now())
 updatedAt DateTime @updatedAt
 members GroupMember[]
 compositions Composition[]
 @@index([visibility,updatedAt])
 @@index([ownerId])
  invitations GroupInvitation[]
  requests GroupMembershipRequest[]
  announcements GroupAnnouncement[]
  events GroupEvent[]
  builds GroupBuild[]
  lootSplits GroupLootSplit[]

}
```

## GroupMember

```prisma
model GroupMember {
 groupId String
 userId String
 role GroupRole @default(MEMBER)
 joinedAt DateTime @default(now())
 group Group @relation(fields:[groupId],references:[id],onDelete:Cascade)
 user User @relation(fields:[userId],references:[id],onDelete:Cascade)
 @@id([groupId,userId])
 @@index([userId])
}
```

## Composition

```prisma
model Composition {
 id String @id @default(cuid())
 authorId String
 author User @relation(fields:[authorId],references:[id],onDelete:Cascade)
 groupId String?
 group Group? @relation(fields:[groupId],references:[id],onDelete:Cascade)
 title String
 description String @db.Text
 region String
 contentType String
 visibility ContentVisibility @default(PRIVATE)
 slots Json
 notes String @db.Text
 version Int @default(1)
 createdAt DateTime @default(now())
 updatedAt DateTime @updatedAt
 versions CompositionVersion[]
 @@index([authorId,updatedAt])
 @@index([visibility,updatedAt])
 @@index([groupId,updatedAt])
  events GroupEvent[]

 hiddenAt DateTime?
 comments ContentComment[]
 reports ContentReport[]
 favorites CompositionFavorite[]

}
```

## CompositionVersion

```prisma
model CompositionVersion {
 id String @id @default(cuid())
 compositionId String
 composition Composition @relation(fields:[compositionId],references:[id],onDelete:Cascade)
 version Int
 snapshot Json
 createdAt DateTime @default(now())
 @@unique([compositionId,version])
}
```

## GroupInvitation

```prisma
model GroupInvitation {
 id String @id @default(cuid())
 groupId String
 group Group @relation(fields:[groupId],references:[id],onDelete:Cascade)
 tokenHash String @unique
 createdById String?
 createdBy User? @relation(fields:[createdById],references:[id],onDelete:SetNull)
 expiresAt DateTime
 acceptedAt DateTime?
 revokedAt DateTime?
 createdAt DateTime @default(now())
 @@index([groupId,createdAt])
}
```

## GroupMembershipRequest

```prisma
model GroupMembershipRequest {
 groupId String
 userId String
 group Group @relation(fields:[groupId],references:[id],onDelete:Cascade)
 user User @relation(fields:[userId],references:[id],onDelete:Cascade)
 status String @default("PENDING")
 message String @db.Text
 updatedAt DateTime @updatedAt
 @@id([groupId,userId])
 @@index([groupId,status])
}
```

## GroupAnnouncement

```prisma
model GroupAnnouncement {
 id String @id @default(cuid())
 groupId String
 group Group @relation(fields:[groupId],references:[id],onDelete:Cascade)
 title String
 body String @db.Text
 authorId String?
 author User? @relation(fields:[authorId],references:[id],onDelete:SetNull)
 createdAt DateTime @default(now())
 @@index([groupId,createdAt])
}
```

## GroupEvent

```prisma
model GroupEvent {
 version Int @default(1)
 id String @id @default(cuid())
 groupId String
 group Group @relation(fields:[groupId],references:[id],onDelete:Cascade)
 title String
 description String @db.Text
 startsAt DateTime
 timezone String
 expectedParticipants Int
 voiceInfo String
 compositionId String?
 composition Composition? @relation(fields:[compositionId],references:[id],onDelete:SetNull)
 cancelled Boolean @default(false)
 authorId String?
 author User? @relation(fields:[authorId],references:[id],onDelete:SetNull)
 createdAt DateTime @default(now())
 rsvps EventRSVP[]
 @@index([groupId,startsAt])
}
```

## EventRSVP

```prisma
model EventRSVP {
 eventId String
 userId String
 event GroupEvent @relation(fields:[eventId],references:[id],onDelete:Cascade)
 user User @relation(fields:[userId],references:[id],onDelete:Cascade)
 status String
 role String
 updatedAt DateTime @updatedAt
 @@id([eventId,userId])
}
```

## GroupBuild

```prisma
model GroupBuild {
 id String @id @default(cuid())
 groupId String
 group Group @relation(fields:[groupId],references:[id],onDelete:Cascade)
 title String
 snapshot Json
 sourceBuildId String?
 sourceBuild Build? @relation(fields:[sourceBuildId],references:[id],onDelete:SetNull)
 authorId String?
 author User? @relation(fields:[authorId],references:[id],onDelete:SetNull)
 createdAt DateTime @default(now())
 @@index([groupId,createdAt])
}
```

## SavedScenario

```prisma
model SavedScenario {
 id String @id @default(cuid())
 authorId String
 author User @relation(fields:[authorId],references:[id],onDelete:Cascade)
 title String
 kind String
 configuration Json
 createdAt DateTime @default(now())
 updatedAt DateTime @updatedAt
 @@index([authorId,updatedAt])
}
```

## GroupLootSplit

```prisma
model GroupLootSplit {
 id String @id @default(cuid())
 groupId String
 group Group @relation(fields:[groupId],references:[id],onDelete:Cascade)
 title String
 configuration Json
 version Int @default(1)
 createdById String?
 createdBy User? @relation(fields:[createdById],references:[id],onDelete:SetNull)
 createdAt DateTime @default(now())
 updatedAt DateTime @updatedAt
 @@index([groupId,updatedAt])
}
```

## CatalogRelease

```prisma
model CatalogRelease {
 id String @id @default(cuid())
 version String @unique
 sourceUrl String
 rightsReference String
 checksum String
 importedAt DateTime @default(now())
 itemCount Int
 items ItemMetadata[]
}
```

## ItemMetadata

```prisma
model ItemMetadata {
 id String @id
 name String
 slot String
 tier Int
 enchantment Int
 itemPower Int?
 abilities Json
 recipe Json?
 releaseId String
 release CatalogRelease @relation(fields:[releaseId],references:[id],onDelete:Restrict)
 active Boolean @default(true)
 @@index([active,slot,tier])
 @@index([name])
}
```

## BuildFavorite

```prisma
model BuildFavorite {
 userId String
 buildId String
 user User @relation(fields:[userId],references:[id],onDelete:Cascade)
 build Build @relation(fields:[buildId],references:[id],onDelete:Cascade)
 createdAt DateTime @default(now())
 @@id([userId,buildId])
 @@index([buildId])
}
```

## CompositionFavorite

```prisma
model CompositionFavorite {
 userId String
 compositionId String
 user User @relation(fields:[userId],references:[id],onDelete:Cascade)
 composition Composition @relation(fields:[compositionId],references:[id],onDelete:Cascade)
 createdAt DateTime @default(now())
 @@id([userId,compositionId])
 @@index([compositionId])
}
```

## BuildVote

```prisma
model BuildVote {
 userId String
 buildId String
 user User @relation(fields:[userId],references:[id],onDelete:Cascade)
 build Build @relation(fields:[buildId],references:[id],onDelete:Cascade)
 createdAt DateTime @default(now())
 @@id([userId,buildId])
 @@index([buildId])
}
```

## ContentComment

```prisma
model ContentComment {
 id String @id @default(cuid())
 authorId String
 author User @relation(fields:[authorId],references:[id],onDelete:Cascade)
 buildId String?
 build Build? @relation(fields:[buildId],references:[id],onDelete:Cascade)
 compositionId String?
 composition Composition? @relation(fields:[compositionId],references:[id],onDelete:Cascade)
 body String @db.Text
 version Int @default(1)
 hiddenAt DateTime?
 deletedAt DateTime?
 createdAt DateTime @default(now())
 updatedAt DateTime @updatedAt
 revisions CommentRevision[]
 reports ContentReport[]
 @@index([buildId,createdAt])
 @@index([compositionId,createdAt])
 @@index([authorId])
}
```

## CommentRevision

```prisma
model CommentRevision {
 id String @id @default(cuid())
 commentId String
 comment ContentComment @relation(fields:[commentId],references:[id],onDelete:Cascade)
 version Int
 body String @db.Text
 createdAt DateTime @default(now())
 @@unique([commentId,version])
}
```

## ContentReport

```prisma
model ContentReport {
 version Int @default(1)
 id String @id @default(cuid())
 authorId String?
 author User? @relation("ReportAuthor",fields:[authorId],references:[id],onDelete:SetNull)
 buildId String?
 build Build? @relation(fields:[buildId],references:[id],onDelete:Cascade)
 compositionId String?
 composition Composition? @relation(fields:[compositionId],references:[id],onDelete:Cascade)
 commentId String?
 comment ContentComment? @relation(fields:[commentId],references:[id],onDelete:Cascade)
 reason String @db.Text
 status String @default("OPEN")
 reviewerId String?
 reviewer User? @relation("ReportReviewer",fields:[reviewerId],references:[id],onDelete:SetNull)
 reviewNote String @default("") @db.Text
 createdAt DateTime @default(now())
 reviewedAt DateTime?
 @@index([status,createdAt])
}
```

## ModerationLog

```prisma
model ModerationLog {
 id String @id @default(cuid())
 actorId String?
 actor User? @relation(fields:[actorId],references:[id],onDelete:SetNull)
 targetType String
 targetId String
 action String
 reason String @db.Text
 createdAt DateTime @default(now())
 @@index([createdAt])
}
```

## Timer

```prisma
model Timer {
 id String @id @default(cuid())
 userId String
 user User @relation(fields:[userId],references:[id],onDelete:Cascade)
 title String
 category String
 status String @default("RUNNING")
 durationMs Int
 dueAt DateTime?
 remainingMs Int?
 version Int @default(1)
 createdAt DateTime @default(now())
 updatedAt DateTime @updatedAt
 @@index([userId,updatedAt])
}
```

## MarketWatchItem

```prisma
model MarketWatchItem {
 id String @id @default(cuid())
 userId String
 user User @relation(fields:[userId],references:[id],onDelete:Cascade)
 region String
 itemId String
 quality Int @default(1)
 createdAt DateTime @default(now())
 @@unique([userId,region,itemId,quality])
}
```

## Ordered migrations (19)

| Migration                                      | SQL                                                                                                                                                                | SHA256                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `20261025194321_foundation`                    | [prisma/migrations/20261025194321_foundation/migration.sql](../../prisma/migrations/20261025194321_foundation/migration.sql)                                       | `eec39c694939395f0fac7fefaaf1224bcd190c864a7ce254009a3e7950387d9e` |
| `20261025195551_build_platform`                | [prisma/migrations/20261025195551_build_platform/migration.sql](../../prisma/migrations/20261025195551_build_platform/migration.sql)                               | `0dc693d959ac177f4cfb45770517570fa11468fb34579f86fd7967d477e339a4` |
| `20261025211414_compositions_and_group_access` | [prisma/migrations/20261025211414_compositions_and_group_access/migration.sql](../../prisma/migrations/20261025211414_compositions_and_group_access/migration.sql) | `62894f81927ec6d3931b9b0ac449f881fd9a872e334ad06c147e507a92cd1f18` |
| `20261025212501_group_collaboration`           | [prisma/migrations/20261025212501_group_collaboration/migration.sql](../../prisma/migrations/20261025212501_group_collaboration/migration.sql)                     | `00a7beee25b5e813a292b721c4345d6d4f98a2adc972b94f77c3391edc0fc601` |
| `20261025213500_qa_invariants`                 | [prisma/migrations/20261025213500_qa_invariants/migration.sql](../../prisma/migrations/20261025213500_qa_invariants/migration.sql)                                 | `4c630e30f5818e81dfc0b6e3dee2bd025fb347ad5c45eba2d9603d27a68a8408` |
| `20261025214851_collaboration_foreign_keys`    | [prisma/migrations/20261025214851_collaboration_foreign_keys/migration.sql](../../prisma/migrations/20261025214851_collaboration_foreign_keys/migration.sql)       | `2a59cbdb07dba63a9e9006d491cbf7618160cb19d48b8228593b89ec561f0ee5` |
| `20261025215723_structured_build_abilities`    | [prisma/migrations/20261025215723_structured_build_abilities/migration.sql](../../prisma/migrations/20261025215723_structured_build_abilities/migration.sql)       | `c01d4758c424788b7e427872e76641c66c968fd49422f0f6e4b2a310ad837976` |
| `20261025220602_saved_economy_scenarios`       | [prisma/migrations/20261025220602_saved_economy_scenarios/migration.sql](../../prisma/migrations/20261025220602_saved_economy_scenarios/migration.sql)             | `946c36507e0a3504a43354043fef97118d7eba0a9bac4754b0646dd6ba12216a` |
| `20261025222653_catalog_metadata`              | [prisma/migrations/20261025222653_catalog_metadata/migration.sql](../../prisma/migrations/20261025222653_catalog_metadata/migration.sql)                           | `b9d588776f02fce238e1ecfbfafaccc97bd517f9c93942e621434ddbc38c1d63` |
| `20261025223720_community_interactions`        | [prisma/migrations/20261025223720_community_interactions/migration.sql](../../prisma/migrations/20261025223720_community_interactions/migration.sql)               | `2a55c221dfb6fe0e542f4d5d33511a9e78996e4c1bb798182c1becc2915065fd` |
| `20261025223807_moderation_version`            | [prisma/migrations/20261025223807_moderation_version/migration.sql](../../prisma/migrations/20261025223807_moderation_version/migration.sql)                       | `051586d1e974ba4c885e6cd487125483b712d0da76cd45c7b33a37e1bddf8510` |
| `20261025224025_community_invariants`          | [prisma/migrations/20261025224025_community_invariants/migration.sql](../../prisma/migrations/20261025224025_community_invariants/migration.sql)                   | `d030f41b257aa51ae7c3a56bfd784d22571b9918637382fcb90c3c44a49af9a9` |
| `20261025224426_group_event_revisions`         | [prisma/migrations/20261025224426_group_event_revisions/migration.sql](../../prisma/migrations/20261025224426_group_event_revisions/migration.sql)                 | `7105ec42cdc5110abb34db8895c67719740a3fdae0d0226307e72083e5561dbc` |
| `20261025224924_personal_timers`               | [prisma/migrations/20261025224924_personal_timers/migration.sql](../../prisma/migrations/20261025224924_personal_timers/migration.sql)                             | `db3018a97a20cd7e235d4d160d49b3b7f75bc967903ddb03ea216914f7f277e8` |
| `20261025225221_personal_data_invariants`      | [prisma/migrations/20261025225221_personal_data_invariants/migration.sql](../../prisma/migrations/20261025225221_personal_data_invariants/migration.sql)           | `c2dbaa5c64eb5e6f5dcf0d9f33de1336430802df54e8efc2e0026dafa430d56e` |
| `20261025225359_timer_null_state`              | [prisma/migrations/20261025225359_timer_null_state/migration.sql](../../prisma/migrations/20261025225359_timer_null_state/migration.sql)                           | `96df630603342a1e32149671d9efef21652ad03820e66809a5c29ea593273dcd` |
| `20261026110000_market_watch_items`            | [prisma/migrations/20261026110000_market_watch_items/migration.sql](../../prisma/migrations/20261026110000_market_watch_items/migration.sql)                       | `f20d5b689723f63a8ed01c0c8bc7cdd1cbd3c281cf95592031925dfa3a8d2ca9` |
| `20261027040000_equipment_sets`                | [prisma/migrations/20261027040000_equipment_sets/migration.sql](../../prisma/migrations/20261027040000_equipment_sets/migration.sql)                               | `05e66cebc8892144cd2cd8d5ca7429d89c93532c2263d50fdf85b7c209e9f835` |
| `20261029120000_team_loot_splits`              | [prisma/migrations/20261029120000_team_loot_splits/migration.sql](../../prisma/migrations/20261029120000_team_loot_splits/migration.sql)                           | `18e7a6a0d636f7692c640f0e33fc26ef52c3a4ce04f7570fee2553af7829aa31` |
