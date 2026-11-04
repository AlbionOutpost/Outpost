# Tooling advisory review — 2–4 November 2026

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

At the original review, the [advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) gave a broad affected range `<11.0.1`, but describes a particular mechanism: `firstPhasePreProcess()` repeatedly appends generated glob parts, followed by pairwise `secondPhasePreProcess()` comparisons. The [upstream fix](https://github.com/isaacs/minimatch/commit/77a0f5c) bounds those modern optimization passes.

The installed legacy source has neither method nor an `optimizationLevel` implementation. Its `make()` converts the brace-expanded set to `globParts` once, then maps that set through the parser (`minimatch.js`, approximately lines 178–205). An executable probe constructing a legacy `Minimatch` with an `a/**/../b/**/../c/**/../d` pattern and `optimizationLevel: 2` confirms both methods are absent and the glob-parts count stays one. The advisory's described preprocessing amplification therefore does not exist in these inspected 3.1.5 artifacts.

This is a narrow **not affected by this advisory's mechanism** assessment, not a guarantee against other regular-expression or brace-expansion denial of service. The [legacy upstream warning](https://github.com/isaacs/minimatch/tree/v3.1.5#important-security-consideration) expressly cautions against untrusted patterns. Outpost's remaining instances belong to development lint/configuration tooling; production-only audit reports zero findings.

The upstream legacy tag still resolves to 3.1.5. Replacing it globally with modern minimatch would break callers expecting `require("minimatch")` to be callable. Updating ESLint to major 10 also conflicts with the current React plugin's declared ESLint peer range. This remediation preserves those genuine versions and APIs; it does not rename, patch, suppress or misrepresent their versions.

## Historical raw results and reproduction

In the 2 November assessment, the complete npm audit reported **15 moderate advisory entries**, propagated from the broad minimatch advisory onto the four legacy instances. Those raw alerts remain historical evidence; that assessment did not claim a zero full-tree audit. Production-only audit reports **0**.

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

## 2 November upstream recheck and repeatable guard

The 2 November 2026 registry recheck found no compatible upgrade that removes the assessed legacy artifacts. ESLint's maintained 9.x release remains 9.39.5. Current `eslint-plugin-react` 7.37.5, `eslint-plugin-import` 2.32.0 and `eslint-plugin-jsx-a11y` 6.10.2 still declare ESLint peers through major 9 and depend on legacy minimatch. An isolated, strict-peer ESLint 10.14.0 resolution failed with `ERESOLVE`; no peer override was applied. See the official [ESLint 10 migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0) and current package manifests for [React](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/package.json), [import](https://github.com/import-js/eslint-plugin-import/blob/main/package.json) and [JSX accessibility](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/package.json).

An isolated compatible update to `eslint-config-next` 16.4.4 and `typescript-eslint` 8.72.1 reduced propagated audit entries to 15, but retained the same underlying advisory and all four genuine 3.1.5 artifacts. It did not resolve this risk and was not adopted. This recheck leaves the repository dependency manifest and lockfile unchanged. Registry metadata, both raw audits, the strict-peer failure and the decision record are preserved under `.qa/tooling-cleanup-2026-11-02/`.

The source-controlled applicability guard verifies the known advisory identity, scope and propagation; the exact four development-only paths; and each inspected version, source hash, callable legacy API and absence of the described preprocessing mechanism:

```bash
node scripts/verify-tooling-assessment.mjs
npm test -- tests/tooling-assessment.test.ts
```

The guard performs a fresh raw npm audit by default. A saved raw report can be checked by passing its path as the first argument. The original guard printed the nonzero raw count and failed on unexpected advisories, paths, source artifacts, production scope or mechanism changes. Its negative tests exercise these rejection cases. The original guard required reassessment if the known advisory disappeared, so the exception could not silently outlive its purpose. That check triggered the 4 November reassessment below.

**The original passing guard was an advisory-specific applicability assessment, not a clean audit.** At that assessment the raw full audit reported 15 moderate entries and `npm audit` exited nonzero; production-only audit reports zero. Keep those raw audit results visible alongside this separate guard. This does not establish general denial-of-service safety for legacy minimatch or authorize untrusted glob input.

Earlier phase refresh (4 November 2026, before the upstream range correction): the fresh raw scan reports15 moderate development advisory entries and production-only0. The earlier reviewed snapshot reported17; its historical logs remain retained. The same exact-artifact/advisory-mechanism guard passes without suppressing raw alerts or changing dependencies.

## 4 November range correction and clean-audit path

The official [GitHub advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) was updated at **2026-11-04T16:50:04Z**. Its affected range is now **`>=7.0.0, <11.0.1`**, excluding the installed legacy3.1.5 line. This is an upstream scope correction; Outpost did not patch, rename or upgrade dependencies to make the advisory disappear.

The first Market/Tools integration phase recorded a failure at the guard's former “known advisory absent” condition; the phase runner continued its other named checks. Fresh Node22/npm10.9.9 scans, including an explicit `npm audit --json --include=dev`, report **0 advisories**; production-only also reports0. Registry configuration points to the public npm registry, audit is enabled, omit/include configuration is empty and relevant production/omit environment settings are unset. Development dependency omission did not cause the zero result. The lockfile and dependency/override manifest sections are unchanged, and all four reviewed source hashes, versions, development-only lock entries and runtime probes remain exact.

The revised guard validates those same artifacts before either result path. A clean report must use the expected audit schema, have an empty vulnerability map and have explicit zero integer values for total and every severity. It reports that the scanner found no known advisories **at scan time**, rather than applying an advisory exception. A nonzero report still has to pass the original strict advisory identity, historical range, propagation, paths and mechanism assessment; new or changed findings continue to fail. The live command explicitly includes development dependencies. Failed/interrupted npm processes, malformed output, audit errors and non-advisory exit failures cannot establish a clean result. Saved raw reports remain explicitly labelled as supplied reports.

Negative tests cover inconsistent/missing/severity counts, malformed maps and schema, findings disguised by zero counts, changed artifact hashes/versions/paths/production scope/APIs/mechanism, and process error/signal/exit-status failures. The old nonzero assessment fixtures remain supported and still report their raw alerts. No advisory is filtered, suppressed or converted to a clean finding.

Evidence is `.qa/market-legal-sharing/tooling-reassessment/`: `github-advisory.json` is the public API record, `audit-all.json` and `audit-production.json` are new raw scans, and `artifact-environment.json` records only allowlisted nonsecret settings and inspected artifacts. The initial integration failure remains `.qa/market-legal-sharing/phase-first/phase-tooling-assessment.log`. Historical15/17-alert reviews above remain distinct from the new zero-advisory observation. A clean scan is not a general security guarantee or permission to pass untrusted patterns to legacy tooling.
