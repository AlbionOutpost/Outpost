# Stack audit

Inspected 2026-10-26. Installed versions were rechecked directly from local package metadata during reconciliation; these are not package.json ranges.

| Area           | Installed                                                  | Assessment                                                                             |
| -------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Runtime        | Node 22.22.2 for QA; engine >=22.12                        | Keep Node22; `.nvmrc` supplied                                                         |
| UI             | Next16.4.3, React/DOM19.3.1, TS5.9.3                       | Keep App Router; read bundled Next docs before changes                                 |
| Authentication | next-auth4.24.15, Prisma adapter1.0.7                      | Database sessions; actual Discord exchange blocked by credentials                      |
| Storage        | Prisma/client6.19.3; PostgreSQL17 Compose                  | Migrations and synthetic restore tested; no production operation implied               |
| Cache          | ioredis5.11.1; Redis7 Compose                              | Shared source budgets plus bounded process cache; integration failure coverage partial |
| Validation     | Zod4.6.7                                                   | Source identity and import schemas; tightened malformed catalog validation             |
| Icons/fonts    | lucide0.577.0; Fontsource Inter/Geist/Barlow5.3.0          | Real items use renderer; fonts bundled locally through next/font                       |
| QA             | Vitest5.0.5, Playwright1.64.1, axe4.14.0                   | Scoped samples, not full browser/device/a11y certification                             |
| Tooling        | ESLint9.39.5/config-next16.4.3; Prettier3.9.10; tsx4.23.15 | Existing ESLint deprecation/peer issue remains QA-014                                  |

No framework/database migration is justified by measured evidence in this pass. Prisma7 or a new auth/framework major would add unrelated risk before product/data gaps close. No Tailwind, motion library, external search service or microservice layer is needed for the current fixes.

Latest completed phase advisory audit reports no advisories. That is a point-in-time registry result, not an independent vulnerability certification. `npm ls` also lists extraneous optional sharp-WASM/@emnapi runtime packages; they may support platform image tooling. Do not delete them without a clean-install/platform check. Upstream maintenance/EOL and a fresh outdated report remain unverified beyond existing project evidence.

Risks: two separate starter catalog paths; full metadata/license unavailable; documentation history is separated from current status; `.git` is not recognized as a repository here; no hosted CI evidence. Next priority: finish data/source integrity and equipment workflow before considering architectural replacements.

GitHub workflow actions were researched from official releases: checkout7.0.1 and setup-node7.1.0 are pinned to exact commit revisions in the prepared workflow. This does not upgrade application dependencies or establish a hosted CI result. New scanner tests verify findings report categories rather than credential values.
