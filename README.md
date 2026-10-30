# Outpost

**The Albion Online companion** — live market prices, crafting and economy calculators, a gear-first build library and editor, Comp planning and Team tools, on desktop and phone.

Live at **[albionoutpost.com](https://albionoutpost.com)**.

## What's inside

- **Market** — city prices for every server with per-side freshness, gold and item history, watchlist, flip and transport calculators, opportunity scanner, item browser.
- **Production** — crafting, refining, enchanting, cooking, alchemy, farming and fishing calculators with city return bonuses, focus, multi-run plans and saved scenarios.
- **Builds** — library with weapon-family browsing, anatomical equipment editor, revisions, swaps, replacement cost and sharing; 10k+ archived builds.
- **Comps** — party planner with roles, per-member loadouts, undo and PNG export.
- **Teams** — roles, invitations, events with RSVP and calendar export, shared builds and Comps, loot splits.
- **And** — guides, journal checklist, kill/death feed, favorites, shopping list, timers, dashboard.

## Quick start

```bash
nvm use                 # Node 22.12+
npm ci
cp .env.example .env    # set NEXTAUTH_SECRET to 32+ random bytes
docker compose up -d    # Postgres + Redis on localhost
npm run db:deploy && npm run db:seed && npm run data:sync
npm run dev             # http://localhost:3000
```

Public tools work without signing in. Accounts use Discord — add your own Discord app credentials to `.env` to sign in locally.

## Docs

|                                              |                                                                 |
| -------------------------------------------- | --------------------------------------------------------------- |
| [PRODUCT.md](PRODUCT.md)                     | Who it's for, what it does, principles                          |
| [DESIGN.md](DESIGN.md)                       | Design system, page archetypes, references, rejected directions |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)   | How we work: rules, commands, code map, definition of done      |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Cloudflare runtime, data flow, security model                   |
| [docs/API.md](docs/API.md)                   | HTTP routes                                                     |
| [docs/DATA.md](docs/DATA.md)                 | Game and market data, provenance, media rights                  |
| [docs/CALCULATORS.md](docs/CALCULATORS.md)   | Every formula                                                   |
| [docs/OPERATIONS.md](docs/OPERATIONS.md)     | Deploys, secrets, Cloudflare, Discord, DNS                      |
| [docs/TESTING.md](docs/TESTING.md)           | Test suites                                                     |
| [docs/ROADMAP.md](docs/ROADMAP.md)           | What's next, open issues, owner actions                         |

## Stack

Next.js 16 · React 19 · TypeScript · Prisma · NextAuth (Discord) · Cloudflare Workers, Durable Objects and D1 via OpenNext · Vitest · Playwright.

---

Outpost is an independent fan project and is not affiliated with or endorsed by Sandbox Interactive. Albion Online and its artwork are trademarks and copyright of Sandbox Interactive GmbH. Market data courtesy of the [Albion Online Data Project](https://www.albion-online-data.com/).
