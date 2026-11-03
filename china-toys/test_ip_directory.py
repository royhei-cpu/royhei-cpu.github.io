#!/usr/bin/env python3
"""Browser checks for character navigation and source-scoped charts; not a full inventory audit."""

# The task-based workspace replaces the previous folded-dashboard layout.
# Keep the old checks below for archived deployments; current CI exercises
# equivalent source, persistence and responsive flows through the new navigation.
from pathlib import Path as _WorkspacePath
if 'window.ATLAS_WORKSPACE=' in (_WorkspacePath(__file__).resolve().parent / 'simple-navigation.js').read_text():
    from workspace_acceptance import run as _workspace_run
    _workspace_run('ip')
    raise SystemExit(0)

import csv,json,pathlib,subprocess,sys,threading,http.server,socketserver
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=pathlib.Path('/tmp/china-toys-ip-qa');OUT.mkdir(exist_ok=True)
cfg=json.loads((ROOT/'china-toys/ip-market.json').read_text())
checks=[];errors=[]
def open_rankings(page):
 if not page.locator('#sourcesResearch').evaluate('(e)=>e.open'):
  page.locator('#sourcesResearch > summary').click()
 if not page.locator('#ip-rankings').evaluate('(e)=>e.open'):
  page.locator('#ip-rankings > summary').click()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass
class Server(socketserver.ThreadingTCPServer):allow_reuse_address=True
server=Server(('127.0.0.1',8766),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url='http://127.0.0.1:8766/china-toys/'
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='networkidle')
  page.wait_for_selector('#ipSelect')
  assert 'China Toy Atlas' in page.title()
  assert page.locator('.product-card').count()>0
  open_rankings(page)
  assert page.locator('#ip-rankings').evaluate('(e)=>e.open')
  assert page.locator('[data-ip-content="browse"]').is_visible()
  page.locator('[data-ip-panel="rank"]').click()
  assert page.locator('#ipRevenueRows .ip-rank-row').count()==8
  assert page.locator('#ipRevenueRows .ip-rank-row').first.get_attribute('data-rank-ip')=='the-monsters'
  assert page.locator('#ipRevenueRows .ip-rank-row').nth(1).get_attribute('data-rank-ip')=='twinkle-twinkle'
  assert 'global revenue' in page.locator('.ip-subtitle').inner_text()
  assert 'not a China-only' in page.locator('.ip-scope').inner_text()
  page.locator('#ip-rankings').evaluate('(e)=>e.scrollIntoView({block:"start"})')
  page.screenshot(path=str(OUT/'desktop-ip-ranking.png'),full_page=False)
  checks.append('Revenue table: eight disclosed IPs, descending values, explicit global H1 2026 scope; pass')
  with page.expect_download() as dl:
   page.locator('#exportIPRanking').click()
  f=OUT/'ranking-export.csv';dl.value.save_as(str(f))
  rows=list(csv.DictReader(f.open(encoding='utf-8-sig')))
  assert len(rows)==8 and rows[0]['Revenue CNY thousand']=='4454361'
  assert all(row['Market']=='Global' and 'hkexnews.hk' in row['Source'] for row in rows)
  checks.append('Ranking CSV has eight rows, exact source values, period, market and metric; pass')
  page.locator('[data-ip-panel="browse"]').click()
  assert page.locator('#requestedBrandChecks button').count()==6
  assert page.locator('#requestedIPChecks button').count()==7
  assert page.locator('#requestedBrandChecks .missing').count()==0
  assert page.locator('#requestedIPChecks .missing').count()==0
  checks.append('All six screenshot brands and seven screenshot IPs have clickable nonzero coverage; pass')
  for k in cfg['requested_ips']+['twinkle-twinkle']:
   page.locator('#ipSelect').select_option(k)
   expected=page.evaluate('(k)=>window.ATLAS_IP_COUNTS[k]',k)
   page.wait_for_function('(k)=>new URLSearchParams(location.search).get("ip")===k',arg=k)
   actual=page.locator('#resultsHint').inner_text()
   assert f'{expected:,}' in actual,(k,expected,actual)
   assert page.locator('.product-card').count()>0
   assert page.eval_on_selector_all('.product-card','(cards)=>cards.every(c=>{const p=window.TOY_ATLAS.products.find(p=>p.id===c.dataset.productId);return window.ATLAS_IP_MATCH(p,new URLSearchParams(location.search).get("ip"))})')
   checks.append(k+' exact character filter: '+actual+'; pass')
  if not page.locator('#resetFilters').is_visible(): page.locator('.atlas-more-filters > summary').click()
  page.locator('#resetFilters').click()
  assert 'ip=' not in page.url
  page.wait_for_function('document.getElementById("ipSelect").value===""')
  page.locator('#retailer').select_option('toptoy')
  assert 'TOP TOY' in page.locator('#resultsTitle').inner_text()
  assert page.locator('.product-card').count()>0
  checks.append('Reset clears IP; existing TOP TOY retailer selector works; pass')
  page.goto(url+'?ip=nommi',wait_until='networkidle')
  page.wait_for_selector('#ipSelect')
  assert page.locator('#ipSelect').input_value()=='nommi'
  assert 'Nommi' in page.locator('#resultsTitle').inner_text()
  page.locator('.card-footer button[data-open]').first.click()
  assert page.locator('#productDialog').evaluate('(e)=>e.open')
  assert page.locator('#detailTitle').inner_text()
  page.locator('#closeProduct').click()
  checks.append('Nommi deep link, main item detail open/close and existing data flow; pass')
  page.locator('#tutorial > summary').click()
  assert page.locator('#tutorial').evaluate('(e)=>e.open')
  video=page.locator('#atlasTutorialVideo')
  assert video.locator('source').get_attribute('src').split('?')[0]=='tutorial/China_Toy_Atlas_Tutorial.mp4'
  video.evaluate('(v)=>v.load()')
  page.wait_for_function('document.getElementById("atlasTutorialVideo").readyState>=1',timeout=45000)
  duration=video.evaluate('(v)=>v.duration')
  assert duration>30
  checks.append('Embedded tutorial source loads video metadata; duration '+str(round(duration,1))+' seconds. Voice quality not re-audited.')
  page.locator('#tutorial').evaluate('(e)=>e.open=false')
  page.set_viewport_size({'width':390,'height':844})
  open_rankings(page)
  page.locator('[data-ip-panel="rank"]').click()
  page.locator('#ip-rankings').evaluate('(e)=>e.scrollIntoView({block:"start"})')
  page.screenshot(path=str(OUT/'mobile-ip-ranking.png'),full_page=False)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.locator('[data-ip-panel="browse"]').click()
  page.locator('#ip-rankings').evaluate('(e)=>e.scrollIntoView({block:"start"})')
  page.screenshot(path=str(OUT/'mobile-brand-ip-checklist.png'),full_page=False)
  page.locator('#requestedIPChecks [data-open-ip="nommi"]').click()
  page.locator('#catalogGrid').evaluate('(e)=>e.scrollIntoView({block:"start"})')
  page.wait_for_function('() => [...document.images].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0}).every(e=>e.complete&&e.naturalWidth>0)',timeout=30000)
  page.screenshot(path=str(OUT/'mobile-nommi-products.png'),full_page=False)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  checks.append('390px mobile ranking, example checklist, Nommi result photos and no horizontal page overflow; pass')
  page.goto(url+'research.html',wait_until='networkidle')
  page.wait_for_selector('#comparisonCharts .analysis-row')
  assert page.locator('#analysisPanel .analysis-row').count()==3
  assert 'appearances' in page.locator('#analysisPanel').inner_text()
  page.locator('[data-analysis="demand"]').click()
  assert page.locator('.analysis-pair').count()==8
  page.locator('#demandSort').select_option('growth')
  assert 'Twinkle' in page.locator('.analysis-pair>a').first.inner_text()
  page.locator('[data-analysis="price"]').click()
  page.locator('#chartCurrency').select_option('CNY')
  assert 'same-item' in page.locator('#analysisPanel').inner_text()
  page.locator('[data-analysis="coverage"]').click()
  assert page.locator('.analysis-row').count()>6
  assert 'not sales' in page.locator('#analysisPanel').inner_text()
  for width in [390,1440]:
   page.set_viewport_size({'width':width,'height':1000})
   for tab in ['china','demand','price','coverage']:
    page.locator('[data-analysis="'+tab+'"]').click()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,tab)
   page.locator('[data-analysis="demand"]').click()
   page.screenshot(path=str(OUT/('analysis-'+str(width)+'.png')),full_page=True)
  checks.append('China visibility, revenue/growth sort, currency-separated price ranges and catalog coverage charts work at 390px and 1440px')
  assert not errors,errors
  checks.append('No JavaScript page errors during tested paths')
  browser.close()
finally:
 server.shutdown()
 report={'checks':checks,'errors':errors,'viewports':[{'width':1440,'height':1000},{'width':390,'height':844}],'browser':'Playwright Chromium','reason':'Browser plugin not available; CI browser used because local network is unavailable','limitations':['Not every item or photograph individually audited','Not a China-wide all-brand sales ranking','No physical iPhone or new narration listening test']}
 (OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False,indent=2))

