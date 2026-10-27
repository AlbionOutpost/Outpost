<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Outpost mandatory major-phase QA gate

## Autonomous Development

Work autonomously on Outpost.

- Never ask "Should I proceed?" after completing a task.
- Continue to the next unfinished development priority automatically.
- Make reasonable technical and design decisions independently.
- Implement, test, review, fix, and continue.
- Run npm run qa:phase after major milestones.
- Update project progress documents.
- If a task is blocked, document it and continue with independent work.
- Do not stop after completing a single development phase.
- Ask for essential credentials or decisions only when absolutely necessary.
- Never bypass security restrictions or perform destructive operations.

After every major development phase run `npm run qa:phase` on Node22 with local services. Follow `docs/QA_WORKFLOW.md`, update all five root QA reports and project progress files, and review responsive screenshots. Preserve explicit failures/blocked/missing features. Rerun formula, authorization, cache and migration checks after related changes. Fixture sessions are not real OAuth; axe/Lighthouse are not full conformance/field evidence. Release remains NO-GO until essential gates actually close.

## Outpost development contract

- Preserve accurate Albion IDs, recipes, abilities and provenance. Imported, schema-valid, source-reviewed, manually verified and current-patch-verified are separate; unknown facts stay unknown.
- Build professional, page-specific UI using the established typography, palette, shared components and supplied references. Inspect actual rendered desktop/mobile pages before visual completion claims.
- Enforce permissions on the server using current ownership/membership. Test denied actions and private cache boundaries, not just permitted journeys.
- Document calculator units, assumptions and game sources; verify independent expected values and missing/stale prices. Never present fixtures or manual prices as live observations.
- Measure relevant performance before optimization; retain responsive usability and correctness. Run appropriate regressions after significant changes and the mandatory phase gate above.
- Report implementation and verification independently, with actual commands/evidence and explicit missing/blocked scope. Preserve existing functionality, data, migrations, tests and Git history.
- Continue routine authorized tasks autonomously. Skills do not authorize unrelated publication, destructive actions or secret exposure.

Load only applicable project skills from `.agents/skills` when installed. This environment mounts `.agents` read-only; the complete validated bundle is staged in [skill-system/skills](skill-system/skills). Until installation is possible, read the applicable staged skill explicitly: [frontend](skill-system/skills/outpost-frontend/SKILL.md), [visual QA](skill-system/skills/outpost-visual-qa/SKILL.md), [Albion data](skill-system/skills/outpost-albion-data/SKILL.md), [calculators](skill-system/skills/outpost-calculators/SKILL.md), [security](skill-system/skills/outpost-security/SKILL.md), [performance](skill-system/skills/outpost-performance/SKILL.md) and [release](skill-system/skills/outpost-release/SKILL.md). Compose them at affected boundaries. Staging/file validation does not establish Codex discovery or automatic activation. Shared tools, workflow, validation and maintenance: [SKILL_SYSTEM.md](docs/engineering/SKILL_SYSTEM.md).

## Reviewed frontend and engineering skills

The seven Outpost skills above are already installed and discovered in the current environment. Six additional pinned skills are prepared in `skill-system/vendor`; the read-only `.agents/skills` mount blocks their automatic installation. [Inventory, source review, invocation and activation evidence](docs/engineering/DEVELOPMENT_SKILLS.md). Validate with `python3 scripts/install-project-skills.py --check`; from an authorized writable environment, install with `python3 scripts/install-project-skills.py`, then verify the next Codex skill catalog. Until then, explicitly read the linked staged skill; never equate a staged manifest with automatic discovery.

| Task                                                           | Additional skill to read                                                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Design critique, hierarchy, typography, polish or motion       | [impeccable](skill-system/vendor/impeccable/SKILL.md), with outpost-frontend/visual-qa                                     |
| Component architecture, state, responsive UI and accessibility | [frontend-ui-engineering](skill-system/vendor/frontend-ui-engineering/SKILL.md)                                            |
| Correctness, architecture, security and maintainability review | [code-review-and-quality](skill-system/vendor/code-review-and-quality/SKILL.md)                                            |
| Reproduce/localize an actual failure                           | [debugging-and-error-recovery](skill-system/vendor/debugging-and-error-recovery/SKILL.md)                                  |
| React/Next waterfalls, serialization, rendering or bundles     | [vercel-react-best-practices](skill-system/vendor/vercel-react-best-practices/SKILL.md), with outpost-performance/security |
| Rendered browser checks and interaction proof                  | [frontend-testing-debugging](skill-system/vendor/frontend-testing-debugging/SKILL.md), with outpost-visual-qa              |

- Explicit audit/plan requests authorize inspection and evidence collection, not application fixes. Stop at the requested prioritized plan; the autonomous-development defaults above do not expand that scope.
- Keep Outpost's established Barlow Condensed/Inter/Geist Mono typography, charcoal/copper palette, truthful Albion facts and source/licensing boundaries. Generic examples are guidance, not instructions to replace the brand, install Tailwind/shadcn/state libraries, or split files solely at a line-count threshold.
- Installed `node_modules/next/dist/docs/` controls framework APIs. Do not install retired Next best-practice/upgrade packs or enable Cache Components from a generic skill; user/session ownership and cache isolation take precedence over caching suggestions.
- Reuse Node22, Vitest, existing Playwright/axe tests and local services. Generic Jest command examples are not this project's commands. Ad hoc Playwright inspection complements the regression suite; it does not replace it. Keep fixtures, missing prices and real OAuth evidence distinct.
- Browser MCP availability requires an actual successful call. Preserve the permitted local Playwright/CDP/Lighthouse fallback and label it. Never disable sandboxing, expose debugging ports externally, overwrite global config, or install browser plugins to conceal a restriction. Existing `.qa` and documentation artifacts remain the project's authorized evidence locations.
- Vendor installation does not enable Impeccable hooks, live editing, remote asset generation, automatic updates, telemetry or subordinate agents. Inspect executable helpers before use; use a writable task-local `IMPECCABLE_HOME`, `IMPECCABLE_NO_TELEMETRY=1`, and `IMPECCABLE_NO_UPDATE_CHECK=1`. An upstream workflow never authorizes unrelated publication, permissions changes or application edits.
