# Compact region selector

The owner rejected the oversized region menu with boxed EU/AM/AS badges and a separate heading/explanation. Replaced it with three plainly named40px options, one restrained selected fill/checkmark, a keyboard-only active outline and a short market-separation note. The trigger now has a defined border/surface. Mouse interaction remains immediate, without movement or fades.

The menu stays anchored to its trigger on phones. Desktop size changes from264×234px to204×169px; the390px phone menu changes from366×234px to204×169px. Existing region values, URL/query preservation, cookies, market isolation and selection/focus behavior are retained. Only option labels in browser tests were updated to their new plain names.

[Before desktop](before-desktop.png), [after desktop](after-desktop.png), [after phone](after-phone.png), [six widths in both themes](states.jpg).

Browser MCP returned “MCP tool call requires approval, but approval policy is never.” Used the permitted installed local-library Playwright fallback without altering security/browser configuration. Reviewed actual before/after images and the six-width theme sheet. Final command and production-capture results follow. Sampled axe is not full screen-reader/device conformance; owner acceptance and existing release gates remain independent.

## Verification

Final `npm run qa:phase` on Node22/local PostgreSQL/Redis passes all10 commands:156 unit tests,83 ordinary production browser tests without snapshot updates,15 disposable database checks and9 bounded regional reads. Existing region tests verify keyboard selection, Escape/outside dismissal, focus return, query item/quality preservation and the persisted server. Current source/bundle configured-secret scans,17 documentation-validator tests and rebuild drift checks pass. Two pre-existing lint warnings remain.

Production captures cover320/375/390/768/1440/1920 in dark and light themes:12 menu configurations, no page overflow or sampled axe violations. Two supplementary interaction captures distinguish selected Europe from active Americas. All three selected labels fit the320px trigger without internal/page overflow. Actual images and the production theme/width sheet were opened. Raw local-library evidence is in `.qa/region-refine`.

The Impeccable source detector returned no findings. Fresh container smoke passes: HTTP200, UID1000, no copied `.env`, PostgreSQL/Redis healthy. Actual OAuth remains unconfigured. The owned QA container is removed; the separate production preview remains at `http://localhost:3100`.

One mobile lab sample each for home/Market/crafting reports performance86/95/95, accessibility100 each, LCP4.164/2.856/2.864s and CLS0. All sampled LCP values miss2.5s; homepage performance misses90. Single samples do not establish a reliable comparison or field/conformance evidence. Full screen-reader/device review, owner visual acceptance and prior product/game/OAuth gates remain open. Release remains NO-GO.
