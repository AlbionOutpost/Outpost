# Homepage polish — 2026-10-26

The existing visual identity is preserved. The390/1440 comparison keeps header, hero and headline geometry unchanged. Desktop tools start6px earlier; mobile feature images are100px tall and the feature section drops from1158px to801px. Loaded content remains responsive and keyboard/touch controls retain their existing semantics.

## Actual changes

- Community cards query saved armor/cape and optional consumables, not just the weapon. Unknown/unassigned gear is not filled with invented items. Content type, actual author when available and saved revision remain visible. Public/non-hidden access stays enforced and the reserved test-user namespace is excluded.
- Market discovery requests the existing public API only when asked. Normal-quality buy/sell quotes retain independent source dates. Missing sides, unknown timestamps, old/future observations, empty responses, outage/retry and wrong identity are explicit. Item/region changes abort stale work and invalidate the displayed result. No sample price or fake activity count is bundled.
- Desktop transition spacing and mobile feature-copy density are tightened with homepage-scoped rules; shared typography/colors/navigation and other page layouts remain intact.
- A local Lighthouse run exposed footer movement when the route loading boundary appeared. Reserving one viewport for homepage loading keeps the footer below view; the fully loaded layout remains unchanged. Original and rerun measurements are retained: the local CLS sample changes from0.1459 to0.0008. This is a single lab comparison, not a field-performance claim; headline/hero geometry is unchanged.

## Rendered and interaction evidence

Local artifact root: `.qa/homepage-polish`. Actual before/after390/1440 captures, measurements and an offline comparison gallery are retained there; current viewport captures also live under `.qa/homepage-correction/07-homepage-polish`. Captures were actually inspected, including the initially wrapped consumable icon and its corrected single-row layout. The source lookup and media gap are documented [separately](SCENE_SOURCE_REVIEW.md).

Populated layout captures are isolated local QA records and labeled as such; after fixtures deliberately add cape/consumable records so those new fields can be inspected. They are not pixel-identical data fixtures or production recommendations. Review records are removed by cascade afterward. Reserved fixture/private/hidden records are deliberately given newer sort dates and asserted absent. No production seed/content was added.

[Homepage regression](../../../e2e/homepage-visual-correction.spec.ts), [loaded preview/failure/cancellation tests](../../../e2e/homepage-polish.spec.ts) and [source validation/freshness units](../../../tests/market-preview.test.ts) exercise actual behavior. The initial pending-selection test used an incorrect Bow ID; its failure context is retained in `initial-failure/`, the test now selects the real authored Bow ID, and the full suite is rerun. No behavior assertion was removed to get a pass.

A separate unmocked browser request against the fresh local container loaded actual Data Project observations, with dates/missing values preserved, at both review widths. Its raw source payload and screenshots are local evidence, not shipped defaults. Current execution counts, Docker smoke and Lighthouse values are generated from [QA evidence](../../qa-evidence.json) in [QA_REPORT.md](../../../QA_REPORT.md). Screenshots and sampled axe/Lighthouse do not certify complete visual acceptance or accessibility.

## Media and remaining acceptance

Logo follow-up: the user-supplied banner replaces the text-only mark in the shared header, mobile drawer and footer. Its original PNG is preserved; the display frame excludes transparent margins and adds a charcoal backplate in light mode. Actual dark/light and drawer captures were reviewed, including320/390/768/1440/1920 widths, with decoded-image, overflow and Escape/focus checks. The initial generic gold-chart image selector conflicted with the new logo images; it now identifies the chart by its accessible name and retains its numeric assertion. Initial failure and corrected-run evidence remain under `.qa/logo`; the full phase was rerun. [Logo provenance](../../assets/OUTPOST_LOGO.json).

No new generated image was created. Genuine screenshot substitution remains BLOCKED: current image-specific reuse evidence was not established from the available official sources. Existing disclosed illustrations are preserved and remain provisional. [Lookup record](SCENE_SOURCE_REVIEW.md), [media ledger](../../assets/OUTPOST_MEDIA_INVENTORY.md), [release gates](../../../RELEASE_READINESS.md).
