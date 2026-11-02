# Security repair phase verification

Use Node 22, the locked install and isolated local PostgreSQL/Redis services. Run `npm run qa:phase` after a major phase. It includes the local billing/authorization regression harness as well as the existing types, lint, units, structural data audit, disposable migrations/backup/restore, production build/browser suite, production dependency audit, exact documented tooling-applicability guard and bounded regional smoke checks. Preserve failed, skipped and blocked statuses. Fixture sessions and provider responses are not real OAuth or payments.

For Cloudflare changes also run `node scripts/qa-cloudflare-runtime.mjs`, build with `node scripts/cloudflare-build.mjs`, typecheck both Worker projects, check the Free bundle limits and exercise the changed flows under the local Cloudflare browser harness. Its fixture entry is never deployed. Run relevant container/Lighthouse checks for runtime/UI changes and inspect desktop/mobile screenshots rather than accepting source or automated scores alone.

After verification, update the reviewed, sanitized `docs/security-remediation.json` record using actual command outcomes. Regenerate all five root QA reports, implementation status and project plan:

```bash
node scripts/security-remediation-reports.mjs
node scripts/security-remediation-reports.mjs --check
node scripts/docs-check.mjs
node scripts/qa-source-secrets.mjs
node scripts/qa-secret-scan.mjs
npm run format:check
```

The report generator will not overwrite documents it does not own or promote the release verdict. It formats the reviewed record; it does not verify claims or manufacture missing evidence. Ignored `.qa` logs/screenshots remain local evidence, while the sanitized source record retains counts, statuses and artifact hashes for portable review. The previous Python report/inventory generators are absent from this GitHub revision; the original checkout's older reports remain historical and are not silently regenerated against a different source tree.

Keep billing, genuine Discord OAuth, live deployment/migration, operator/legal, current-patch source data and owner visual acceptance as independent gates. Never include credentials, cookie/session values, private records or database dumps in reports or uploaded artifacts. No benchmark, audit, passing parser or screenshot closes those gates automatically.

The tooling guard leaves raw development alerts visible. It fails on any unassessed advisory, artifact, scope or mechanism change; passing it does not mean the full dependency audit is clean. Region browser helpers wait for committed navigation when the selection changes; choosing an already selected region is a no-op. Controlled market tests cover both delayed API responses and delayed route responses, including preservation of the Back destination.
