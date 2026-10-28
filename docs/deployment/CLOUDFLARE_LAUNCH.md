# AlbionOutpost Cloudflare setup

Owner-authorized infrastructure work on28 October2026. **The full application is not deployed or connected to D1. Release remains NO-GO.** Cloudflare access persists in this workspace without a browser session; it is not a global connector.

## Applied and checked

| Service        | Actual state                                                                                                                                                                                                                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DNS zone       | `albionoutpost.com` active on Cloudflare nameservers. Registry still identifies Namecheap as registrar; no registrar transfer was performed here.                                                                                                                                                                                                   |
| TLS            | Full (strict), minimum TLS1.2, TLS1.3 enabled, Always Use HTTPS enabled. An owned HTTP HEAD request redirects301 to HTTPS. The existing parking origin does not establish working Outpost HTTPS.                                                                                                                                                    |
| WAF            | Managed Free Ruleset enabled; one custom rule blocks `.env`, `.git` and `/api/internal` probes on the apex/www hosts. Owned `.env` and `.git/config` HEAD requests return403. No attack-load or comprehensive WAF certification.                                                                                                                    |
| Cache          | Explicit bypass for `/api/`, NextAuth session-bearing requests and invitation links. App-level private/no-store and server authorization remain necessary.                                                                                                                                                                                          |
| Email          | Owner chose no email. Imported Namecheap forwarding MX/SPF defaults were backed up and replaced with null MX, `v=spf1 -all`, strict reject DMARC including subdomains, and an empty wildcard DKIM key. All four policies resolve through public DNS. No mailboxes, routing, sending or reporting inbox were created.                                |
| DNSSEC         | Cloudflare signing requested and currently pending. No parent DS is published, so the chain is **not validated**. See the registrar step below.                                                                                                                                                                                                     |
| D1             | EU-jurisdiction `albionoutpost-staging` contains29 application tables,40 indexes and an infrastructure marker. Foreign-key check is clean; users/builds/accounts are empty. This is an isolated schema candidate, not an app migration.                                                                                                             |
| Turnstile      | Managed `albionoutpost-community` widget created and metadata read back. Comments, comment edits and reports have frontend challenge and server Siteverify integration. Production activation and genuine browser/provider handoff are pending. Favorites, votes and other authenticated actions retain existing authorization and request budgets. |
| Access         | Account API reads returned403/9999. No organization/application/policy was changed; no Access protection is claimed. App moderator permissions remain server-enforced.                                                                                                                                                                              |
| Bot Fight Mode | Settings read returned403/10000. No change or successful activation claimed. WAF and the scoped Turnstile integration are separate controls.                                                                                                                                                                                                        |
| R2/billing     | No bucket, metered R2 activation, plan upgrade or billing change. Current assets can remain static/official renderer assets; there is no new upload requirement.                                                                                                                                                                                    |

The old parked apex A/www CNAME are preserved until a working application target passes its gates. HSTS preload/includeSubDomains and restrictive CAA changes are deferred until the real origin, certificates and subdomain inventory are verified. API configuration read-back is not application HTTPS or Secure-cookie acceptance.

## DNSSEC registrar step

Public RDAP still lists Namecheap. Publish this DS at the **current registrar**, or complete the transfer to Cloudflare Registrar and verify its automatic publication. Do not add a DS as a normal zone DNS record.

```text
Key tag:     2371
Algorithm:   13 (ECDSAP256SHA256)
Digest type: 2 (SHA-256)
Digest:      EA0B08B0302525D84DAC1BCC9162267D745FC6EAAB32E95340CCA567BAB30465
```

Re-read the live generated DS before submitting it, since a future key rotation can change it. Run `npm run cloudflare:dnssec` after publication; matching parent DS still requires a validating-resolver child-zone check. If rolling back, remove the registrar DS first and retain signing until its parent TTL expires. Do not disable signing first.

## Measured workload and free-tier fit

Read-only local PostgreSQL statistics measured **13,743,795 bytes** across30 user tables, including the migration table. The largest table is ItemMetadata at approximately7510 rows. Statistics are approximate; this is not a SQLite size forecast, production traffic sample or complete record export. No private records were copied to Cloudflare.

Market observations are fetched on demand from AODP. There is no scheduled ingestion job or price-history database table. Public data uses a60-second in-process/Redis cache, bounded response sizes, regional cooldowns and a20-request/minute regional upstream budget. Private market watchlists store item identities, not continuous price observations. Therefore the quoted180,000 scheduled writes/day example does not describe this app. Future ingestion needs a separately measured read/write budget, including indexes and retention deletes.

D1's staging schema occupies442,368 bytes before user data. No Worker SSR CPU, deployed bundle-size, request-volume or production D1 read/write benchmark has been obtained. The dynamic root layout reads cookies/session and calls `connection()`; the existing site cannot be counted as unlimited free static requests. Free-tier feasibility remains **unproven**, even with modest database size.

## Why application cutover is blocked

The application uses PostgreSQL/Prisma6, scalar arrays, case-insensitive filters, interactive/RepeatableRead/Serializable transactions, Redis coordination, Node filesystem archive reads and Next16.4.3 server rendering. Prisma's D1 adapter does not preserve its transaction guarantees. Replacing the connection string or ignoring those transactions would break atomic gear/version saves and current-membership authorization. The29-table D1 schema is deliberately disconnected.

The generated candidate converts scalar alternatives to validated JSON arrays, JSONB to validated JSON text and enums to CHECK constraints, retaining foreign keys and indexes. Nine isolated SQLite checks cover private defaults, ownership constraints, malformed JSON, enum denial, array shape, spell/set round-trip, unique slots and cascade. They do **not** prove D1 runtime authorization, transactions, concurrency or restore parity. The first fixture omitted required gear fields; the fixture was corrected rather than changing the schema.

The next migration must port transaction-dependent services to safe atomic D1 batches/conditional writes, preserve current-role checks and optimistic versions, replace Redis without weakening global budgets/private-cache isolation, make archive reads asset-compatible, and validate a current Workers/Next adapter against the installed framework. Cloudflare currently recommends beta vinext for new migrations; OpenNext remains a separate supported path. No beta framework swap, ignored transaction or untested production deployment was introduced.

After that: migrate only reviewed data using encrypted backups and counts/checksums; prove restore and denied-user journeys; measure actual Worker CPU/bundle and D1 rows; activate Turnstile secrets; verify genuine Discord OAuth/Secure cookies on owned HTTPS; configure monitored operator/security contacts, alerts and rollback; then switch parked DNS to the verified target. Current local PostgreSQL and all18 existing migrations remain intact.

## Reusable operations

Credentials remain only in owner-only `.env.cloudflare`, excluded from Git/Docker/formatting and app environments. `CLOUDFLARE_API_TOKEN` handles account resources; the separate `CLOUDFLARE_DNS_API_TOKEN` supplies verified zone permissions. Initial broad account tokens lacked zone DNS/settings rights; the scoped user token fixed that boundary. Never print or copy either token into runtime secrets.

```bash
npm run cloudflare:status
npm run cloudflare:security -- --apply
npm run cloudflare:mail
npm run cloudflare:mail -- --apply-no-mail --replace-registrar-defaults
npm run cloudflare:dnssec
npm run cloudflare:d1:schema -- --check
python3 scripts/qa-d1-schema.py
npm run cloudflare:d1:provision -- --apply
```

Security writes preserve unrelated rules and reject changed owned refs. Mail changes reject unexpected existing providers; the explicit registrar-default switch retires only exact Namecheap defaults under the owner's no-mail choice. Ignored timestamped snapshots retain rollback values. D1 provisioning refuses populated/unrecognized schemas and schema-hash drift; it never connects to the PostgreSQL database or exports records.

Turnstile production configuration requires all three: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` at build time, `TURNSTILE_SECRET` in runtime secret storage, and `TURNSTILE_HOSTNAMES=albionoutpost.com,www.albionoutpost.com`. The widget permits local development, but production Siteverify rejects localhost/127.0.0.1 allowlists and requires exact hostname/action, strict success, bounded output and single-use provider verification. Owned production comments/reports fail closed when unconfigured. Secrets currently remain only in Cloudflare's widget configuration; no runtime activation is claimed.

The verified Outpost application ID and OAuth Client Secret are configured locally with the exact `https://albionoutpost.com/api/auth/callback/discord` redirect. No mock provider or public fixture login was added.

Local evidence: `.qa/cloudflare-launch/` contains sanitized infrastructure read-backs, public DNS/HTTP checks, schema checks, full phase logs, container/browser captures and lab samples. Private environment files are excluded from evidence.

Official references: [D1 pricing and row/index accounting](https://developers.cloudflare.com/d1/platform/pricing/), [Prisma6 D1 transaction limitations](https://www.prisma.io/docs/orm/v6/overview/databases/cloudflare-d1), [Workers Next.js migration](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [zone managed WAF deployment](https://developers.cloudflare.com/waf/managed-rules/deploy-api/), [Turnstile Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) and [DNSSEC registrar publication/rollback](https://developers.cloudflare.com/dns/dnssec/).

Discord profile follow-up: the owner supplied a bot credential; its application/bot icons, description/tags and disabled installation link are verified. The OAuth callback is correct, and its OAuth Client Secret is configured locally; actual consent/session lifecycle remains pending. [Current settings and exact remaining steps](DISCORD_APP_SETUP.md).
