# Restore the landing page from PR83

The owner rejected the hierarchy and spacing redesign shipped in PR84 and explicitly requested the prior page. This rollback restores every application and browser-test file to merge `56dde354d38a9f4d99aebbd9fa12939cf9cb1fba` (PR83), preserving Git history and the experiment's documentation as historical evidence.

The restored page has three planning previews (Build, Team Management, Comp) and all three live tool cards together. Original activity/guide spacing, card sizes, creator/example destinations and responsive styles return. The experimental tool selector and companion Team strip are removed. No new design decisions, recipe facts, formulas, assets, database schema or server permissions are introduced.

PR83 itself only aligned the landing guide category pill immediately left of reading time in the top-right row. The long category wraps within its own pill on narrow phones while reading time stays beside it. It did not introduce the PR84 homepage hierarchy.

`git diff 56dde354d38a9f4d99aebbd9fa12939cf9cb1fba -- src e2e` is empty after restoration. Mandatory Node22 full-phase, current rendered checks, container and required protected/public release checks remain pending at this initial rollback checkpoint. Prior known equipment screenshot mismatches, full-provider/legal/current-patch/recovery/loading/full-product launch gates remain independent.

Current local verification: Node22 full phase11/12,524units and167/170browser cases pass; the only failures are three existing equipment goldens.12render/axe cases across six widths/both themes and all4contact sheets inspected, current24D1runtime and fresh non-root container pass. Current lab sample79performance/100accessibility,LCP4813ms/CLS0.0632is not field proof or a speedup. Required protected/current public/native checks remain pending at this committed checkpoint.
