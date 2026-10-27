# Repository readiness

**NOT READY for final owner review or release.** AlbionOutpost/outpost and AlbionOutpost/outpost-operations now exist as private, empty repositories. No application upload or hosted CI execution is verified.

| Check                                       | State                                                              |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Lockfile and migration history              | Present; retain                                                    |
| Environment/certificate/backup exclusions   | Improved in `.gitignore`; `.env.example` retained                  |
| Git repository/history                      | UNAVAILABLE: `git status` reports no repository                    |
| History/complete secret scan                | NOT VERIFIED; no false zero-secret claim                           |
| Current application QA                      | See `.qa/phase-summary.json` and five root reports                 |
| Global formatting and dead-code audit       | Formatting PASS; dead-code/dependency completeness still partial   |
| Fresh checkout/install                      | Not verified                                                       |
| Hosted GitHub Actions                       | Prepared locally; hosted execution NOT VERIFIED                    |
| License                                     | Owner decision required; no arbitrary LICENSE created              |
| Game media/data rights                      | Item-render integration documented; full dataset/scenes unresolved |
| Real OAuth, operator details and deployment | Blocked/unverified                                                 |

No secrets should be committed. Never upload `.env`, database dumps, local QA backups or fixture sessions. Before a push, run a maintained source/history secret scanner, inspect the exact staged diff and validate exclusions using real Git metadata. Previous creation authorization does not justify publishing publicly; latest instruction requires explicit remote-push authorization.

Scoped source scan: `.qa/repository-source-scan.json` examined265 candidate source/docs/config text files for the configured session secret, private-key markers and GitHub token patterns; no matches. This excludes ignored environments/generated output and cannot examine Git history here. It is not a complete maintained-scanner audit or a zero-secrets certification.

## Prepared local workflow

`.github/workflows/quality.yml` runs read-only pull_request/push gates, uses immutable official checkout7.0.1/setup-node7.1.0 commits, disables persisted checkout credentials, uses npm ci and Node from .nvmrc, creates a random ephemeral session secret, starts loopback Compose services and runs formatting, migration/catalog setup, browser installation, scoped source/bundle scans and full qa:phase. It neither deploys nor pushes. No real OAuth/production secrets are passed to PR code. CI cleanup removes only its ephemeral runner volumes.

Pins verified from official release/commit pages: [checkout](https://github.com/actions/checkout/commit/3d3c42e5aac5ba805825da76410c181273ba90b1), [setup-node](https://github.com/actions/setup-node/commit/949feb2413d6458794dcd2491c4babbbce0c15c1). Hosted execution remains unverified. Scope-limited pattern scanning is not a maintained full-history Gitleaks audit. No unreviewed artifact upload of database dumps or fixture sessions is configured.

Latest scope-limited scan:288 candidate source text files and43 browser static files, no configured-secret/pattern findings. Global Prettier check passes. Git metadata/history remain unavailable; original-code licensing, hosted CI and fresh checkout are unverified. These scans are not a maintained full-history audit. No remote push/publication was performed.

## GitHub provisioning checkpoint

Prepared `scripts/github-setup.mjs` and `docs/deployment/GITHUB_SETUP.md` for OutpostDevelopment with private outpost/outpost-operations repositories. Added weekly Dependabot configuration. Six isolated API fixture tests pass, including owner gating and read-back drift. Live API connection is blocked in the current execution context, so authentication, organization availability, remote creation/policies and hosted CI remain NOT VERIFIED. No code upload/commit/push, billing change or Git initialization performed. The user's request authorizes private provisioning; environment restrictions still apply.

Final GitHub-preparation QA:123 unit tests,53 production browser tests,15 disposable database checks and all ten phase gates PASS after correcting test typing. Production build, types, lint, advisory and region checks pass. Initial failing gate retained in .qa/github-setup/initial; final evidence .qa/github-setup/final. Scoped scans312 source/43 static files found no configured-secret matches; no Git history certification. No application UI changes or new visual acceptance claim. Remote organization/repository creation and security configuration remain BLOCKED/NOT VERIFIED; release NO-GO.

## Live private GitHub provisioning — 2026-10-26

Owner-created AlbionOutpost verified under authenticated oNxZero; private empty outpost and outpost-operations repositories created. Organization least privilege and both repository policies verified by actual API read-back. Actions limited to the two selected repositories, checkout/setup-node only with full SHA pinning, read-only token defaults and no workflow PR approvals; fork workflows disabled without secrets/write tokens, cross-repository reusable access disabled and retention14 days. Dependabot alerts/security fixes enabled remotely; weekly update YAML remains local. Owner membership made private. No code upload, Git initialization, hosted CI, deployment, billing change or security-product purchase.

Remaining: enable organization MFA and restrict member visibility changes/deletion/outsider invitations in GitHub website settings. Private rulesets return403 on Free plan, so required PR/check/force-push protections are not enforced. Full source/history scanning, hosted CI, reporting contact and app/organization webhook audit remain incomplete. Script now handles actual Free-plan API constraints, inherited allowlists and bounded selection propagation; ten fixture tests cover core security/ordering/drift failures. Remote evidence .qa/github-live/provisioning.json; exact operator actions docs/deployment/GITHUB_SETUP.md. Latest full phase evidence is in .qa/phase-summary.json; public release remains NO-GO.

Final live-GitHub phase QA: all ten gates PASS on Node22 with local services;127 unit tests,53 production browser tests and15 disposable database checks. Inspected responsive homepage screenshots at375/768/1440/1920; no UI code changed and no new visual-acceptance claim. Evidence .qa/github-live/phase-summary.json and visual-review.json. Current remote access review confirms only oNxZero, no deploy keys/repository webhooks/Actions secrets/self-hosted runners and private owner membership. Organization webhook inspection remains scope-blocked. Public release remains NO-GO.
