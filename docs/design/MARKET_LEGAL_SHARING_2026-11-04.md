# Market, legal information and public sharing — 4 November 2026

This is a new incremental release candidate based on the owner-preferred PR83 layout restored by PR85 (`85477dd814348f9c812686032bfb5985fc53ae87`). The rejected PR84 layout remains withdrawn. This work does not reintroduce its tool selector, paired planning windows or Team strip.

## Requested behavior

The landing Supporter heading, description and actions move toward the center of the illustrated card. Its width, height, supplied artwork, silhouette and action destinations remain the same. The padding redistributes the previous vertical space around the visible body rather than enlarging the card. Guides now precede Top kills this week. PR83's inline category/read-time metadata and the three simultaneous landing tool previews remain.

Market and the Tools directory begin extending the landing visual language into working pages: task emblems, restrained illustrated mastheads, copper frames and the established typography. Core controls, selection, source labels, quality/region identity, research/watchlists, filtering and device-local shortcuts remain functional. [Market/Tools design and rendered evidence](MARKET_TOOLS_OPERATE_2026-11-04.md).

The German `/legal` reading page now describes the implementation's actual authentication, storage, external services, public/private content, payments code, rights and partially AI-assisted decorative artwork. It is explicitly a draft with missing operator/operational details. [Legal source and activation ledger](../legal/GERMAN_LEGAL_DRAFT_2026-11-04.md). Placeholder identity is not legally complete, and the existing code is not a verified statutory cancellation or withdrawal mechanism. Billing remains unconfigured.

The privacy review found that a configured AdSense publisher previously started Google's script without a consent integration. Ad requests/units are now disabled. Passive publisher ownership metadata and the seller declaration remain; optional first-party Supporter offers still use current server entitlement. No custom banner, invented consent string or paid activation is introduced. Fifteen focused privacy regressions exercise configured IDs, actual rendered elements, server entitlement and nonce/Turnstile/CSP boundaries.

Public hubs, tools, archives, active items and explicitly published builds/standalone compositions gain route-specific search/share metadata and a static branded preview image. Private/unlisted/hidden/Team content receives generic restricted metadata independently of the viewer's body permissions. [SEO implementation and remaining Search Console steps](../SEO_AND_SOCIAL_SHARING.md). Indexing/ranking and external social-cache refreshes remain outside this implementation's control.

## Review and evidence

The active session's Browser MCP call was rejected: “MCP tool call requires approval, but approval policy is never.” Permitted local-library Playwright ran with its normal Chromium sandbox. Native Firefox159 used fresh task-owned profiles at100% with loopback BiDi. These are explicitly labelled fallback/native evidence, not MCP or personal-profile evidence.

Before/after Supporter captures and geometry are under `.qa/market-legal-sharing/`. Twelve final local dev cases cover1920/1440/768/390/375/320 in both themes. The copy group is within0.01px of the visible body center, and measured dimensions differ from the original baseline by less than0.02px at matching card widths. Root inspected both contact sheets and critical full-size originals. Native home/cutout checks passed14 cases; their local report/captures are copied into `native-home-local/`. The small phone extension below the original picture remains the existing responsive behavior, not a new resize.

The Market/Tools design owner reviewed24 local Chromium route/theme/width cases and12 native Firefox cases; root independently inspected all four final contact sheets, Market desktop and mobile originals and Tools catalogue originals. Six state probes cover partial/stale/missing data, loading/error/empty, keyboard selection/detail/history, quality URLs and pin/reload/reset. Four scoped axe analyses found no violations. Legal has12 local responsive/theme cases, keyboard-contained table scrolling and scoped axe evidence. These checks do not establish full accessibility, all GPUs, real providers or owner acceptance.

The SEO owner and an independent security reviewer exercised public-only metadata queries, revoked visibility, hidden/unlisted/Team denial, active matching items, malformed canonical paths and optional verification configuration. A backslash-origin edge case in the canonical helper was fixed before integration; current callers use static/encoded local paths, and no user-flow redirect was demonstrated. The static1200×630 share image was inspected at native resolution and its provenance/hash recorded.

Full-phase attempts, production/container/Cloudflare checks and protected/public deployment results are separate. The reviewed root QA record is the prepublication checkpoint; final delivery receipts supplement it after a confirmed deployment. Existing equipment screenshot failures, operator/legal/provider/current-patch/media/production-recovery limits remain explicit rather than being erased by this incremental UI release.

## Final local integration checkpoint

Final mandatory phase:614unit tests,171of174browser cases,11of12named gates. Only the three existing equipment golden mismatches fail. First attempt caught test-only child-process environment typing and the upstream advisory change; second caught obsolete Market-data title/legal font expectations. Corrections retain explicit desired font/title checks; the final phase passes all affected flows. No equipment goldens were edited.

Current24D1runtime,70Cloudflarecore cases, both Worker typechecks, OpenNext build and both real dry-runs pass. Fresh container runs asUID1000 without a baked.env and reports healthy local services.48production route/theme/width cases and16scopedaxe analyses pass, with10actual crawler-head checks,PNG200/1200×630 and11519sitemap URLs; no advertising requests or page errors. All8production contact sheets and critical originals reviewed. An initial ignored checker used the wrong AncientLands slug; its failure is retained. Initial1440Market captures were still loading; response registration before navigation now ensures settled observation/error captures, and the final rerun passes.

Single local Market mobile Lighthouse observation:80performance/100accessibility,LCP4883ms/CLS0.0633. It is not a controlled improvement or field result. Current raw all/prod dependency scans report0 after the official range correction; the strict tooling guard retains exact artifact checks. Source/artifact/staged/docs/format checks and normal protected publication/current public evidence are recorded separately.

Final manual production review found inherited white text on the light Market refresh button. A scoped text-color correction now matches the landing primary action. Six rebuilt-production contrast cases pass at1440/390/320 in both themes; final Cloudflare build/types/70core and fresh dry-runs were repeated. The earlier full phase and lab sample precede only this color refinement; no formulas or behavior changed.
