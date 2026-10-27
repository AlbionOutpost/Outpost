# Development skill collection and installation evidence

Reviewed 26 October 2026 against the actual project: Next.js **16.4.3** App Router, React **19.3.1**, TypeScript **5.9.3** (strict), Prisma **6.19.3**/PostgreSQL, Redis, NextAuth database sessions, custom CSS/local fonts, Vitest **5.0.5**, Playwright **1.64.1** and axe **4.14.0**. The app is a standalone Node deployment; no Tailwind, shadcn, Supabase, Electron or Vercel deployment is assumed.

**Installation outcome:** seven existing project skills are installed and present in the active session catalog. Six new reviewed skills are available as an explicitly invokable project-local vendor bundle, but **automatic installation/discovery is blocked** by the read-only `.agents/skills` mount. They are not described as automatically activated. No global Codex configuration or application functionality was changed for this request.

## Sources and selection

| Source                                                                 | Pinned revision / maintenance evidence                                                                | Decision                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Impeccable](https://github.com/pbakaus/impeccable)                    | `7d9be7a52139aad722c20d3f08852487828a879e`, commit October 26; skill 4.7.1, engine 0.1.17; Apache-2.0 | Select the current single Codex-compatible skill and its references. Retain LICENSE/NOTICE. Do not install hooks or global plugin configuration.                                                   |
| [Addy Osmani agent-skills](https://github.com/addyosmani/agent-skills) | `aeac41d4d005999432bb7312f7ff06383a91d59d`, commit October 13; MIT                                    | Select frontend engineering, code review and debugging. Skip the broad meta-router and unrelated workflow pack.                                                                                    |
| [OpenAI skills](https://github.com/openai/skills)                      | `49f948faa9258a0c61caceaf225e179651397431`; README explicitly deprecates this repository              | Investigated as requested. Follow its link to the maintained OpenAI plugins source instead of installing deprecated copies.                                                                        |
| [OpenAI plugins](https://github.com/openai/plugins)                    | `0722921d5542fc593105c27bd52630babd8b8c2a`, commit October 8; Build Web Apps manifest declares MIT    | Select `frontend-testing-debugging`, including the ordinary Playwright fallback. No plugin connection or Browser dependency is silently installed.                                                 |
| [Vercel agent-skills](https://github.com/vercel-labs/agent-skills)     | `063bee94c3f4df8453406c830b0a7df0f2860278`, commit August 28; selected skill declares MIT             | Select the direct 70-rule React performance reference. Skip the older 64-rule duplicate in the OpenAI plugin.                                                                                      |
| [Vercel next-skills](https://github.com/vercel-labs/next-skills)       | `c522619e45aa3492fd2bfc916b308b275eff7798`, commit September 16; README documents migration           | Do not install retired `next-best-practices`/`next-upgrade`. This Next version already ships version-matched docs and generated AGENTS rules. Cache Components workflow adoption is outside scope. |

Maintenance dates establish observed recent repository activity, not a guarantee of future support. Exact upstream paths, SHA-256 of every installed/staged file, adaptations and rejected candidates are retained in [vendor-lock.json](../../skill-system/vendor-lock.json). No dependency or application package version was changed.

Rejected: legacy `playwright-interactive` requires `js_repl` and `danger-full-access`; neither is compatible with this session's restrictions. Legacy CLI Playwright/CI skills from the deprecated catalog were not added just to increase the skill count. Deployment, payment, native/mobile framework, image-generation and broad duplicate security/performance packs were also excluded. Existing Outpost and environment skills already cover relevant boundaries.

## Installation method and trust review

The official local skill-installer helper and its GitHub utility were read before execution. Its download mode copies selected skill directories from a pinned GitHub archive; it does not run repository install scripts. Public downloads ran without forwarding GitHub credential environment variables. Candidates were quarantined under `.qa/skill-upgrade/review` and reviewed before copying into `skill-system/vendor`. No `curl | sh`, broad `npx skills add`, global plugin install or upstream hook installer ran.

The Impeccable launcher was inspected, including its pinned engine checksum verification and cache behavior. Its source context/update/telemetry paths were inspected. The engine download matched its committed digest, and `context`/`detect` ran using a task-local cache with `IMPECCABLE_NO_TELEMETRY=1` and `IMPECCABLE_NO_UPDATE_CHECK=1`. Engine 0.1.17 Linux x64 SHA-256: `44c0d601e985980a9c39718fee15b48a8f7cbe67779f6ae05efe9124817ab629`. It recognized the existing visual implementation. Missing PRODUCT.md/DESIGN.md did not trigger a redesign or an invented brief; the real design/workflow documents and incumbent code remained authoritative.

Two packaging repairs are explicit in the lock file: Addy's external shared checklists were copied into the relevant skills with self-contained reference paths; three Vercel AGENTS links were corrected to its bundled `rules` directory. Rule content was preserved. Vendor scripts are excluded from application lint/format/Docker context; these tooling exclusions do not change app behavior.

## Catalog and invocation

For installed skills use `$name` plus the task. For staged additions, the explicit fallback works now: “Read `skill-system/vendor/NAME/SKILL.md`, then [task].” The `$name` examples below require successful canonical installation/catalog discovery first; a matching name in this document is not proof of discovery.

| Skill                        | Current state                      | Purpose                                                                                          | Example after discovery                                             |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| outpost-frontend             | Installed, discovered              | Outpost pages, brand and components                                                              | `$outpost-frontend refine the build editor`                         |
| outpost-visual-qa            | Installed, discovered              | Rendered reference/state/responsive acceptance                                                   | `$outpost-visual-qa review the market at six widths`                |
| outpost-albion-data          | Installed, discovered              | IDs, source rights, metadata and patch evidence                                                  | `$outpost-albion-data verify these imported records`                |
| outpost-calculators          | Installed, discovered              | Independent accounting and game-mechanics evidence                                               | `$outpost-calculators verify refining arithmetic`                   |
| outpost-security             | Installed, discovered              | Sessions, ownership, private caches and denied actions                                           | `$outpost-security review watchlist authorization`                  |
| outpost-performance          | Installed, discovered              | Comparable measurements and evidence-led optimization                                            | `$outpost-performance profile Market LCP`                           |
| outpost-release              | Installed, discovered              | Migrations, actual QA and release gates                                                          | `$outpost-release assess release readiness`                         |
| impeccable                   | Staged; manual invocation verified | Design critique, hierarchy, typography, motion and technical audit                               | `$impeccable audit the market` or `$impeccable critique the editor` |
| frontend-ui-engineering      | Staged; manual invocation verified | Accessible/responsive components, state and UI engineering                                       | `$frontend-ui-engineering review the calculator workflow`           |
| code-review-and-quality      | Staged; manual invocation verified | Correctness, readability, architecture, security and performance review                          | `$code-review-and-quality review this change`                       |
| debugging-and-error-recovery | Staged; manual invocation verified | Reproduce, localize and explain a failure                                                        | `$debugging-and-error-recovery diagnose this failing test`          |
| vercel-react-best-practices  | Staged; manual invocation verified | React/Next waterfalls, serialization, rendering and bundles                                      | `$vercel-react-best-practices review this React page`               |
| frontend-testing-debugging   | Staged; manual invocation verified | Page identity, console, screenshots and interaction proof with Browser/Playwright classification | `$frontend-testing-debugging verify this local user journey`        |

Preinstalled system skills remain unchanged: `$openai-docs` for official OpenAI/Codex guidance, `$skill-installer` for reviewed skill installs, `$skill-creator` for authored skill changes, and `$imagegen` for authorized bitmap work. The environment also exposes eleven Cloudflare/general performance skills: agents-sdk, cloudflare, cloudflare-email-service, cloudflare-one, cloudflare-one-migrations, durable-objects, sandbox-sdk, turnstile-spin, web-perf, workers-best-practices and wrangler. They were not duplicated or activated merely for this Node/Prisma project. Other environment service plugins remain unchanged and are not part of this project collection.

The official [Codex skill guidance](https://developers.openai.com/codex/skills/) describes metadata discovery followed by selective loading. Root [AGENTS.md](../../AGENTS.md) now provides task routing without preloading a whole vendor pack. Project typography, domain correctness, ownership/cache rules, installed Next guides and explicit audit-only scope override generic examples. Existing Vitest/Playwright/axe commands remain authoritative; no generic Jest command or Tailwind example becomes a new dependency.

## Actual checks and remaining activation action

- Both existing seven-skill validators pass; installed/staged Outpost trees were already identical. Seven names/paths appear in the session's authoritative available-skill catalog.
- Six new manifests pass names/descriptions, local links, helper JavaScript parsing, shell syntax and lock-file integrity checks. No automatic selection is inferred from those checks.
- The offline installer successfully copied the six skills to a temporary destination and preserved matching copies on a second run. It refuses divergent existing destinations. It never overwrites the seven Outpost skills or runs upstream scripts.
- Canonical installation was actually attempted and failed at creating `.agents/skills/.outpost-skills-*` with `Read-only file system`, before any skill was copied there. No remount, chmod, alternative global install or security-policy change was attempted.
- Impeccable context/detector actually ran; four border-accent warnings were reviewed against code/screenshots rather than treated as automatic defects. The frontend, code-review, debugging, Vercel and OpenAI testing instructions were explicitly applied to the audit's source/rendered/network findings. This proves scoped manual use, not future automatic routing.
- Actual Playwright MCP returned approval-required under a `never` policy; Chrome DevTools MCP lacked `/opt/google/chrome/chrome`. Local Playwright/Chromium/CDP/Lighthouse worked without disabling the sandbox. The official testing skill classified the dedicated Browser plugin as absent and used the permitted fallback.

From an authorized environment where this project's `.agents/skills` is writable:

```bash
python3 scripts/install-project-skills.py --check
python3 scripts/install-project-skills.py
```

Then open a fresh Codex session/catalog (`/skills` where supported) and confirm all thirteen project names and their `.agents/skills/.../SKILL.md` paths. Run a small explicit audit/review prompt for each newly installed skill. Do not enable hooks/live editing as part of that check. In this session the six-skill automatic-discovery gate remains **BLOCKED**, not passed.

The [read-only UI/UX and engineering audit](UI_UX_CODE_AUDIT_2026-10-26.md) is the improvement plan requested after setup. No application fixes were made after the audit-only instruction.

## Activation recheck during implementation

The subsequent authorized implementation request reran both installer commands: integrity PASS, installation BLOCKED with `EROFS`. `stat` shows `.agents` and `skills` owned by the current `bttw` user with owner-write mode; `findmnt -T .agents/skills` identifies a separate Btrfs mount with `ro,nosuid,nodev` options. The enclosing workspace is writable. Together with the environment's protected-path policy, this identifies the sandbox's read-only mount as the restriction, rather than Unix mode/ownership. No sudo, chmod, remount or global alternative was attempted. All thirteen cannot be verified in a fresh session until canonical installation succeeds; seven remain in this session's authoritative catalog, six use explicit staged paths. [Implementation and browser evidence](../design-review/refinement/README.md).
