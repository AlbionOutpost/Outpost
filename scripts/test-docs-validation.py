"""Focused regression tests for documentation validation and partial-credit scoring."""
from pathlib import Path
import copy
import datetime
import hashlib
import importlib.util
import json
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
def load(name,filename):
 spec=importlib.util.spec_from_file_location(name,ROOT/filename)
 module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
validator=load('docs_validator','scripts/docs-validate.py')
reports=load('qa_reports','scripts/qa-reports.py')

class DocumentationValidation(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
  (self.root/'proof.ts').write_text('evidence')
  self.inventory={'schema_version':2,'scoring':{'weights':{'core':25,'data':20,'security':20,'ui':15,'performance':10,'code':5,'operations':5},'implementation_credit':{'COMPLETE':1,'PARTIAL':0.5,'MISSING':0},'verification_credit':{'VERIFIED':1,'PARTIALLY_TESTED':0.5,'FAILED':0,'BLOCKED':0,'NOT_TESTED':0}},'items':[{'id':'CORE-001','category':'core','title':'Supported scope','implementation':'PARTIAL','verification':'VERIFIED','verified_scope':'A tested subset','remaining':'More work','evidence':['proof.ts']}]}
 def tearDown(self):self.temp.cleanup()
 def errors(self):return validator.validate_inventory(self.root,self.inventory)
 def test_supported_partial_is_valid(self):self.assertEqual(self.errors(),[])
 def test_duplicate_ids_and_titles_fail(self):
  self.inventory['items']*=2;self.assertTrue(any('duplicate' in e for e in self.errors()))
 def test_missing_cannot_be_verified(self):
  self.inventory['items'][0]['implementation']='MISSING';self.assertTrue(any('Conflicting' in e for e in self.errors()))
 def test_missing_evidence_fails(self):
  self.inventory['items'][0]['evidence']=['missing.ts'];self.assertTrue(any('evidence' in e for e in self.errors()))
 def test_unweighted_correctness_category_fails(self):
  self.inventory['items'][0]['category']='correctness';self.assertTrue(any('category' in e for e in self.errors()))
 def test_na_requires_reason(self):
  self.inventory['items'][0].update(implementation='NOT_APPLICABLE',verification='NOT_APPLICABLE');self.assertTrue(any('rationale' in e for e in self.errors()))
 def test_links_anchors_and_inline_paths(self):
  p=self.root/'README.md';p.write_text('# Outpost\n\n[bad](gone.md) [anchor](#absent) `src/no.ts`\n')
  errors=validator.validate_markdown(self.root,p);self.assertEqual(len(errors),3)
 def test_valid_reference_links_and_heading(self):
  p=self.root/'README.md';p.write_text('# Outpost\n\n[here][self]\n\n[self]: #outpost\n');self.assertEqual(validator.validate_markdown(self.root,p),[])
 def test_nonexistent_api_route_and_method_fail(self):
  path=self.root/'src/app/api/timers/[id]';path.mkdir(parents=True);(path/'route.ts').write_text('export const PATCH = handler;')
  self.assertEqual(len(validator.validate_api_contract(self.root,'`PUT /api/timers/[id]` `GET /api/missing`')),2)
 def test_existing_api_method_passes(self):
  path=self.root/'src/app/api/health';path.mkdir(parents=True);(path/'route.ts').write_text('export async function GET() {}')
  self.assertEqual(validator.validate_api_contract(self.root,'`GET /api/health`'),[])
 def test_obsolete_branding_fails(self):
  p=self.root/'README.md';p.write_text('# Albion Atlas\n');self.assertTrue(validator.validate_markdown(self.root,p))
 def test_changed_and_missing_artifacts_fail_strict_mode(self):
  evidence={'phase_checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'local_artifacts':[{'path':'missing.log','sha256':'0'*64}],'reviewed_sources':{'proof.ts':'0'*64}}
  errors,_=validator.validate_evidence(self.root,evidence,True);self.assertEqual(len(errors),2)
 def test_stale_timestamp_fails(self):
  evidence={'phase_checked_at':'2000-01-01T00:00:00Z','local_artifacts':[],'reviewed_sources':{}}
  self.assertTrue(any('stale' in e for e in validator.validate_evidence(self.root,evidence)[0]))
 def test_manually_changed_test_count_is_rejected(self):
  (self.root/'.qa').mkdir();(self.root/'.qa/phase-unit.log').write_text('Tests 2 passed')
  evidence={'phase_checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'counts':{'unit_passed':3}}
  self.assertTrue(any('actual test log' in e for e in validator.validate_evidence(self.root,evidence)[0]))
 def test_passing_summary_cannot_hide_different_phase_statuses(self):
  (self.root/'.qa').mkdir();when=datetime.datetime.now(datetime.timezone.utc).isoformat()
  (self.root/'.qa/phase-summary.json').write_text(json.dumps({'checkedAt':when,'checks':[{'name':'build','status':'FAIL'}]}))
  evidence={'phase_checked_at':when,'checks':[{'name':'build','status':'PASS'}]}
  self.assertTrue(any('phase statuses' in e for e in validator.validate_evidence(self.root,evidence)[0]))
 def test_joint_credit_is_not_full_for_partial_or_blocked(self):
  inv=copy.deepcopy(self.inventory);inv['items']=[]
  for n,cat in enumerate(inv['scoring']['weights']):
   row=copy.deepcopy(self.inventory['items'][0]);row.update(id=f'CORE-{n+1:03}',category=cat,title=cat);inv['items'].append(row)
  _,overall=reports.score(inv);self.assertEqual(overall['joint'],50)
  for row in inv['items']:row['verification']='BLOCKED'
  _,overall=reports.score(inv);self.assertEqual(overall['joint'],0);self.assertEqual(overall['implementation'],50)
 def test_empty_or_unweighted_categories_cannot_silently_score(self):
  with self.assertRaises(ValueError):reports.score(self.inventory)
  self.inventory['scoring']['weights']['correctness']=1
  with self.assertRaises(ValueError):reports.score(self.inventory)

if __name__=='__main__':unittest.main()
