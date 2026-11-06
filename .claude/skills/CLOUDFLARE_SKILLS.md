# Vendored Cloudflare skills

`workers-best-practices`, `durable-objects` and `wrangler` are copied unchanged from the official
[cloudflare/skills](https://github.com/cloudflare/skills) repository (Apache-2.0), commit `1f2cd0a`
(2026-11-03). They are Markdown only: no scripts, hooks or install steps.

Not vendored: `nextjs-on-cloudflare` (it steers new work to vinext and installs further skills;
Outpost deliberately runs on OpenNext), and the rest of the collection (products Outpost does not use).

Outpost's own rules win where they differ: `outpost-deploy` for CI, deploys and migrations,
`outpost-security` for auth and private data, `outpost-performance` for Free-tier budgets.

To update: re-copy the three folders from a newer commit, review the diff, and bump the commit above.
