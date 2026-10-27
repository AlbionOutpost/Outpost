"""Render reviewed QA inventory and executed local evidence; never auto-approve release."""
from pathlib import Path
import json, collections, re
root=Path(__file__).resolve().parents[1]
def read(name,default=None):
 p=root/name
 return json.loads(p.read_text()) if p.exists() else default
inventory=read('docs/qa-inventory.json',[])
phase=read('.qa/phase-summary.json',{'checks':[]})
counts=collections.Counter(i['status'] for s in inventory for i in s['items'])
checklist='''# QA checklist

Audit date: 2026-10-26. PASS applies only to the implemented scope and cited evidence; it is not an assertion about future features, a penetration-test guarantee or legal/accessibility certification. BLOCKED and NOT IMPLEMENTED receive no score credit. Database fixtures are not real Discord OAuth.

Evidence: `.qa/phase-summary.json`, `.qa/phase-*.log`, `.qa/ui-audit.json`, `.qa/light-audit.json`, `.qa/database-final.json`, `.qa/live-comparison.json`, `.qa/docker.json`, `.qa/secret-scan.json`, `.qa/lighthouse-home.json`, `.qa/api-timings.json`. Raw `.qa` files are local ignored artifacts. Reviewed inventory: `docs/qa-inventory.json`.

'''+', '.join(f'{k}: {v}' for k,v in sorted(counts.items()))+'\n\n'
for section in inventory:
 checklist+=f"## {section['number']}. {section['title']}\n\n| ID | Requirement | Status | Evidence / limitation |\n| --- | --- | --- | --- |\n"
 for n,item in enumerate(section['items'],1):
  checklist+=f"| {section['number']}.{n:02} | {item['item'].replace('|','/')} | **{item['status']}** | {item['evidence'].replace('|','/')} |\n"
 checklist+='\n'
(root/'QA_CHECKLIST.md').write_text(checklist)
weights={'core':25,'data':20,'security':20,'ui':15,'performance':10,'code':5,'operations':5}
labels={'core':'Core functionality','data':'Albion data and calculation accuracy','security':'Security and authorization','ui':'UI/UX quality','performance':'Performance and responsiveness','code':'Code quality and maintainability','operations':'Deployment and operations'}
scores={}
for category,weight in weights.items():
 items=[i for s in inventory if s['category']==category for i in s['items'] if i['status']!='NOT APPLICABLE']
 passed=sum(i['status']=='PASS' for i in items)
 scores[category]={'score':round(100*passed/len(items),2),'passed':passed,'applicable':len(items),'weight':weight}
overall=round(sum(v['score']*v['weight']/100 for v in scores.values()),2)
table='| Category | Weight | Verified/applicable | Score |\n| --- | ---: | ---: | ---: |\n'+''.join(f"| {labels[k]} | {v['weight']}% | {v['passed']}/{v['applicable']} | {v['score']:.2f}/100 |\n" for k,v in scores.items())
checks='\n'.join(f"- `{c['name']}`: **{c['status']}** ({c.get('seconds','n/a')}s)." for c in phase['checks'])
(root/'RELEASE_READINESS.md').write_text(f'''# Release readiness

**NO-GO for public release. Overall evidence-coverage score: {overall:.2f}/100.**

## Score methodology

PASS earns1; FAIL/BLOCKED/NOT IMPLEMENTED earn0; NOT APPLICABLE is excluded. Requirements are equally weighted within their assigned category in docs/qa-inventory.json. Category weights are the requested product weights. This is a checklist coverage index, not a probability of safety or a certification; numerous small checks can overstate product completeness. Essential gates always override the score.

{table}

Weighted total = sum(category score × weight /100) = **{overall:.2f}**.

## Release blockers

- No P0 was reproduced in the scoped checks; absence of all possible vulnerabilities is not certified.
- Open P1 capability gaps: full composition/build item and spell catalog, remaining guild assets/custom-permission workflows, most economy calculators and remaining moderation hardening.
- Actual Discord OAuth exchange, redirect/state and repeated-account handling remain BLOCKED by absent credentials. Database sessions cannot close that gate.
- Operator details, qualified privacy/legal review, retention and vendor disclosures remain incomplete.
- Journeys B/C/D/E have blocked or missing steps. Journey A has an automated complete regression with fixture responses plus separate live source comparisons.

## Latest automated gate

{checks}

See raw logs for any FAIL; successful subsets must not conceal an overall failing command. Targeted ownership, privacy, origin/CSRF, concurrent version, expiry/logout, hostile-text, source/cache and migration tests have evidence. These are scoped checks, not full product certification.

## Missing verification

Current supplementary checks: Docker rebuild BLOCKED by socket permissions; fresh Lighthouse BLOCKED by standalone server bind EPERM. See `.qa/reference-extra-gates.json`. Historical artifacts do not close current checks.

Real HTTPS/Secure-cookie deployment; actual OAuth; screen-reader sessions; physical devices; field p75 LCP/INP; production-scale load; scheduled encrypted backups/alerts; compatible-schema rollback rehearsal. Chrome DevTools MCP is unavailable; standalone Lighthouse is separate lab evidence.

## Recommendation

Continue local development or protected staging. Do not recommend general public operation as the complete requested platform. Run npm run qa:phase after every major phase, review updated screenshots/checklist, and rerun Docker/Lighthouse after relevant changes. Automated test success must never automatically upgrade NO-GO to GO.
''')
# ID|Title|Severity|Feature|Reproduction|Expected|Actual before fix/current|Cause|Files|Status|Verification
bug_data='''QA-001|Header region and tool request disagree|P1|Market/history/items|Set atlas-region=asia; open market with no region URL; compare.|Use Asia.|Header Asia but Europe request.|Independent hardcoded defaults.|region-context.tsx; shell.tsx; market.tsx; history.tsx; item-catalog.tsx|FIXED|Failed pre-fix browser reproduction; shared-context regression passes.
QA-002|Old item/quality prices remain visible|P1|Market|Load Bag quality1 then change quality/item.|Invalidate observations.|Old rows remained until region changed.|Incomplete result identity.|market.tsx; tools/market/page.tsx|FIXED|Failed pre-fix reproduction; full selection-key invalidation test passes.
QA-003|Finite inputs overflow calculated outputs|P1|Trade math|Price1e308 with quantity1000000.|Reject unrepresentable scenario.|Schema accepted overflowing scenario.|No aggregate precision bound.|calculations.ts; qa-regressions.test.ts|FIXED|Pre-fix unit failed; bounded validation passes.
QA-004|Cleared numeric input renders NaN|P2|Trade input|Clear purchase-price field.|Blank with validation and no React warning.|NaN passed to controlled input.|No blank display adapter.|trade-calculator.tsx|FIXED|Clear-input browser test records no React errors.
QA-005|Fractional profit hidden by rounding|P2|Trade output|Buy1 sell1.5 quantity1.|Show0.5.|Rounded to whole silver.|Math.round at presentation.|trade-calculator.tsx|FIXED|Fractional-profit browser assertion.
QA-006|Invalid domain data accepted by database|P1|Persistence|Disposable DB: quality6, playerCount-1, invalid region.|Reject invalid records.|All three were accepted.|Only API validation.|20261025213500_qa_invariants/migration.sql|FIXED|database-baseline.json shows failure; database-final.json records all scoped checks.
QA-007|Database failures mislabeled or unbounded|P2|API errors|Throw sensitive service error; send oversized JSON.|Safe503; proper413/415/400 client errors.|Broad400 catch or missing safe boundary.|Inconsistent handler policy.|api-errors.ts; http.ts; build/account routes|FIXED|Sanitized exception unit tests, oversized payload and conflict browser tests.
QA-008|Inline link and table accessibility failure|P2|Market accessibility|Run axe at375px.|Non-color link cue and keyboard scroll.|Color-only link; unfocusable scroll region.|Missing underline/tab semantics.|globals.css; market.tsx; history.tsx|FIXED|Initial axe nodes captured; final dark tagged-rule assertions pass.
QA-009|Light theme contrast failures|P2|Theme|Run light axe at375/1440.|Readable contrast.|19 route/viewport color-contrast findings.|Dark gold/gray accents reused.|globals.css|FIXED|20 light route/viewport cases assert no tagged violations.
QA-010|Mobile drawer lacks focus management|P2|Navigation|Open drawer, Tab and Escape.|Modal focus, dismiss, return.|Background focus/scroll not controlled.|Visual-only drawer.|shell.tsx; globals.css|FIXED|Dialog/Escape/focus-return test passes; actual screen reader remains blocked.
QA-011|Process cache has no byte budget|P2|Caching|Cache many near-limit responses.|Bound memory.|500 entries could retain about1GB serialized payload.|Entry-only bound.|data-client.ts; cache-expiry.test.ts|FIXED|8MiB serialized-payload/128-entry policy; eviction and TTL regressions.
QA-012|Wrong source identity cached before validation|P2|Source validation|Return valid-shaped wrong item; retry.|Reject without cache poisoning.|Identity check followed cache write.|Context check outside schema.|market-client.ts; cache-expiry.test.ts|FIXED|Repeated mismatch requests trigger repeated source validation, not poisoned hit.
QA-013|Untested root-running Docker scaffold|P2|Container|Build/inspect original Dockerfile.|Reproducible nonroot health-checked runtime.|Root, single stage, npm install, no app smoke.|Initial scaffold.|Dockerfile; next.config.ts; qa-container.mjs|FIXED|Image built; UID1000, env absent, home and DB/Redis health200.
QA-014|Deprecated lint toolchain|P2|Dependencies|Inspect npm deprecation and peer graph.|Maintained compatible lint stack.|ESLint9 deprecated;10 conflicts with Next plugin peers.|Ecosystem compatibility gap.|package.json; package-lock.json|OPEN|Zero audit advisories does not resolve deprecation.
QA-015|Prisma reads coupled to presentation|P3|Maintainability|Inspect build/settings server pages.|Reusable query/repository helpers.|Prisma reads remain inside markup modules.|Foundation coupling.|app/builds; settings/page.tsx; layout.tsx|OPEN|Source inspected; future behavior-preserving extraction.
QA-016|Settings action service-failure recovery|P2|Account UX|DB rejects profile save or account deletion.|Clear retry preserving draft.|Typed errors retain form state and both operations succeed on retry.|Missing action result/error model; overloaded session ReturnType also prevented build.|settings/actions.ts; settings-forms.tsx; settings-recovery.spec.ts|FIXED|Fixture-only PostgreSQL UPDATE and DELETE failure injection verifies preserved drafts/confirmation, unchanged records on failure and successful retry; real OAuth remains separate.
QA-017|Composition catalog and guild milestone incomplete|P1|Product|Attempt20-player comp/group invite workflow.|Persisted authorized collaboration.|Composition and group workflows pass phase gates; complete catalog and remaining guild workflows are incomplete.|Ongoing implementation.|PROJECT_PLAN.md; schema.prisma|IN PROGRESS|See docs/DEVELOPMENT_PROGRESS.md; no full-completion claim.
QA-018|Verified item/spell and build feature gaps|P1|Builds|Try legal spells, duplicate, favorites or build cost.|Verified selectors and required interactions.|Validated starter item/spell picker, duplication, version restoration and costs pass; complete catalog, unlocks/statistics and full swap workflow remain incomplete.|Incomplete data/build phase.|build-editor.tsx; item-database.ts|OPEN|e2e/verified-builds.spec.ts and tests/build-cost.test.ts pass within starter catalog scope; full catalog acceptance remains unresolved.
QA-019|Moderation hardening and spam coverage incomplete|P1|Community|Try reporting/reviewing abusive public content.|Moderated reporting operations.|Reports/queue/audited hide-restore and comment revisions implemented; advanced abuse controls remain.|Partial community phase.|build API; schema.prisma|OPEN|e2e/community.spec.ts passes core multi-account controls; comprehensive abuse/appeals/operations coverage remains unresolved.
QA-020|Specialized economy coverage incomplete|P1|Economy|Try focus/city crafting or reload saved scenario.|Sourced production mechanics and persistence.|Crafting/refining/enchanting starter engines and private saved scenarios are implemented; remaining economy scope is incomplete.|Calculator phase incomplete.|calculations.ts; PROJECT_PLAN.md|OPEN|tests/production.test.ts and e2e/production.spec.ts cover the implemented subset; automatic city/focus specialization and full recipes remain missing.
QA-021|Production monitoring/backups unconfigured|P2|Operations|Find alerts/scheduled backup jobs.|Operational monitoring/retention.|Local health/logs and synthetic restore only.|No deployed operations.|docs/DEPLOYMENT.md|OPEN|Local restore does not establish production backup service.
QA-022|Actual Discord OAuth unverified|P1|Authentication|Attempt real login without credentials.|Verified redirect/state/login/repeat account.|Provider unavailable; fixture sessions only.|Credentials missing.|auth.ts; signin/page.tsx|BLOCKED|Requires real credentialed verification; no exposed mock login.
QA-023|Legal/operator and retention incomplete|P1|Legal/release|Open legal page with missing operator data.|Completed reviewed disclosures.|Explicit draft/missing-data labels.|Operator/legal information unavailable.|legal/page.tsx; .env.example|BLOCKED|No legal compliance claim; NO-GO.
QA-024|Public TLS/cookies and field vitals unverified|P2|Deployment/performance|Inspect public TLS/field evidence.|Secure-cookie and field verification.|Local HTTP/lab evidence only.|No public staging deployment.|proxy.ts; env.ts; RELEASE_READINESS.md|BLOCKED|No local measurement promoted to HTTPS/field certification.
QA-025|Closed Redis singleton never recovers|P2|Resilience|Client status end, later request.|Recreate client.|Closed client retained.|No end-state recovery.|redis.ts; redis-recovery.test.ts|FIXED|Unit verifies new client; live restart drill remains unverified.
QA-026|History dates treated as local timezone|P2|Chart dates|Read timezone-less source near DST.|Consistent UTC interpretation.|Browser Date.parse timezone varies.|Missing UTC normalization.|freshness.ts; history.tsx|FIXED|Explicit UTC/future freshness unit test; chart uses shared parser.
QA-027|Standalone output uses incompatible start|P2|Startup|Build standalone then next start.|Prepared standalone server.|Next warning about unsupported start mode.|Scaffold command unchanged.|start.mjs; prepare-standalone.mjs; package.json|FIXED|Final production browser gate uses standalone startup.
QA-028|First design pass font and responsive geometry defects|P2|Shared design system|Load first design pass; resize desktop and inspect fonts/map/caption.|Loaded typefaces and unobscured content.|Fonts fell back; nested SVG expanded; margin animation temporarily covered content.|Font variables resolved above their definitions; broad SVG selector; breakpoint margin transition.|fonts.ts; globals.css; design-review.spec.ts|FIXED|Actual font-family and desktop geometry assertions plus dark/light168-state matrix; corrected selector and immediate responsive geometry.
QA-029|Settings failure fixture suppressed other test cleanup|P2|QA isolation|Run settings DELETE failure fixture alongside independent user cleanup.|Only the selected test user fails.|BEFORE DELETE returned NEW for other users, preventing unrelated deletion.|Trigger reused UPDATE return semantics for DELETE.|e2e/settings-recovery.spec.ts|FIXED|Return OLD for unrelated DELETE operations; full concurrent production browser gate rerun passes.

QA-030|Small copper legal links failed contrast|P2|Outpost visual system|Run dark375/1440 axe on Legal after switching to copper.|Small links meet4.5:1.|Brand copper on card surface measured3.99:1.|Prose selector retained brand color instead of accessible ink.|globals.css; legal/page.tsx|FIXED|Prose links use --accent-ink; full176-state dark/light review and phase gate pass.
QA-031|Outpost concept-image comparison was unavailable|P2|Design acceptance|Locate the supplied numbered concept screenshot.|Inspect hierarchy and compare rendered layouts.|Eight-panel reference is now supplied and reviewed; no pixel-perfect claim.|Earlier concept attachment was unavailable.|docs/OUTPOST_ACCEPTANCE.md; .qa/reference-review|FIXED|Actual image retained for QA-only comparison; no illustrative artwork cropped into application.
QA-032|Authentic hero and feature screenshots missing|P2|Design media|Find sourced permitted environment images for hero/cards.|Use actual Albion media with recorded permission.|No suitable supplied/repository assets; official press-kit retrieval403.|Missing source assets and verified usage evidence.|docs/assets/OUTPOST_MEDIA_INVENTORY.md|BLOCKED|Earlier generated scenes were user-authorised and disclosed, but do not close the latest genuine-media requirement.


QA-033|Composition native dragging stopped after roster rebuild|P2|Composition editor|Drag member1 to member2 in the full roster.|Reorder and persist party order.|Native drag never started on the new form-control handle.|Native drag interaction did not survive layout change.|composition-editor.tsx; globals.css|FIXED|Pointer capture movement passes dragTo and persistence assertions; keyboard ArrowDown and mobile focus pass separately.
QA-034|Starter gear preview overflowed320px homepage|P2|Responsive home|Open home at320px.|No document overflow and usable equipment.|350px scroll width.|Intrinsic three-slot minimum width plus padding.|globals.css|FIXED|Minmax columns, shrinkable images and narrow padding; seven-width overflow audit passes.
QA-035|Guild overview text action inherited native gray button|P2|Guild overview|Run dark/light axe on new activity overview.|Readable action contrast.|Copper text on native gray button failed4.5:1.|Text-link style did not reset button background.|globals.css|FIXED|Explicit transparent button reset;176-state tagged axe matrix passes.

QA-036|Reference fidelity rejected despite passing functional QA|P1|Visual acceptance|Compare supplied reference with rendered implementation.|Preserve reference hierarchy, imagery regions and density.|Prior design rejected; measured build/composition corrections are starter-scoped and full acceptance remains open.|Prior phases prioritized general component treatment and tests over measured reference comparison.|docs/design-review; src/app/page.tsx; globals.css|OPEN|Three sequential rendered reviews required; actual image permissions remain blocking. No visual acceptance from QA alone.
QA-037|Undated production observations treated as fresh|P1|Calculator correctness|Use a source price with null timestamp.|Warn about unknown freshness.|Null timestamp bypassed stale check.|Truthiness guard skipped validation.|production.ts; production.test.ts; production-freshness.spec.ts|FIXED|Missing/invalid/past/future timestamp and manual-override regressions; final gate recorded below.
QA-038|Pending refresh overwrites newer manual prices|P1|Calculator state|Start overwrite refresh then edit a material price.|Keep the newer input.|Late source result replaced the edit.|No request cancellation or edit identity.|production-observations.ts; production-calculator.tsx|FIXED|Independent merge tests plus held-response production browser test.
QA-039|Imported search hides locally supported items|P1|Item search|Search Bow when imported catalog has no Bow.|Keep selectable local names.|Successful empty response removed fallback rows.|Database response replaced rather than merged catalog paths.|catalog/search.ts; catalog-item-picker.tsx; catalog.spec.ts|FIXED|Validated bounded merge and successful-empty-response browser regression.
QA-040|Long public build titles overflow mobile cards|P2|Responsive discovery|Browse a build with a long unbroken name at375px.|Wrap without document overflow.|Title escaped the card.|Missing overflow-wrap and shrinkable art column.|globals.css; design-review.spec.ts|FIXED|Reproduced actual375px screenshot; wrap correction and full matrix rerun.
QA-041|Historical events suppress upcoming guild activity|P1|Guilds|Create55 past events plus one future.|Show scheduled next activity.|Earliest50 excluded future event.|Ascending history consumed entire limit.|groups/dashboard.ts|FIXED|Bounded future/recent queries; populated PostgreSQL browser regression.
QA-042|Discovery semantic header/footer inherit site chrome|P2|Guilds|Open new discovery at375/390.|Readable filters without overflow.|Fixed header height overlaps content; footer padding bloats cards.|Legacy global element selectors.|globals.css|FIXED|Scoped resets;176-state matrix and320/390 screenshots.
QA-043|Repeated discovery query parameters can reach Prisma as arrays|P2|Build discovery|Request duplicate q/content parameters.|Safe bounded parsing without500.|String-only page type ignored actual array inputs.|Incorrect searchParams runtime assumption.|builds/page.tsx|FIXED|String narrowing, allowlisted filters and browser HTTP200 regression. Anonymous own collection explicitly empty.
QA-044|Source market records permit excessive field lengths and price magnitude|P2|Market integration|Receive oversized city/date or beyond-safe-number quote.|Reject before cache/UI.|Only whole-response bytes were bounded.|Missing per-field and numeric magnitude bounds.|market-client.ts|FIXED|Ten new source/cache tests preserve sentinel handling and valid retry; all regions rerun.
QA-045|Serialization rollback reported as composition revision conflict|P1|Composition persistence|Concurrent local activity producesP2034.|Retry only known rollback, preserve revision guards.|Spurious changed-composition error on own fixture.|Serialization failure conflated with stale revision.|compositions/service.ts;serialization-retry.ts|FIXED|Failed raw run retained; bounded retry tests and real competing-editor regression pass.
QA-046|Other calculator records crowd saved plans out of first page|P2|Scenario persistence|Save trade/transport then51 newer crafting records.|Find saved plan for selected calculator.|Client filtering followed global50-record limit.|Missing server kind filter.|scenarios/route.ts;scenario-controls.tsx;transport-calculator.tsx|FIXED|Trade and transport restored despite51 newer other-mode fixtures; private access and export tests.
QA-047|Inactive or partial catalog release reported synchronized|P2|Catalog import|Repeat import after deactivation or incomplete active records.|Reject incomplete release state.|Checksum match returned early without active-record checks.|Idempotency relied only on source identity.|catalog/release-state.ts;sync-catalog.ts|FIXED|Active-count and checksum regression tests; no main database import performed.
QA-048|Item navigation loses selected Albion region|P2|Item catalog|Open Asia catalog then item details and market.|Retain Asia region.|Navigation defaulted to Europe.|Region missing from links.|item-catalog.tsx;item-market-link.tsx|FIXED|Asia detail and market-link production browser regression passes.
QA-049|Starter ability names imply complete verified mappings|P2|Metadata disclosure|Open starter item details.|Separate sourced names and current-patch verification.|Verified wording exceeded available evidence.|No clear verification-stage labels.|items/page.tsx;items/[id]/page.tsx;composition-editor.tsx|FIXED|Labels now sourced/imported; manual and patch not recorded; actual patch coverage remains0.






'''
tracker='# Bug tracker\n\nAudit date: 2026-10-26. Missing essential capabilities are product release blockers. No P0 reproduced; absence of all P0 vulnerabilities is not certified.\n\n'
for line in filter(str.strip, bug_data.strip().splitlines()):
 b=line.split('|');ident,title,severity,feature,repro,expected,actual,cause,files,status,verification=b
 tracker+=f'## {ident} — {title}\n\n- **Severity:** {severity}\n- **Affected feature:** {feature}\n- **Status:** {status}\n- **Reproduction:** {repro}\n- **Expected:** {expected}\n- **Actual before fix / current unresolved behavior:** {actual}\n- **Root cause:** {cause}\n- **Files:** {files}\n- **Fix verification:** {verification}\n\n'
(root/'BUG_TRACKER.md').write_text(tracker)
def log_count(name,pattern):
 p=root/name
 m=re.search(pattern,p.read_text()) if p.exists() else None
 return m.group(1) if m else 'unavailable'
uc=log_count('.qa/phase-unit.log',r'Tests\s+(\d+) passed');bc=log_count('.qa/phase-browser.log',r'(\d+) passed \(')
ui=read('.qa/ui-audit.json',{'rows':[]});light=read('.qa/light-audit.json',[]);lh=read('.qa/lighthouse-home.json',{})
perf=lh.get('categories',{}).get('performance',{}).get('score');acc=lh.get('categories',{}).get('accessibility',{}).get('score')
perf=100*perf if isinstance(perf,(float,int)) else 'UNAVAILABLE';acc=100*acc if isinstance(acc,(float,int)) else 'UNAVAILABLE'
metrics={k:lh.get('audits',{}).get(k,{}).get('numericValue') for k in ['largest-contentful-paint','cumulative-layout-shift','total-blocking-time']}
timings=read('.qa/api-timings.json',[])
timing_text='; '.join(f"{r['path'].split('?')[0]}: warm p95 {r['warmP95Ms']:.2f}ms, first request {r['firstRequestMs']:.2f}ms" for r in timings)
(root/'QA_REPORT.md').write_text(f'''# QA report

## Executive summary

**NO-GO for public release.** A functioning but incomplete foundation. Reproduced defects were fixed with regressions; attractive pages and a passing build do not close missing product, OAuth or legal gates. Evidence-coverage index **{overall:.2f}/100**, computed in RELEASE_READINESS.md.

## Feature coverage

Working: transport planner and cross-city/Black Market observation scanner; starter crafting/refining/enchanting and private saved/shared scenarios; regional market observations/history/gold, curated item search, manual trade accounting, database sessions/settings/export/deletion, and private/public/unlisted builds with revisions. Composition core storage/editor/sharing is now tested; group collaboration has passed its full phase gate with five independent fixture accounts. Still missing: most calculators, complete item/spell catalog, full community moderation coverage, guide CMS, islands, background timer notifications, dashboard customization and operational admin tools. Persistent manual timers, bounded personal dashboard and permission-filtered Ctrl+K search are verified in e2e/personal-tools.spec.ts; settings save/delete failure retries are verified in e2e/settings-recovery.spec.ts. See docs/DEVELOPMENT_PROGRESS.md for the authoritative current milestone scope.

## Test results

- Baseline type/lint/unit/migrations/build/browser/advisories passed. New reproductions then genuinely failed for region mismatch, stale quality rows and overflow. Fixed tests subsequently pass; initial failures are not hidden.
- Latest unit log: **{uc} passed**. Latest production browser log: **{bc} passed**. Check command statuses below; successful counts must not hide an overall FAIL.
- Disposable database: all recorded fresh/upgrade/constraint/backup/restore/cascade checks pass. Baseline invalid quality/playerCount/region were accepted; new migration enforces them. No existing application DB reset or production backup used.
- Live price/history/gold: nine region/endpoint checks pass. Raw-versus-app comparison matches all 8 price rows per region, including IDs, city, quality, values and timestamps. Raw sample .qa/live-comparison.json is audit evidence, not UI seed data.
- Historical foundation container evidence (predates new collaboration/economy routes): build and local smoke pass, UID1000, no /app/.env, home200, Postgres/Redis health200. Auth availability is separately not-configured.
- Historical browser static secret-value scan:20 files, no configured NEXTAUTH_SECRET match. Discord secret absent, so cannot scan it by value. This is not a complete source/OS security audit.

{checks}

## Major problems and security findings

BUG_TRACKER.md records individually described findings, including reproduced fixed data/calculation/DB/accessibility/container defects and unresolved release gates. Existing authorization was retained and tested with separate users. Role/author spoofing is ignored, hostile text remains escaped, oversized JSON is rejected, concurrent version writes produce one success/one conflict, expired/logout sessions cannot export data and private responses are no-store. These are targeted checks, not a penetration-test guarantee.

Open: query/UI coupling, consistent recovery across remaining client mutations, moderation/anti-spam/monitoring/backups and missing core product phases. Actual OAuth, TLS cookies, legal/operator and field performance verification remain blocked.

## Rendered screenshots and accessibility

Baseline audit dark matrix: **{len(ui['rows'])}** route/viewport records; light matrix: **{len(light)}**. Screenshots at375/768/1440/1920; overflow checks also320/430/1024. Final audit asserts no document overflow, browser errors or tagged axe violations in sampled states. It does not cover every content/state combination or establish WCAG conformance.

Actually reviewed: homepage375/768/1440/1920, market375, build-new375, settings375 and light-home1440; six final contact sheets cover all twelve implemented page types at375 and1440 (.qa/screenshots/review-375-0.png through review-1440-2.png). Raw evidence/screenshots are under .qa and ignored from source control; retain controlled artifacts separately. New milestone screenshots composition-editor-375.png, group-dashboard-375.png and production-375.png were also visually reviewed historically; the production result and forms remain within the mobile viewport. Personal-tool screenshot matrices at375/768/1440/1920 were reviewed in timers-review.png and dashboard-review.png; overflow checks also320/430/1024 and sampled axe assertions pass. Physical touch and screen-reader sessions are unverified.

## Current measured visual correction

The prior design was rejected; global visual acceptance remains open. Latest master-prompt sequencing prioritizes data foundations, Build Editor and Compositions. Build Editor has three inspected correction iterations; the composition board has three corrections plus a recapture after inspection caught a loading-skeleton capture defect. See docs/design-review/ for actual reference crops, screenshots, comparisons, discrepancies and remaining source gaps.

Current implementation uses real official-renderer item icons. Earlier expressly authorised generated homepage scenes remain disclosed provisional illustrations; they do NOT satisfy the latest genuine-game-scene criterion. No new generated scene or cropped concept art is introduced in this milestone. Full permitted metadata, consumables, ability artwork/unlocks, current game mechanics and remaining page corrections are incomplete.

Latest composition fixtures cover populated5/7/20-player states at1440/390/320, save/reload and1920×1080 PNG. Hidden streamed HTML is not sufficient capture evidence: the final test requires the actual title/roster to be visible. Existing large-party drag/keyboard/permission regressions remain required. Current all-page matrix includes176 dark/light states, but sampled checks are not WCAG certification or user acceptance.

Public release remains NO-GO. Homepage authentic media, real OAuth, legal/operator, complete calculators/data and deployment/operations remain unresolved. Historical functional passes are retained without promoting them to full-product acceptance.

## Performance

One standalone Lighthouse local simulated-mobile run: performance **{perf}**, accessibility **{acc}** on the 0–100 scale. LCP **{metrics['largest-contentful-paint']}ms**, CLS **{metrics['cumulative-layout-shift']}**, TBT **{metrics['total-blocking-time']}ms**. Measured on the baseline audit container, before these collaboration and production routes; no new-route performance claim. It is not a field percentile or multi-page performance audit. Exact Lighthouse version/config in .qa/lighthouse-home.json.

Local 20-sample API measurements: {timing_text}. Exact sample definition in .qa/api-timings.json. Warm <500ms is a local regression target, not a public SLA. Field p75 and INP remain BLOCKED. The web-perf skill at /home/bttw/.agents/skills/web-perf/SKILL.md requires Chrome DevTools MCP; no such tools are configured, so that trace workflow was blocked. Standalone Lighthouse is separate evidence.

## Recommended improvements

Prioritize real OAuth/legal gates; complete equipment/ability coverage and remaining guild workflows; broader sourced recipes and calculators; moderation; action failures/dependencies/monitoring/backups; real TLS and manual accessibility. Full recommendations in PRODUCT_IMPROVEMENTS.md.

## Continuous quality / verdict

Run npm run qa:phase after every major phase, inspect new screenshots, review docs/qa-inventory.json and regenerate reports with python3 scripts/qa-reports.py. Relevant infrastructure/UI changes also require Docker/Lighthouse checks. The current container rebuild is BLOCKED by Docker socket permissions and fresh Lighthouse is BLOCKED by server bind permissions; historical measurements remain historical. See .qa/reference-extra-gates.json for current supplementary evidence. The gate retains failed/BLOCKED results and never auto-upgrades NO-GO. No public deployment recommended.
''')
(root/'PRODUCT_IMPROVEMENTS.md').write_text('''# Product improvements

## Highest value

1. **P1 compositions:** expand the tested persisted roster/editor with complete verified equipment, abilities and artwork. Preserve tested version conflicts and current-membership enforcement.
2. **P1 guilds:** extend the tested fixed-role collaboration with configurable permissions and safe logo/banner uploads. Profile/event editing, calendar exports and private-group discovery are tested.
3. **P1 economy:** sourced recipes/return/focus mechanics and licenses, upfront versus economic costs, manual/live price provenance, missing/stale propagation and saved/restored scenarios. Do not invent mechanics from generic trade arithmetic.
4. **P1 builds/community:** complete permitted item/spell picker, compatibility, costs, duplication and report/moderation workflows.

## Design follow-up

Preserve the Outpost system documented in docs/DESIGN_SYSTEM.md: Barlow display/Inter product UI/Geist Mono figures, warm copper surfaces, compact top navigation, data tables, inventory previews and schedule-first guilds. Run the176-state production design matrix after meaningful shared-style changes. Use the supplied concept for structural reviews and obtain permitted hero/card/ability assets before closing media acceptance. Complete fresh Docker/Lighthouse when environment permissions permit. Validate actual assistive technology, physical-device touch/zoom and field performance; do not replace those checks with screenshots or axe.

## UI/workflow weaknesses

Exact IDs remain a barrier outside the verified starter catalog. Preserve reusable inventory overview/slot controls and the tested starter ability picker while expanding permitted catalog coverage. Preserve manual notes honestly until catalog data exists. Preserve tested settings draft/confirmation recovery and extend field-specific errors and retry handling to remaining mutations. Preserve tested revision restoration and extend snapshot inspection and publication/visibility clear. Keep partial-release labels and remove no useful feature merely to satisfy a test.

## Simplification/maintainability

Extract Prisma read helpers from presentation, cohesive equipment/numeric field components, and typed action results. Resolve the tracked ESLint version deprecation with compatible Next peers; the passing lint command does not close that dependency issue. Keep one region source; add a server preference mutation if selector changes should persist across devices.

## Performance/operations

Add tool-page Lighthouse and real-user LCP/INP monitoring before field claims. Preserve byte/TTL/cache-identity tests, test cross-instance stampedes and real Redis recovery. Add structured source health metrics, alerts, controlled admin authorization, scheduled encrypted backups/retention and production restore/rollback drills. Health200 is not full monitoring.

## Accessibility

Retain semantic theme colors, underlined links, focusable wide tables, skip link and dismissible drawer focus. Test actual assistive technologies, physical touch and zoom. Review inline target spacing and small secondary text. Axe/Lighthouse do not certify WCAG2.2AA.

## Player needs

New players need names instead of IDs, buy-order versus sell-order explanations, sourced fee assumptions and stale/missing guidance. Advanced guild users need shared comps, mass assignment, replacement-set budgeting, rosters and safe simultaneous edits. No invented meta statistics or simulated collaboration.
''')
(root/'docs/qa-score.json').write_text(json.dumps({'overall':overall,'categories':scores,'statusCounts':counts,'verdict':'NO-GO'},indent=2)+'\n')
print(json.dumps({'requirements':sum(len(s['items']) for s in inventory),'overall':overall,'statuses':counts}))


# Current master-prompt foundation milestone supersedes historical correction notes.
for report in ['QA_REPORT.md','QA_CHECKLIST.md','BUG_TRACKER.md','PRODUCT_IMPROVEMENTS.md','RELEASE_READINESS.md']:
 p=root/report
 p.write_text(p.read_text()+"\n\n## Current development audit — 2026-10-26\n\nMaster-prompt milestone: stricter catalog integrity, bounded merged item search, source-zero/missing-timestamp handling and pending-refresh/manual-edit preservation implemented; measured build/composition/market/calculator/guild corrections, wide PNG export with bounded artwork delivery and a locally prepared pinned-action CI workflow added. Full metadata/recipes, authentic scene/ability sources, visual acceptance and production gates remain incomplete. Engineering scope and calculator gaps: docs/engineering/. Release-blocker checkpoint: direct DB EPERM isolated; additive watchlist migration passes13 disposable DB checks but remains unapplied to the existing app DB. Repository data audit181 equipment/221 combined IDs, zero current-patch verification. Manual trade thresholds/private scenarios and rolled-back serialization recovery added. Real OAuth/HTTPS setup is documented, not executed. See docs/engineering/RELEASE_BLOCKERS.md. Latest command evidence above controls test status; no full-product or competitor-parity claim. Failed second-gate logs are retained in .qa/foundations/second-gate-failed.\n")

# Current live GitHub evidence is distinct from local application gates.
for report in ['QA_REPORT.md','QA_CHECKLIST.md','BUG_TRACKER.md','PRODUCT_IMPROVEMENTS.md','RELEASE_READINESS.md']:
 p=root/report
 p.write_text(p.read_text()+"\n\n## Live GitHub provisioning — 2026-10-26\n\nAlbionOutpost/outpost and outpost-operations are private and empty. Organization/repository policies, selected-repository Actions with SHA-pinned checkout/setup-node only, read-only token defaults, fork isolation,14-day retention and Dependabot alerts/security fixes passed real API read-back. Ten fixture tests cover provisioning safety and API constraints. MFA and owner-only visibility/deletion/outsider invitations require website settings; private branch rules are blocked by the Free plan. No code upload, hosted CI, paid upgrade, full-history secret scan or deployment. See docs/deployment/GITHUB_SETUP.md and local .qa/github-live/provisioning.json. Final Node22 local phase: all ten gates PASS,127 unit/53 production browser/15 disposable DB checks; homepage screenshots inspected at375/768/1440/1920 without UI changes or acceptance upgrade. Local results do not establish hosted CI. Release NO-GO.\n")
