# Dependency cleanup

2026-10-26. No dependency changed or removed in this pass.

`npm ls --depth=0` resolves Next16.4.3/React19.3.1/Prisma6.19.3 and the installed tool versions listed in STACK_AUDIT.md. Latest completed phase registry audit has zero reported advisories; it does not prove absence of unknown or contextual vulnerabilities.

Extraneous optional `@img/sharp-wasm32` and `@emnapi/runtime` appear locally. Retain until clean-install/platform image tooling is checked. Do not delete platform helpers just to make a dependency listing look clean. ESLint9 compatibility/deprecation remains QA-014; a major migration needs plugin compatibility proof. No blind `npm audit fix`, forced peer override or framework migration performed.

Pending: complete import/script/runtime dependency analysis, duplicated dependency graph review, current upstream lifecycle/outdated check and provenance verification where available. Keep package-lock.json and use `npm ci` for reproducibility.

Source-verification checkpoint: no new dependency or lockfile change. A direct offline image-library install could not resolve its package cache and was abandoned; PNG signature/CRC/bounded inflation validation uses Node22 built-ins with explicit static RGB/RGBA limits. This is format validation, not semantic artwork verification. Do not claim support for all PNG encodings.
