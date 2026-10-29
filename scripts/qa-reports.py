"""Generate current Outpost reports from reviewed scopes and recorded execution evidence."""
from pathlib import Path
import argparse
import collections
import hashlib
import json
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = {
    "core": "Core functionality", "data": "Game data and accounting",
    "security": "Security and authorization", "ui": "Interface and accessibility",
    "performance": "Performance", "code": "Code quality", "operations": "Operations",
}
INPUTS = ["docs/qa-inventory.json", "docs/qa-evidence.json", "docs/qa-bugs.json", "docs/qa-release-gates.json", "scripts/qa-reports.py"]


def read(path):
    return json.loads((ROOT / path).read_text())


def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def formatted(path, text):
    prettier = ROOT / "node_modules/prettier/bin/prettier.cjs"
    if not prettier.exists():
        raise ValueError("Install locked development dependencies before generating reports")
    return subprocess.run([shutil.which("node") or "node", str(prettier), "--stdin-filepath", path], input=text, text=True, capture_output=True, check=True).stdout


def capture_evidence():
    phase = read(".qa/phase-summary.json")
    units = re.search(r"Tests\s+(\d+) passed", (ROOT / ".qa/phase-unit.log").read_text())
    browsers = re.search(r"(\d+) passed \(", (ROOT / ".qa/phase-browser.log").read_text())
    database = read(".qa/database-final.json")
    live = [json.loads(line) for line in (ROOT / ".qa/phase-live-regions.log").read_text().splitlines() if line.startswith('{"name":')]
    if not units or not browsers or len(live) != 9:
        raise ValueError("Cannot derive complete factual QA counts from the execution logs")
    paths = [".qa/phase-summary.json", ".qa/database-final.json", ".qa/game-data-coverage.json", ".qa/repository-source-scan.json", ".qa/secret-scan.json"]
    paths += [f".qa/phase-{c['name']}.log" for c in phase["checks"] if c["status"] != "BLOCKED"]
    paths += [".qa/documentation-reconciliation/migration-state.json", ".qa/documentation-reconciliation/remote-state.json", ".qa/documentation-reconciliation/dependency-status.json", ".qa/documentation-reconciliation/visual-review.json"]
    for path in paths:
        if not (ROOT / path).is_file():
            raise ValueError(f"Missing execution evidence: {path}")
    snapshot = {
        "schema_version": 1, "phase_checked_at": phase["checkedAt"],
        "scope": "Recorded local Node22 execution; fixtures are not real OAuth, legal/design acceptance or hosted CI.",
        "checks": phase["checks"], "counts": {"unit_passed": int(units[1]), "browser_passed": int(browsers[1]), "database_passed": sum(r["passed"] for r in database["results"]), "database_total": len(database["results"]), "live_region_endpoints": len(live)},
        "game_data": read(".qa/game-data-coverage.json"),
        "migration": read(".qa/documentation-reconciliation/migration-state.json"),
        "remote": read(".qa/documentation-reconciliation/remote-state.json"),
        "dependency_maintenance": read(".qa/documentation-reconciliation/dependency-status.json"),
        "visual_review": read(".qa/documentation-reconciliation/visual-review.json"),
        "source_scan": read(".qa/repository-source-scan.json"), "bundle_scan": read(".qa/secret-scan.json"),
        "local_artifacts": [{"path": p, "sha256": digest(p), "availability": "local ignored artifact; portable summary retained here"} for p in paths],
    }
    protected = []
    for directory in ["src", "prisma", "tests", "e2e", "public", "data", ".github"]:
        protected.extend(p for p in (ROOT / directory).rglob("*") if p.is_file())
    protected.extend(ROOT / p for p in ["package.json", "package-lock.json", "next.config.ts", "playwright.config.ts", "vitest.config.ts", "tsconfig.json", "Dockerfile"] if (ROOT / p).is_file())
    snapshot["reviewed_sources"] = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(set(protected))}
    supplementary_path = ".qa/homepage-polish/supplementary.json"
    if (ROOT / supplementary_path).is_file():
        supplementary = read(supplementary_path)
        # A later phase must not silently inherit current-measurement claims.
        if supplementary.get("phaseCheckedAt") == phase["checkedAt"]:
            snapshot["supplementary"] = supplementary
            for path in [supplementary_path, ".qa/homepage-polish/lighthouse-home.json", ".qa/homepage-polish/live-market.json", ".qa/docker.json"]:
                snapshot["local_artifacts"].append({"path": path, "sha256": digest(path), "availability": "local ignored artifact; portable summary retained here"})
    (ROOT / "docs/qa-evidence.json").write_text(formatted("docs/qa-evidence.json", json.dumps(snapshot, indent=2) + "\n"))


def score(inventory):
    weights = inventory["scoring"]["weights"]
    if set(weights) != set(CATEGORIES) or sum(weights.values()) != 100:
        raise ValueError("Every category must be weighted exactly once; total must be 100")
    ic = inventory["scoring"]["implementation_credit"]
    vc = inventory["scoring"]["verification_credit"]
    result = {}
    for cat, weight in weights.items():
        rows = [r for r in inventory["items"] if r["category"] == cat and r["implementation"] != "NOT_APPLICABLE"]
        if not rows:
            raise ValueError(f"Unpopulated category: {cat}")
        count = len(rows)
        result[cat] = {"weight": weight, "scopes": count,
            "implementation": 100 * sum(ic[r["implementation"]] for r in rows) / count,
            "verification": 100 * sum(vc[r["verification"]] for r in rows) / count,
            "joint": 100 * sum(ic[r["implementation"]] * vc[r["verification"]] for r in rows) / count}
    overall = {dimension: round(sum(r[dimension] * r["weight"] / 100 for r in result.values()), 2) for dimension in ["implementation", "verification", "joint"]}
    return result, overall


def cell(value):
    return str(value).replace("|", "/").replace("\n", " ")


def links(paths):
    return ", ".join(f"[{p}]({p})" for p in paths)


def label(value):
    return {"MISSING": "NOT IMPLEMENTED", "PARTIALLY_TESTED": "PARTIALLY TESTED", "NOT_TESTED": "NOT TESTED", "NOT_APPLICABLE": "NOT APPLICABLE", "FAILED": "FAILED"}.get(value, value)


def render():
    inv, evidence, bugs, gates = [read(p) for p in INPUTS[:4]]
    rows = inv["items"]
    byid = {r["id"]: r for r in rows}
    categories, overall = score(inv)
    fingerprint = hashlib.sha256("".join(digest(p) for p in INPUTS).encode()).hexdigest()
    stamp = f"<!-- Generated by scripts/qa-reports.py; evidence={evidence['phase_checked_at']}; inputs={fingerprint} -->\n\n"
    counts = evidence["counts"]
    checktable = "| Local gate | Result | Seconds |\n| --- | --- | ---: |\n" + "".join(f"| {c['name']} | {c['status']} | {c.get('seconds', '—')} |\n" for c in evidence["checks"])
    open_gates = [g for g in gates["gates"] if byid[g["requirement"]]["implementation"] != "COMPLETE" or byid[g["requirement"]]["verification"] != "VERIFIED"]
    verdict = "NO-GO" if open_gates or any(c["status"] != "PASS" for c in evidence["checks"]) else "OWNER REVIEW REQUIRED"
    outputs = {}
    checklist = "# Outpost QA checklist\n\n" + stamp
    checklist += "Current acceptance scopes only. Implementation and verification are independent; VERIFIED applies only to the stated supported scope. PARTIAL never means full feature coverage. [Method and status definitions](docs/DOCUMENTATION.md); [legacy traceability](docs/qa-legacy-map.json).\n\n"
    for cat, title in CATEGORIES.items():
        checklist += f"## {title}\n\n| ID | Acceptance scope | Implementation | Verification | Evidence and limits |\n| --- | --- | --- | --- | --- |\n"
        for r in rows:
            if r["category"] == cat:
                detail = f"{r['verified_scope']} Remaining: {r['remaining']} {links(r['evidence'])}"
                checklist += f"| {r['id']} | {cell(r['title'])} | {label(r['implementation'])} | {label(r['verification'])} | {cell(detail)} |\n"
        checklist += "\n"
    outputs["QA_CHECKLIST.md"] = checklist
    status = "# Outpost implementation status\n\n" + stamp
    status += "Current supported workflows, separate from full-product acceptance. [Executed QA](QA_REPORT.md) and [release gates](RELEASE_READINESS.md) are authoritative for verification and release decisions.\n\n| Feature | Implementation | Verification | Supported behavior / remaining scope |\n| --- | --- | --- | --- |\n"
    for r in rows:
        if r["category"] == "core":
            status += f"| {r['title']} | {label(r['implementation'])} | {label(r['verification'])} | {cell(r['verified_scope']+' '+r['remaining'])} |\n"
    data = evidence["game_data"]
    status += f"\nThe authored catalog audit records {data['equipmentEntries']} equipment variants, {data['uniqueCombinedIds']} combined IDs and {data['currentPatchVerifiedEntries']} current-patch-verified entries. These are repository counts, not live-database or full-game coverage. [Sources and formula provenance](DATA_SOURCES.md).\n\n"
    status += "Foundation: Next.js/React/TypeScript with local PostgreSQL/Prisma and Redis, standalone Node and Cloudflare Workers/D1 runtimes. Discord provider/session code exists; genuine personal consent/session/logout checks remain separate. Current repository, hosted CI and deployment evidence is recorded in [Cloudflare delivery progress](docs/deployment/CLOUDFLARE_PORT_PROGRESS.md). [Full technical acceptance inventory](QA_CHECKLIST.md).\n\nHistorical checkpoints are preserved in [development history](docs/DEVELOPMENT_PROGRESS.md) and the [original-document archive](docs/history/README.md); they do not determine current status.\n"
    outputs["IMPLEMENTATION_STATUS.md"] = status
    qa = "# Outpost QA report\n\n" + stamp
    qa += f"Local execution: **{evidence['phase_checked_at']}**. **{sum(c['status']=='PASS' for c in evidence['checks'])}/{len(evidence['checks'])} phase gates PASS**; {counts['unit_passed']} unit tests, {counts['browser_passed']} production browser tests, {counts['database_passed']}/{counts['database_total']} disposable database checks and {counts['live_region_endpoints']} regional endpoint checks. Counts are parsed from the run artifacts in [the evidence snapshot](docs/qa-evidence.json), never typed into the report.\n\n" + checktable
    qa += "\nThe production browser suite uses real local PostgreSQL sessions and isolated source/manual-price fixtures. It covers supported persistence, duplication/restoration, favorites, guild roles/revocation, composition export, accounting, stale/missing sources and responsive states. [Journey-by-journey evidence](docs/USER_JOURNEYS.md) separates implemented steps from real OAuth and full feature acceptance. Separate live checks sample price/history/gold shape in three regions; they do not make browser fixtures live observations.\n\n"
    qa += f"Current source-pattern scan: {evidence['source_scan']['filesScanned']} candidate files, {len(evidence['source_scan']['findings'])} scoped findings. Browser configured-secret scan: {evidence['bundle_scan']['filesScanned']} files, {len(evidence['bundle_scan']['matches'])} matches. These scans exclude ignored/generated source and cannot certify Git history, absent secret values or the absence of vulnerabilities.\n\n"
    qa += "Sampled axe, keyboard/focus, overflow and screenshot checks are regression evidence, not WCAG conformance, real-device testing or owner visual acceptance. [Reviewed captures](docs/qa-evidence.json) retain their exact scope.\n\n"
    supplementary = evidence.get("supplementary")
    if supplementary:
        container, lab, live = [supplementary[key] for key in ["container", "lighthouse", "livePreview"]]
        qa += f"Current local supplementary checks: fresh Docker image smoke reports UID{container['uid']}, copied environment file absent={container['envAbsent']}, homepage HTTP{container['homeStatus']}, DB/Redis health={container['health']}. Real OAuth remains unconfigured. A separate unmocked browser preview loaded {live['sourceRows']} source observations and rendered {live['visibleRows']} city rows at390/1440; review fixture users remaining={live['remainingReviewUsers']}.\n\n"
        qa += f"One local simulated-mobile homepage Lighthouse{lab['version']} run: performance{lab['performance']}/100, accessibility{lab['accessibility']}/100, LCP{lab['lcpMs']:.1f}ms, CLS{lab['cls']:.4f}, TBT{lab['tbtMs']:.1f}ms. It samples the initial homepage, not the loaded interaction, field p75, all routes or full accessibility. Historical timings stay historical; no production throughput or visual-acceptance claim. [Polish review and measurement limits](docs/design-review/homepage/POLISH.md).\n\n"
    else:
        qa += "Historical Docker/Lighthouse/timing artifacts remain historical; this phase does not establish a current image, load capacity or field performance.\n\n"
    failed_scopes = [f"{r['id']} — {r['title']}" for r in rows if r['verification'] == 'FAILED']
    qa += "No failure in the latest local phase is hidden by a passing subset. Separately reviewed failed scopes: " + ("; ".join(failed_scopes) if failed_scopes else "none recorded") + ". External/manual checks remain BLOCKED or NOT TESTED where evidence is absent. The [latest rendered implementation review](docs/design-review/playful-ui/README.md) records the new search palette, explained tool menu, progressive region picker, real equipment composition and browser-observed route/theme transitions; earlier accessibility/reflow fixes remain in the linked history. Passing lint is distinct from dependency maintenance. No full security, legal or accessibility certification is made.\n\n"
    qa += f"Joint implementation/evidence coverage: **{overall['joint']:.2f}/100**. This is a scope-weighted checklist index, not release approval or measured product-completion percentage. [Score and independent release gates](RELEASE_READINESS.md); [methodology](docs/DOCUMENTATION.md); [current defects](BUG_TRACKER.md).\n"
    outputs["QA_REPORT.md"] = qa
    owner_note = gates.get("owner_release_approval", "Formal full-product acceptance is not recorded.")
    release = "# Outpost release readiness\n\n" + stamp + f"**{verdict} for public release.** {len(open_gates)} essential scope gates remain open. {owner_note} Local test passes do not close external or full-feature acceptance.\n\n"
    release += f"Joint implementation/evidence coverage: **{overall['joint']:.2f}/100**. Separate implementation index: **{overall['implementation']:.2f}/100**; verification index: **{overall['verification']:.2f}/100**. These are documented rubric indices, not estimates of completed work or probabilities of safety.\n\n| Category | Weight | Scopes | Implementation index | Verification index | Joint coverage |\n| --- | ---: | ---: | ---: | ---: | ---: |\n"
    for cat, r in categories.items():
        release += f"| {CATEGORIES[cat]} | {r['weight']}% | {r['scopes']} | {r['implementation']:.2f} | {r['verification']:.2f} | {r['joint']:.2f} |\n"
    release += "\nThe rubric gives COMPLETE=1, PARTIAL=0.5, MISSING=0; VERIFIED=1, PARTIALLY TESTED=0.5, FAILED/BLOCKED/NOT TESTED=0. Joint credit multiplies the two. Equal current acceptance scopes within each category; NOT APPLICABLE requires a rationale and is excluded. Final weighting is applied once. No score threshold can override a gate. [Full method and limitations](docs/DOCUMENTATION.md).\n\n## Essential release gates\n\n| Gate | Requirement | Implementation / verification | Acceptance still required |\n| --- | --- | --- | --- |\n"
    for g in gates["gates"]:
        r=byid[g["requirement"]]
        release += f"| {g['id']} | {r['id']} — {r['title']} | {label(r['implementation'])} / {label(r['verification'])} | {cell(g['acceptance'])} |\n"
    release += "\nStatus evidence is linked from the [current checklist](QA_CHECKLIST.md). Use [the prioritized plan](PROJECT_PLAN.md) for acceptance work and [operator runbooks](docs/DEPLOYMENT.md) for controlled execution. This file is the single authoritative release-blocker list. Automation can request owner review; it cannot certify legal/design quality or approve release.\n"
    outputs["RELEASE_READINESS.md"] = release
    tracker = "# Outpost bug tracker\n\n" + stamp + "Reproduced defects, technical debt and missing capabilities are distinguished. A resolved historical result stays resolved unless new evidence reproduces it. Full reproduction/expected/actual/cause records for every ID remain in [the structured defect ledger](docs/qa-bugs.json) and [the original tracker](docs/history/2026-10-26-before-reconciliation/BUG_TRACKER.md).\n\n## Current unresolved findings\n\n| ID | Severity / state | Finding | Current evidence / reproduction |\n| --- | --- | --- | --- |\n"
    for b in bugs["items"]:
        if b["status"] != "FIXED":
            tracker += f"| {b['id']} | {b['severity']} / {b['status']} | {b['title']} | {cell(b['current']+' Reproduce/inspect: '+b['reproduction']+' '+b['verification'])} {links(b['evidence'])} |\n"
    tracker += "\nBACKLOG denotes incomplete acceptance scope, not a failure of the implemented subset. External release gates are tracked once in [release readiness](RELEASE_READINESS.md). No P0 was reproduced in the cited local checks; absence of all P0 vulnerabilities is not established.\n\n## Resolved historical findings\n\n| ID | Finding | Recorded verification |\n| --- | --- | --- |\n"
    for b in bugs["items"]:
        if b["status"] == "FIXED":
            tracker += f"| {b['id']} | {b['title']} | {cell(b['verification'])} |\n"
    outputs["BUG_TRACKER.md"] = tracker
    outputs["PRODUCT_IMPROVEMENTS.md"] = "# Outpost product improvements\n\n" + stamp + "Prioritized acceptance work lives in [PROJECT_PLAN.md](PROJECT_PLAN.md); external release blockers live in [RELEASE_READINESS.md](RELEASE_READINESS.md). This document records improvement themes without a second competing status list.\n\n- Expand permitted, patch-reviewed equipment/ability/recipe coverage while retaining explicit unknowns. A recent download or a passing accounting fixture does not establish game correctness.\n- Preserve the tested build/composition/guild/favorite flows. Extend full templates, equipment sets, configurable roles, archives and source-backed costs with independent authorization/revision tests.\n- Keep numeric assumptions and observation freshness visible. Extend source/city/focus models only when provenance is reviewed; keep manual accounting usable.\n- Complete mutation draft/retry recovery beyond settings and favorites; extract remaining page-level database reads without changing behavior.\n- Continue per-page measured reference review, genuine permitted media replacement, physical-device and screen-reader sessions. Functional tests and generated artwork do not establish visual acceptance.\n- Measure current routes and staging load before performance claims. Retain bounded caches and verify cross-instance/source-failure behavior under controlled conditions.\n\n[Current defects](BUG_TRACKER.md), [calculator scope](docs/engineering/CALCULATOR_PARITY.md) and [visual reviews](docs/design-review/README.md) supply the detailed evidence.\n"
    summary = {"schema_version":2,"evidence_checked_at":evidence["phase_checked_at"],"inputs_sha256":fingerprint,"coverage_indices":overall,"categories":categories,"implementation_counts":dict(collections.Counter(r['implementation'] for r in rows)),"verification_counts":dict(collections.Counter(r['verification'] for r in rows)),"open_release_gates":len(open_gates),"verdict":verdict}
    outputs["docs/qa-score.json"] = json.dumps(summary,indent=2)+"\n"
    return {path:formatted(path,content) for path,content in outputs.items()}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh-evidence",action="store_true",help="Capture factual local execution metadata; never promotes reviewed feature statuses")
    parser.add_argument("--check",action="store_true",help="Fail if generated reports differ; does not modify files")
    args=parser.parse_args()
    if args.refresh_evidence and args.check:
        parser.error("--check is read-only; use --refresh-evidence separately")
    if args.refresh_evidence:
        capture_evidence()
    outputs=render()
    stale=[]
    for path,text in outputs.items():
        if args.check:
            if not (ROOT/path).exists() or (ROOT/path).read_text()!=text:
                stale.append(path)
        else:
            (ROOT/path).write_text(text)
    if stale:
        raise ValueError("Stale generated reports: "+", ".join(stale))
    print(json.dumps({"generated_reports":list(outputs),"check_only":args.check,"score":read('docs/qa-score.json')['coverage_indices']}))


if __name__=="__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error))
