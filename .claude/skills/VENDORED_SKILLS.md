# Vendored skills

Copied unchanged from their upstream repositories, Markdown only (no scripts, hooks or install steps).
Outpost's own rules win where they differ: `outpost-deploy` for CI, deploys and migrations,
`outpost-security` for auth and private data, `outpost-performance` for Free-tier budgets,
DESIGN.md and `outpost-frontend` for design.

| Skill                                                   | Source                                                                                              | Licence    | Commit (date)          |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- | ---------------------- |
| `workers-best-practices`, `durable-objects`, `wrangler` | [cloudflare/skills](https://github.com/cloudflare/skills) `skills/`                                 | Apache-2.0 | `1f2cd0a` (2026-11-03) |
| `better-typography`                                     | [jakubkrehel/skills](https://github.com/jakubkrehel/skills) `skills/better-typography`              | MIT        | `60bf140` (2026-11-01) |
| `reverse-engineer-anything`                             | [morluto/rea](https://github.com/morluto/rea) `.agents/skills/reverse-engineer-anything`            | MIT        | `a7574d4` (2026-11-06) |
| `stop-slop`                                             | [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) (SKILL.md, references, LICENSE) | MIT        | `8da1f03` (2026-03-18) |
| `humanizer`                                             | [blader/humanizer](https://github.com/blader/humanizer) (SKILL.md, LICENSE)                         | MIT        | `0ef9fe5` (2026-10-28) |
| `impeccable`, `vercel-react-best-practices`             | See each skill's own notes                                                                          | —          | —                      |

Notes:

- `stop-slop` and `humanizer` are checklists for UI and marketing copy, not hard rules: UI labels may be terse, and German legal pages (`src/app/legal`) must not be rewritten by them.

- `better-typography` gives Tailwind equivalents; Outpost uses plain CSS and DESIGN.md's type scale.
- `reverse-engineer-anything` is instructions only. Its REA MCP server and analysis engines are not
  installed (owner decision needed). Never point it at the Albion Online client or servers: that
  conflicts with the game's terms and with DATA.md.
- Not vendored: Cloudflare `nextjs-on-cloudflare` (steers work to vinext; Outpost runs on OpenNext).

To update: re-copy the folder from a newer commit, review the diff, and bump the commit above.
