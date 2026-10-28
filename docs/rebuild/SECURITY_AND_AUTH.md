# Authentication, privacy and authorization

Cloudflare deployment addendum (28 October2026): production is public Workers hosting with a private data service, EU D1 public catalog/archive and SQLite Durable Object account transactions. Next SSR runs in signed, expiring browser-session objects with request budgets; no private HTML/role cache. PostgreSQL/Redis below remains the supported local runtime. Cloudflare Access is removed. Only server-verified persisted Discord account303585687460904970 receives owner ADMIN. See [current runtime and verification](../deployment/CLOUDFLARE_PORT_PROGRESS.md); fixture sessions are not real OAuth, and production recovery is not certified.

## Login lifecycle

Use NextAuth with PrismaAdapter, Discord and **database sessions**. Provider registration is conditional on both Discord credentials. Scope is `identify email`, checks are state+PKCE, the custom sign-in page is `/signin` and the database session max age is14days. The session callback exposes `user.id` to server/client consumers. The login button calls the actual provider with `/settings` callback; it is not a fake login selector or a permanent seeded account.

A working fixture session proves application authorization tests only. Genuine Discord exchange, repeat sign-in, logout/expiry and Secure-cookie behavior still require owned HTTPS staging and real credentials. Never document a token, session cookie, client secret or authenticated response body as a reproducibility input. Configure test users only in isolated tests and remove them afterward.

## Mutation boundary

The shared API helper checks Origin against `new URL(NEXTAUTH_URL || req.url).origin`, requires a server session and consumes the current user’s30-changes/minute budget. Reject a missing or different Origin. Inputs require JSON content type and bounded stream parsing: default65536bytes; comp creates/updates explicitly1048576bytes; watch creates2048bytes. Actual handlers are authoritative for exceptions. A trusted session does not bypass input, current role, ownership or version checks.

`apiHandler` adds private/no-store responses, returns deliberate HttpError status/messages, maps invalid JSON/schema to400 and sanitizes unexpected failure as503. Some public source handlers use explicit400/429/503 responses instead of that wrapper; do not assume every API has identical middleware. Preserve the relevant headers/statuses in tests.

Server Actions for settings use their existing session/validation/budget/framework boundary and keep failed drafts visible. Settings save allows bounded display/character names and region, updates the region cookie and revalidates layout. Deletion requires literal `DELETE` and rejects an account still owning groups. Staff assignment is not a profile setting.

## Resource matrix

| Resource/action                         | Anonymous or outsider                                             | Owner/current eligible actor                                             |
| --------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Public build read                       | Allowed unless hidden from that actor                             | Author can inspect own hidden content                                    |
| Unlisted build read                     | Direct readable URL allowed; omitted from public discovery        | Owner edits/duplicates/restores through the same services                |
| Private build read/cost/duplicate       | 404 unless author                                                 | Owner only; readable duplication becomes new private record              |
| Build update/restore/delete             | Session plus ownership required; denied write leaves DB unchanged | Expected version for update/restore; delete includes owner predicate     |
| Public comp read                        | Allowed unless hidden                                             | Author/group policies still govern mutation                              |
| Private comp read                       | 404 unless author                                                 | Author owns non-group writes                                             |
| GROUP comp read                         | Current membership required, including for a former author        | Role must be read from current database membership                       |
| GROUP comp edit                         | Ordinary member denied                                            | OWNER/ADMIN/OFFICER can edit; only author moves/republishes              |
| GROUP comp delete                       | Outsider/member denied                                            | Author with edit role or OWNER/ADMIN; see exact deletion service         |
| Public guild page                       | Public metadata only, no dashboard resources                      | Current members receive the authorized dashboard                         |
| Private guild page/discovery            | No outsider disclosure                                            | Membership-scoped visibility                                             |
| Member management                       | No client-role trust                                              | OWNER/ADMIN, with owner-specific restrictions                            |
| Shared guild plans/events/announcements | No outsider write                                                 | Eligible OWNER/ADMIN/OFFICER roles, as action-specific service permits   |
| Invitation accept                       | Sign-in required; invalid/revoked/expired/used token denied       | Token verified by stored hash; atomic membership change                  |
| Favorite/vote/comment/report            | Must first be able to read the actual target                      | Session, action-specific rules and optimistic comment versions           |
| Moderator queue/actions                 | Current ADMIN/MODERATOR database role required                    | Checked again inside moderation transaction                              |
| Scenarios/timers/watchlist/export       | Current owner only; no userId switch in request                   | Session-derived owner and expected versions/caps where applicable        |
| Public player profile                   | Only selected public, nonhidden content                           | Does not expose email, OAuth/session data or certify character ownership |

This is a rebuild matrix, not a complete security certification. Preserve exact action-specific safeguards in the referenced services, including owner demotion/removal restrictions, visibility moves, membership revocation, inaccessible attachments and content hiding.

## Guild actions and roles

The discriminated group action union contains `profile`, `edit-event`, `invite`, `revoke`, `request`, `decide`, `role`, `remove`, `leave`, `transfer`, `delete`, `announcement`, `remove-announcement`, `event`, `cancel-event`, `rsvp`, `share-build`, `remove-build`. Do not turn this into a generic unchecked `{action,payload}` dispatcher. Validate every branch using `src/lib/groups/validation.ts` and preserve transaction decisions in `service.ts`.

`canEditShared` is OWNER/ADMIN/OFFICER; `canManageMembers` is OWNER/ADMIN. Ownership transfer is a separate transactional action and cannot be emulated by posting `role: OWNER`. Invitation and calendar URLs are private resources, not public guild feeds. An old invitation token should not rejoin someone after revocation/expiry.

## Content and external-input policy

All author prose is rendered as text. Do not introduce unrestricted HTML, arbitrary Markdown HTML injection, generic file upload, URL proxying or user-selected upstream hosts while rebuilding. These features do not exist in the baseline. Validate source responses, size/time bounds, image signatures and identity before caching or presenting values.

CSP uses per-request nonce/strict-dynamic for scripts, self-hosted fonts, self/data/blob/fixed renderer images, no objects/frames, self-only forms and development-only websocket/unsafe-eval allowances. Preserve page no-store and invitation no-referrer handling. Public HTTPS mode conditionally adds HSTS. Do not copy dev relaxations into a public reverse proxy or claim actual deployed cookie/security verification without testing.

## Caches, export and logging

Private profile/roster/guild/scenario/search results must not enter public region/source caches. Revoked members must lose read/write access immediately through current database predicates. Do not retain a browser search’s private result set across dismissal and unrelated identity states. Logout/account deletion must invalidate actual sessions through the real auth/account mechanisms, not just remove a displayed username.

Account export explicitly selects allowed profile/provider identifiers and owned content/revisions/personal planning/community records/membership metadata; provider access/refresh tokens and session tokens are excluded. The filename remains `albion-atlas-account.json` for compatibility. Export/download filenames, calendar identifiers and historical namespaces are not branding mistakes to replace casually.

Structured logs contain operation/error codes, not secrets, private request bodies or full upstream responses. Source/artifact scans check configured values and known token/key patterns with explicit limits. Source upload remains private; do not add `.env`, `.aws`, agent auth, DB dumps, backups or ignored QA session/request logs to a rebuilt repository.

## Required negative acceptance

Run independent-user cases, not only the happy path: outsider private reads, wrong-owner updates/deletes, cross-user scenario/watch ids, stale versions, bad Origin/content type/oversized bodies, revoked group membership, role demotion after session warmup, hidden content across search/list/export, inaccessible build attachments, expired/reused/revoked invites, owner-account deletion and private cache headers. Confirm returned status and unchanged database state. Existing e2e/domain tests are mapped in [testing](TESTING_AND_ACCEPTANCE.md).
