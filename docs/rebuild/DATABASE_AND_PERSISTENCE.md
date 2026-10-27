# Database and persistence contracts

**October27 implementation update:** Migration18 adds `Build.equipmentSets` as non-null JSONB default[]; Build versions include it through validated input, older snapshots default[]. Each strict set has UUID/name and1–10 unique-slot equipment choices, with abilities/quality/alternatives and valid hand combinations; up to five distinct sets. Comp members carry the same JSON sets. Copying a Build copies values rather than linking mutable arrays; JSON imports preserve exported sets.

The [exact database reference](DATABASE_REFERENCE.md) reproduces all29 Prisma models, three enums and18 ordered migration paths/checksums. It is the complete schema appendix. This chapter explains how those tables work together. Recreate both ORM definitions and committed SQL; do not infer constraints only from forms.

## Entity groups

| Domain                | Tables                                                                | Purpose                                                                                |
| --------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Identity              | `User`, `Account`, `Session`, `VerificationToken`                     | NextAuth adapter identity/provider/session records; profile, region and staff role     |
| Builds                | `Build`, `BuildEquipment`, `BuildVersion`                             | Build metadata, one equipment row per occupied slot and immutable numbered snapshots   |
| Guilds                | `Group`, `GroupMember`, `GroupInvitation`, `GroupMembershipRequest`   | Ownership, current role, hashed invites and approval workflow                          |
| Shared planning       | `Composition`, `CompositionVersion`, `GroupBuild`                     | JSON party roster/revisions and saved shared build snapshots                           |
| Guild communication   | `GroupAnnouncement`, `GroupEvent`, `EventRSVP`                        | Announcements, versioned UTC events and one RSVP per user/event                        |
| Personal planning     | `SavedScenario`, `Timer`, `MarketWatchItem`                           | Private accounting assumptions, manual reminder state and per-region/quality watchlist |
| Metadata              | `CatalogRelease`, `ItemMetadata`                                      | Immutable release identity/checksum plus active normalized game metadata               |
| Community             | `BuildFavorite`, `CompositionFavorite`, `BuildVote`                   | Unique user/content relationships, not fabricated popularity                           |
| Discussion/moderation | `ContentComment`, `CommentRevision`, `ContentReport`, `ModerationLog` | Versioned text, target-specific reports, staff review and audit history                |

`BuildVisibility` is PUBLIC/PRIVATE/UNLISTED. `ContentVisibility` is PUBLIC/PRIVATE/GROUP for comps. `GroupRole` is OWNER/ADMIN/OFFICER/MEMBER. Staff role is a separate string on `User`, not the guild role enum. Many operational states are schema-constrained strings with SQL checks rather than Prisma enums; preserve those SQL checks too.

## Keys, relations and deletion

User/content primary keys are generated cuid strings except explicitly composite relationships. Group membership/request keys combine group/user; favorites/votes combine user/content; RSVP combines event/user. Build equipment is unique per build/slot. Version snapshots are unique per resource/version. Watchlist identity is unique on user/region/item/quality. OAuth account uniqueness is provider/providerAccountId and session tokens are unique. Exact optional relations, cascade/SetNull behavior and indexes are in the reference.

Deleting a user is not a UI-only cleanup. The server first requires owned groups to be transferred or deleted, then deletes the actual user and relies on committed relation semantics for dependent private records/sessions. Do not disable the group ownership safeguard to make deletion easier. Shared/group data can have different retention or nullable-author behavior from personal data; follow migration/schema definitions.

Content comments/reports must reference the supported target shape. SQL enforces checks and unique/relationship invariants that a lax JSON document store would lose. Treat a rejected write as an actual conflict/validation failure, not an excuse to drop a constraint.

## Build save, revision, duplicate and restore

A build create validates the full `BuildInput`, derives `authorId` from the session, inserts gear rows and stores version1 snapshot. Update accepts `{version, build}`. In one transaction, update only the row matching id/author/version, increment version, replace gear rows and add the new snapshot. Failure to match returns409 and leaves the old state intact. The browser must retain the draft and ask for reload/reconciliation rather than silently overwriting.

A duplicate first verifies readable/nonhidden access and creates an independent PRIVATE record with its own equipment/revision1. Restoration accepts `{revision, version}`; only the owner can restore, the old snapshot is revalidated, current visibility is retained and a **new** numbered revision is written. Do not mutate the old version row or reset the revision counter.

Legacy `abilities`/`alternatives` prose and structured `abilitySelections`/`alternativeItemIds` coexist. They are not interchangeable: structured selections get equipment compatibility validation, while author prose stays text and is not promoted to verified game data.

## Comp persistence

A comp contains1–100 uniquely identified member slots. Each member has player label, role/custom role, mandatory/substitute/notes, optional sourceBuildId and up to10 unique equipment choices. The roster is JSON, validated before both create and update; snapshots use the same logical input shape. Create stores version1; update accepts `{version, composition}` and preserves immutable author identity.

Saving GROUP visibility requires an eligible current guild role and matching groupId. Other visibility requires groupId null. Shared editors can edit content but only the author can move/republish it. Access/destination checks occur inside serializable transactions. Existing copied build sources and newly attached sources have distinct validation handling; preserve that service rather than trusting any browser-supplied buildId. A duplicated comp becomes PRIVATE, clears group linkage, gets fresh member UUIDs and clears sourceBuildId links while retaining independent copied equipment.

## Watchlist and scenarios

Watchlist POST accepts strict `{region,itemId,quality}` with a2048-byte body limit. It returns an existing exact identity rather than making duplicates and enforces the100-item user cap under serializable isolation/retry. GET returns at most100 rows for the current user. DELETE includes user ownership in the predicate; another user’s id is404. Reload persistence is real local implementation, not just localStorage.

Saved scenarios store title, kind and validated configuration JSON owned by a user. GET filters supported kind **before** the newest50 limit; it is not a single global mixed list with client-only privacy. A share fragment copies static assumptions into a URL; it does not make the database row public or refresh saved source timestamps.

## Guild and moderation writes

Guild creation creates owner membership with the group. The current group role is re-read for actions; fixed permissions govern invitations, membership decisions, role changes, ownership transfer and shared resources. Invites use32 random bytes represented as64 hex characters; only SHA256 hashes are stored. Preserve expiry, single-use/revoked checks and transactional membership creation.

Group profile edits use expectedUpdatedAt; event edits use an expected integer version. Calendar snapshots use stable event identity/revision. Moderation rechecks the current database staff role inside the transaction, checks report version, updates target hide/restore or report status and writes an audit record. Do not issue staff roles through a newly invented public endpoint.

## Catalog activation

`CatalogRelease.version` and checksum bind a normalized immutable bundle. `data:sync` validates before a serializable transaction, refuses divergent bytes under an existing release version, deactivates previous item rows and upserts the activated release. Re-running the same intact release reports its actual existing state; it does not silently overwrite conflicting release history. Local verification/import and current-patch verification are separate.

The committed snapshot is rebuild input. A production DB contains accounts/content and deployment state that are **not** in Git. Do not create a database dump in this documentation or replace missing private account content with seeded “real users.” The seed is intentionally empty.
