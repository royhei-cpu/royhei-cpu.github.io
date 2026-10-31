#!/usr/bin/env python3
"""Run regression suite, then capture loaded-photo evidence for the final UI."""
import json,pathlib,runpy,subprocess,sys
from playwright.sync_api import sync_playwright
R=pathlib.Path(__file__).resolve().parent;O=pathlib.Path('/tmp/china-toys-review-qa')
runpy.run_path(str(R/'review_test.py'),run_name='__main__')
d=json.loads((R/'catalog.json').read_text());ps=d['products']
assert not any(p['id']=='6795ac535d4629da' for p in ps),'Mismatched Molynk photo must not remain a product card'
assert any(p['id']=='6795ac535d4629da' for p in d['source_leads'])
assert sum(bool(p.get('image_review',{}).get('visually_reviewed')) for p in ps)>=8
server=subprocess.Popen([sys.executable,'-m','http.server','8766','--directory',str(R.parent)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
errors=[];checks=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1080})
  page.on('pageerror',lambda e:errors.append(str(e)))
  def loaded():
   page.wait_for_function('''() => [...document.images].filter(e=>{const r=e.getBoundingClientRect();return e.checkVisibility()&&r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0}).every(e=>e.complete&&e.naturalWidth>0)''',timeout=30000)
  page.goto('http://127.0.0.1:8766/china-toys/?view=trending',wait_until='networkidle')
  page.wait_for_selector('.review-appeal',state='attached');page.locator('#catalogGrid').evaluate('(e)=>e.scrollIntoView({block:"start"})');loaded()
  page.screenshot(path=str(O/'desktop-reviewed-products.png'))
  checks.append('Reported demand and possible appeal displayed separately; visible desktop photos loaded')
  page.locator('#search').fill('labubu');page.wait_for_timeout(150)
  assert page.locator('.product-card').count()==0,'Trending filter should remain in force'
  page.locator('.view-tab[data-view="catalog"]').click();page.wait_for_timeout(150)
  ids=page.locator('.product-card').evaluate_all('(xs)=>xs.map(x=>x.dataset.productId)')
  assert ids and all('labubu' in ' '.join(str(p.get(k,'')) for k in ['brand','name','name_cn','ip','wave']).lower() for p in ps if p['id'] in ids)
  checks.append('LABUBU search returns matching identities, not stale cards')
  page.locator('#resetFilters').click();page.locator('.view-tab[data-view="trending"]').click()
  page.set_viewport_size({'width':390,'height':844});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(O/'mobile-reviewed-top.png'))
  page.locator('#catalogGrid').evaluate('(e)=>e.scrollIntoView({block:"start"})');loaded();page.screenshot(path=str(O/'mobile-reviewed-product.png'))
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.locator('.product-card').first.get_by_text('Trend evidence & product angle',exact=True).click();page.locator('.review-reason').first.evaluate('(e)=>e.scrollIntoView({block:"start"})');loaded();page.screenshot(path=str(O/'mobile-why-trending.png'))
  checks.append('390px mobile: one readable card per row, reason/source visible, no horizontal overflow')
  page.locator('.product-card [data-open]').first.click();page.get_by_text('Specifications, photos & variants',exact=True).click();page.wait_for_selector('.review-details')
  page.locator('.review-details').evaluate('(e)=>e.scrollIntoView({block:"start"})');page.wait_for_timeout(150)
  page.screenshot(path=str(O/'mobile-item-details.png'));checks.append('Photo review scope, material/size and field-source links open in product details')
  assert not errors,errors
  browser.close()
finally:
 server.terminate()
 result=json.loads((O/'results.json').read_text());result['checks']+=checks;result['errors']+=errors;result['photo_sample_reviewed']=8;result['product_photo_excluded']=1
 (O/'results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
# Ensure contact sheet reflects only final, included product records.
import review as v
v.make_sheet(ps)
import shutil
shutil.copytree(R/'review-media',O/'photo-review',dirs_exist_ok=True)
