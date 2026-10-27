<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Albion Atlas mandatory major-phase QA gate

After every major development phase run `npm run qa:phase` on Node22 with local services. Follow `docs/QA_WORKFLOW.md`, update all five root QA reports and project progress files, and review responsive screenshots. Preserve explicit failures/blocked/missing features. Rerun formula, authorization, cache and migration checks after related changes. Fixture sessions are not real OAuth; axe/Lighthouse are not full conformance/field evidence. Release remains NO-GO until essential gates actually close.
