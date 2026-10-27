"""Validate current documentation structure, evidence, links and deterministic reports."""
from pathlib import Path
import argparse
import datetime
import hashlib
import importlib.util
import json
import re
import sys
import unicodedata
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
HISTORY = "docs/history/2026-10-26-before-reconciliation"
IMPLEMENTATION = {"COMPLETE", "PARTIAL", "MISSING", "NOT_APPLICABLE"}
VERIFICATION = {"VERIFIED", "PARTIALLY_TESTED", "FAILED", "BLOCKED", "NOT_TESTED", "NOT_APPLICABLE"}
CATEGORIES = {"core", "data", "security", "ui", "performance", "code", "operations"}


def validate_inventory(root, inventory):
    errors=[]
    if inventory.get("schema_version") != 2:
        errors.append("Inventory schema_version must be 2")
    ids=set(); titles=set()
    weights=inventory.get("scoring",{}).get("weights",{})
    if set(weights)!=CATEGORIES or any(not isinstance(w,(float,int)) or w<=0 for w in weights.values()) or sum(weights.values())!=100:
        errors.append("Scoring must cover every category once with positive weights summing to 100")
    expected_impl={"COMPLETE":1,"PARTIAL":0.5,"MISSING":0}
    expected_ver={"VERIFIED":1,"PARTIALLY_TESTED":0.5,"FAILED":0,"BLOCKED":0,"NOT_TESTED":0}
    if inventory.get('scoring',{}).get('implementation_credit')!=expected_impl or inventory.get('scoring',{}).get('verification_credit')!=expected_ver:
        errors.append("Scoring credit rubric differs from documented contract")
    for row in inventory.get("items",[]):
        ident=row.get("id","")
        if not re.fullmatch(r"(?:CORE|DATA|SEC|UI|PERF|CODE|OPS)-\d{3}",ident) or ident in ids:
            errors.append(f"Invalid/duplicate checklist ID: {ident}")
        ids.add(ident)
        title=re.sub(r"\W+"," ",row.get("title","").lower()).strip()
        if not title or title in titles:
            errors.append(f"Missing/duplicate acceptance title: {ident}")
        titles.add(title)
        if row.get("category") not in CATEGORIES:
            errors.append(f"Unweighted/invalid category: {ident}")
        impl,ver=row.get("implementation"),row.get("verification")
        if impl not in IMPLEMENTATION or ver not in VERIFICATION:
            errors.append(f"Invalid status dimension: {ident}")
        if impl=="MISSING" and ver in {"VERIFIED","PARTIALLY_TESTED"}:
            errors.append(f"Conflicting missing/tested implementation: {ident}")
        if (impl=="NOT_APPLICABLE" or ver=="NOT_APPLICABLE") and (impl!=ver or not row.get("not_applicable_reason")):
            errors.append(f"NOT_APPLICABLE requires matching dimensions and a rationale: {ident}")
        for field in ["verified_scope","remaining"]:
            if not row.get(field): errors.append(f"Missing {field}: {ident}")
        if not row.get("evidence"): errors.append(f"Missing evidence references: {ident}")
        for path in row.get("evidence",[]):
            if not isinstance(path,str) or not (root/path).exists() or not (root/path).resolve().is_relative_to(root.resolve()):
                errors.append(f"Missing/invalid evidence reference {ident}: {path}")
    return errors


def headings(text):
    counts={}; result=set()
    for line in re.sub(r"```.*?```","",text,flags=re.S).splitlines():
        match=re.match(r"^#{1,6}\s+(.+?)(?:\s+#+)?$",line)
        if not match: continue
        value=re.sub(r"<[^>]+>","",match[1]).lower()
        value="".join(c for c in value if c in " -_" or unicodedata.category(c)[0] in "LN")
        slug=value.replace(" ","-")
        n=counts.get(slug,0);counts[slug]=n+1
        result.add(slug+(f"-{n}" if n else ""))
    return result


def validate_markdown(root,path):
    errors=[]; raw=path.read_text()
    if path.relative_to(root).as_posix()=="docs/DEVELOPMENT_PROGRESS.md":
        raw=raw.split("## Preserved earlier checkpoints",1)[0]
    raw=re.sub(r"```.*?```","",raw,flags=re.S)
    raw=re.sub(r"<!--.*?-->","",raw,flags=re.S)
    definitions={m[1].lower():m[2] for m in re.finditer(r"^\s*\[([^\]]+)\]:\s*(\S+)",raw,re.M)}
    targets=[m[1].strip('<>') for m in re.finditer(r"!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+\"[^\"]*\")?\s*\)",raw)]
    targets.extend(definitions.values())
    for m in re.finditer(r"\[([^\]\n]+)\]\[([^\]\n]*)\]",raw):
        name=(m[2] or m[1]).lower()
        if name not in definitions:errors.append(f"{path.relative_to(root)}: undefined link reference {name}")
    for value in targets:
        uri=urlsplit(value)
        if uri.scheme or uri.netloc: continue
        target=(root/uri.path.lstrip('/') if uri.path.startswith('/') else path.parent/unquote(uri.path)).resolve() if uri.path else path.resolve()
        if not target.is_relative_to(root.resolve()) or not target.exists():
            errors.append(f"{path.relative_to(root)}: broken local link {value}");continue
        if uri.fragment and target.suffix=='.md' and not target.is_relative_to(root/HISTORY):
            if unquote(uri.fragment) not in headings(target.read_text()):
                errors.append(f"{path.relative_to(root)}: missing heading anchor {value}")
    # Backticked repository paths are root-relative references, not commands/routes/globs.
    for value in re.findall(r"(?<!`)`([^`\n]+)`(?!`)",raw):
        if re.fullmatch(r"(?:src|docs|scripts|tests|e2e|prisma|public|assets|\.github)/[\w./@\[\]-]+",value):
            if not (root/value).exists(): errors.append(f"{path.relative_to(root)}: nonexistent repository reference {value}")
    if re.search(r"\b(?:Albion Atlas|Atlas)\b",raw):
        errors.append(f"{path.relative_to(root)}: obsolete current product branding")
    return errors


def validate_evidence(root, evidence, require_local=False, max_age_days=7):
    errors=[]; warnings=[]
    try:
        time=datetime.datetime.fromisoformat(evidence['phase_checked_at'].replace('Z','+00:00'))
        age=(datetime.datetime.now(datetime.timezone.utc)-time).total_seconds()/86400
        if age>max_age_days or age < -0.01: errors.append('QA evidence timestamp is stale or in the future')
    except (KeyError,ValueError,TypeError):errors.append('Missing/invalid evidence timestamp')
    for row in evidence.get('local_artifacts',[]):
        path=root/row['path']
        if not path.is_file():
            (errors if require_local else warnings).append('Local artifact unavailable: '+row['path'])
        elif hashlib.sha256(path.read_bytes()).hexdigest()!=row['sha256']:
            errors.append('Evidence changed since report capture: '+row['path'])
    for path,sha in evidence.get('reviewed_sources',{}).items():
        if not (root/path).is_file() or hashlib.sha256((root/path).read_bytes()).hexdigest()!=sha:
            errors.append('Source changed since recorded execution/review: '+path)
    phase=root/'.qa/phase-summary.json'
    if phase.exists():
        actual=json.loads(phase.read_text())
        if actual.get('checkedAt')!=evidence.get('phase_checked_at'):
            errors.append('Latest phase timestamp differs from captured report evidence')
        if actual.get('checks')!=evidence.get('checks'):
            errors.append('Recorded phase statuses differ from execution evidence')
    for relative,pattern,key in [('.qa/phase-unit.log',r'Tests\s+(\d+) passed','unit_passed'),('.qa/phase-browser.log',r'(\d+) passed \(','browser_passed')]:
        path=root/relative
        if path.is_file():
            match=re.search(pattern,path.read_text())
            if not match or int(match[1])!=evidence.get('counts',{}).get(key):
                errors.append('Recorded count differs from actual test log: '+key)
    database=root/'.qa/database-final.json'
    if database.is_file():
        results=json.loads(database.read_text())['results']
        if sum(bool(r['passed']) for r in results)!=evidence.get('counts',{}).get('database_passed') or len(results)!=evidence.get('counts',{}).get('database_total'):
            errors.append('Recorded database counts differ from actual results')
    for key,relative in [('game_data','.qa/game-data-coverage.json'),('migration','.qa/documentation-reconciliation/migration-state.json'),('remote','.qa/documentation-reconciliation/remote-state.json'),('dependency_maintenance','.qa/documentation-reconciliation/dependency-status.json'),('visual_review','.qa/documentation-reconciliation/visual-review.json'),('source_scan','.qa/repository-source-scan.json'),('bundle_scan','.qa/secret-scan.json')]:
        path=root/relative
        if path.is_file() and json.loads(path.read_text())!=evidence.get(key):
            errors.append('Recorded review differs from actual artifact: '+key)
    live=root/'.qa/phase-live-regions.log'
    if live.is_file():
        names=[json.loads(line)['name'] for line in live.read_text().splitlines() if line.startswith('{"name":')]
        if len(set(names))!=evidence.get('counts',{}).get('live_region_endpoints') or len(names)!=len(set(names)):
            errors.append('Recorded regional endpoint count differs from actual log')
    if not evidence.get('local_artifacts') or not evidence.get('reviewed_sources'):
        errors.append('Evidence capture lacks artifact or reviewed-source fingerprints')
    return errors,warnings


def validate_api_contract(root, text):
    errors=[]
    for match in re.finditer(r'`((?:(?:GET|POST|PUT|PATCH|DELETE)/?)+) (/api/[^` ?]+)(?:\?[^`]*)?`', text):
        methods,route=match.groups()
        path=root/'src/app'/route.lstrip('/')/'route.ts'
        if not path.is_file():
            errors.append('Documented API route does not exist: '+route)
            continue
        source=path.read_text()
        for method in methods.split('/'):
            if not re.search(r'export\s+(?:const\s+|(?:async\s+)?function\s+)'+method+r'\b',source):
                errors.append('Documented API method not exported: '+method+' '+route)
    return errors


def validate(root=ROOT,require_local=False,max_age_days=7):
    errors=[];warnings=[]
    inventory=json.loads((root/'docs/qa-inventory.json').read_text())
    errors+=validate_inventory(root,inventory)
    ids={r['id'] for r in inventory['items']}
    gates=json.loads((root/'docs/qa-release-gates.json').read_text()); gateids=set()
    for gate in gates['gates']:
        if not re.fullmatch(r'REL-\d{3}',gate['id']) or gate['id'] in gateids:errors.append('Invalid/duplicate release gate ID')
        gateids.add(gate['id'])
        if gate['requirement'] not in ids or not gate.get('acceptance'):errors.append('Release gate lacks current scope/acceptance: '+gate['id'])
    if len({g['requirement'] for g in gates['gates']})!=len(gates['gates']):errors.append('Duplicated release requirement')
    legacy=json.loads((root/'docs/qa-legacy-map.json').read_text()); legacyids=set()
    for row in legacy:
        if not re.fullmatch(r'\d+\.\d{2}',row['legacy_id']) or row['legacy_id'] in legacyids:errors.append('Invalid/duplicate legacy ID')
        legacyids.add(row['legacy_id'])
        if any(i not in ids for i in row['current_scopes']):errors.append('Unknown scope in legacy traceability: '+row['legacy_id'])
    original=json.loads((root/HISTORY/'docs/qa-inventory.json').read_text())
    expected={f"{s['number']}.{n:02}" for s in original for n,_ in enumerate(s['items'],1)}
    if legacyids!=expected:errors.append('Legacy checklist IDs are missing or invented')
    bugids=set()
    for bug in json.loads((root/'docs/qa-bugs.json').read_text())['items']:
        if not re.fullmatch(r'QA-\d{3}',bug['id']) or bug['id'] in bugids:errors.append('Invalid/duplicate defect ID')
        bugids.add(bug['id'])
        if not bug.get('reproduction') or not bug.get('verification') or not bug.get('evidence'):errors.append('Defect missing reproduction/evidence: '+bug['id'])
        for p in bug.get('evidence',[]):
            if not (root/p).exists():errors.append('Missing defect evidence: '+p)
    docs=[*root.glob('*.md'),*[p for p in (root/'docs').rglob('*.md') if not p.is_relative_to(root/HISTORY)]]
    for path in docs:errors+=validate_markdown(root,path)
    errors+=validate_api_contract(root,(root/'docs/API.md').read_text())
    # Review all application branding matches, except explicitly preserved protocol identifiers.
    for path in (root/'src').rglob('*'):
        if path.suffix not in {'.ts','.tsx'}:continue
        for line in path.read_text().splitlines():
            if re.search(r'\b(?:Albion Atlas|Atlas)\b',line) and not (path.relative_to(root).as_posix()=='src/lib/groups/calendar.ts' and 'PRODID:' in line):
                errors.append('Obsolete user-facing source branding: '+str(path.relative_to(root)))
    evidence=json.loads((root/'docs/qa-evidence.json').read_text())
    e,w=validate_evidence(root,evidence,require_local,max_age_days);errors+=e;warnings+=w
    coverage=root/'docs/engineering/GAME_DATA_COVERAGE.md'
    if coverage.is_file() and f"Generated {evidence['game_data']['checkedAt']}" not in coverage.read_text():
        errors.append('Game-data coverage timestamp differs from recorded audit; run data:audit before refresh')
    for record in json.loads((root/'docs/design-review/homepage/generated-assets.json').read_text()):
        for pathkey,hashkey in [('original','originalSha256'),('optimized','optimizedSha256'),('prompt',None)]:
            path=root/record[pathkey]
            if not path.is_file() or (hashkey and hashlib.sha256(path.read_bytes()).hexdigest()!=record[hashkey]):
                errors.append('Missing/changed media provenance reference: '+record[pathkey])
    for relative,sha in json.loads((root/HISTORY/'manifest.json').read_text()).items():
        p=root/HISTORY/relative
        if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=sha:errors.append('Historical snapshot bytes changed: '+relative)
    spec=importlib.util.spec_from_file_location('outpost_reports',root/'scripts/qa-reports.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    for path,content in module.render().items():
        if not (root/path).is_file() or (root/path).read_text()!=content:errors.append('Stale/conflicting generated report: '+path)
    return {'status':'FAIL' if errors else 'PASS','markdown_files':len(docs),'current_scopes':len(ids),'legacy_ids':len(legacyids),'defect_ids':len(bugids),'errors':errors,'warnings':warnings,'limits':'Validates structured status claims and references, not natural-language truth, legal quality, semantic screenshot fidelity or external URLs.'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--require-local-evidence',action='store_true')
    parser.add_argument('--max-age-days',type=float,default=7)
    args=parser.parse_args()
    try:report=validate(require_local=args.require_local_evidence,max_age_days=args.max_age_days)
    except (ValueError,OSError,KeyError,TypeError) as error:report={'status':'FAIL','errors':[str(error)]}
    print(json.dumps(report,indent=2))
    return 0 if report['status']=='PASS' else 1

if __name__=='__main__':sys.exit(main())
