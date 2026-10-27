# Companion-app reference — 2026-10-26

Implemented the [supplied reference](reference.png) through a structural homepage and shared-navigation change. The prior chart-led landing composition is replaced by a compact persistent desktop sidebar, expanded global-search trigger, wide courtyard hero, smaller Inter headline and four compact equipment-led tool previews. The real source chart and item lookup remain below the previews. Shared navigation appears on product routes; their editors, calculations and data behavior are preserved.

| Viewport         | Before                       | After                       |
| ---------------- | ---------------------------- | --------------------------- |
| Desktop 1440×900 | [Full page](before-1440.png) | [Full page](after-1440.png) |
| Mobile 390×844   | [Full page](before-390.png)  | [Full page](after-390.png)  |

The courtyard is an existing user-authorised generated illustration, visibly disclosed and linked to media details. It is not genuine gameplay. Equipment icons use the existing official renderer/fallback; no new art, statistics, prices, activity, recommended comps or abilities were invented. The reference is a layout reference, not a source for its game facts or prices.

Opened actual final screenshot viewports at 1440/1920/768/390/375/320 and desktop/mobile full pages. No document overflow, failed requests, page/console errors or sampled axe violations in these six source-state captures ([measurements](measurements.json)). Background-image contrast checks still need human judgement; zero axe findings are not full conformance. Reviewed the hero overlay/readability manually. First-pass review corrected the nested lookup layout and search accessible-name mismatch. Four changed tablet/desktop equipment/comp goldens were opened; renderer pixels are masked only in those deterministic regression images, while homepage review captures retain actual imagery.

Eight focused visual/market tests passed. The first complete gate had 66 passing browsers and one outdated Barlow-homepage assertion; the current reference deliberately uses Inter for the hero. Updated that assertion while preserving Barlow checks on existing display-title pages. Final execution is authoritative in [QA_REPORT](../../../QA_REPORT.md). Browser automation uses the permitted local Playwright fallback; MCP navigation is restricted by approval policy. Physical-device and owner visual acceptance remain separate.

Shared-shell review also opened actual Market, equipment detail, crafting and Guilds pages; the separate source-state route check found no overflow across six product routes. Whole-app regression review caught two palette regressions: the calculator mobile breakdown link and a light-theme secondary-button hover state. Both now use readable semantic text colors. Page-specific tool redesigns and missing game content are not claimed complete by this shell change.

The remaining light-mode comp failure was traced with a bounded local fixture: after selecting a party size, Add member changes from primary to secondary and the global 160ms foreground/background interpolation passed through unreadable colors. Button state colors now change immediately while border/shadow transitions remain; reduced motion still disables those. This fixes the actual transient state rather than delaying or weakening the accessibility test. The diagnostic fixture was removed in its cleanup block.

Final complete gate: all ten checks PASS, including 143 unit tests and 67 production browser tests. The 176-configuration regression review completed without overflow or sampled axe violations. Local production responds on port 3001. Docker verification remains blocked by the read-only builder activity directory; no security permissions were changed.

One sequential post-change Lighthouse 13.5 mobile lab sample: performance97/100, accessibility100/100, LCP2.554s, CLS0. This is not a controlled before/after benchmark; the2.5s target is not claimed achieved.
