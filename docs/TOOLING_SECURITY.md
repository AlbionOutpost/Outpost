# Tooling advisory review — 2 November 2026

This records the dependency remediation for security finding S-07. It does not claim that all dependency risks or release gates are closed.

## Compatible upgrades

The dependency overrides pin `glob` to 14.0.3 and modern `minimatch` (requested major 9 or newer) to 11.0.4. This replaces the previous `@node-minify/core` override to glob 10.5.0. Node 22 remains the supported verification runtime.

- [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) identifies glob cancellation continuing filesystem traversal; the advisory's patched version is 14.0.2. The installed 14.0.3 is outside its affected range.
- [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) identifies amplification during minimatch preprocessing at optimization level 2 or higher; its patched version is 11.0.1. Installed modern consumers use 11.0.4.

The actual consumers retain their supported API shapes: OpenNext's cache collection calls `globSync` with `withFileTypes` and reads `isFile()`/`fullpath()`; node-minify calls `globSync` with string or array patterns; TypeScript ESLint uses the named `minimatch` export. Isolated probes exercised these shapes and the patched preprocessing bound. Full repository ESLint then completed with zero errors and eight existing warnings. Production builds and the phase gate are separate verification authorities.

## Legacy minimatch: advisory-specific not-affected assessment

Four installed packages remain genuine upstream **minimatch 3.1.5**:

- `node_modules/@eslint/config-array/node_modules/minimatch`
- `node_modules/@eslint/eslintrc/node_modules/minimatch`
- `node_modules/eslint-config-next/node_modules/minimatch`
- `node_modules/eslint/node_modules/minimatch`

Each installed `minimatch.js` has SHA-256:

```text
746849f267c4868a53729225bd85c7dccd387712136fb305fcc0a3eadd4a3d9d
```

The [advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) gives a broad affected range `<11.0.1`, but describes a particular mechanism: `firstPhasePreProcess()` repeatedly appends generated glob parts, followed by pairwise `secondPhasePreProcess()` comparisons. The [upstream fix](https://github.com/isaacs/minimatch/commit/77a0f5c) bounds those modern optimization passes.

The installed legacy source has neither method nor an `optimizationLevel` implementation. Its `make()` converts the brace-expanded set to `globParts` once, then maps that set through the parser (`minimatch.js`, approximately lines 178–205). An executable probe constructing a legacy `Minimatch` with an `a/**/../b/**/../c/**/../d` pattern and `optimizationLevel: 2` confirms both methods are absent and the glob-parts count stays one. The advisory's described preprocessing amplification therefore does not exist in these inspected 3.1.5 artifacts.

This is a narrow **not affected by this advisory's mechanism** assessment, not a guarantee against other regular-expression or brace-expansion denial of service. The [legacy upstream warning](https://github.com/isaacs/minimatch/tree/v3.1.5#important-security-consideration) expressly cautions against untrusted patterns. Outpost's remaining instances belong to development lint/configuration tooling; production-only audit reports zero findings.

The upstream legacy tag still resolves to 3.1.5. Replacing it globally with modern minimatch would break callers expecting `require("minimatch")` to be callable. Updating ESLint to major 10 also conflicts with the current React plugin's declared ESLint peer range. This remediation preserves those genuine versions and APIs; it does not rename, patch, suppress or misrepresent their versions.

## Raw results and reproduction

After installation, the complete npm audit still reports **17 moderate advisory entries**, propagated from the broad minimatch advisory onto the four legacy instances. These alerts remain visible; the repository does not claim a zero full-tree audit. Production-only audit reports **0**.

The first post-upgrade scan reported15 propagated entries; the refreshed final scan reported17, still derived from the same single legacy advisory. Final raw output is `.qa/security-retest/audit-all-final.json` and `audit-production-final.json`.

Raw ignored artifacts: `.qa/security-remediation/tooling/audit-all.json`, `audit-production.json`, and `dependency-tree.json`. These record scanner output independently of the assessment above. `compatibility-and-legacy-assessment.json` records the installed API probes and all four source hashes; its repeatable local probe is `verify-installed.mjs` in the same directory.

```bash
npm ls glob minimatch --all
npm audit --json
npm audit --omit=dev --json
npm run lint
sha256sum node_modules/eslint/node_modules/minimatch/minimatch.js
```

Do not use a blanket major override, force peer dependencies, or treat audit's proposed downgrade to retired tooling as a compatible fix. Reassess this exception when the advisory range or supported upstream consumers change.

## Current upstream recheck and repeatable guard

The 2 November 2026 registry recheck found no compatible upgrade that removes the assessed legacy artifacts. ESLint's maintained 9.x release remains 9.39.5. Current `eslint-plugin-react` 7.37.5, `eslint-plugin-import` 2.32.0 and `eslint-plugin-jsx-a11y` 6.10.2 still declare ESLint peers through major 9 and depend on legacy minimatch. An isolated, strict-peer ESLint 10.14.0 resolution failed with `ERESOLVE`; no peer override was applied. See the official [ESLint 10 migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0) and current package manifests for [React](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/package.json), [import](https://github.com/import-js/eslint-plugin-import/blob/main/package.json) and [JSX accessibility](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/package.json).

An isolated compatible update to `eslint-config-next` 16.4.4 and `typescript-eslint` 8.72.1 reduced propagated audit entries to 15, but retained the same underlying advisory and all four genuine 3.1.5 artifacts. It did not resolve this risk and was not adopted. This recheck leaves the repository dependency manifest and lockfile unchanged. Registry metadata, both raw audits, the strict-peer failure and the decision record are preserved under `.qa/tooling-cleanup-2026-11-02/`.

The source-controlled applicability guard verifies the known advisory identity, scope and propagation; the exact four development-only paths; and each inspected version, source hash, callable legacy API and absence of the described preprocessing mechanism:

```bash
node scripts/verify-tooling-assessment.mjs
npm test -- tests/tooling-assessment.test.ts
```

It performs a fresh raw npm audit by default. A saved raw report can be checked by passing its path as the first argument. The guard prints the nonzero raw count and fails on unexpected advisories, paths, source artifacts, production scope or mechanism changes. Its negative tests exercise these rejection cases. It also requires reassessment if the known advisory disappears, so the exception cannot silently outlive its purpose.

**A passing guard is an advisory-specific applicability assessment, not a clean audit.** The current raw full audit still reports 17 moderate entries and `npm audit` still exits nonzero; production-only audit reports zero. Keep those raw audit results visible alongside this separate guard. This does not establish general denial-of-service safety for legacy minimatch or authorize untrusted glob input.
