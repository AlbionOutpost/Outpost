# Architecture

## Runtime and boundaries

A Next.js 16.4 App Router modular monolith on Node 22 serves server-rendered pages, API handlers and focused interactive React components. TypeScript is strict; third-party declaration checks are skipped. Custom responsive CSS and Lucide avoid unnecessary client packages at this stage. The existing stack is deliberately not substituted with a hosted Worker/D1 architecture.

- `src/app`: routes, server components, authenticated server actions and API handlers.
- `src/components`: shell, market/history charts, item search, trade and build editors.
- `src/lib/albion`: fixed regional hosts, schemas, request caching/budgets/backoff, original small item index and pure arithmetic.
- `src/lib/builds`: shared build validation and access predicate.
- `src/lib/http.ts`: same-origin authenticated mutation boundary and bounded JSON parsing.
- `prisma`: schema, generated versioned SQL migrations and non-synthetic connectivity seed.

## Persistence and authentication

PostgreSQL is authoritative. NextAuth v4 Discord OAuth uses state and PKCE with identify/email scopes, no guild permissions, Prisma accounts and database sessions. Provider registration is disabled without credentials and the sign-in page explains the configuration gap. Profile editing, export and deletion require a server session. Account deletion cascades sessions, accounts, builds, equipment and snapshots. Admin role exists on User as an unexposed server-side field; no admin interface or role mutation endpoint exists yet.

Builds normalize equipment and revision rows. Private reads require authorship; unlisted reads allow possession of a URL and are excluded from the public list. Mutation handlers validate origin against NEXTAUTH_URL, authenticate, rate-limit, parse bounded JSON and validate all domain fields. Updates use an author/id/version compare-and-set inside a transaction with equipment replacement and snapshot insertion. A stale version or non-owner produces a nonmutating conflict. Deletion requires authorship and cascades owned children.

JSON snapshots preserve author inputs at each version; item/ability validity against game metadata is still pending. React escapes author prose; no untrusted HTML renderer or file upload exists.

## Market integration

All requests target fixed HTTPS hosts from the region enum and internal endpoint prefixes; redirects are rejected. Data is compressed, timeout-limited and schema-validated with a streamed two-megabyte response cap and a bounded URL. Price batches allow up to 50 IDs within the URL bound. Query keys include region and all source parameters.

A bounded 128-entry, 8MiB serialized-payload process TTL cache and Redis shared cache avoid redundant calls; concurrent same-key process requests share one promise. Observation timestamps remain separate from response retrieval time. Cache hits do not imply fresh underlying observations. Prices with missing observations stay missing. History chart points retain actual source dates/counts; no interpolated rows are generated.

Redis Lua INCR/EXPIRE implements fixed-window budgets. The upstream budget is conservatively 20 requests/minute per region; public endpoints and authenticated content have additional shared/user budgets. A 429 stores a regional cooldown in process and Redis using reset/retry headers. Only one short bounded retry is allowed; longer cooldowns fail clearly without sleeping a request until reset. This is not a complete abuse-prevention or distributed-lock system; separate processes can still miss the cache concurrently.

## Browser and security policy

The region URL determines explicit tool requests; a first-party preference cookie persists selection and settings stores the account region. Theme is a first-party cookie. No analytics or third-party fonts are loaded.

`src/proxy.ts` follows the installed Next.js nonce guidance. Every non-prefetch document response receives a new script nonce and no-store policy; the root layout uses request-time APIs to keep pages dynamic. Production excludes unsafe-eval. Style unsafe-inline is retained for compatibility; object/embed, framing and foreign script sources are blocked. Other headers prevent type sniffing and restrict device permissions. HTTPS deployments receive HSTS for document responses. HTTPS is required at the deployment boundary for secure OAuth cookies.

Redis budget failures deny requests; caches degrade to process cache. User errors do not include upstream payloads or secrets. Full structured operational logging, audit history, spam moderation, request identity policies and dependency maintenance remain deployment work.

## Verification and deployment boundary

Local PostgreSQL/Redis, migrations, strict application types, lint, pure calculations, selected access controls, live regional reads, production compilation and twelve production-browser tests were exercised. OAuth code exchange, Docker application image, backups, large-scale load and complete legal/accessibility/security audits remain unverified. This is not a production readiness certification. See IMPLEMENTATION_STATUS.md for test counts and feature gaps.

## QA hardening update

`api-errors.ts` normalizes bounded-parser/client conflicts and unexpected service failures without logging payloads/credentials; `env.ts` validates required runtime configuration. The process cache now has both byte and entry budgets and checks item identity before insertion. A closed Redis singleton is recreated. Shared region context keeps cookie/header/tool requests consistent; market result identity includes region, item and quality. Source dates normalize to UTC.

Database native CHECK constraints complement Prisma/API validation. Startup and health remain operational checks, not a promise that Discord or absent modules work. Docker uses standalone traced output and a nonroot runtime. Detailed evidence and residual risks are in the QA reports; direct Prisma reads in some server pages and tailored Server Action service-failure feedback remain improvement work.

## Compositions and group authorization

Compositions store a schema-validated JSON roster and transactional version snapshots. Expected revisions prevent lost writes; serializable conflicts return409. Group-only reads require current membership even for the original author after removal. Officers/admins/owners edit group resources; only the author may change a composition’s visibility/destination. Duplicates/imports become independent private drafts and receive new roster IDs.

Group invitations store SHA-256 digests of32-byte random tokens, never recoverable invitation URLs. Single-use acceptance is atomic with membership creation and expiry/revocation checks. Member roles come from PostgreSQL, not request bodies. Ownership transfers demote/promote/update owner in one serializable transaction; owner departure/account deletion is blocked until transfer/deletion. Group event and content actor references are nullable on account deletion; shared resources remain group-owned snapshots. No external Discord messages are sent.

## Structured builds and saved production scenarios

Build gear retains legacy notes alongside validated ability selections and alternative IDs. Revision restoration creates a new immutable snapshot and preserves current visibility. Replacement-cost queries batch by quality and region; incomplete observations cannot produce a complete total.

Production engines live in `src/lib/albion/production.ts` independently of UI. Limited source-backed recipes live in `recipes.ts`. Observations carry manual/source provenance and region/city/quality/timestamps; mismatched source observations are unavailable. Material-return value is separate from upfront cash cost. SavedScenario records belong to one user, cascade on account deletion, and are included in personal export. Static share fragments contain the user's scenario inputs; they are schema-validated and explicitly not live data. Mutations use existing session/origin/rate-limit/bounded-body controls.

## Equipment continuation — 2026-10-25

Versioned CatalogRelease/ItemMetadata persistence, atomic CLI synchronization with bounded schema validation, provenance and immutable checksums, paginated search API, item detail pages, and first-party cached official render icons are implemented. Original starter release contains181 equipment variants; no unlicensed bulk data is bundled. `npm run data:sync` imports original records; `npm run data:sync -- /path/to/reviewed-bundle.json` imports a reviewed full replacement snapshot. This command does not acquire redistribution rights: verify the bundle license/permission before use. Unknown item power/unlock requirements remain null and visibly unverified. Metadata imported outside the starter families is searchable but not yet selectable in the structured build/composition editor.

Official metadata probes returned403. ao-data/ao-bin-dumps README and license endpoint supplied no verifiable license. Complete weapons/armor/spells/unlocks/recipes therefore remain BLOCKED by source access/rights, not complete. Official render host returned200 PNG for T4_MAIN_AXE; optional failures now return a neutral unavailable image. First gate failed three browser checks (image timeouts, a navigation stall, and an XSS test assuming no legitimate images). Fixed rendering failure behavior and retained precise hostile-image injection assertions; rerun passed48 unit/27 browser tests plus all other qa:phase checks.

Changed: prisma/schema.prisma and catalog_metadata migration; scripts/sync-catalog.ts; src/lib/catalog/validation.ts; item-renderer/icon-cache; item API/detail/browser; shared ItemIcon and equipment displays; catalog tests. Remaining priorities: unblocked transport/opportunity calculations, community/moderation, remaining guild/platform tools. NO-GO remains.

## Economy continuation — verified transport/scanner subset

Added `/tools/transporting`, validated capacity/trip/risk arithmetic, region/city/quality/item/execution-specific source observations, manual overrides, private scenario save/load/delete and mobile layout. `/tools/flipping` now includes a bounded25-item batched cross-city/Black Market scanner, profit sorting, timestamps, explicit missing/stale observations and execution assumptions. Black Market player sell listings are rejected. Existing manual trade calculator is preserved.

Final economy milestone gate passed53 unit/28 production browser tests plus migration/restore, lint/types, build, audit and9 regional source checks. Initial transport browser test timed out because helper text changed price fields’ accessible names; explicit labels fixed the issue and the full gate reran. Independent fixture:10×100 purchase,10×150 sale,8% tax,2.5% fee,150kg cargo/100kg capacity,20/trip and10 risk =2 trips,1050 cost,157.5 fees,292.5 profit. All rates/weights are user inputs, not asserted game defaults. New scanner endpoints are unit-tested against controlled source responses; no independent live route/source comparison has yet been executed.

Full crafting/refining/cooking/alchemy recipe coverage, automatic city/focus/spec inputs, farming/animals/laborers/fish/IP/craft planning remain incomplete. Transport currently restores assumptions into the current selected header region and clearly invalidates mismatched source prices; shared transport URLs and volume/mount metadata are unfinished. Do not mark all Phase2 complete. Continuing with independently implementable community permissions and moderation.

## Community continuation — verified core

Build/composition favorites, build votes, comments with optimistic editing/revision history/deletion, reporting, role-protected moderator queue and audited hide/restore/resolve/dismiss actions are implemented with PostgreSQL persistence. Author profiles expose only recent public unmoderated content; favorites filter current visibility/membership. Admin/moderator roles are read from PostgreSQL per operation, never accepted from clients. No public staff-role assignment API exists. Native constraints enforce exactly one target for comments/reports, valid report state and bounded bodies/versions.

Community phase gate passed54 unit/29 production browser tests, including a four-account workflow checking favorites across refresh, vote uniqueness/self-vote denial, literal hostile-text escaping, comment version conflicts/history privacy, unauthorized report review, stale moderation conflicts, hide enforcement on content/cost/community endpoints, favorites filtering and role revocation. Real OAuth remains unverified. Additional group-only favorite and deletion/export checks are being expanded. Staff provisioning is an operator database action; no real user was promoted. Remaining: advanced spam/appeals/admin operations, extensive moderation of every target/state and remaining platform tools. NO-GO remains.

## Guild editing/calendar continuation — verified subset

Owner/admin group profile editing now persists name/description/region/visibility with expected-updatedAt conflicts. Officer-or-higher event editing uses revision checks, retains RSVP records, validates future dates/IANA zones/group compositions and conflicts with cancellations. Member-only calendar downloads export escaped/folded RFC5545 text, UTC start, stable UID, sequence and cancellation status. Native group URLs stay stable when profile names change.

Gate passed55 unit/30 production browser tests and all remaining qa:phase checks. New tests cover owner/member/outsider profile/event permissions, stale edits, actual editor save/reload behavior, calendar authorization and removal of membership. Community regressions now also verify group-only favorites and revocation, private group denial, personal export and comment deletion. First private-page assertion assumed HTTP404; streamed Next notFound responses may be200, so the regression now checks the rendered not-found state and absence of private content while preserving strict404 API assertions.

Remaining guild/composition scope: safe logo/banner uploads, configurable role permissions, full alternatives UX, image summaries/templates and large-scale refinements. Existing composition revision conflict protection remains tested. NO-GO remains. Next: independent persistent personal tools and release hardening.

## Personal tools and recovery continuation — 2026-10-26

Persistent personal timers, account dashboard summaries and global Ctrl+K search now pass the major-phase gate. Timers support manual category/duration, create/pause/resume/reset/complete/rename/delete, PostgreSQL persistence, expected-version conflicts and owner-only mutations. Dashboard sections show at most eight recent account records; search provides bounded item/build/composition/group/tool results with current visibility/membership checks, hidden-content exclusion and no-store responses. No automatic game timers, push/background notifications, group timers, dashboard customization or guide CMS search is claimed.

Fixed settings session typing that prevented TypeScript/build completion. Typed save/delete errors preserve controlled drafts and deletion confirmations; fixture-only PostgreSQL UPDATE and DELETE failure injection proves unchanged data on failure and successful retries. No public fault-injection endpoint was added. Real Discord OAuth remains unverified.

Final Node22 `npm run qa:phase`: 57 unit tests and 33 production browser tests passed, together with typecheck, lint, disposable migration/constraint/backup/restore checks, production build, dependency advisories and nine live regional source checks. `e2e/personal-tools.spec.ts` covers search privacy, immediate membership revocation, timer ownership/revision conflicts, persistence and keyboard navigation. Responsive screenshots reviewed at375/768/1440/1920 for timers/dashboard, overflow checks at320/430/1024 also pass; sampled axe assertions pass. Initial phase type/build failures and an intermediate sandbox-constrained invocation are historical failures, not successful checks. The final gate was rerun successfully.

Supplementary current Docker rebuild is BLOCKED by Docker socket permission; Lighthouse is BLOCKED because a new standalone server on3102 cannot bind (EPERM). Preserve historical Docker/Lighthouse artifacts without treating them as current evidence; `.qa/personal-tools-extra-gates.json` records these limitations. Release remains NO-GO for missing product scope, real OAuth, public TLS/cookies, legal/operator information and production operations.

Next priorities: remaining client mutation recovery and broader timer transition/export/deletion regressions; shopping lists and island planning with explicit manual assumptions; permitted full item/spell/recipe data; configurable guild permissions; moderation abuse controls. External release gates remain explicit.

## Shared interface system — 2026-10-26

See docs/DESIGN_SYSTEM.md. src/app/fonts.ts binds reproducible Fontsource Latin variable assets through next/font/local; public/licenses retains their notices. globals.css centralizes type/surface/spacing/control/motion roles, including light and reduced-motion overrides. EquipmentOverview and EquipmentGlyph are reused by build and composition editors; selection logic and domain validation remain in their existing components/services. GroupDashboard presents schedule/RSVP before administration without changing API authorization. Homepage query links reuse existing routes; no mock market data is bundled. e2e/design-review.spec.ts adds a168-state rendered matrix with database fixtures, explicit font-family/geometry checks and controlled browser-only market observations. Supplementary Docker/Lighthouse remain permission-blocked; full product release stays NO-GO.

## Current Outpost frontend

Outpost supersedes the Atlas visual identity. Shell now uses a top navigation and native Tools/account menus with modal mobile navigation; internal cookie/session/export identifiers remain compatible. The typography-only Wordmark, four next/font/local roles and shared warm copper tokens are documented in docs/DESIGN_SYSTEM.md. No data model, market endpoint, calculation engine or authorization service changed. Guides contains original app-workflow documentation. Outpost acceptance and sourced-media gaps are explicit in docs/OUTPOST_ACCEPTANCE.md; public release remains NO-GO.

## Player workflow frontend — 2026-10-26

`EquipmentWorkbench` is the shared controlled equipment editor: category/name browser, anatomical slots and legal starter ability controls. Its three mobile views preserve the same validated EquipmentChoice model. `EquipmentStrip` supplies compact roster/snapshot previews. `EditorDialog` uses native modal focus/Escape semantics. Composition state, imports, optimistic versions and save APIs remain unchanged; pointer capture reorders the existing slot array. Guild tabs retain existing action handlers, with profile/admin under Settings and event forms inside dialogs. `CatalogItemPicker` queries the existing item endpoint, aborts stale searches and supports listbox keyboard selection; manual identifiers remain available. Production/transport formula engines are unchanged. The frontend requests validated official-renderer image URLs; same-origin bounded icon service remains a fallback, and Legal/CSP reflect the external image host. Fonts are next/font/local Barlow800 display, Inter interface and Geist Mono data. No backend schema or authentication redesign was introduced. Scope/evidence: docs/PRODUCT_UI_WORKFLOWS.md.

## Numbered-reference interface additions — 2026-10-26

`PartyBoard` renders small-party loadouts; the existing roster handles larger groups and remains selectable. `CompositionPngExport` creates a local canvas download from existing composition state, with at most four concurrent requests to the bounded same-origin icon service and explicit text fallbacks. It sends no group content off-site. `BuildPreviewCard` and `BuildLoadoutView` present actual equipment. Public discovery queries retain non-hidden/visibility/owner constraints while adding bounded content/weapon filters and real favorite-count sorting; page size/order remain deterministic. The homepage selects public/non-hidden rows only and recovers from unavailable discovery. `MobileFilterPanel` collapses the discovery rail on small screens. `GuideDirectory` searches original notes passed as server-rendered children. No schema, auth, market data contract or formula changes were needed.
