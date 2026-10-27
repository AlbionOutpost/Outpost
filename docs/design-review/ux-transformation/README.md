# Task-led homepage, Market and crafting

Implemented October27 on the actual Next.js application. The short homepage now offers three planning tasks and one searchable market preview. The equipment collage, repeated market panels and empty community strip are removed. Phones show compact navigation and expand source prices/history only on request.

Market guides item/city/quality setup before displaying quotes, explains source failures separately from genuine missing observations, and preserves independent watchlist/history access. Crafting separates recipe setup, pricing and profit on phones while retaining the desktop workbench, manual assumptions, exact accounting and saved scenarios. Shared controls/panels use8px/12px radii and the same charcoal/light tokens; the brown terminal override is removed.

## Matched screenshots

Actual production Chromium, Europe, dark theme, no mocked prices. Full-page captures use the same initial viewport per pair:1440×900 and390×844. The page heights differ because content was removed. Source observations can age between captures.

| Page           | Desktop before                     | Desktop after                    | Phone before                      | Phone after                     |
| -------------- | ---------------------------------- | -------------------------------- | --------------------------------- | ------------------------------- |
| Homepage       | [Before](before-home-1440.png)     | [After](after-home-1440.png)     | [Before](before-home-390.png)     | [After](after-home-390.png)     |
| Market setup   | [Before](before-market-1440.png)   | [After](after-market-1440.png)   | [Before](before-market-390.png)   | [After](after-market-390.png)   |
| Crafting setup | [Before](before-crafting-1440.png) | [After](after-crafting-1440.png) | [Before](before-crafting-390.png) | [After](after-crafting-390.png) |

Raw ignored evidence is under `.qa/ux-transform`: six widths1440/1920/768/390/375/320, viewport and full-page captures, actual observed market results, a manual crafting scenario and light-theme checks. Playwright MCP returned `MCP tool call requires approval, but approval policy is never`; these are the permitted **local Playwright library fallback**, not MCP execution. Screenshots were opened and inspected. The review corrected an inherited brown panel palette, uneven mobile progress wrapping, hidden pre-comparison watchlist/history access and the mobile crafting action order.

## Functional limits

Prices retain their own source times and stale/missing statuses. Manual crafting examples use explicit unit prices100/50 and sale price3000;1 craft yields1000 silver before supplied fees/returns,10 crafts10000. These are independently calculated manual examples, not observed profits or recipe/current-patch certification. Source recipe limitations remain displayed.

Build/comp/guild interactions retain their established workspaces, with the shared type/surface/control changes checked by regression screenshots. Full workflow redesign of those tools is outside this implemented scope. Real Discord OAuth, current-patch recipe verification, owned HTTPS operations and hosted CI remain separate open release gates. No production deployment is implied.

## Verification

Final `npm run qa:phase` on Node22/local PostgreSQL/Redis passes all ten checks,143 unit cases and72 production browser cases. The browser suite includes saved scenarios, denied private actions, watchlist persistence, source identity/freshness and independently computed production examples. Eight deliberate equipment/comp pixel baselines were opened and accepted, then passed without updates in the full gate.

The initial three pages were captured/opened at six widths; populated actual-market, explicit manual-profit and light-home states were checked at1440/390/320. Fifteen sampled axe scans report zero violations;27 captured route/state/width combinations have no document overflow. This is not full WCAG or physical-device certification. The full-page camera is returned to scroll0 before comparison captures.

Homepage captured height at390px is3006→1101px; at320px3539→1145px; at1440px1730→997px. These are layout measurements, not loading-time claims. [Structured results](measurements.json).

320px pairs: homepage [before](before-home-320.png)/[after](after-home-320.png); Market [before](before-market-320.png)/[after](after-market-320.png); crafting [before](before-crafting-320.png)/[after](after-crafting-320.png).

Current Lighthouse13.5.0 mobile-default sample against the local production homepage: Performance97, Accessibility100, LCP2554ms, CLS0. One current sample, no comparable before benchmark or field-speed claim;2.5s LCP remains unmet in this sample. Raw `.qa/ux-transform/lighthouse.json` is retained. Docker build is blocked by the read-only `/home/bttw/.docker/buildx/activity` path; security permissions were not changed. Chrome DevTools MCP still cannot find `/opt/google/chrome/chrome`.

Additional inspected states: [actual market observations](market-observed-1440.png), [phone observations](market-observed-390.png), [manual crafting profit](crafting-manual-profit-390.png), [light theme](home-light-1440.png).
