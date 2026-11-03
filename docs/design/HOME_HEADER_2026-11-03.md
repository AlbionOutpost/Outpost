# Homepage and server selector — 3 November 2026

The owner requested a smaller centered Supporter cutout, six larger activity cards, distinct Explore tools and Sign in hero actions, a redesigned server selector without header search, and a fix for the Firefox hairline returning on card hover.

## Implementation

- The Supporter body is centered at a maximum of 760px with 640px artwork, shorter spacing and smaller type. The supplied crown artwork and native silhouette are retained.
- The homepage features Crystal creatures, Small scale, Hellgate 5v5, Avalonian Dungeons, Corrupted Dungeons and Solo Mists: three columns on desktop and two on smaller screens. All 32 activities remain in the full gallery. Crystal creatures has one recorded build/weapon; extra weapon previews or counts are never invented.
- Copper and dark action plates lead to Explore tools and Sign in, preserving region in both URLs. Natural accessible names include their visible helper text.
- The header search and its shortcut are unmounted. Tool-specific searches remain. The server control distinguishes the current region from the three larger menu options, with clear selection, globe marks and keyboard focus. It retains existing query state, immediate region invalidation and persistence. Option accessible names include the visible Albion server name. Mobile menu positioning is independent of its entrance animation.
- Activity hover no longer rotates, scales or re-filters the cutout stack. Static shadows and protruding source artwork retain depth; the existing clipped light overlay changes opacity on hover. Image brightness filtering and hover stacking changes are removed. This addresses the remaining transformed-hover rendering path rather than claiming all Firefox GPUs have been certified.

## Verification and delivery

Final prepublication verification is complete; publication and public read-back remain pending. The initial full phase retained 155/166 passes and 11 failures: three existing equipment goldens plus eight failures from incomplete initial navigation assertions, menu positioning and visible/accessibility-label mismatches. Those findings were fixed; the nine focused navigation, menu, personal-workspace and accessibility cases subsequently passed. No golden or axe assertion was removed or suppressed.

The final full phase, production Cloudflare runtime/core browser suite, native Firefox pointer checks, responsive screenshot review and bundle/container/loading checks are recorded in the reviewed [QA record](../security-remediation.json). Public delivery remains pending. Raw local logs and captures are under `.qa/header-home/`; they distinguish fixtures from actual public read-back. The native pointer sequence follows the [WebDriver BiDi input specification](https://w3c.github.io/webdriver-bidi/#command-input-performActions).

The previous cutout release was merged as07183a91010453967177860d3b19130919d6545e in PR77. Deployment41724408093 succeeded with data92c952fb-95be-4d5a-ae22-a76a0af2af6b and web7767ed8b-bb40-4bbc-a592-ae36f26c7767. The owner saw it and requested the smaller dimensions; automated public read-back for that intermediate version was superseded by this follow-up. Publication of this candidate remains pending normal required checks and the already owner-authorized deployment.

The broader independent legal, current-patch data, real OAuth/payment, recovery, loading and full-product gates remain open. Fixture sessions, lab scores and screenshot inspection do not close them.

## Owner follow-up — 4 November, Europe/Berlin

The tool previews now size to their contents. Market Explorer's search shortcut is removed; its table, history interaction and full-tool link remain. Cost/sale and profit/margin areas have tighter spacing. Craft city rows contain actual complete quotes, with a compact coverage note instead of padded missing-price rows. Selection, observations, return assumptions, fees and arithmetic are unchanged; absent quotes remain unavailable.

The example planner keeps ten capes and three broadswords, with two aligned name/progress groups beside their icons. Per-item unit-price/city subtitles are removed, while missing sell orders remain explicit. Owned totals derive from the active plan's required and remaining quantities, so a removed line cannot contribute stale ownership. Independent browser fixtures verify13 total items, a partial10,000-silver cost when three swords are unpriced, and9,000 after owning one1,000-silver cape. The animation fixture moves13,000→12,000→13,000 from complete1,000-silver item quotes; these are labelled QA fixtures, not market observations.

Activity weapon previews grow from48px to56px (compact phone previews28px to32px). The section gap after Supporter grows to128px on desktop and80px on phones. Rendered review caught the Supporter element missing from the reveal observer even though CSS applied its unrevealed56px offset; adding it to the observer restores its final position and prevents target crops. A normal-motion regression checks the reveal and real gap.

The footer is reduced to six links, the wordmark, Back to top, a short data/affiliation disclosure, copyright and privacy/terms. It uses one navigation row on desktop and a compact three-column link grid on phones. The latest18 focused homepage/activity/region/navigation cases pass; the current full phase retains162/166 browser passes (three existing equipment goldens and one90-second editor timeout, passed unchanged in18.2seconds on rerun). All62 Cloudflare core cases,24 runtime cases,108 Chromium checks including96 axe scopes,14 native Firefox100% cases, both Worker types, bundle limits and a fresh non-root container pass. All responsive/hover variants were reviewed through16 contact sheets and critical full-size captures. One separate local Lighthouse sample scores76 performance/100 accessibility with5415ms LCP/0.063CLS; it is not field evidence and loading targets remain open. Source/artifact/staged scans and documentation/formatting checks pass. Protected publication and actual public verification remain pending.
