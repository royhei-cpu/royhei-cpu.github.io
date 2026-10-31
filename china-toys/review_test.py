#!/usr/bin/env python3
"""UI regression checks on final reviewed data. Screenshots are CI artifacts, not proof of every SKU."""
import json,pathlib,subprocess,sys,time,shutil
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent;OUT=pathlib.Path('/tmp/china-toys-review-qa');OUT.mkdir(exist_ok=True)
server=subprocess.Popen([sys.executable,'-m','http.server','8765','--directory',str(ROOT.parent)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
checks=[];errors=[];data=json.loads((ROOT/'catalog.json').read_text())
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1080},device_scale_factor=1)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8765/china-toys/',wait_until='networkidle');page.wait_for_selector('.product-card')
  assert page.locator('.product-card').count()==24
  assert page.locator('#brandCoverageReview').count()==1
  assert page.locator('#weeklyOverview').is_visible()
  assert 'what changed this week' in page.locator('#weeklyOverview').inner_text().lower()
  page.screenshot(path=str(OUT/'desktop-top.png'))
  checks.append('Page, weekly update panel, brand coverage control and 24-card pagination render')
  page.locator('.view-tab[data-view="trending"]').click();page.wait_for_selector('.review-reason',state='attached');page.locator('.product-card').first.get_by_text('Trend evidence & product angle',exact=True).click()
  assert page.locator('.review-reason').count()>0
  page.locator('#catalogGrid').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'desktop-trend-reasons.png'))
  checks.append('Trending cards contain dated reason and direct evidence link')
  target=page.locator('.product-card').filter(has_text='Sweet Dreams Forecast').first
  if target.count():target.locator('[data-open]').first.click()
  else:page.locator('.product-card [data-open]').first.click()
  page.get_by_text('Specifications, photos & variants',exact=True).click();page.wait_for_selector('.review-details');assert page.locator('.review-details h3').count()>=2
  assert page.locator('#productDialog').evaluate('(e)=>e.open')
  page.screenshot(path=str(OUT/'product-specifications.png'))
  checks.append('Product detail exposes specifications, photo-check scope and source links')
  page.locator('#closeProduct').click()
  page.locator('#retailer').select_option('jotoys-official');page.wait_for_timeout(100)
  assert page.locator('.product-card').count()>0
  assert 'JOTOYS' in page.locator('#resultsTitle').inner_text()
  page.locator('.product-card [data-open]').first.click();page.get_by_text('Specifications, photos & variants',exact=True).click();page.wait_for_selector('.review-options')
  page.locator('.review-options summary').first.click();assert page.locator('.review-options table').first.is_visible()
  page.locator('#closeProduct').click();checks.append('JOTOYS retailer filter and its per-variant price/options table work')
  page.locator('#resetFilters').click();page.locator('#search').fill('labubu');page.wait_for_timeout(100)
  assert page.locator('.product-card').count()>0
  assert all('labubu' in t.lower() or 'labubu' in page.locator('#search').input_value().lower() for t in page.locator('.product-title').all_text_contents())
  page.locator('#resetFilters').click();page.locator('#category').select_option('Squishy toys');page.wait_for_timeout(100)
  assert page.locator('.product-card').count()>0
  page.locator('.save-button').first.click();assert page.locator('#savedCount').inner_text()=='1'
  with page.expect_download() as dl:page.locator('#exportButton').click()
  assert dl.value.suggested_filename.endswith('.csv');checks.append('Search, squishy filter, shortlist and filtered CSV export respond')
  page.locator('#resetFilters').click();page.locator('#brandCoverageReview summary').first.click()
  assert page.locator('.review-table tbody tr').count()==len(data['brand_checklist'])
  assert 'Missing' in page.locator('#brandCoverageReview').inner_text()
  page.screenshot(path=str(OUT/'brand-coverage.png'));checks.append('Every priority brand has an explicit partial/missing coverage row')
  page.locator('#brandCoverageReview summary').first.click()
  page.set_viewport_size({'width':390,'height':844});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/'mobile-top.png'))
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.locator('.view-tab[data-view="trending"]').click();page.locator('#catalogGrid').evaluate('(e)=>e.scrollIntoView({block:"start"})');page.wait_for_timeout(300)
  page.locator('.product-card').first.get_by_text('Trend evidence & product angle',exact=True).click();page.screenshot(path=str(OUT/'mobile-trend-card.png'));assert page.locator('.review-reason').first.is_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  checks.append('390px mobile view: no horizontal overflow; trend reasons visible')
  visible=page.evaluate('''() => [...document.images].filter(e=>{const r=e.getBoundingClientRect();return e.checkVisibility()&&r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0}).map(e=>({src:e.src,complete:e.complete,width:e.naturalWidth}))''')
  assert all(x['complete'] and x['width'] for x in visible),visible
  checks.append('All product photos in the final tested viewport decoded successfully')
  assert not errors,errors;checks.append('No JavaScript runtime errors in the tested flows')
  browser.close()
finally:
 server.terminate();(OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'viewports':[[1440,1080],[390,844]],'scope':'Interface and file-level checks; not a full product accuracy audit'},indent=2));print(json.dumps({'checks':checks,'errors':errors},indent=2))
# Small reproducible local workspace, with real photos for the inspected sample.
work=OUT/'workspace'/'china-toys';work.mkdir(parents=True,exist_ok=True)
for p in ROOT.glob('*'):
 if p.is_file() and p.suffix in ('.json','.js','.css','.html','.py','.csv','.md'):shutil.copy2(p,work/p.name)
(work/'images').mkdir(exist_ok=True)
ids={p['id'] for p in data['products'][:120]}
ids.update(p['id'] for p in data['products'] if p.get('trend') or p.get('china_price') or any(l.get('source_id')=='jotoys-official' for l in p['listings']))
for p in data['products']:
 if p['id'] in ids and (ROOT/p['image']).is_file():shutil.copy2(ROOT/p['image'],work/p['image'])
if (ROOT/'review-media').exists():shutil.copytree(ROOT/'review-media',OUT/'photo-review',dirs_exist_ok=True)
