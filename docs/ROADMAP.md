# Roadmap

The goal: the best Albion Online site ever made. Getting there means three things, in this order: **ship reliably** (green CI, real deploys, backups), **look world-class** (one coherent design system, fast on phones), and **go deeper than anyone** on the data and tools players actually use every day.

Status as of 1 Nov 2026. Update this file when something ships, breaks or gets planned.

## Giveaways — 8 November 2026

- `/giveaways` (More menu, footer, sitemap): Outpost staff (a global ADMIN) start a giveaway (title, prize, server, winners, closing time, optional painted picture and rules), edit or cancel it before the draw and draw the winners once entries close. Any signed-in player enters once and can leave until the deadline; guests get Sign in to enter, which comes back to the page. Winners show by display name with their place.
- Teams run their own under Announcements with a new **Manage giveaways** permission (every role with Manage team got it); only current members enter, and anyone who left before the draw cannot win.
- The server draws inside one transaction with crypto randomness, once: a second draw returns the same winners, and the store refuses any change after the draw. Postgres `20261111090000_giveaways`, private-store step 15 (from 14, so it lands after step 14).
- Not done: Discord notifications to winners, claim tracking, giveaway pages of their own.

## Tax defaults and saves on the account — 9 November 2026

- Every sales-tax field starts at 4% (Premium) with "Premium 4%" and "No premium 8%" beside it: flipping and its route scan, the Black Market board and Profitable crafts (one shared field now), the crafting family, transport, laborers (was 8%), farming and fishing (was empty). Saved runs and links keep their own rate (owner decision, 8 Nov 2026).
- Signed in, library favorites and Specialization & focus levels are kept on the account and follow you to every device; the browser's own copy moves over once after sign-in without duplicates. Guests keep them in the browser as before. Private-store schema 14 (`0015_account_saves`).
- Fishing hides its detail rows until every input is in, so the page stays on one screen with the fee filled.

## Legal page unpublished — 8 November 2026

- `/legal` (notice, privacy, terms) is off until the operator details are final (owner's decision): it answers 404, the footer and sign-in links are hidden and `llms.txt` no longer lists it. Turn it back on with `legalPublished` in `src/lib/legal.ts`; `e2e/legal.spec.ts` runs again automatically.

## Teams, guide reader and comp weapons — 8 November 2026

- Team workspace: six tabs (Overview, Events, Members, Loadouts, Treasury, Announcements). "All teams" is a back link beside the chips; Settings sits behind a gear for the owner and Manage team / Manage roles holders and keeps `#team-settings`. Comps and Builds merge into Loadouts; `#team-comps` and `#team-builds` still land on their view. Phones get one sideways strip.
- Overview: next event with quick actions, one Loadouts panel, members and news in a rail; empty parts are one line. Members is a role-coloured table with role filters, then invitations, requests and Leave team (moved from Settings). Rolls & flips: coin stage beside the form and flip history; loot rolls open on one row.
- Team directory cards carry a banner in the team's shield colour; no "No description yet." filler.
- Guide reader: details as hero chips, equal All guides / Print guide pills, contents and one "Use with this guide" rail aligned with the reading page.
- Comps by activity cards overlay the three weapons their Group Builds comps carry most (player comps fill in), from a small build-time `grind-comp-weapons.json` on Cloudflare.

## Editors without the duplicates — 8 November 2026

- Build editor: one loadout view, Cost · board · Abilities side by side (board, abilities, cost on phones). The "Your build" slot list and the Equipment, Abilities and Cost tabs are gone; the board is the only place to pick a slot. Alternatives and Notes stay as tabs.
- Comp editor: party size is chosen in one place (the empty party's well, then a Party size select under the board); The comp holds comp details only; Your builds appears once there is a party and says one thing; a 5-player party fits one row of smaller windows.
- Builds pages end on their content: the Favorites "Make one yours" band and the guest editor's sign-in band are gone (a guest gets one line with Sign in).

## Black Market board, Profitable crafts, watchlist changes — 8 November 2026

- **Black Market board** (`/tools/black-market`): one gear category over a tier range at one enchantment and quality; each item's cheapest player-city sell order beside the Black Market's buy order, net after the player's tax (Premium 4% / No premium 8%, editable), margin and both observation ages, best net first. Items without both orders are listed last as unavailable, never as zero. Each row opens Market Explorer and plans the haul in the transport calculator.
- **Profitable crafts** (`/tools/profitable-crafts`, "What should I craft?"): every primary recipe of a category at one tier and enchantment, priced from one bounded AODP batch and run through the Crafting calculator's `production()` with the player's buy, craft and sell cities, city returns, daily bonus, tax, setup fee and budget; top 10 with Show all, unpriced recipes listed with what is missing. Open takes a recipe to its calculator with the same settings (the crafting, cooking and alchemy pages read them from the link).
- **Watchlist "since your last visit"**: after refreshing quotes, each watched item shows how its lowest sell and highest buy order moved since the player last pressed Mark as seen (up/down %, new order, no order now). The marks live on the device, the watchlist itself stays on the account.
- Both scan routes answer from one AODP request and are kept in the signed-out edge cache for two minutes; changing cities, tax or budget re-ranks in the page without a new request.
- Not yet: focus and specialization in Profitable crafts; buy orders as a purchase route on the board; order volume.

## Tools and editors on one screen — 8 November 2026

- Every calculator, flipping, gold, reference, the Avalon mapper, the build and comp editors and the admin console now fit 1440×900: compact mastheads with their tabs and back links at the right edge, no closing link bands (market pages keep `MarketNextSteps`, as DESIGN.md asks), long lists scrolling in their own wells. `e2e/one-screen.spec.ts` checks each page.
- Crafting family: the five modes sit in the masthead; the Production plan is one summary row with Open plan; Run details open from the result's head. Flipping shows Scan a route or Check one trade, one at a time. The build editor gained a Cost tab; the comp editor puts The comp and Your builds beside the party. The tools hub shows all 23 tools (25 since the Black Market board and Profitable crafts) five across with whole descriptions.
- Gold's failed load is one line with Try again; on phones a missing market order is a lone dash.
- Fixed: a price that finished loading while a player was in its field replaced the text under the caret, so their typing was appended to it (2,982 + 3000 read as 29,823,000). Number fields now hold outside values until the player leaves the field.

## Audit fixes — 8 November 2026

- Sign-in keeps the destination: dashboard, settings, timers, favorites, new Team, admin and build/comp edit pages send `callbackUrl`, and Discord returns there (same-origin allowlist only).
- Home shows "Your dashboard" instead of "Sign in" to signed-in players; the lede counts tools, not calculators.
- Comp editor: saving with no members says "Add at least one member before saving" (no raw validator text), a fresh form reads "New comp · not saved", and the title hint follows the activity and size.
- `/legal` links the Supporter page only while billing is on.
- One name per tool across menu, hub, footer and H1; "Copy to my builds" matches "Copy to my comps"; Crafts vs Upgrades and a Transmute label in the production calculators; one Refresh per price panel; build detail drops a Build server row that repeats the region; 12px floor on home stats and build card dates.

## Comps open on their activities — 8 November 2026

- `/compositions` opens on Comps by activity, as Builds does: painted activity cards with comp counts, each opening the list filtered to that activity. All comps is one click away at `/compositions?view=all`; links with a search, filter, source or page still open the list, and `/compositions/activities` 308s to `/compositions`. Footer, sitemap, canonicals and back pills follow.

## Forms, guild tax and a lively crest — 9 November 2026

- Fields no longer start with sample text or zeros: the loot split name and pool, expense names, event head count and timezone (now the device's own) start empty with "e.g." hints; placeholders are quieter so they never read as typed. Empty required numbers show as missing, never as 0.
- Every numeric input is one `NumberField`: 1,250,000 as you type, no leading zeros, 25m / 1.2m / 500k / 2b on silver fields, decimals only where allowed, a numeric keyboard, arrow-key steps and the plain number underneath. No formula changed.
- Loot splits: each expense is Silver or % of the pool, and a Guild tax toggle takes the team's rate for the pot first; paying the split credits the pot. Saved splits keep their kind and rate, and older splits read as before.
- Team setting Guild tax (%) (Manage team; 0–100, one decimal; Postgres `20261109090000_team_guild_tax`, private-store step 13).
- The team crest leans toward the pointer with a shine, lifts, strikes with sparks on click and wobbles on tap; the crest picker flips old parts away as new ones land. Reduced motion keeps it still.

## Team economy — 8 November 2026

- Teams get one **Treasury** tab (8 tabs then; six since the Loadouts merge) with three views under a segmented control, each with its own link (`#team-treasury`, `#team-treasury-wallet`, `#team-treasury-rolls`, or `?tab=treasury&view=wallet`; the old loot, wallet and rolls links land on the matching view). **Wallet**: each member's silver balance and a team pot, kept as a ledger. Officers with the new Manage wallet permission credit, debit, pay out and reset; members see their own balance and history. A saved loot split can be paid into wallets once, with a chest that opens and throws silver to each member's card.
- **Rolls & flips**: coin flips between two members or a call, to settle ties and decisions (no stakes: the owner decided flips never move silver); loot rolls (1–100, one roll each, highest wins, ties settled by a coin flip) with optional silver shared among the rollers and the pot. A 3D silver coin with a milled rim (crown heads, skull tails) tumbles end over end with a little precession, catches the light, casts a shadow that shrinks while it is high and lands with a bounce, a ring and dust; d100 number drums replay rolls. Both only replay the server's result; reduced motion shows it at once.
- Manage wallet went to every role that had Manage loot splits (Postgres `20261108090000_team_economy`, private-store step 12).
- Not done: roll penalties into the pot, regear requests and stats from the Discord bot; live updates (the view re-reads every 20 s while a roll is open).

## Founding a Team and member pictures — 7 November 2026

- `/groups/new` is a five-step founding ceremony (name, banner, plays, who can join, charter) with a live banner preview and a reveal when the team is created; one submit to the unchanged create API.
- The workspace address fills in from the name (`slugFromName`, the API's own `teamSlug` rule) until edited; whether it is free is still decided by the server on submit.
- Team members see each other's Discord pictures in their frames, a You tag and joined dates; the overview's Members panel tallies roles. Outsiders never receive the pictures (`e2e/supporting-product.spec.ts`).

## Team roles — 7 November 2026

- Teams have Discord-style roles: each Team keeps ordered roles with a name, a palette colour and nine permissions (manage team, manage roles, invite, review requests, remove members, events and announcements, comps, loot splits, shared builds). Members hold any number; rights are their union; the owner is the Leader with all of them. New Teams start with Admin, Officer and the default Member.
- Hierarchy is enforced on the server inside each transaction: roles and members are managed only below your own highest role, and nobody grants a permission they lack. The crest and profile need Manage team.
- Existing Teams were migrated to the same rights (Postgres `20261107180000_team_roles`, private-store step 11).
- Settings has a Roles panel; the member list shows role chips and a Roles dialog.
- Not done: a "see private content" permission; every member still sees the Team's events, comps, builds, announcements and loot splits.

## Homepage weight — 7 November 2026

- Images: one variant step (`scripts/image-variants.mjs`) for activity art, emblems, every guide cover in the library JSON (`public/library/media/guides`) and the Supporter painting; guide cards, the landing guide stories, the Supporter band and the landing windows pick a width with `srcset`/`sizes`, and a cover's blurred backdrop uses its narrowest file. The first `/guides` card loads eagerly with high priority (it is the LCP). `--check` also catches a repainted source (hash) and leftover variants. Local images on `/` after a full scroll: 1,126 → 718 KB at 412px, 1,199 → 769 KB at 1350px.
- Browser cache: `public/_headers` gives `/_next/static/*` a year (immutable) and artwork, icons and fonts 30 days plus a week stale-while-revalidate; before, every static file was `max-age=0`.
- CSS: rules for classes no source file uses were deleted from the 16 root sheets and `homepage.css` (≈ 120 KB of source). No element on 45 routes (signed out and admin, 1440 and 390) carries a removed class, and computed styles are unchanged. Inline CSS on `/` 405 → 308 KB; the homepage HTML 1,260 → 968 KB (213 → 167 KB gzip).
- `public/llms.txt` added.
- Not done: the homepage LCP is the lede, held back by the hero's rise animation; webpack strict CSS chunking; both wait for the owner. Item icons from the official renderer are requested at 2× for every screen; Next's built-in polyfills are the 14 KB of "legacy JavaScript"; the crest shields are CSS backgrounds and get no variants.

## Dashboard, settings and admin redesign — 6 November 2026

- Dashboard: compact well rows for your builds (loadout strip), comps (party weapons), running timers (running first), Teams and saved plans, builds and comps beside the side lists. An empty list is its panel head with one action; a new account sees one "first build" band instead of five empty lists. The quick-start tiles and closing cards are gone.
- Settings: one column of groups (name and line left, controls right): profile, sign-in and export, staff tools for admins and moderators, then closing the account under a rule. The section rail, masthead chips, floating admin button and closing cards are gone.
- Admin overview: "Needs attention" first (open reports, flagged accounts with their signals), totals in one strip, the last 30 days as daily bars beside the newest accounts, then recent access changes. Account search and "Ban a Discord ID" sit in the masthead. The admin pages' closing cards (`AdminNextSteps`) are deleted; the rail is the one set of section links.

## 30 guides, all Outpost's own — 6 November 2026

- The 8 archive guides have new titles, structure and text, written by Outpost; slugs stay, section anchors changed. Facts that still hold were kept and updated for Rogue Frontier, Abyssal Depths, Realm Divided, Radiant Wilds and Dragonfire.
- The 8 Outpost guides got search-style titles and fixes (Brecilien crafting bonuses, the Dragonfire sibling focus split, the fishing calculator's real inputs).
- 14 new guides: Hellgates, the Depths, the Mists, Roads of Avalon, Faction Warfare, zones and death loss, tracking, arenas, group dungeons, islands and farming, gathering T4 to T8, the Destiny Board, enchanting and ZvZ for new guild members. A new PvP category holds the PvP ones.
- `/guides` shows three cards across on wide screens so 30 guides fill every row. Sources per guide: `docs/data/guides-source.json`.
- Not done: wiki.albiononline.com, albiononline.com and the forum blocked direct fetches, so mechanics were checked through search-indexed copies; figures that could not be confirmed for the current patch are left out.

## Redesign batch 0: foundation — 6 November 2026

- Inner-page mastheads are open again: the rule that boxed every `WorkspaceHeading` is deleted, so ~35 routes now open on the painted backdrop like the landing. Guide readers show their cover across the masthead; the dashboard and settings show the player's Discord picture. Phone mastheads shade the copy edge to edge, and tab rows that overflow fade on the cut edge.
- One set of accent, radius and page-width tokens, defined at the top of `product-system.css` (`--page-width` 1240px, `--workspace-width` 1392px, `--radius-md` 10px); the shadowed `--accent-*`, `--action*` and `--radius-*` definitions in seven older sheets are gone. DESIGN.md's frontmatter now lists what ships.
- Shared components for the page batches: `SectionHeading`, `PanelHead`, `EmptyWell`, `StatusLine` / `Unavailable`, `Disclosure`, `WellSelect` and `SystemPage` (see DESIGN.md › Shared building blocks). Section headings are mixed case with one accent word, as on the landing.
- The 404 and error pages use the landing hero's language, `global-error.tsx` covers a failing root layout, and the root loading state is neutral instead of calculator-shaped.
- Next: page batches 1–9 move routes onto these pieces and onto `--page-width` / `--workspace-width`.

## Route-scoped stylesheets — 6 November 2026

- The root layout imports 16 global stylesheets (was 32). The 13 build, composition, Team build and guide sheets load from `src/app/build-styles.ts` in the `builds`, `compositions` and `guides` layouts and the favorites, Team and item pages; `fishing-workspace.css` and `journal-workspace.css` load with their calculators. CSS on the homepage in a production build: 513 KB → 347 KB (84 KB → 60 KB gzip) with Turbopack, 519 KB → 352 KB with webpack (the Cloudflare build).
- `workspace-refresh.css` is gone: its masthead rules live at the end of `product-system.css`, its support-page surfaces at the end of `product-support.css`.
- Route sheets now load after every global sheet, so declarations that only ever lost to a later global rule were deleted, and the build-detail rules that `product-system.css` and `inventory-board.css` overrode with moved to the sheets they style. Rendering was compared with the previous build on 52 routes (signed in and out, both themes, 1440/390/320, opened dialogs and disclosures, client-side navigation): identical apart from three unused `--card-*` tokens no longer defined on pages without build cards.

A full review of the last ~40 PRs. Fixed:

- **Account deletion:** a lapsed Supporter could not transfer or delete their Team, and so could not delete their account. Remove, transfer and delete are no longer paywalled. A deleted author's team comps now pass to the team owner instead of being cascaded away.
- **Teams:** join requests to private Teams return 404 (the same answer as a missing Team), a rejection is not reopened by re-requesting, the Supporter gate no longer reveals a private Team's owner plan to outsiders, and moderated comps can't be attached to new events.
- **Calculators:** Black Market production output is priced from the highest buy order and charges no setup fee; laborers "Margin" is relabelled return on cost; transport trip counts use exact decimals; the landing quote uses the unrounded 18/118 return rate.
- **Free-tier cost:** landing counts read the archive manifest instead of scanning about 11.5k D1 rows per view; expression indexes cover the library's default and newest orders (they take effect on the next `cloudflare-stage-library.mjs --apply`); the landing quote and top kills are edge-cached for signed-out visitors, and cache hits skip the rate-limit object; like chips refresh on focus at most every five minutes; the homepage loads its live previews with one `/api/landing` request (market + history + crafting + planner + top kills; one shared AODP price batch) and its like chips with one batched read, so a visit makes 2 data requests instead of 7; activity cards load a 400/600/800px WebP by rendered width (homepage artwork 354 KB → 112 KB on 1x desktop and 2x phones); the owner-promotion write runs once per user per isolate instead of on every request.
- **Data truth:** top-kill gear value ignores listings older than the seven-day kill window.
- **Profile frames:** players pick a picture frame (none, bronze, silver, gold, crystal) in Settings; it shows around their picture in the header, Settings and dashboard mastheads, and around their initial on their profile, comments and Team rosters.
- **Teams:** the directory is a grid of team cards (crest, server, size, what they play, joining state, one action) with a compact search row; public Teams get a home page for outsiders; every Team can pick a crest (an item render on a palette field, set by owners and admins in Settings) and say what it plays and whether it is recruiting. Image uploads for crests are not built (they need R2 storage and moderation).
- **Security:** Discord OAuth tokens are no longer stored, and tokens stored earlier are cleared by private-store schema step 8 on the next data Worker deploy (Postgres: migration `20261105220000_clear_oauth_tokens`); signed-out search is cached for two minutes (was ten).
- **Cleanup:** removed dead components, `home-fidelity.css`, the header-search CSS and dead `workspace-refresh.css` rules; deleted the generated root status reports; restored spaces dropped around numbers in the docs.

Still open from the review: get the weekly visual suite green and regenerate baselines on CI; per-user caps and expired-row cleanup for private data.

## Homepage and navigation — 4 November 2026

The owner-authorized candidate adds a compact server menu without global search, Explore tools / Sign in action plates, a smaller centered Supporter cutout with correct reveal/spacing, six larger featured activities with larger weapon previews, stable Firefox card-hover lighting, shorter tool previews and a minimal six-link footer. The example planner keeps two items; missing market observations stay unavailable. All 32 activities and the full tools remain available. [Design and verification details](design/HOME_HEADER_2026-11-03.md) and the reviewed QA record distinguish current implementation, test evidence, known screenshot/timing failures and pending protected publication. Broad launch NO-GO remains separate from this explicitly authorized incremental UI release.

## Security repair — 2 November 2026

The owner-requested security repair is implemented on a dedicated local branch and undergoing consolidated verification. It covers invitation revocation, caller/source quotas, streaming limits, cache isolation/headers, billing lifecycle and schema upgrades, calculator provenance/accounting, icon identity and responsive killboards. GitHub required checks and secret push protection were applied and read back; application changes have not been merged or deployed. The [security workflow](QA_WORKFLOW.md) distinguishes implementation, test evidence, remaining tooling alerts and external gates.

## Next session — inner pages to landing quality

Handover from the 31 Oct–1 Nov run. Every page already shares the backdrop, header, footer, palette, painted masthead emblems and framed panels; what is left is the **inside** of the pages. Work one page per round, in this order: ~~Market explorer → Build library → Crafting calculator (and its siblings: refining, cooking, alchemy) → Build editor~~, then ~~Comp planner, Teams, Timers, Item database~~. All shipped 1 Nov (sections below); next: real item art and live prices checked on production, then the dashboard and remaining supporting pages.

Per page, the bar is the landing (`src/app/page.tsx`, `homepage.css`):

- **Hierarchy:** one clear primary element per page (the thing the player came for) and a rhythm of sections, not a column of equal boxes.
- **Insides restyled:** inputs, selects, tables, tabs and empty states in the landing's language (wells, display-font numbers, gain green/loss red, city dots, coin icons, 12px floor). No old grey 10–11px labels or default form controls.
- **Motion:** hover lift/glow on anything clickable, spring buttons; reveals only through `LandingReveal`-style one-shot classes (IntersectionObserver), never transforms on panels driven by scroll (a shifted panel covered neighbouring controls).
- **States:** loading, empty, error and stale designed and inviting; real data only, missing stays missing.
- **Both themes and 390 / 1440 px**, checked in a browser; light mode framed panels are dark leather by design.

Things learned the hard way (read before touching CSS):

- Framed working panels draw their frame as a `border-image` on the panel itself (`product-system.css`, top-level panel selector). Do not reintroduce `::before`/`::after` layers or forced `position` on panels: it broke sticky panels (their `top` became an offset) and let a static panel's layer cover the page.
- The production CSS minifier differs from local builds: `@property` initial values like `0%` became `0` and silently invalidated every card background. Keep custom properties unit-free with fallbacks; check the live site, not only local.
- The header has no `backdrop-filter`: a live blur cannot be captured by the theme view transition and flickered on every switch.
- Durable Object SQLite date comparisons in Prisma queries matched nothing; filter dates in code (`site-stats.ts`).
- The deploy check runs under workerd with streamed pages; tests must wait for elements to be visible before measuring.
- Route stylesheets (`build-styles.ts`, component-imported sheets) load after every global sheet, and after client-side navigation after other routes' sheets too. A route rule that relied on losing to a later global rule changes the page; delete the dead declaration instead, and keep sheets that override each other in one ordered import list.
- Bot commits (visual baselines) need their CI runs approved (`POST /actions/runs/{id}/approve`); dispatch `visual-baselines.yml` on the branch after any visual change.

Open items found on the way:

- "Active players" counts signed-in accounts whose row was touched by a visit in the last 30 days (`updatedAt`, touched at most twice a day in `auth.ts`); visitors without an account are not counted.
- Framed working panels have no centre gems (the border-image frame cannot draw outside elements); add them back only with a technique that needs no positioning.

## Now — foundations

| #   | Item                                                                                                                                                                                                                                                                                                                                                                                            | Why                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | ~~Fix CI on `main`.~~ Done 30 Oct: the SQLite staging scripts no longer depend on `quote()` typing, the deploy token was replaced, and both workflows annotate the failing command.                                                                                                                                                                                                             | Green and deploying                                   |
| 2   | **Design system reset.** Replace the 16 layered global stylesheets (~350 KB on every route, plus route sheets) with one token file, one component layer (button, input, card, item well, table, tabs, chip, dialog) and per-archetype route styles. Move to the navy + ember palette and illustrated mastheads chosen on 30 Oct (DESIGN.md), enforce the 12px text floor and the spacing scale. | Biggest single lever on polish, consistency and speed |
| 3   | **Mobile speed.** Lab mobile LCP is 3.6–5.3 s on home, library, detail, market and crafting (target ≤2.5 s). Cut global CSS, check font and hero image loading, re-measure with a repeatable protocol.                                                                                                                                                                                          | Phones are first-class users                          |
| 4   | **Verify recovery.** After the next deploy, run `node scripts/cloudflare-recovery.mjs bookmark` once to confirm point-in-time recovery works on the Free plan. Email alerts for Worker errors, DDoS, SSL and abuse reports are on.                                                                                                                                                              | Backups only count once a restore path is proven      |
| 5   | **Legal page.** Operator name/contact and a privacy policy; then real Terms/Privacy URLs in the Discord portal.                                                                                                                                                                                                                                                                                 | Required for an account-holding site                  |

## Shipped — launch pass (30 Oct)

- Research-first market: the Market Explorer, price history and every calculator (crafting family, transport, farming, fishing, laborers) load observations for the current selection; manual prices are kept and the button only refreshes.
- Item pages: city prices on arrival, every tier and enchantment, consuming recipes, public builds for weapons; enchanted item routes (`T4_MAIN_AXE@1`) decode correctly.
- Market flipping leads with an item-picker route scanner (up to 25 items, margin and freshness per row, haul links); transport preselects cargo and route from links.
- Build pages: an empty community list hands visitors the Build Library; loadout prices load when the section is in view; author strategy opens by default; scratch copies are kept out of related builds.
- Comps, Teams and Guides share the illustrated masthead (`WorkspaceHeading` gained an `actions` slot); the landing page is rebuilt around benefits, real product screenshots, provenance and a final call to action, with no market request on arrival.
- Deploy and PR pipelines run the browser suites as three parallel shards; sign-in is rate-limited per client address; CSP allows Discord avatars; logo and guide media shrank from 20 MB to 2.4 MB.
- Competitor parity matrix in [PARITY.md](PARITY.md); `sitemap.xml` (generated at build time by `scripts/build-sitemap.ts`, 11.5k URLs served as a static asset) lists hubs, tools, guides and the archived library and is referenced from `robots.txt`.

## Shipped — honest kill feed freshness (8 Nov)

- Game Info sometimes serves an old copy of the live feed (Asia returned 31 Oct kills on 8 Nov). The kill feed now shows its newest kill's age, asks once more when an answer is over an hour behind the newest kill the collector has seen, and says above the kills when the copy is old or the source is running behind, instead of showing week-old fights as the latest.

## Shipped — live top kills by gear value (1 Nov)

- The landing's Top kills reads Outpost's own seven-day shortlist instead of Albion's lagging daily ranking. The data Worker keeps one `KillBoard` Durable Object per server, refilled every minute by a cron trigger from the live event feed and the weekly ranking; it stores the highest-fame kills of the last seven days (fame follows the victim's gear). The top-kills endpoint prices each shortlisted victim's worn gear at its lowest royal-city sell order and shows the three highest silver values. Heading now reads "Top kills this week". Trophies dropped 8px; the Guides page is centred.

## Shipped — two-handed weapons fill the off hand (1 Nov)

- Builds, build detail and editor boards, landing windows, top kills and the kill feed show a two-handed main hand again in the empty off-hand slot at 50% opacity, as the game does.

## Shipped — Market Explorer inner page (1 Nov)

- First page of the inner-page pass: sticky search rail, an item hero with lowest sell / highest buy / newest observation, a well table of city orders with spread, Lowest/Highest tags, per-price ages and Stale chips, a stacked two-line layout on phones, a selected-city detail that moves Price history to that city, and the landing chart for history (also on Gold, with hour labels for hourly data). Research list and watchlist open directly in their tabs.
- 369 legacy market selectors removed from ten global stylesheets; the page's rules live in `market-explorer.css` and `history.css`.

## Shipped — One builds list, one comps list (7 Nov)

- `/builds` lists community and library builds together with a source switch (All · Community · Library) beside the weapon, activity, playstyle and search filters; `/builds/library` list URLs 308-redirect to `/builds?source=library` keeping region and filters. Build pages are unchanged.
- `/compositions` lists player comps and Group Builds together (All · Player comps · Group Builds · My comps) with an activity filter; `/compositions/library` list URLs redirect the same way. `CompTabs` and the library tile grid CSS are gone.
- One activity filter covers both vocabularies: library activities and player content types are paired only where they are the same activity (`src/lib/source-filter.ts`).

## Shipped — Build library inner page (1 Nov)

- Library windows lead with the loadout board beside the weapon, author, activity chip, abilities and notes; titles get two lines; empty notes are no longer printed; phones show the date beside the author and drop the caption's duplicate (cards 178px).
- Library and Community rails and toolbars share framed panels and well selects; the Community empty state spans the results column.

## Shipped — Crafting calculator inner page (1 Nov)

- Crafting, refining, enchanting, cooking and alchemy (one component): total profit is the headline figure (gain/loss in colour and words), per-output figures and cash lines in wells, accounting and assumptions folded into the results panel, price ages with Stale/Manual chips instead of raw ISO times, one section-title style, well selects, and saved runs in a "Keep this run" panel.

## Shipped — Build editor inner page (1 Nov)

- Create and Edit open on the builds masthead; the back link is a pill beside a draft-status chip; guests get a "Starting from scratch?" well with the example set; slot switches are pills; selects and inputs are wells; market estimates are a well disclosure; the duplicate "Back to builds" button is gone. Twenty legacy `.guest-build-notice` rules across five sheets (one hid the copy, one set 11px) were removed.

## Shipped — Comp planner inner page (1 Nov)

- Create and Edit open on the comps masthead; the empty roles strip no longer renders for an empty party (Available builds moves up beside the roster); the empty party is a dashed well; party sizes are pills; selects and inputs are wells; "Back to comps" is a pill.

## Shipped — Teams inner pages (1 Nov)

- Team overview cards are framed panels with one heading style (no more mixed uppercase), compact "View all" / "Open comps" pills instead of full-width buttons, capitalised region and visibility chips; the directory's selects are wells and its empty state drops the display face.

## Shipped — Timers and Item database inner pages (1 Nov)

- Timers: one framed toolbar (filter, count chip, reload and add on one row) instead of a full-width select with a colliding count and a stray reload button; the empty state is a dashed well; selects are wells.
- Item database: category and List/Grid switches are pills, selects are wells, the category column reads as UI text, rows show their tier under the name instead of repeating the category and identifier, and "Compare prices" is a compact pill.

## Shipped — Albion light mode, game panels and a faster search (1 Nov)

- Light mode in Albion's own UI colours (dusty brown page, tan windows); every page's panels share the landing's panel look and mastheads keep the night style with painted emblems.
- Dashboard: four framed quick actions, game panels, Discord picture as the emblem (also on settings).
- Search: signed-out searches cached at the edge (two minutes since 5 Nov), no session lookup for guests, tool matches shown instantly, painted icons and guide covers, animated results.
- Theme switch: own sun and moon, no wait between clicks. Pill buttons and slider arrows animate on hover. security.txt published.

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
- **Page map**: kill and death feed are one route (`/tools/kill-feed?view=deaths`; `/tools/death-feed` redirects); gold history joins the Market Explorer tabs; Comps and Group Builds share one list (7 Nov); the header's tools menu is generated from the tool directory; "About market data" and "Reference tables" are linked from the footer. Builds (`/builds` community, `/builds/library` archive) and Comps keep separate addresses because they are different data sources with indexed URLs; they already share one masthead and tab row. Favorites stays a tab of Builds; `/timers` is the detail of the dashboard's summary; `/items`, `/market-data` and `/tools/reference` are different things (catalog, data coverage, game tables).

## Shipped — surface system across the site (31 Oct)

- The landing's look becomes the component layer (`product-system.css`): a warm canvas lit from the top, full-bleed painted mastheads that dissolve into the page (`WorkspaceHeading` with `scene`, `cover`, `emblem`, `titleId`; `MastheadTabs`; `.masthead` for custom heroes), one raised surface for every panel and card (`.raised`, `.has-scene`, `.well`), pill links and tabs, chips, hearts, rosters (`CompRoster`), guide cover cards (`GuideCoverCard`), silver coins (`Silver`) and city dots. Market Explorer, Build Library (windows with the loadout on the mini board), Group Builds (roster windows), Tools, Guides, Teams, Items, build and comp detail, guide readers, the calculators, combat feeds, Crafting Planner, dashboard, settings, timers, team workspaces and sign-in all sit on it. The old layered masthead, rail, card and tab rules were deleted from their sheets as each page moved.
- Still to converge: the remaining per-page stylesheets (the design-system reset in "Now"), the build/comp editors' chrome, and the Dashboard archetype.

## Shipped — landing page v5 and header (31 Oct)

- The home page is rebuilt to the owner's final mockup: a hero that dissolves into the page with a measured-numbers row (`countPlayers` service + library counts), three teaser windows on its edge (a public build on the board with chosen abilities and a device-saving ♥, what a Team does, a comp as a roster by weapon type), three live tool cards in one chrome (Market Explorer with a six-city table and dated chart, Crafting Calculator picking the best of five T6 recipes through `/api/landing/craft`, Crafting Planner with queue/shopping tabs), a guides slider with reading time, and three killboards from Game Info's kill-fame ranking (`/api/combat-events/top`, inventories, participants, estimated gear value). Cards share a raised surface with the scene blurred behind. `/api/economy/preview` and the earlier preview components are gone.
- Site-wide header: 72px bar, ember underline on the current section, wide search field with a `Ctrl K` cap (removed on 4 Nov in favour of the server menu; `/api/search` remains), region pill, two-state sun/moon switch.

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
| DES-CSS      | P1  | Design       | 39 stylesheets in `src/app` (16 load on every route), 7 redefine the palette; ~332 hex literals, 52 font sizes                                                                                                                    |
| AUD-11       | P2  | A11y         | Unlabelled `<aside>` landmarks in fishing, team loot, guide directory, shopping and farming                                                                                                                                       |
| QA-015       | P3  | Architecture | Direct `db.` reads in 14 page modules (e.g. builds/[id], builds/[id]/edit, compositions, compositions/new, dashboard, groups, groups/[slug], invitations/[token], players/[id], market-data, timers, items, items/[id], settings) |
| QA-014       | P2  | Tooling      | ESLint 9 deprecated; v10 blocked by Next plugin peers                                                                                                                                                                             |
| COMBAT-CACHE | P2  | Data         | On Cloudflare the combat feed cache key (`atlas:combat:*`) is rejected by the Cache API wrapper, so every request hits the 12/min upstream budget (unverified at runtime)                                                         |
| QA-019       | P2  | Community    | No spam defences beyond Turnstile and rate limits; no appeals                                                                                                                                                                     |
| SEC-006      | P2  | Security     | No full-history secret scan (a private disclosure contact is in SECURITY.md)                                                                                                                                                      |

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
- **Brand compatibility:** new downloads, composition/trade exports, package metadata and calendar producer metadata use Albion Outpost. Legacy composition imports remain supported; stored cookies, cache keys, database/provenance identifiers and calendar UIDs retain their existing identity. See [architecture](ARCHITECTURE.md#known-architectural-limits).
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

## Activity illustrations — 3 November 2026

Owner-approved protruding category artwork is integrated into the current homepage activity section and the new Builds → Activities collection, using the existing listed-library counts and most-liked build links. Main desktop/mobile navigation and homepage actions reach it; Library, community and personal routes stay available. [Scope, provenance and release verification](design/ACTIVITY_BACKGROUNDS.md). Push/deployment explicitly authorized by the owner; actual CI and deployment outcomes are recorded separately from implementation.

Activity illustration delivery: PR70 merged as 06e30f5 and deployed successfully through 41634703496. All required hosted checks, 57 Cloudflare core cases and independent public homepage/category/mobile/region/image-hash checks pass; most-liked links remain functional. The [activity review](design/ACTIVITY_BACKGROUNDS.md#published-read-back) records exact versions and remaining independent gates. No new application migration, paid feature or credential change was made.

Activity-card refinement requested after PR70: remove homepage Most liked rows; add progressive bottom artwork blur, contour shadows/bevel/reflection and restrained activity-only perspective feedback with a static reduced-motion/touch treatment. Current local Node phase 159/162 browser and 519 units; three equipment pixel comparisons remain independent. [Refinement scope and verification](design/ACTIVITY_BACKGROUNDS.md#owner-refinement-depth-and-progressive-blur).

Owner follow-up: restore source-backed weapon previews on both homepage and Builds activity cards, raise the graduated blur and fade the outer border near the cutouts. Fix landing crafting quantity changes by recalculating from the loaded market quote rather than requiring another fetch; remove the obsolete retained-quote error banner. Apply shared rolling digits to silver and calculator results, with reduced-motion support. Verification/deployment for this follow-up is recorded separately from the prior PR72 delivery; independent launch gates remain open.

Owner-requested homepage polish after PR73: replace swapped-digit motion with pinned NumberFlow continuous transitions, restore fanned weapon previews, move the free-access/Supporter band above activities, replace bright mismatched edges with a dark inset rim and matched corners, and modernize the shared footer without dropping links or disclosures. [Scope and evidence](design/HOMEPAGE_POLISH_2026-11-03.md). Publication remains distinct from the local verification checkpoint; independent equipment/source/provider/legal/loading/full-product gates remain open.

- Homepage Supporter courtyard: owner-supplied illustration integrated above activity discovery with a raised silhouette, readable lower copy and responsive actions. Phase/release evidence: [design note](design/SUPPORTER_ARTWORK_2026-11-03.md).

- Owner card-artwork corrections: restore the centered Supporter callout with the replacement crown scene, constrain activity effects to the silhouette, remove preview icon fills, and resolve build scenes by category. [Scope/evidence](design/CARD_ARTWORK_CORRECTIONS_2026-11-03.md).

- Centered Supporter cutout plus Firefox card rendering: separate crown silhouette above the body, centered copy/actions, direct artwork blur in place of backdrop sampling, no idle perspective transform, and a native Firefox regression runner. [Design and limits](design/CENTERED_CUTOUTS_FIREFOX_2026-11-03.md).

## 2026-11-04 — Homepage owner follow-up

Implemented wider single-scene Supporter, restored stable-artwork foreground motion, symmetric interruptible theme reveal, third planner item/readable remaining counts, natural preview headers/actions and feature-plus-two guide layout. Final 320px crowding corrected with one wider column/48px weapons. Node 22 mandatory phase 11/12 (524 units, 163/167 browser cases): three existing equipment goldens and stale planner digit assertion; corrected assertion passes with 17 focused cases. Final 63 Cloudflare core/24 runtime/types/free/container pass;60 scoped rendered/axe cases and 72 captures reviewed, native Firefox 159 100% 14 plus theme 2/all-six 320px 2 checks pass. Broader launch NO-GO and actual public verification remain separate. [Current evidence and reference review](design/HOMEPAGE_REFINEMENT_2026-11-04.md). Protected push/merge/deploy explicitly authorized; publication receipt follows successful deployment.

## 2026-11-04 — Owner card/motion corrections

Implemented outer native Supporter mask, uniform activity artwork/blur/border grow+press, shared control/card feedback and confirmed-success like/favorite/upvote pops, equal desktop tool tracks with 72px graph/92px profit, reachable narrow financial columns and bottom-left guide copy. Source audit covers all 52 route patterns; private/manual coverage limits remain explicit. Node 22 phase 11/12 (524 units, 167/170 browsers, only 3 existing goldens);66 final Cloudflare core/24 runtime/types/free/container pass;60 scoped rendered/axe cases, 12 visual motion, native Firefox 14 with mouse-emulation, 16 scroll regions and 12 touch cases reviewed. [Detailed current checkpoint](design/CARD_MOTION_POLISH_2026-11-04.md). Normal protected publication and public proof pending; full-product NO-GO remains independent.

## Final card corner verification — 4 November 2026

The shared motion and aligned preview refinement shipped through PR80. A manual live Firefox review caught tiny residual black corner pixels missed by geometry checks; the follow-up refines only the Supporter SVG contour and lower mask continuation. Current local desktop/phone captures in both themes are clean. Protected checks, final public delivery evidence and existing product-launch blockers remain independent.

## 2026-11-04 — Landing density and footer refinement

Owner follow-up compacts profit/margin, selects a real multi-material recipe for the preview, moves guide categories upper-right, removes landing guide author/date lines and gives the minimal footer two coherent groups. All existing recipe facts, accounting and full-calculator choices remain. Both-theme desktop/phone captures and scoped keyboard/axe checks are inspected; current full-phase/protected/public delivery evidence remains separate. [Design and verification checkpoint](design/LANDING_DENSITY_FOOTER_2026-11-04.md).

## 2026-11-04 — Inline guide metadata clarification

PR82 shipped the landing density/footer refinement. The owner clarified that category belongs left of reading time in the same top-right row. Current two-file UI correction passes productionbuild/homepage7 and 12 responsive guide cases, including 320px internal label wrapping. Parentfullphase and final newprotected/public evidence remain separate. [Checkpoint](design/LANDING_DENSITY_FOOTER_2026-11-04.md).

## 2026-11-04 — Homepage hierarchy and spacing

Paired public build/comp previews now lead to the actual creators; Team capabilities sit in a compact companion strip. Three persistent live tools share one accessible preview, with wider section/card rhythm and preserved inputs. Current full Node 22 phase 11/12: 524 units, 167/170 browsers; only three existing equipment goldens fail. Local rendered/state/keyboard/pointer review, 24 D1 runtime and fresh container pass. [Design and evidence](design/HOMEPAGE_RHYTHM_2026-11-04.md). Protected publication and exact-head public/native proof remain pending at this committed checkpoint; broader launchNO-GO remains separate.

## 2026-11-04 — Revert PR84 after owner rejection

The owner explicitly requested the prior homepage. Application and e2e trees now match PR83 exactly: three planning windows and three simultaneous tools return, experimental selector/Team strip removed. Historical evidence is retained and the PR84 design marked withdrawn. Current Node 22 phase 524 units/167 of 170 browsers (only 3 existing goldens),12 render/axe cases, 24 D1 runtime and fresh container pass. [Rollback checkpoint](design/HOMEPAGE_REVERT_2026-11-04.md). Normal protected publication/current public proof remain pending; broader launchNO-GO unchanged.

## 2026-11-04 — Market, legal draft and search/share integration

The owner-preferred PR83 layout restored in PR85 remains. Supporter copy is centered without resizing; guides precede weekly kills. Market/Tools working surfaces extend the landing brand while preserving task controls. Public-only search/share metadata, branded OG image, 11519-URL sitemap and optional Google/Bing verification wiring are implemented. German legal information is an explicit draft; missing operator/consumer-rights/operational facts remain open. Google ad requests fail closed pending real consent/revocation; no payments enabled.

Final Node 22 phase: 614 units and 171/174 browsers, only 3 existing equipment goldens fail. Current 24 D1 runtime, 70 CF core/types/dry runs, fresh non-root container, 48 production route cases/16 scoped axe and native Firefox 14 home+12 Market/Tools pass. Production/lab/negative metadata details and first failures are preserved in [phase design/evidence](design/MARKET_LEGAL_SHARING_2026-11-04.md), [SEO](SEO_AND_SOCIAL_SHARING.md), [legal activation ledger](legal/GERMAN_LEGAL_DRAFT_2026-11-04.md) and [tooling reassessment](TOOLING_SECURITY.md). Protected publication/current public receipt pending at this checkpoint; full-product/commercial launch remains NO-GO.

## 2026-11-04 — Legal language and reading clarity

PR86 is deployed as `301b5676` through run `41914907559`; its public receipt remains separate from this follow-up. The current candidate improves Supporter text contrast without changing its image, silhouette or dimensions. The legal draft now uses a framed, left-aligned Inter reading surface, concise pending labels with complete adjacent requirements, and responsive contents navigation. Full English and German copies retain all 12 sections and 31 original literal link destinations. Weighted browser preferences select English/German, unsupported languages fall back to English, and the explicit switch preserves region and section without a translation service or new preference cookie.

Current Node 22 phase: 659 units and 172/175 browser cases; the same three equipment goldens remain failed. Current 24 D1 runtime cases, 71 Cloudflare core cases, Worker types, fresh bundle dry-runs, non-root container and 36 production Chromium checks pass. Current native Firefox 14 cases and source/artifact/21-file staged scans pass; root repeats the exact final document stage scan before commit. One current homepage mobile Lighthouse sample records 76 performance/100 accessibility,LCP 5569ms/CLS 0.06318; this is not a controlled speedup or field result. [Design and evidence](design/LEGAL_LANGUAGE_READABILITY_2026-11-04.md) and [bilingual copy ledger](legal/BILINGUAL_LEGAL_DRAFT_2026-11-04.md) preserve the remaining operator/legal, consumer-rights and provider requirements. This is a prepublication checkpoint; protected publication and exact-head public verification remain pending. Ads and payments stay off; broader commercial/full-product launch remains NO-GO.

## 2026-11-05 — Complete legal release after blocked section-navigation check

PR87 merged but failed production verification and did not deploy. A legal-only restorer now aligns the preserved fragment after hydration/fonts; the original viewport assertion is retained and a cold-load regression added. Current 659 units/173 of 176 browsers (only 3 existing goldens),24 D1 runtime, 72 CF core/types/fresh dry runs and 8 fresh container cases pass. [Corrective evidence](design/LEGAL_SECTION_SCROLL_2026-11-05.md). Protected corrective publication/current public proof pending; legal/operator/provider/full-product limits remain open.

## Administration follow-up

The overview, current-role user management, manual review signals, Supporter gifts, session revocation, persistent Discord identity bans and audit pages are implemented. They do not supply visitor analytics, revenue reporting, automated fraud verdicts or role assignment. Operator decisions on audit/ban retention and a rehearsed production schema 7 recovery remain separate work. The current interface retains existing Team ownership and paid billing when an account is banned; support procedures must handle those consequences.
