# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Albion Online players** on EU, Americas and Asia servers — solo players, small-scale groups and guild members — who check prices, pick builds, plan crafts and coordinate parties **before acting in game**. They often have the game open on another screen or are on a phone between sessions.
- **Shot-callers and guild officers** who plan Comps, share loadouts and run events for a Team.
- **Crafters, refiners and traders** who need exact, sourced numbers to decide whether something is worth doing.

## Product Purpose

Outpost (albionoutpost.com) is the Albion Online companion: live market research, crafting and economy calculators, a gear-first build library and editor, Comp planning, and Team tools — in one place, on desktop and phone.

Success means a player trusts Outpost enough to make an in-game decision from it without double-checking elsewhere, and comes back because it is the fastest and most pleasant way to do that job. The ambition is to be the best Albion site ever made: the one players recommend and other sites are measured against.

## Supporter plan

**Launch grant (owner, 8 Nov 2026): every account is a lifetime Supporter, free.** That includes accounts that sign up later, until the owner closes the launch; accounts made before then keep it for life. Outpost is free and takes no payments; billing stays off. **Ads (owner, 9 Nov 2026): everyone sees ads except Supporters with a plan or an admin gift** — the launch grant does not hide them. Ads only switch on once the Impressum is complete (`adsActive()`; it is since 11 Nov 2026, with the contact form `/contact` as the second contact channel) (see [OPERATIONS.md](docs/OPERATIONS.md#supporter-billing-stripe)).

**Paid plan (owner, 9 Nov 2026), prepared but not live:** Supporter costs €4.99 a month (owner raised it from €2.99, 9 Nov 2026) through Stripe (the price shown always comes from Stripe). It gives no ads, a public Supporter badge beside the name (builds, comps, comments, Team rosters, profile, account menu) and the right to create Teams. When the launch closes, accounts made before it keep creating and running Teams for life but see ads and get no badge unless they buy the plan; the launch grant shows no badge. The badge is optional, on by default (owner, 9 Nov 2026): "Show Supporter badge" in Settings hides it everywhere. Joining Teams stays free. Ko-fi is not used. Going live is two steps: the four Stripe settings (with the publishable key) and `launchGrant.closedAt`; `/legal` (Impressum, privacy policy, terms) is published since 11 Nov 2026 ([OPERATIONS.md](docs/OPERATIONS.md#go-live-checklist)). German consumer-law pieces are built in: the order box with "Zahlungspflichtig bestellen", an unticked terms box, a § 312k cancellation page and a § 356a withdrawal page linked from every footer, and the terms, cancellation policy and withdrawal form in `/legal` (they say the plan is not offered while billing is off). **Withdrawal (owner, 9 Nov 2026):** within 14 days of ordering, a withdrawal ends the plan at once and refunds every payment in full, with no deduction for days used; checkout asks for no waiver of the right of withdrawal. **Payment on the site (owner, 9 Nov 2026, "option 3"):** buyers pay in Stripe's Payment Element inside the order box on `/supporter`, styled like Outpost in both themes, and order with Outpost's own button; there is no redirect to a Stripe page. Card data still goes only to Stripe, Stripe.js loads only once a buyer starts an order, and the Stripe dashboard decides the payment methods (card, Apple Pay, Google Pay, Link).

Outpost stays free: prices, builds, calculators, guides, comps and joining a Team never sit behind a plan. The **Supporter** plan removes advertising, adds the badge and unlocks running a Team workspace — creating one and managing its events, announcements, invites, roles, shared builds, loot splits and giveaways (a lapsed paid owner keeps winding-down actions: remove members, transfer, delete). Members take part for free. Advertising, when configured, is one unit after a page's main content (hubs and articles), never inside a tool or a workspace, and never shown to Supporters. The routes keep their technical names (`/supporter`, the old `/premium` redirects).

## Positioning

- **One connected workspace.** Market prices feed calculators, calculators feed shopping lists, builds feed Comps, Comps feed Team events. Competitors are single-purpose tools; Outpost connects the jobs.
- **Honest numbers.** Every price carries its city, quality, side (buy/sell order) and its own observation time. Missing data is shown as missing, never as a plausible number. Manual inputs are labelled.
- **Gear-first, game-literate UI.** Real item art, the in-game inventory anatomy, and Albion's own vocabulary.

## Operating Context

- Market data comes from player uploads to the Albion Online Data Project (AODP) — coverage varies by server, city, item and quality, and can be hours old.
- Item metadata comes from a pinned public snapshot; recipes from transcribed game files; some content (builds, comps, guides, journal, cooking/alchemy recipes) is an archive imported from the owner's albiononlinegrind.com capture.
- Players sign in with Discord. Public tools work without an account; saving, sharing and Teams need sign-in.
- Hosted entirely on Cloudflare's free tier, so request, CPU and database budgets are real product constraints.

## Capabilities and Constraints

- Implemented: market explorer, gold and item history, item browser, flipping and transport calculators, opportunity scanner (≤25 items), Black Market board, Profitable crafts ("What should I craft?"), watchlist changes since the last visit, crafting/refining/enchanting/cooking/alchemy/farming/fishing calculators, production plans, build library/editor/detail with revisions and cost, Comp planner with PNG export, Teams with roles, invitations, events/RSVP, ICS calendars, loot splits, a Treasury with silver wallets (in-game bookkeeping only), stake-free coin flips and loot rolls, giveaways (site-wide ones run by Outpost staff on `/giveaways` and a Team's own; free to enter, one entry each, winners drawn once at random by the server after entries close; prizes handed over in game), favorites, shopping list, timers, guides, kill/death feed, dashboard, settings with export/deletion, administration with stored-record charts, user search, review signals, audited Supporter gifts/session revocation/Outpost bans, and a moderator reports queue.
- Not yet: current-patch verified data, enchanted/artifact recipes, crafting specialization, notifications/alerts, Albion player/guild lookup, islands, Avalon, mastery, laborers, animals. See [roadmap](docs/ROADMAP.md).
- Terminology is fixed: **Comps** (party plans), **builds/loadouts**, **swaps**, **IP**, **spec**, **focus**, **RRR**, **buy order / sell order**, **Teams** (Outpost groups — not in-game guilds). Routes keep their technical names (`/compositions`, `/groups`).

## Brand Commitments

- Name: **Outpost**. Logo: `public/brand/outpost-logo.png` (unmodified).
- Voice: plain, confident, player-to-player. Headings name the task. No slogans inside tools, no hype, no "AI".
- Independent fan project, not affiliated with or endorsed by Sandbox Interactive. Game art belongs to Sandbox Interactive and is used only to identify real items.

## Evidence on Hand

- Real: AODP market observations (on request), 7,510 item records, 70 equipment/refining recipes, 399 archived cooking/alchemy recipes, 10,770 archived builds, 682 archived comps, 8 imported + 4 original guides, 1,784 journal objectives.
- Not on hand — never fabricate: usage numbers, votes, view counts, "verified" badges, testimonials, meta/win-rate claims, current-patch verification.

## Product Principles

1. **Truth over polish.** A beautiful wrong number is a failure. Show source, freshness and assumptions; unknown stays unknown.
2. **Task first.** Every page answers one player job quickly; atmosphere never slows the job down.
3. **Connected, not siloed.** Anything a player looks at should flow into the next step (price → calculator → shopping list → build → Comp → Team).
4. **Game-literate.** Speak Albion, show real gear, mirror in-game layouts players already know.
5. **Fast everywhere.** A phone on mobile data is a first-class user; free-tier limits are respected by design.

## Accessibility & Inclusion

WCAG 2.2 AA as the working target: keyboard access everywhere, visible focus, labelled controls, ≥4.5:1 text contrast, no text below 12px, profit/loss never conveyed by colour alone, full reduced-motion support.
