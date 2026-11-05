# Complete the bilingual legal release: streamed section links

PR87 merged as 9b4ee5, but production run 41929236400 stopped in verification and did not deploy it. The failing keyboard language-switch journey retained `#privacy` and selected German correctly, but the privacy section had viewport ratio 0. The assertion was preserved. PR86 remained the actual public deployment during this correction.

The failure is consistent with native fragment positioning racing streamed document/font layout. The existing build-detail navigation already explicitly settles fragment scrolling after client commit. Legal now mounts a small client restorer after its document and aligns the current legal section after hydration and font readiness. It also handles hash/history navigation and cleans up its animation frames/listeners. No locale, cookie, data, legal-text or payment behavior changes.

A new cold-load regression delays self-hosted font responses, then checks direct section links and reloads in both languages. The original keyboard switch/hash/region/viewport assertion is unchanged. Current local Cloudflare verification passes all 72 core cases. A newly built non-root production container passes 8 cold/font-delayed keyboard-switch/reload cases across both languages, themes and desktop/phone widths. These are actual browser behavior checks, not proof that every network timing or browser is covered.

The earlier 36-layout/14-native evidence remains relevant to the source-identical reading styles and Supporter contrast; this correction changes only legal scroll restoration. The homepage Lighthouse sample predates this legal-only change and is retained as a scoped observation, not rerun into a better score. Full current Node phase, scans, protected checks and final exact-head public verification remain separately recorded by release reports/receipts.

The initial production failure/logs are retained in `.qa/legal-readability/deployment-failure.log` and `.qa/legal-stream-scroll/blocked-deployment.json`. Current fix evidence is under `.qa/legal-stream-scroll/`. No gate was bypassed, failed assertion weakened or unsuccessful production run called a deployment.
