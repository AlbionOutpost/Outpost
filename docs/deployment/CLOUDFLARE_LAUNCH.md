# AlbionOutpost Cloudflare deployment

The complete application is publicly deployed at https://albionoutpost.com on Cloudflare Free, at the owner's explicit instruction. Access gating is removed. [Current runtime, tests and delivery progress](CLOUDFLARE_PORT_PROGRESS.md) is the operational record. The formal release assessment remains NO-GO for missing independent acceptance and recovery evidence; public availability does not close those gates.

## Current services

| Service   | Applied state                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web       | Workers custom domains apex/www; canonical www redirect to apex; static assets and per-browser rendering objects                                  |
| Data      | Private service binding; public EU D1 catalog/archive; private SQLite Durable Object transactions                                                 |
| DNS/TLS   | Active Cloudflare zone, Full strict, TLS1.2 minimum/TLS1.3, forced HTTPS; old parking targets backed up                                           |
| WAF/bots  | Managed Free rules, sensitive-path custom block, Bot Fight Mode; application authorization and budgets still required                             |
| Cache     | Private/API/session/invitation bypass; public regional market Cache API cache only                                                                |
| Mail      | Owner selected no email: nullMX, SPF `v=spf1 -all`, reject DMARC including subdomains, empty wildcard DKIM                                        |
| Turnstile | Managed widget and production server secret configured for comments/edits/reports; genuine human flow pending                                     |
| Discord   | Real provider configuration and HTTPS auth start verified; owner Discord ID303585687460904970 maps server-side to ADMIN; personal consent pending |
| Access    | Public site has no Access application; unused organization is not a site gate                                                                     |
| Billing   | Free plan read back; no R2 or paid activation; finite product quotas remain                                                                       |

## DNSSEC registrar step

Public RDAP still lists Namecheap. Publish this DS at the **current registrar**, or complete the transfer to Cloudflare Registrar and verify its automatic publication. Do not add a DS as a normal zone DNS record.

```text
Key tag:     2371
Algorithm:   13 (ECDSAP256SHA256)
Digest type: 2 (SHA-256)
Digest:      EA0B08B0302525D84DAC1BCC9162267D745FC6EAAB32E95340CCA567BAB30465
```

Re-read the live generated DS before submitting it, since a future key rotation can change it. Run `npm run cloudflare:dnssec` after publication; matching parent DS still requires a validating-resolver child-zone check. If rolling back, remove the registrar DS first and retain signing until its parent TTL expires. Do not disable signing first.

## Operations and delivery

Private0600 `.env.cloudflare` contains persistent management access; `.env.cloudflare-runtime` contains only application secrets/configuration. Do not copy management tokens into application bindings or GitHub. GitHub uses a separately scoped Workers deploy token, expiring26 January2027. Source push/release delivery is defined by `.github/workflows/cloudflare-preview.yml`; actual run evidence is recorded in the progress document.

```bash
npm run cloudflare:status
npm run cloudflare:security
npm run cloudflare:mail
npm run cloudflare:dnssec
node scripts/qa-cloudflare-hosted.mjs
node scripts/qa-cloudflare-auth.mjs
```

Market observations are requested on demand from AODP, with regional caches/budgets/cooldowns. There is no scheduled full-market ingestion or continuous price-history SQL table. D1 writes include imports and indexes; batching does not remove row-write charges. New ingestion requires a measured retention/write budget.

The deployment initially hit Error1102 on cold SSR. Per-session rendering objects and disabled automatic page prefetch fixed the reproduced failures; bounded probes and30 hosted responsive checks pass. This does not certify sustained traffic, cold lifecycle behavior at scale or unlimited free use. [Cloudflare errors](https://developers.cloudflare.com/workers/observability/errors/) and [Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/) describe the distinct execution limits.

No private PostgreSQL export was imported. Local migration/backup tests and fixtures do not establish production recovery or real Discord lifecycle. Keep operator/legal, current-patch data and remaining product gates explicit. [Discord setup](DISCORD_APP_SETUP.md).

## GitHub monitoring limitations

An actual GitHub runner was challenged by Bot Fight Mode before reaching the app; the event was read back from Cloudflare analytics. This is distinct from Error1102. The deployment-check wrapper records exact managed challenges as BLOCKED only in explicitly configured GitHub CI, retaining a visible warning and no application-PASS claim. Other errors remain failures; normal operator checks remain strict. No bot setting or IP allowlist was weakened. Documentation-only commits have separate portable checks and do not redeploy the app.
