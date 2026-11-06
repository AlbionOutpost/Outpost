# AI tooling

What Claude Code has available for Outpost, when to use it, and how to keep token use low. Read this
when choosing tools or models; it is not loaded every session (only [DEVELOPMENT.md](DEVELOPMENT.md) is).
Evaluated on 6 November 2026; the review table is at the end.

## Available

| Tool                                                                           | Use for                                                                      | Don't use for                                                            |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Project skills `outpost-*`                                                     | Any change in their area; they hold Outpost's rules                          | —                                                                        |
| `impeccable`, `vercel-react-best-practices` (vendored)                         | Design critique and polish; React/Next performance patterns                  | Overriding DESIGN.md                                                     |
| `workers-best-practices`, `durable-objects`, `wrangler` (vendored, Cloudflare) | Worker/DO code review, bindings, Wrangler commands; verify against live docs | CI/deploy steps (`outpost-deploy` wins), auth rules (`outpost-security`) |
| `Explore` agent (`.claude/agents/Explore.md`, Haiku)                           | Finding files, call sites, naming conventions across the repo                | Reviews, audits, security or design judgement                            |
| Playwright + Chromium (installed), `outpost-visual-qa` scripts                 | Screenshots, responsive and pixel-diff checks, browser flows                 | —                                                                        |
| Next.js docs in `node_modules/next/dist/docs`                                  | Next 16 APIs: exact installed version                                        | —                                                                        |
| Session MCP: GitHub, Cloudflare (`Cloudflare__*`), Claude Docs                 | PRs/CI; Cloudflare docs and account reads                                    | Settings changes the owner hasn't asked for                              |

Built-in commands worth knowing: `/context` (what fills the window), `/cost`, `/skills` and
`/skill-doctor` (context cost per skill), `/doctor`, `/advisor`, `/output-style`, `/compact`.

## Models and cost

Per million tokens (Anthropic API, 6 Nov 2026): Opus 5.5 $4 in / $20 out; Sonnet 5.5 $2 / $10;
Haiku 5.5 $0.10 / $0.50 (prompts ≤100K); Fable 5.1 $10 / $50. Cache reads are far cheaper than
fresh input, so a stable prompt prefix matters more than any plugin.

- Main thread: the session model. Hard design, security, data-truth and architecture calls stay there.
- Broad read-only searches: the `Explore` agent (Haiku, about 40× cheaper per token than Opus).
- Mechanical, well-specified subtasks (formatting, renames, doc typo sweeps): a subagent with
  `model: "sonnet"` or `"haiku"`. Never delegate judgement you would then have to redo.
- Don't spawn agents for a handful of tool calls; each starts with a fresh context.

## Keeping tokens low

- Read the part of a file you need (line ranges, `grep -n`) rather than whole files; the CSS sheets
  and JSON data files are thousands of lines.
- Prefer one targeted search over several broad ones; keep test and build output to the tail.
- Skills load only when used; keep descriptions short. Large references belong in skill
  `references/`, not in always-loaded docs. Keep DEVELOPMENT.md lean; put detail in topic docs.
- Measure before claiming savings: `/context` and `/cost` on the same task before and after.

## Security rules for extensions

- Read every file of a skill, plugin or MCP before adding it; reject install scripts, hooks or
  daemons you can't justify, and anything that sends code or prompts to an unknown vendor.
- Vendored skills keep upstream bytes and a provenance note (see `.claude/skills/VENDORED_SKILLS.md`);
  list them in `.prettierignore` and in `vendored` in `scripts/docs-check.mjs`.
- New network hosts, API keys, paid services or Claude config hooks need the owner's OK.

## Review of suggested tools (6 Nov 2026)

Kept or installed: Cloudflare `workers-best-practices`, `durable-objects`, `wrangler`; `better-typography` (jakubkrehel); `reverse-engineer-anything` skill (morluto/rea, instructions only, MCP not installed); built-in
per-agent model routing (`Explore` on Haiku); existing Playwright, impeccable, vercel skills.

Optional, owner decision: Context7 (needs `mcp.context7.com` allowed and an API key; sends queries to
Upstash; local Next docs already cover Next.js), Ponytail (author-measured −45% tokens; may clash with
the polish bar; has hooks), Headroom (vendor-measured −21–57% input; local proxy, telemetry on by
default; awkward in cloud sessions), osv-scanner / Semgrep CE (`--metrics=off`) as extra local audits.

Rejected: claude-mem, ECC, OmniRoute, Claude Octopus, Caveman, free-LLM API lists (hooks/daemons,
third-party data flow or no measured saving); Firecrawl, ScrapeGraphAI (overlap, cost; scraping game
data conflicts with DATA.md); Magic UI (assumes Tailwind and motion), Apple Design, interface-design,
Hue, Hallmark themes (second design system); `nextjs-on-cloudflare` (pushes a vinext migration);
Playwright MCP (duplicates installed Playwright, costs tokens); MarkItDown (built-in PDF reading
suffices); off-topic: MiroFish, Harvey, DaVinci Resolve MCP, claude-ads, job-search and social skills.

Unresolved (no confident match): Artemis, Cloud Hub, Generate Skill (use the built-in
skill-creator), Prompt Motion, Aisa. Instead of Caveman and Ponytail, DEVELOPMENT.md has two rules:
report briefly, and least code that works.
