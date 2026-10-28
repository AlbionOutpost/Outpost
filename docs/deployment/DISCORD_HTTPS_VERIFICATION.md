# Discord OAuth and HTTPS staging verification

Status: preparation only. No real Discord exchange or owned HTTPS staging deployment has been executed. Local database-session fixtures verify application access controls, not OAuth.

Portal setup and avatar: [exact Discord application settings](DISCORD_APP_SETUP.md).

Required operator inputs: an owned staging hostname/hosting target; its DNS/TLS access; a Discord developer application client ID and client secret; a strong independently generated NEXTAUTH_SECRET; private PostgreSQL/Redis connections; legal/operator contact details and source/media permission decisions. Keep all secrets in the deployment secret store or an ignored local environment file. Never commit them or paste them into reports.

1. Configure an isolated staging database/cache and backup policy. Review/apply migrations from [MIGRATIONS.md](MIGRATIONS.md); do not point test/reset tools at production.
2. Build the existing Dockerfile in an environment with Docker access and dependency downloads. Use its nonroot standalone runtime. Supply environment variables at runtime, never COPY an environment file into an image.
3. Terminate HTTPS on the owned hostname with a maintained reverse proxy/hosting service. Route to private application port3000; expose neither database nor Redis. Set NEXTAUTH_URL to the exact public HTTPS origin, with no alternate untrusted hostname. Keep forwarded-host/protocol handling constrained by the trusted proxy.
4. In the Discord developer application, register exactly `https://YOUR_OWNED_HOST/api/auth/callback/discord`. Set DISCORD_CLIENT_ID/DISCORD_CLIENT_SECRET on staging. The application requests identify/email and uses state+PKCE through NextAuth. No Discord guild/bot permissions are required for sign-in.
5. Run health, sign-in and account permission smoke checks. Execute a real login through Discord consent in a clean browser, confirm callback returns to the owned origin and a database session survives reload. Verify secure/HttpOnly/SameSite cookie attributes without recording cookie values.
6. Verify logout invalidates the session, an expired session cannot export private data, and a second account cannot access the first account’s private builds/compositions/scenarios. Exercise bad/missing state only against the owned application and verify rejection; do not attack Discord infrastructure.
7. Check redirect confinement, HTTPS-only cookies, safe error recovery and browser console/network failures. Record timestamp, deployment image digest, migration state and pass/fail observations, with no tokens, codes or personally identifying screenshots.

Keep real OAuth, deployed TLS/cookie handling, backup restore, monitoring and rollback rehearsal BLOCKED until actually executed. Do not use fixture-login endpoints, fabricated credentials or a public development tunnel as proof of production verification. Existing local Playwright tests retain owner/member/outsider, logout, expiry, origin and account-export coverage; this guide supplements those checks.
