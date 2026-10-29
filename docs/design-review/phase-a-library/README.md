# Build Library: bounded Phase A, 29 October 2026

Implemented the library/discovery portion of the owner-supplied master brief, deep audit and route matrix in `.qa/codex-ready-2026-10-29`. Market and build detail are separate coordinated workstreams. Owner acceptance, the final production capture and the full mandatory phase gate remain independent.

## Observed problem and change

The real public library rendered 24 large cards, repeated collection/source navigation and a long weapon-category stack. Search was inside the mobile filter drawer. The compact presentation now leads with the real main-hand item, title, weapon name, authored activity, author and recorded update date. It previews three armor slots and recorded main-hand spells. Full equipment and alternatives remain on detail; the archived record is still read-only.

A single collection navigation names Library, Community, My Builds, Favorites and Saved Filters. The shared community page drops its duplicate source bar; its queries, owner/favorite actions and permission service are unchanged. Favorites remain explicitly device/account scoped by their existing interfaces. Search remains visible, sorting submits the existing query, desktop filters expand inline, and mobile filters retain their keyboard modal drawer. The weapon-family select uses real family counts; changing family clears the specific weapon to avoid an incompatible combination. Removing active filters remounts the form from canonical URL state. Existing sort, page, region, device favorites and saved-filter behavior is preserved.

## Measured render outcomes

Anonymous browser, 24 identical public source records, 1440×900 and 390×844. Baseline: local Node22 production on port3003; after: local Node22 development on port3006. This measures rendered geometry, not production performance or Worker CPU.

| Metric                    |   Before |    After |
| ------------------------- | -------: | -------: |
| Mobile document height    |   6840px |   4203px |
| Mobile first card height  | 238.98px | 135.39px |
| Mobile first card top     | 507.78px | 448.86px |
| Desktop document height   |   2573px |   2292px |
| Desktop first card height | 226.98px | 184.98px |
| Desktop first card top    | 394.19px | 450.05px |

Mobile document length falls38.6% with the same24 records. The desktop first result moves56px lower because search is now a main workspace control above results; shorter cards reduce total length. This is a recorded tradeoff, not a first-result speed improvement claim. Mobile search requires no filter-drawer opening. Phone layout controls are intentionally omitted because compact list presentation is used for both compatible URL views.

## Actual evidence

- [Before desktop](before-1440.png), [after desktop](after-1440.png), [before phone](before-390.png), [after phone](after-390.png).
- Raw capture matrix: `.qa/phase-a-library/after/manifest.json`, with320/375/390/768/1024/1440/1920 widths. All seven default states returned200 with zero logged page errors, horizontal overflow or missing card images. Seven default plus two filter-open axe samples reported zero violations.
- Rendered after screenshots were inspected at every width. Desktop/mobile list mode, filter-open, empty search and light-theme captures are in the same directory. An initial axe capture harness incorrectly used `browser.newPage`; its failure is preserved in `capture-after.log`. Corrected isolated browser contexts produced the matrix.
- Light toolbar controls have explicit token-based backgrounds, text, borders and placeholders. Settled, actual theme-toggle captures: `light-390-fixed.png`, `light-1440-fixed.png`; `light-fixed.json` records zero axe violations at both widths. Earlier immediate-toggle gray transitional frames remain historical failure evidence, not accepted final appearance.
- Four focused browser journeys passed twice, latest10.4s: new real family/sort/page/region journey; phone save/reload/sticky search; existing library favorites/saved filters; existing320px drawer keyboard/no-results journey. `.qa/phase-a-library/scoped-tests-second.log`.
- Focused ESLint completed without diagnostics: `.qa/phase-a-library/eslint.log`. Final light-toolbar regression is included in the phone test; root coordinates complete production QA.

Playwright MCP navigation returned `MCP tool call requires approval, but approval policy is never`; captures use the installed sandboxed local-library fallback. No real OAuth, account fixtures, production prices or backend/schema changes were needed for these library journeys. Automated axe and these samples do not establish full WCAG conformance, real device behavior, 200% text-zoom acceptance, field performance or owner visual approval. No deployment or push was performed by this workstream.
