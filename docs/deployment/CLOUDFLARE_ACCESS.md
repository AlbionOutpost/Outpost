# Persistent Cloudflare access

The owner authorized project-local token authentication on28 October2026. Live read-only checks verified an active account-owned token, the account list, zone list, the account token verification endpoint and the active `albionoutpost.com` zone. Wrangler4.154.0 `whoami` also authenticates. No expiration was returned by the verification endpoint; this is not a guarantee against later revocation, permission changes or expiry.

Credentials and selected account/zone IDs live only in `.env.cloudflare`, a0600 owner-only file excluded by existing Git/Docker environment-file rules and the formatter. The file is separate from Next.js runtime environments. Do not print it, copy it into application source, containers, client variables, documentation, issue bodies or logs. New sessions with access to this workspace can reuse it without the owner's browser login. This does not install a global ChatGPT connector or copy authentication into unrelated projects/machines.

```bash
npm run cloudflare:status
npm run cloudflare -- whoami
npm run cloudflare -- --version
```

The wrapper loads the private file on each call, pins the official API origin, disables telemetry/error uploads, keeps sanitized Wrangler logs under ignored `.qa/cloudflare`, and redacts the configured token from stdout/stderr. Use the wrapper in this environment: plain Wrangler attempts to write its default global log directory, which is unavailable. No global auth/configuration was overwritten. Commands that print/change browser authentication are excluded from this token wrapper.

For explicitly requested DNS/account work beyond Wrangler, import `cloudflareRequest` from `scripts/cloudflare-client.mjs`. It supports GET/POST/PUT/PATCH/DELETE, fixed HTTPS API paths, no redirects, a30-second timeout and an8MB response limit. It returns data to the caller without logging bodies; log only task-relevant safe fields. Do not print returned secret values from credential-creation endpoints. Status defaults to read-only token/zone verification. Write permissions are whatever the account token actually grants; successful reads do not certify every write scope.

No resource, DNS, nameserver, deployment or billing change is part of this connection setup. Existing Outpost release gates still apply. Plugin discovery returned no matching Cloudflare connector; persistent CLI/API authentication is the verified integration here.

Official references: [account-owned tokens](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/), [Wrangler authentication variables](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/) and [account token verification](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/).

## Domain setup follow-up

The owner subsequently delivered the full setup request and chose no email. A separate owner-supplied zone token now verifies DNS and settings writes. TLS/WAF/cache/mail settings were applied and publicly sampled; an isolated EU D1 schema and Turnstile widget were created. Persistent credentials remain outside app runtime. The application is not deployed/connected to D1; DNSSEC registrar publication, genuine OAuth, Access/Bot Fight Mode permissions and full Workers compatibility remain open. [Actual setup, commands, workload and limits](CLOUDFLARE_LAUNCH.md).
