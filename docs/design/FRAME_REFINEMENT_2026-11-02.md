# Site-wide copper frame refinement

The owner requested quieter frames throughout the application, extending the initial landing-page request to every shared frame. This is a refinement of the established charcoal/copper identity.

## Scope and implementation

`src/app/product-system.css` owns both frame implementations: illustrated `.raised.has-scene` cards draw the shared 9-slice frame on their pseudo-element, while top-level working panels draw it directly as a border image. Both now inherit the same muted copper artwork (`#92715a` → `#684c3c` → `#3e322b`), a thinner outer stroke and a quieter inner stroke. Corner studs and centre gems use darker metal tones. Offset shadows replace the orange halos in resting and interactive states, in both themes. Hover/focus-within gives illustrated cards a restrained brightness change. `src/app/site-refinement.css` uses the same copper rule/gem for the footer without a halo.

The inventory covers landing previews and kill/activity cards, build cards/search, market panels, calculator panels, editor/loadout/party panels, readiness panels, timer forms, fishing, discovery and other pages using the shared selectors. Nested inset panels retain their existing border treatment. There is no page-local copy of the old 9-slice artwork. Primary controls, keyboard focus outlines, selected equipment states, game artwork and semantic colours remain distinct from decorative frames.

## Rendered evidence

[Representative calculator preview](references/subtle-copper-frames-1440.png) shows the shared working-panel treatment. The capture includes loading/missing price states and is evidence of the frame styling, not price readiness.

Local-library Playwright fallback used the installed Chromium with sandbox enabled, anonymous local PostgreSQL/Redis services and bounded upstream observations. Evidence is in the ignored `.qa/frames-2026-11-02` directory. Existing owner artwork and the pre-change build at `d2ea511` are the references; no new raster artwork was generated.

- `before-matrix.json`: 16 baseline captures across eight routes at desktop1440 and mobile390.
- `after-matrix.json`: 48 final captures across landing, crafting, market, build library, compositions, Teams, Supporter and flipping in both themes. Landing/crafting use1440/1920/768/390/375/320; other routes use1440/390. Final captures use reduced motion for stable visual inspection. Initial animated landing captures were transient and prompted the stable recapture; they were not used as evidence of a layout defect.
- All48 responses were200; no document overflow was measured. Every route/theme inherited one identical frame token and gem token. Computed resting frame filters contain an offset depth shadow, without the coloured halo.
- Inspected all six dark landing widths, representative desktop/mobile calculator/build/market/composition/Teams/Supporter/flipping captures, and light-theme captures. Existing equipment/composition screenshot baselines were updated and individually inspected for the intentional frame change. Equipment artwork is masked in those existing deterministic fixtures; those masks are not production rendering evidence.

This is visual and interaction regression evidence, not owner acceptance, full accessibility conformance, current-patch verification or field-performance evidence. Genuine Discord and Stripe lifecycle checks remain owner-deferred. No deployment is performed by this refinement record; later release receipts must record any authorized publication separately.

## Validation authority

The current reviewed phase outcomes and remaining blockers are recorded in `docs/security-remediation.json` and its generated root QA/progress reports. Raw logs and captures remain in the ignored evidence directory. No new application behaviour, formula, cache namespace, permission or migration is introduced by the frame change. The first full phase exposed an unrelated expired date in the existing Teams test: its fixed `2026-11-02T20:00` input was now in the past and the app correctly returned “Choose a future event date.” The fixture now supplies tomorrow in the browser’s local timezone. The original155/156 run is retained under `first-phase-failed`; the corrected test passed3/3 targeted repeats before the final full phase.
