# Supporting product routes and homepage — 29 October 2026

This work implements the supporting-page portion of the owner’s complete product rebuild. The controlling new brief and actual homepage reference are `.qa/product-rebuild-2026-10-29/reference-package/PROMPT.md` and `references/01-home.png`. Shared navigation, global tokens, Market, builds, calculations and editors have separate owners. No production deployment, push, credential, billing, schema or security-policy change was performed by this workstream.

## Implemented structures and behavior

| Surface                           | Change and preserved authority                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                              | Bounded headline/neutral atmosphere, three task destinations, one split market search/observations workspace, optional history/source disclosure, and four genuine public library records. The existing quote parser, item/server identity, abort handling, independent timestamps and history gaps remain authoritative. History loads when requested; no invented prices, popularity or scene assets. |
| Dashboard                         | Actual most recently edited build/comp becomes the continuation entry; other recent work forms a compact list. Timers, memberships and saved calculator plans remain current-user scoped. Original calculator-resume action label and exact region/kind/hash destinations are preserved.                                                                                                                |
| Timers                            | Existing active/paused reminders lead the page. Status filtering, due-first sorting, collapsed creation when populated, maintenance disclosure and saved-row focus after creation. Empty accounts can create immediately. Existing duration engine, versions, endpoints and ownership remain unchanged.                                                                                                 |
| Teams directory/create/invitation | Explicit Discover/My Teams views; `mine=1` now narrows existing visibility to actual memberships. Search/pagination preserve that scope. Creation uses the selected regional context and explains visibility; invitation validation, expiry, acceptance and server permissions remain unchanged.                                                                                                        |
| Team workspace                    | Tab selection survives links/reload/back through `#team-*`. Upcoming/past/all event filters, per-event details, loaded-roster search and 25-row client paging. The existing bounded server roster/event windows, member roles, RSVP, exports, invitations, shared snapshots and mutation services remain authoritative.                                                                                 |
| Guides/articles                   | Compact editorial list with authentic cover/topic imagery, real authors and dates; region-preserving links; reading summary, print control, durable TOC and readable prose. Original content, journal progress and fishing tools remain intact.                                                                                                                                                         |
| Tools directory                   | Compact task rows, original functional tool glyphs, search/categories and an allowlisted device-only collection of up to six pinned shortcuts. No account sync or invented activity claim.                                                                                                                                                                                                              |
| Combat feeds                      | Dense expandable event ledger, with a page-local minimum-fame filter alongside existing player/guild search and sort. Kill/victim perspective, bounded paging, timestamps, refresh/cancellation and genuine equipment remain unchanged.                                                                                                                                                                 |
| Settings/sign-in                  | Preferences, export, session and account closure are distinct sections. Draft-change/reset feedback preserves the actual settings actions and failed-save draft. Sign-in names the intended continuation without exposing callback tokens or changing OAuth behavior.                                                                                                                                   |
| Public profiles                   | Public visible builds/comps only, with actual edit dates and explicit shown counts; no inferred Albion identity verification.                                                                                                                                                                                                                                                                           |
| Moderation                        | Loaded queue and selected report are separated; rationale belongs to the selected report and clears when selection changes. Current-role authorization, optimistic versions, audited mutations and untrusted text rendering are preserved.                                                                                                                                                              |
| Legal                             | Readable contents navigation and source/privacy/operator sections. Missing official fields remain visibly unresolved. Scene text now matches the removed homepage illustration. No legal approval or operator identity was invented.                                                                                                                                                                    |

## Source and evidence

Before-source copies and SHA256 identities are in `.qa/product-support-rebuild/before-source/manifest.json`; this baseline includes the existing uncommitted Phase A work, not an older repository revision.

Baseline: local Node22 production on port3003. After: shared local Node22 development on port3006. Actual screenshots exist for **17 route patterns × desktop1440/phone390 =34 captures** in each of:

- `.qa/product-support-rebuild/before/screenshots`
- `.qa/product-support-rebuild/after-final/screenshots`

Both matrices returned200 with zero logged page errors, document overflow or missing images, and their disposable owner/member/invite fixtures were removed in `finally`. Fixtures are not real Discord OAuth, real scheduled events, real complaints or real team activity. Public price/feed requests were genuine source reads and can be loading or unavailable. The final desktop homepage capture records loading; an earlier inspected `after-iteration1/screenshots/home/1440-viewport.png` records actual dated source observations. These are distinct evidence states.

Representative actual images were inspected for home, timers, dashboard, combat, guides, settings, teams, profile, moderation and legal. Homepage six-width browser coverage additionally checks1440/1920/768/390/375/320, optional history and overflow. Parent production review owns the final all-route/theme matrix and acceptance.

The scoped stylesheet is `src/app/product-support.css`, imported by the root owner after shared tokens. Main source boundaries are the affected pages plus `HomeMarketTerminal`, `TimerManager`, `GroupDashboard`, `GroupCreate`, guide directories/reading tools, `ToolDirectory`, `CombatFeed`, settings forms and `ModerationQueue`. New bounded shortcut parsing is `src/lib/tool-shortcuts.ts`.

## Measured geometry, not performance claims

The same isolated fixture/content states were used for these phone document-height comparisons. They are not field loading, user-task timing or Worker CPU measurements.

| Route            | Before |  After |
| ---------------- | -----: | -----: |
| Timers           | 1320px |  953px |
| Dashboard        | 1614px | 1518px |
| Guides directory | 3818px | 3247px |
| Tools directory  | 3894px | 3424px |
| Kill/death feeds | 4648px | 3759px |

Settings, legal, guide reading, team creation and home became longer as readable sections/context and real public builds were added. No blanket scroll-reduction or pixel-fidelity claim is made. The real-data scene-right homepage reference remains represented by a restrained CSS atmosphere because no approved genuine scene asset was established. The featured-build row is below the first desktop fold rather than fully visible within it; real observed city quotes replace the reference’s fictional multi-item ticker.

## Verification and retained failures

- `npx vitest run tests/tool-shortcuts.test.ts`: **2 passed**. Malformed/foreign destinations, duplicates, order and six-item bound are checked independently.
- Scoped `tsc --noEmit`: **passed** in `typecheck-final.log`; scoped ESLint: **passed** in `eslint-final.log`.
- Seven current focused browser cases were covered across `.qa/product-support-rebuild/tests/fifth.log` (six passed; one obsolete empty-pin expectation failed) and corrected `.qa/product-support-rebuild/tests/pins-final.log` (one passed). They cover price failure/missing/retry, identity/region, six-width disclosure flow, device pins/reload, actual membership scope/private API denial, and timer creation/focus/persistence. The exact one-price-request-per-item assertion is retained for production; development StrictMode replay issues two initial requests.
- Initial harness/fixture failures, including omitted required fixture fields and the first obsolete pin assertion, remain in `.qa/product-support-rebuild/tests` rather than being erased.
- The first full parent phase found real custom-link contrast, a timer list ARIA role omission, inherited profile alignment/count spacing and Market target-size defects. Root owns the app corrections and mandatory rerun. Stale tests were updated to the actual single-preview/disclosure/new-dashboard-anchor flow without dropping source-gap, range, value, region, private-boundary or keyboard assertions.
- Final `npm run qa:phase`, native Cloudflare checks, final production screenshot comparison and all five root reports are coordinated by the root agent. This review does not assert they passed before their results exist.

Playwright MCP navigation returned approval-required under an approval policy of never. Browser evidence uses the existing **sandboxed local-library fallback**, not an MCP availability claim. Axe samples and fixtures do not establish full WCAG conformance, real provider consent, full physical-device/200% zoom coverage, current-patch mechanics, scene rights, legal readiness or owner visual approval. Those gates remain independent.
