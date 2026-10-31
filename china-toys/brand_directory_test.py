#!/usr/bin/env python3
"""Reconcile every label and test real directory filters, CSV and navigation."""
import csv,io,json,subprocess,sys,time
from collections import Counter
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parent
D=json.loads((R/'brand-directory-data.json').read_text())
C=json.loads((R/'catalog.json').read_text())
expected=Counter(p['brand'] for p in C['products'])
actual={l['name']:l['count'] for e in D['entries'] for l in e['labels']}
assert actual==dict(expected)
assert sum(e['count'] for e in D['entries'])==len(C['products'])
assert len({e['id'] for e in D['entries']})==len(D['entries'])
assert all(e.get('source','').startswith('https://') for e in D['entries'] if e['kind'] in ['brand','industry_brand','supplier'])
O=Path('/tmp/china-toys-china-desk-qa');O.mkdir(exist_ok=True)
server=subprocess.Popen([sys.executable,'-m','http.server','8798','--directory',str(R.parent)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
checks=[];errors=[]
try:
 time.sleep(.4)
 with sync_playwright() as pw:
  b=pw.chromium.launch();p=b.new_page(viewport={'width':1440,'height':1000});p.on('pageerror',lambda e:errors.append(str(e)))
  root='http://127.0.0.1:8798/china-toys/'
  p.goto(root+'brands.html',wait_until='networkidle')
  assert p.locator('.brand-card').count()==24
  expect(p.locator('#directoryStats')).to_contain_text(str(D['catalog_labels']))
  p.locator('#directorySearch').fill('TOP TOY')
  expect(p.locator('.brand-card h3')).to_have_text('TOP TOY')
  p.locator('.brand-card a.browse').click()
  expect(p.locator('#resultsTitle')).to_have_text('TOP TOY')
  expect(p.locator('#resultsHint')).to_have_text(str(expected['TOP TOY'])+' products / series')
  p.locator('.atlas-directory-link').click()
  p.locator('#directorySearch').fill('TeDou')
  expect(p.locator('.brand-card h3')).to_have_text('TeDou')
  expect(p.locator('.brand-count')).to_contain_text('not yet captured')
  assert p.locator('.brand-card a.browse').count()==0
  p.locator('#directoryReset').click()
  p.locator('#directoryTabs [data-tab="catalog"]').click()
  p.locator('#directorySearch').fill('Lisa')
  assert p.locator('.brand-card').count()>0
  with p.expect_download() as dl:p.locator('#exportDirectory').click()
  rows=list(csv.DictReader(io.StringIO(Path(dl.value.path()).read_text(encoding='utf-8-sig'))))
  assert rows and all('lisa' in r['Name'].lower() for r in rows)
  assert any(r['Example photo URL'] for r in rows)
  p.locator('#directoryReset').click()
  p.locator('#directoryTabs [data-tab="supplier"]').click()
  expect(p.locator('#directoryHint')).to_contain_text(str(D['counts']['supplier']))
  p.locator('#directoryTopic').select_option('squishy')
  assert p.locator('.brand-card').count()>0
  assert p.locator('.brand-card a.browse').count()==0
  checks.append('All catalog names reconciled; TOP TOY opens matching products; missing TeDou listings do not open empty results; filtered CSV includes photo URLs; supplier and squishy views')
  for width in [390,768,1440]:
   p.set_viewport_size({'width':width,'height':1000})
   p.goto(root+'brands.html',wait_until='networkidle')
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
   p.screenshot(path=str(O/f'brand-directory-{width}.png'))
   p.locator('#directoryNext').click()
   expect(p.locator('#directoryPage')).to_contain_text('Page 2')
  p.goto(root+'research.html#trends',wait_until='networkidle')
  p.locator('.atlas-directory-link').click()
  expect(p.locator('#directoryTitle')).to_have_text('Brand & maker directory')
  assert not errors,errors
  checks.append('Phone, tablet and desktop fit; pagination works; research page opens the full directory')
  b.close()
finally:
 server.terminate()
 (O/'brand-directory-results.json').write_text(json.dumps({'checks':checks,'errors':errors,'labels':len(actual),'records':sum(actual.values())},indent=2))
 print(json.dumps({'checks':checks,'errors':errors,'labels':len(actual),'records':sum(actual.values())},indent=2))
