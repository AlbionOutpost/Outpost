# Codebase cleanup

2026-10-26 review. No application route, migration, backup, user content or component was deleted without reference evidence.

Changes: tightened ignore rules for environment variants, private keys/certificates, local databases/backups, logs/caches/build output and editor files; retained `.env.example` and npm lockfile; added EditorConfig. Catalog result validation/merging and production observation identity now live in pure domain helpers rather than embedded assertions/casts.

Retained intentionally: all migration history; local-only fixture setup; reference images and design-review documents as QA evidence; runtime optimized scene files and original provenance; optional WASM image packages pending platform investigation. Existing long CSS override layers are a cleanup candidate, but removing them without page-by-page visual baselines would risk regression.

Not yet verified: whole-project dead-code/dynamic-route audit, global formatting, clean-checkout setup, Git tracked/history inventory. `.git` is not recognized by this environment. Do not claim the working tree is clean or all dependencies are used. No destructive reset or remote push performed.

Formatting pass: `npm run format:check` identified six document/JSON files; formatted those files and reran successfully. ESLint excludes environment-owned .agents/.codex/.aws directories after a transient missing-directory traversal failure; application/test code stays linted. Added a reusable, tested source-pattern scanner with value-redacted findings; retained full-history scanning as unresolved. CONTRIBUTING.md/SECURITY.md added without inventing contacts or selecting a code license.

Current cleanup: removed a duplicate market-response identity loop only after confirming the same check already runs in the supplied cache/response schema and adding item/quality rejection plus retry tests. Canonical batching avoids duplicate request identities. Removed own already-applied `/tmp/outpost-*` draft/patch copies listed in the development transcript; these were not application files, migration history, user data or QA evidence. Required before/after screenshots and failed logs remain intentionally retained under ignored `.qa`. Global formatting passes; complete dead-code/dependency elimination and Git-history review remain unverified.
