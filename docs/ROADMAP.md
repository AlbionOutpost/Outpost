# Roadmap

The goal: the best Albion Online site ever made. Getting there means three things, in this order: **ship reliably** (green CI, real deploys, backups), **look world-class** (one coherent design system, fast on phones), and **go deeper than anyone** on the data and tools players actually use every day.

Status as of 31 Oct 2026. Update this file when something ships, breaks or gets planned.

## Now — foundations

| #   | Item                                                                                                                                                                                                                                                                                                                                                                         | Why                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | ~~Fix CI on `main`.~~ Done 30 Oct: the SQLite staging scripts no longer depend on `quote()` typing, the deploy token was replaced, and both workflows annotate the failing command.                                                                                                                                                                                          | Green and deploying                                   |
| 2   | **Design system reset.** Replace the 31 layered global stylesheets (~600 KB on every route) with one token file, one component layer (button, input, card, item well, table, tabs, chip, dialog) and per-archetype route styles. Move to the navy + ember palette and illustrated mastheads chosen on 30 Oct (DESIGN.md), enforce the 12px text floor and the spacing scale. | Biggest single lever on polish, consistency and speed |
| 3   | **Mobile speed.** Lab mobile LCP is 3.6–5.3 s on home, library, detail, market and crafting (target ≤2.5 s). Cut global CSS, check font and hero image loading, re-measure with a repeatable protocol.                                                                                                                                                                       | Phones are first-class users                          |
| 4   | **Verify recovery.** After the next deploy, run `node scripts/cloudflare-recovery.mjs bookmark` once to confirm point-in-time recovery works on the Free plan. Email alerts for Worker errors, DDoS, SSL and abuse reports are on.                                                                                                                                           | Backups only count once a restore path is proven      |
| 5   | **Legal page.** Operator name/contact and a privacy policy; then real Terms/Privacy URLs in the Discord portal.                                                                                                                                                                                                                                                              | Required for an account-holding site                  |

## Shipped — launch pass (30 Oct)

- Research-first market: the Market Explorer, price history and every calculator (crafting family, transport, farming, fishing, laborers) load observations for the current selection; manual prices are kept and the button only refreshes.
- Item pages: city prices on arrival, every tier and enchantment, consuming recipes, public builds for weapons; enchanted item routes (`T4_MAIN_AXE@1`) decode correctly.
- Market flipping leads with an item-picker route scanner (up to 25 items, margin and freshness per row, haul links); transport preselects cargo and route from links.
- Build pages: an empty community list hands visitors the Build Library; loadout prices load when the section is in view; author strategy opens by default; scratch copies are kept out of related builds.
- Comps, Teams and Guides share the illustrated masthead (`WorkspaceHeading` gained an `actions` slot); the landing page is rebuilt around benefits, real product screenshots, provenance and a final call to action, with no market request on arrival.
- Deploy and PR pipelines run the browser suites as three parallel shards; sign-in is rate-limited per client address; CSP allows Discord avatars; logo and guide media shrank from 20 MB to 2.4 MB.
- Competitor parity matrix in [PARITY.md](PARITY.md); `sitemap.xml` (generated at build time by `scripts/build-sitemap.ts`, 11.5k URLs served as a static asset) lists hubs, tools, guides and the archived library and is referenced from `robots.txt`.

## Shipped — backdrop, inventory light mode and sign-in fix (31 Oct)

- Discord sign-in works again: Discord now sends `iss` on the callback and the provider names its issuer.
- Like counts written to the production library; the build library lists the 1,382 builds from 2026 with likes and the landing counts match.
- One castle painting fixed behind every page; hero and mastheads sit on it, so sections never meet at a seam.
- Light mode uses Albion's inventory colours (parchment and leather); framed cards keep their own paintings in both themes.
- Activity cards back to fanned weapons with the most liked build, after the tools; plans centred; Rootbound Staff reads as support.

## Shipped — framed cards, library scope and sign-in diagnostics (31 Oct)

- MMO-style card frame (ember double line, cut corners, gems) on every card that leads somewhere; hairline-edged raised surfaces; paintings blurred more and fitted per card; no figure behind loadout boards.
- New theme-specific logos; the shell renders on the server (no bare "Loading Outpost…" on refresh).
- Library lists 2026 builds liked at least once (1,382), ranked by likes; like counts carried into D1; activity cards show each activity's five most liked builds; Group Build members on the game board; guides four per row.
- Landing: reveals finish once in view (no half-clipped headings), crafting card names unpriced cities, planner prices each line at its cheapest city, top kills open several at once and skip kills without recorded gear, guide arrows no longer drop on hover.
- Render deadline (30 s) and `waitUntil` bound (10 s) after the 31 Oct duration-allowance outage; Workers Paid enabled by the owner.
- Sign-in errors are logged (sanitized) to diagnose the Discord callback failure; web logs sampled at 100%.

## Shipped — canvas, motion and landing polish (31 Oct)

- One smooth canvas under every page (eased warm light from the top, night base over the full height, grain against banding); the landing spans the window at any width.
- Motion pass: expo/spring tokens, cards grow with an ember light that follows the pointer, guide covers grow with a slow inner zoom, hero settle/rise and dealt windows, scroll-driven section reveals (transforms and clip paths only), circular theme reveal from the switch.
- Top kills: participants open inside their own card with a height animation and staggered rows; scene art no longer stretches when a card grows.
- Landing tool cards: tables keep to their well at every width (single grid track, flexible name column, coins dropped in narrow cards), material names wrap, shorter planner/craft copy; windows show every row instead of fading out.
- "Why choose Outpost?" and the closing band replaced by builds by activity (real counts, weapons and most-liked build) and a Free / Supporter plans band.
- Header: region globes from Natural Earth outlines; roomy theme switch with a sticky thumb (legacy 64px toggle rules removed); AdSense loader on every page and `/ads.txt`.

## Shipped — Supporter plan, advertising placements and page map (31 Oct)

- **Supporter** (`/supporter`; `/premium` redirects): a monthly Stripe subscription that removes advertising and unlocks running a Team. Plan columns on `User`, Stripe REST client without the SDK (`src/lib/billing/stripe.ts`), checkout and portal routes, a signature-verified webhook that re-reads the subscription before writing, gates in `src/lib/billing/gate.ts` (create a workspace; manage one — the owner's plan), settings billing section, honest states while billing is off. Switch-on steps in OPERATIONS.
- **Advertising**: `AdSlot` placements `hub` (after a hub's list) and `article` (after a guide or library build), one per page, reserved height, hidden for Supporters; unit ids from `NEXT_PUBLIC_ADSENSE_SLOT_HUB` / `_ARTICLE`.
- **Page map**: kill and death feed are one route (`/tools/kill-feed?view=deaths`; `/tools/death-feed` redirects); gold history joins the Market Explorer tabs; Comps and Group Builds share one tab row; the header's tools menu is generated from the tool directory; "About market data" and "Reference tables" are linked from the footer. Builds (`/builds` community, `/builds/library` archive) and Comps keep separate addresses because they are different data sources with indexed URLs; they already share one masthead and tab row. Favorites stays a tab of Builds; `/timers` is the detail of the dashboard's summary; `/items`, `/market-data` and `/tools/reference` are different things (catalog, data coverage, game tables).

## Shipped — surface system across the site (31 Oct)

- The landing's look becomes the component layer (`product-system.css`): a warm canvas lit from the top, full-bleed painted mastheads that dissolve into the page (`WorkspaceHeading` with `scene`, `cover`, `emblem`, `titleId`; `MastheadTabs`; `.masthead` for custom heroes), one raised surface for every panel and card (`.raised`, `.has-scene`, `.well`), pill links and tabs, chips, hearts, rosters (`CompRoster`), guide cover cards (`GuideCoverCard`), silver coins (`Silver`) and city dots. Market Explorer, Build Library (windows with the loadout on the mini board), Group Builds (roster windows), Tools, Guides, Teams, Items, build and comp detail, guide readers, the calculators, combat feeds, Crafting Planner, dashboard, settings, timers, team workspaces and sign-in all sit on it. The old layered masthead, rail, card and tab rules were deleted from their sheets as each page moved.
- Still to converge: the remaining per-page stylesheets (the design-system reset in "Now"), the build/comp editors' chrome, and the Dashboard archetype.

## Shipped — landing page v5 and header (31 Oct)

- The home page is rebuilt to the owner's final mockup: a hero that dissolves into the page with a measured-numbers row (`countPlayers` service + library counts), three teaser windows on its edge (a public build on the board with chosen abilities and a device-saving ♥, what a Team does, a comp as a roster by weapon type), three live tool cards in one chrome (Market Explorer with a six-city table and dated chart, Crafting Calculator picking the best of five T6 recipes through `/api/landing/craft`, Crafting Planner with queue/shopping tabs), a guides slider with reading time, and three killboards from Game Info's kill-fame ranking (`/api/combat-events/top`, inventories, participants, estimated gear value). Cards share a raised surface with the scene blurred behind. `/api/economy/preview` and the earlier preview components are gone.
- Site-wide header: 72px bar, ember underline on the current section, wide search field with a `Ctrl K` cap, region pill, two-state sun/moon switch.

## Shipped — landing page tool cards (30 Oct)

- The three product cards are rebuilt as framed tool windows: Market Explorer with five city quotes, city dots and an axis-labelled trend; Build Library with one public build per activity tab (Solo Mists, Small scale, ZvZ, PvE) and its abilities on their keys; Crafting Calculator with craft/refine tabs, a batch stepper, a materials list and a cost & profit panel. `/api/economy/preview` takes `batches` and refining recipes and returns `profitPerItem`.

## Shipped — landing page v4 (30 Oct)

- Rebuilt to the owner's concept: full-bleed painted hero with the capability strip inside it, three product cards with working controls (trend city + range, recipe + city) and outlined actions, the Group Compositions band reading a real library comp by weapon type (`src/lib/compositions/weapon-roles.ts`, labelled "roles by weapon type"), "Why choose Outpost?", the ad-free offer and a painted closing band.

## Shipped — landing page v3 (30 Oct)

- `LoadoutBoard` (`src/components/loadout-board.tsx`, original slot glyphs in `loadout-glyphs.tsx`): the game's inventory arrangement with a silhouette, official renders and recorded abilities under each piece; sizes hero/card/mini. The hero shows the featured library build on it; Group Builds show a real composition as a party of mini boards.
- Capability cards carry official item renders; trust cards sit on the owner's paintings; product-window actions live in the window footer; copy trimmed throughout.
- Region picker: original globe marks and the game's server names (Albion Europe / West / East).
- Advertising: `AdSlot` renders an AdSense unit only when `NEXT_PUBLIC_ADSENSE_CLIENT` is set (CSP origins follow the same switch); the "Go ad-free with Premium" offer links to `/premium`, which states that nothing is sold yet. Plan storage and admin grants are the next step.

## Shipped — landing page reconstruction (30 Oct)

- The landing page is rebuilt as a product site: independent header, bounded hero with the owner's market-square painting and a live gold ticker, three product windows that run on the real endpoints (`/api/market`, `/api/history`, new `/api/economy/preview`), a Group Builds spotlight from a real library composition, a trust grid and a closing call to action. The six illustration tiles and six build tiles are gone; the tool catalog stays on `/tools`.
- The footer is structured (brand + provenance, Explore / Tools / Your workspace columns, legal line) on every page.
- Phone layouts (390/320) hide the buy column and optional members instead of stacking the desktop composition; no horizontal overflow at 320–1920.

## Shipped — game data (30 Oct)

- 11,314 recipes from the archived game data, with enchanted and artifact versions; enchanting for every foundry family; full city bonus table; spec-based focus; item weights and mounts in transport; laborers, specialization, reference tables and the Roads of Avalon mapper.

## Next — best-in-class core

**Market**

- Broad flip and Black Market scanner beyond 25 items, enchant/upgrade flips, buy-order fee modelling.
- Volume and liquidity signals from history; price alerts on the watchlist.
- Quality alternatives surfaced clearly when the exact quality has no data.

**Crafting and refining**

- Hearts and transmutation; cheapest-path refining (buy vs refine the previous tier, faction tokens).
- Station focus rounding and item power from specs; nutrition-based station fees.
- Tax and setup presets (premium / non-premium) instead of zero defaults.

**Game data**

- Current-patch pipeline: pinned dumps → diff → review → activate, with every record labelled by source patch and date. Today 0 of 7,510 records are current-patch verified.
- Item stats, unlocks and full ability details; resolve the 55 quarantined base records and the 5 unresolved archived build item IDs.
- Settle the data-rights question for ao-bin-dumps (owner decision).

**Builds and Comps**

- Swap-set replacement costing, patch/freshness labels on the archived builds and 682 comps, better template curation.
- Party-position export for Comps.

## Later — breadth

- Albion player, guild and battle lookup (Game Info).
- Notifications and shared Team timers; dashboard customisation.
- Configurable Team roles, safe uploads (banners), roster/archive paging, moderation appeals.
- Islands, animals and breeding, farming with island/premium/spec coefficients and byproducts; save laborer runs and share Avalon maps with a Team.
- Guide authoring with revisions and moderation.
- Real-user performance metrics; save fishing scenarios; sync journal progress to the account.

## Open defects

| ID           | Sev | Area         | Issue                                                                                                                                                                                                                             |
| ------------ | --- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PERF-002     | P1  | Performance  | Mobile LCP 3.6–5.3 s across key routes                                                                                                                                                                                            |
| DES-ART      | P2  | Design       | Mastheads ship on every hub with the five existing scenes; dedicated scenes for Teams, Guides and the Roads mapper would replace the shared ones (owner to supply)                                                                |
| DES-CSS      | P1  | Design       | 31 global stylesheets, 7 redefine the palette; `home-fidelity.css` is dead; ~332 hex literals, 52 font sizes                                                                                                                      |
| AUD-11       | P2  | A11y         | Unlabelled `<aside>` landmarks in fishing, team loot, guide directory, shopping and farming                                                                                                                                       |
| QA-015       | P3  | Architecture | Direct `db.` reads in 14 page modules (e.g. builds/[id], builds/[id]/edit, compositions, compositions/new, dashboard, groups, groups/[slug], invitations/[token], players/[id], market-data, timers, items, items/[id], settings) |
| QA-014       | P2  | Tooling      | ESLint 9 deprecated; v10 blocked by Next plugin peers                                                                                                                                                                             |
| COMBAT-CACHE | P2  | Data         | On Cloudflare the combat feed cache key (`atlas:combat:*`) is rejected by the Cache API wrapper, so every request hits the 12/min upstream budget (unverified at runtime)                                                         |
| QA-019       | P2  | Community    | No spam defences beyond Turnstile and rate limits; no appeals                                                                                                                                                                     |
| SEC-006      | P2  | Security     | No full-history secret scan; no private vulnerability contact in SECURITY.md                                                                                                                                                      |

## Owner actions

Only the owner can do these.

| #     | Action                                                                                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OA-1  | Publish the DNSSEC DS at Namecheap ([OPERATIONS.md](OPERATIONS.md#cloudflare-zone))                                                                                                                                                                    |
| OA-2  | Real Discord login test on production: sign in, reload, admin role appears, sign out, sign in again; check cookies are Secure/HttpOnly/SameSite                                                                                                        |
| OA-3  | Complete a real Turnstile challenge on comment, edit and report                                                                                                                                                                                        |
| OA-4  | Provide operator name, address and contact email for the legal page; then set Discord Terms/Privacy URLs                                                                                                                                               |
| OA-5  | Choose a code licence (none today)                                                                                                                                                                                                                     |
| OA-6  | Decide the current-patch data source and its rights (ao-bin-dumps has no declared licence)                                                                                                                                                             |
| OA-7  | Run `node scripts/cloudflare-recovery.mjs bookmark` once after the next deploy to confirm recovery works                                                                                                                                               |
| OA-8  | Enable required MFA on the GitHub org; decide on branch protection (paid plan for private repos)                                                                                                                                                       |
| OA-9  | Rotate the GitHub Workers deploy token before **2027-01-26** (a reminder is scheduled for 5 Jan 2027)                                                                                                                                                  |
| OA-11 | Refresh the lint and OpenNext toolchain: `npm audit` reports moderate advisories in `minimatch`/`glob` reached only through `eslint`, `eslint-config-next` and `@opennextjs/cloudflare` (dev dependencies); the CI gate now covers the production tree |
| OA-10 | Write down homepage acceptance criteria before the next homepage pass (four iterations were rejected in three days)                                                                                                                                    |
| OA-11 | Delete leftover merged branches on GitHub                                                                                                                                                                                                              |

## Tech debt

- **Components** over 700 lines: `production-calculator` (1,216), `composition-editor` (1,045), `build-editor` (937), `group-dashboard` (898), `equipment-workbench` (869), `market` (752), `build-equipment-studio` (701). Split by responsibility when touched.
- **Two runtimes, two schemas.** Decide whether the Node/Postgres/Redis path stays as a dev-only shim generated from one schema source, or local dev moves to workerd + SQLite.
- **`atlas` identifiers** in cookies, cache keys, export formats, ICS UIDs and the npm package name — rename only with a backward-compatible reader.
- **Auth.js v5** migration (currently next-auth v4 with a custom sign-in wrapper).
- **CI speed:** the Node e2e run and the Cloudflare e2e run both execute on every `main` push; `test:live` spends real AODP budget inside `qa:phase`.
- **Unused data:** `src/lib/albion/reviewed-crafting.json`; `assets.ts` ability-art status out of sync with `spell-icon.tsx`.
- **Naming:** the production D1 database is called `albionoutpost-staging`; `cloudflare/d1/manifest.json` still says "staging only".

## Launch-quality gates

A release is "done" when all of these hold:

1. CI green on `main` and the deploy actually ran.
2. Real Discord login lifecycle verified on production HTTPS.
3. Legal page with real operator details and privacy policy.
4. Private data recoverable (30-day point-in-time recovery) with a verified restore path.
5. Error alerting reaches the owner (done: email); uptime probe still missing.
6. All data labelled with source and date; patch drift tracked.
7. Every shipped calculator mode has sourced coefficients and hand-checked fixtures; unsupported modes are absent, not faked.
8. Mobile LCP ≤2.5 s on home, market and builds.
9. A code licence chosen.
10. Abuse controls proportionate to public content (Turnstile, reports, moderation, rate limits).
