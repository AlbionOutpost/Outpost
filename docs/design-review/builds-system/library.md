# Build discovery ecosystem

Mode: **Operate**. The owner requested implementation of the [supplied build-system reference](references/target.png). This phase addresses its discovery side; detail/editor changes and their separate verification follow the parent milestones. The active charcoal/navy/copper theme and real equipment remain authoritative. No synthetic popularity, views, votes, verified status, combat ratings or IP claims are added.

## Design contract

Use a compact heading and collection tabs, a210px weapon/content/playstyle rail, real result counts, sortable grid/list views and three compact equipment-led columns on desktop. Browse uses the actual10,770-record library. `/builds` retains public account builds and `?mine=1` private-owner discovery, rather than pretending the empty account collection is the full library. My Builds, Favorites and Saved Filters share the same heading structure. Mobile filters use the parent-managed focus-trapped drawer; controls remain associated with the real filter form.

Cards show actual author/update date, a fixed eight-slot gear order with quiet empty placeholders and recorded main-hand spell IDs. Library favorites explicitly stay on the device. Account favorites and management actions use the existing permission-checked APIs. Unknown quality, game statistics and unrecorded abilities stay unknown. The concept's scenic background is intentionally omitted: the existing generated scene is not authenticated Albion artwork.

## Data and runtime parity

`scripts/build-discovery-index.mjs` generates the small hashed discovery index from the owned public build records and the pinned factual `build-weapon-families.json`. The latter transcribes category IDs by item code from the already-cached July main-hand snapshot; its original URL and SHA-256 remain recorded. This is factual taxonomy reuse, not current-patch activation or manual verification. The current index reports10,770 builds,142 recorded weapon names (including aliases),17 observed weapon families and29 nonempty activity categories. Counts describe this library, not the entire game or private accounts. Tags are author-recorded; no role/playstyle facts are inferred.

Node pagination, the shared public-asset fallback and D1 JSON predicates support exact weapon names, factual family membership, case-insensitive author tags and source update-date sorting. No schema migration is required. The generated fallback index now carries actual update timestamps. Native D1 checks compare facets/newest order and exact Battleaxe filtering independently against source rows. Alias names use distinct option values rather than colliding item-code keys.

Account discovery obtains count and related page rows in one RepeatableRead transaction. Owner filtering, public visibility, hidden-state exclusion and favorite predicates remain on the server. Specific weapon matching separates a base code from artifact suffixes instead of using an ambiguous substring. Owner action controls are only rendered for the current server-verified author; their endpoints remain authoritative.

Device collections validate and bound100 public build references and eight filter presets per server. Invalid stored data is preserved rather than silently overwritten. Stored paths and query keys are allowlisted; no private ownership parameter or external destination can be restored. Navigation and forms preserve the current validated server through `BuildRegionLink`/`BuildRegionInput`. Debounced search waits450ms, retains the other form filters and supports native Enter and clearing.

## Evidence and corrections

Parent baseline paths: `.qa/builds-redesign/before-{library,builds}-{1440,390}.png`. Initial rendered discovery exposed inherited global header height/flex rules, excessive card identity spacing, colliding alias option keys and region loss during navigation. Those defects were corrected. The first rejected captures remain `library-first-*`; they are not visual acceptance.

Focused checks under `.qa/builds-ecosystem`:20 unit tests passed across discovery/device/region and existing archive/source suites; typecheck, affected-file ESLint, generated-index check and JSON formatting pass. Parent's three new browser journeys pass in development (`library-browser-second.log`): URL/server/device collections, keyboard mobile drawer/pagination/empty results and owner duplicate/delete/error handling. Fixture sessions are not genuine Discord OAuth.

Full Node phase, native Cloudflare, production-container six-width review, production performance, deployment/CI and final owner acceptance remain parent milestone work. A20-test pass or zero overflow does not establish whole-product completion or accessibility conformance. No publication was performed by this subtask.
