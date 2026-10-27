# Search, navigation and real equipment — 2026-10-27

Implemented the owner’s next refinement in the application using Outpost frontend, visual QA and release skills. Reviewed the supplied search screenshot, actual local baseline and the Grind navigation reference. Rechecked the public Grind homepage. No third-party frontend code, audience figures, example prices or unapproved scene artwork was copied.

The new search palette replaces the large empty form with a single clear search field, task shortcuts, item examples, grouped results with genuine item imagery, keyboard navigation, close/reset and source-error states. Debounce/cancellation and existing server filtering remain. Result links now retain the chosen region. Escape closes even when a populated search input would otherwise consume it. The search is reset on dismissal so previous query/results do not linger.

The Tools menu now has larger original task glyphs, short explanations and an All tools action. A native region select gains a styled/animated picker through progressive CSS enhancement, retaining its values, URL/cookie behavior and classic native fallback in browsers without support. It does not invent latency/server status. Shared controls, type and neutral charcoal surfaces are larger and clearer; copper still follows the logo. Error text was lightened to retain contrast against the revised panel.

React19.3 ViewTransition wraps the page content, keeping the header in place during route changes. Theme changes use a native snapshot crossfade with an immediate fallback where unsupported. Actual browser animation names were observed, including route-arrive/route-leave and theme-arrive/theme-leave. No animation library or route interception was introduced; queries, saved state and APIs retain existing behavior. Reduced motion disables these transitions.

Removed the generated panoramic hero. The new compact equipment composition uses actual renderer Battleaxe/Broadsword/Bow artwork with selectable weapon links, plus named Scholar Cowl and Mercenary Jacket links. It is equipment browsing, not a recommended compatible loadout, current meta, invented statistic or gameplay illustration. The original generated assets remain archived for historical evidence. Authentic scene-specific redistribution permission remains unverified; the official presskit still returned403 and no protected access was bypassed.

Final screenshot, test, performance and publication evidence is recorded below after verification. Initial parser, overflow, contrast, search Escape and visible/accessibility-label issues were preserved in local logs and corrected. Existing authorization, data identity, calculation, persistence and missing-price behavior remain covered by their regression suites. No full accessibility or owner visual acceptance claim is made.

## Rendered evidence and checks

[Desktop before](before-1440.png), [desktop after](after-1440.png), [mobile before](before-390.png), [mobile after](after-390.png), [new search](search-empty-1440.png), [real item results](search-results-1440.png), [mobile search](search-empty-390.png), [Tools](tools-1440.png), [region picker](region-1440.png) and [light theme](light-1440.png). Actual production/source screenshots were opened; this is the local Playwright Chromium fallback, not MCP. The actual MCP call returned “MCP tool call requires approval, but approval policy is never.”

The homepage is checked at1440/1920/768/390/375/320px, with additional desktop/mobile captures for Market, Builds, Equipment, Crafting, Comps, Guilds and Guides. Anonymous empty and unavailable states remain truthful; they are not filled with invented community or market activity. Authenticated workflows are covered separately by labelled browser fixtures. All ten reviewed equipment/comp/drawer golden images were opened. Sampled axe checks and route/theme motion observations are preserved in the JSON records; these do not establish complete conformance, real OAuth, physical devices or subjective owner acceptance.

Two old Community verified build records were identified by exact reserved atlas-test owners, IDs, fixture titles and descriptions, and removed from the local database. No user-authored record matched. The subsequent gallery capture represents the actual empty state. No database contents, credentials, environments, backups, sessions or ignored QA request logs are included in publication.

## Artwork loading

The large weapon was the initial LCP element. Three sequential Lighthouse13.5 simulated-mobile baselines used the same production route and fresh browser profile, with local services/application caches warm. The image was lazy-loaded from the external renderer without a high-priority hint. Five unmodified official renderer PNGs are now pinned in [the source/checksum ledger](../../assets/HOMEPAGE_EQUIPMENT.json), served locally through Next Image optimization, with the lead image eager/high priority. Original source PNG bytes are retained. No mechanics, patch verification or blanket artwork permission is inferred from delivery.

Actual raw audits remain in `.qa/playful-ui/lighthouse-before-{1,2,3}.json` and `lighthouse-after-{1,2,3}.json`. Browser captures/builds were not run concurrently with these measurements. Source observations can age between runs; they are not fixed market fixtures. Browser caches are cold; local service/image caches may be warm. This remains lab evidence, not field p75 or a guarantee on physical devices.

Median lab LCP changed from 5.222s to 2.862s. Before range 5.210–5.224s; after 2.633–3.399s. All six audits reported accessibility100 and CLS0. The 2.5-second LCP target remains unmet. [Sample summary](performance.json).

## Final regression and publication preparation

Final `npm run qa:phase` passed all ten checks on Node22 with local services:143 unit tests,71 production browser tests, typecheck/lint, disposable database checks, production build, dependency audit and bounded regional reads. Two existing unused-variable lint warnings remain. Browser concurrency is capped at two because the suite shares local service/request budgets; rate limits and assertions were preserved. An earlier eight-worker run hit the public request limit and is retained as a failed run. The last legal-copy clarification identifies all generated scenes as archived; its rebuild and three focused browser regressions passed separately. A popup exit-opacity race was also corrected so text remains at full contrast during rapid close/open sequences.

The existing private AlbionOutpost/Outpost remote was empty and writable. Cloned it into `/tmp/outpost-publish-20261027`, copied an explicit source manifest and excluded environments except `.env.example`, credentials, local DBs/backups, generated runtimes and ignored QA/session logs. Clean `npm ci --ignore-scripts` and a production build passed there. Prisma’s default cache was read-only; a scoped writable XDG cache under `/tmp` allowed the clean build without changing permissions. Source/blob checks and actual push outcome are recorded in the delivery/repository evidence. Original protected workspace Git metadata was not replaced, and no existing remote history was rewritten. This source publication does not deploy the site or close real OAuth, staging, legal, data/recipe or operations gates.

Docker remains blocked before build by the read-only builder activity directory. No field performance, full conformance or owner visual approval is implied.

The last rendered phone review removed a decorative caption overlapping the jacket label and adjusted card headings so “Calculators” no longer breaks inside the word. Those presentation corrections were rebuilt and the three focused browser tests rerun; final screenshots were recaptured.

## Publication read-back

Published implementation commit [226e3ae](https://github.com/AlbionOutpost/Outpost/commit/226e3aec087f96a2d7fc4f12b47ae8afb22bdf8f) to the existing private `AlbionOutpost/Outpost` repository on `main`. GitHub’s commit endpoint returned the same SHA. It is the repository’s first source commit, with865 explicitly reviewed files; there was no prior remote history to rewrite. The clean candidate build and exact staged-blob/configured-secret scan passed. The initial [hosted Quality gates run](https://github.com/AlbionOutpost/Outpost/actions/runs/40427701027) was observed running; that does not establish hosted success. The following documentation commit records this read-back. No hosted site was deployed.
