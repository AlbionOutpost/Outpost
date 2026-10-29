# Build to composition bridge

This milestone connects real build actions to an independent composition draft. It does not infer combat roles or create account records on navigation. Personal Discord consent remains separate from fixture-session verification.

## Flow and data contract

`BuildCompositionLink` constructs the validated `/compositions/new` destination from the current server and either a persisted account build ID or a public library reference. Unsaved editor drafts do not receive an attach action. The parent places the detail action in Summary Quick Actions; editor integration uses the persisted ID only.

The protected create page resolves the source on the server, then supplies a PRIVATE draft with `groupId:null` and one member. The default role is `Custom` with `customRole:"Unassigned"`; only an explicit enum role changes that choice. Region comes from the explicit launch selection, then the existing cookie/current account preference. GET navigation does not create a build or composition; only the existing authenticated save action persists the draft. Normal authentication/session maintenance is unchanged.

Account source lookup uses the same read rule as the previous loadout API: PUBLIC/UNLISTED sources are readable; PRIVATE or hidden sources require the current author. An unreadable or missing source returns the same not-found error before parsing private equipment. The API retains `private, no-store`. Source ownership is rechecked again by the existing composition save service when attaching a new source reference, including revocation between preview and save.

The pure copy validates the entire equipment array, alternatives and named spare sets, including slot uniqueness and two-handed/off-hand incompatibility. Empty sources and sources without a main hand are rejected. Spare sets receive independent identifiers; structured ability selections remain validated choices. Freeform author reminders stay in notes rather than being promoted into ability data. Member notes are bounded at2,000 characters and composition notes at12,000, with a visible notice when shortened. Original records remain unchanged.

Library copying reuses the existing recorded-spell translation and then applies the strict composition equipment/set validators. It checks that translation did not silently discard equipment, alternatives or alternate ability sets. Unsupported or excessive sets fail clearly. Original title/activity are retained rather than inheriting the build editor's “copy” title or flattening granular content types. Normal quality remains an explicitly editable assumption when the library has no quality record. Library IDs are never attached as database build IDs: `sourceBuildId` is always null for that source kind.

## Sign-in boundary

`safeSignInReturn` permits the fixed `/settings` fallback or the canonical same-origin relative `/compositions/new` path. Its only permitted query keys are `fromBuild`, `fromLibrary`, `region` and `role`, with one source at most and bounded IDs/enum values. External or scheme-relative URLs, backslashes, control characters, fragments, unknown/duplicate keys, traversal payloads and oversized values fall back to settings. The sign-in page validates the return both for already-authenticated redirects and the LoginButton callback prop. `authOptions`, provider credentials, OAuth state/PKCE and the registered callback URI are unchanged. The shared role enum was extracted into a lightweight module so callback validation does not import the equipment catalog into the login button.

After save, composition navigation includes the validated draft server. Existing Back/source/build links retain the current application server. Other editor behavior and API permissions remain unchanged.

## Actor/action matrix

| Actor/source                             | Preview/loadout result                                 | New composition result                        |
| ---------------------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| Anonymous                                | Sign-in required; approved return preserved            | No account composition created                |
| Signed-in reader, PUBLIC/UNLISTED source | Validated independent equipment copy                   | PRIVATE, current user, actual source build ID |
| Current author, PRIVATE/hidden source    | Same validated copy                                    | PRIVATE, current user, actual source build ID |
| Outsider, PRIVATE/hidden source          | Generic not-found before private parsing               | No source data or composition write           |
| Signed-in reader, public library source  | Strict translated copy or clear unsupported-data error | PRIVATE, sourceBuildId null                   |
| Source access revoked before first save  | Existing save service denies attachment                | No composition write                          |

## Verification status

37 focused unit cases pass in `.qa/builds-ecosystem/composition-unit.log`; typecheck and affected-file ESLint pass. Cases cover exact ability/alternative/spare preservation, independent copies, whole-array validation, missing main hand, notes bounds, library null references, explicit/default roles, unsafe callback destinations and current source read guards.

Two browser journeys pass in `e2e/build-composition.spec.ts`: public/own-private/outsider/revoked-source behavior with source immutability and private persistence; library entry, anonymous sign-in return, already-authenticated continuation, explicit role, null library reference and outsider denial. The complete Node production phase passes335 unit/118 browser cases, including both journeys. Combined-member-note shortening, denial recovery preserving server selection and independently keyed dialog sections are verified. Twenty native database cases pass; final Cloudflare browser/publication evidence remains separate. Fixture sessions do not establish actual personal Discord consent, admin assignment or account lifecycle completion.
