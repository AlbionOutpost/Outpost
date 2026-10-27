# Contributing to Outpost

Use the Node version in `.nvmrc`, `npm ci`, local loopback PostgreSQL/Redis and the committed Prisma migrations. Setup is in README.md. Keep private configuration in ignored `.env` files; example database credentials are loopback development values, not shared-environment secrets.

Make a focused branch and reviewable changes. Read AGENTS.md and relevant installed Next documentation. Use TypeScript, existing domain engines and shared tokens/components; do not duplicate formulas in UI. Preserve authentication, current role checks, optimistic revisions and migrations. Do not reset shared databases or rewrite shared Git history.

For every major phase run `npm run qa:phase`, inspect responsive screenshots and review inventory and regenerate current reports following [the documentation workflow](docs/QA_WORKFLOW.md); update the dated progress log. Isolated browser fixtures are not real OAuth or market observations. Keep explicit failures and blockers. Before a pull request describe the behavior, validation and remaining limits; do not commit .qa dumps/logs, credentials or temporary output.

Bug reports should give steps, route, viewport and expected/actual behavior with sanitized evidence. Feature suggestions should identify the player workflow and required verified data source. Never copy competitor code, paid data or unlicensed artwork. Report security issues privately using SECURITY.md; do not publish sensitive reproduction details. No license has been selected for original code yet.
