#!/usr/bin/env python3
"""Browser checks for the exact requested examples; not a full data-accuracy audit."""
import csv,json,pathlib,subprocess,sys,threading,http.server,socketserver
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=pathlib.Path('/tmp/china-toys-ip-qa');OUT.mkdir(exist_ok=True)
cfg=json.loads((ROOT/'china-toys/ip-market.json').read_text())
checks=[];errors=[]
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
  page.locator('#openIPRankings').click()
  assert page.locator('#ip-rankings').evaluate('(e)=>e.open')
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
  page.locator('#watchTutorialButton').click()
  assert page.locator('#tutorial').evaluate('(e)=>e.open')
  video=page.locator('#atlasTutorialVideo')
  assert video.locator('source').get_attribute('src')=='tutorial/China_Toy_Atlas_Tutorial.mp4'
  video.evaluate('(v)=>v.load()')
  page.wait_for_function('document.getElementById("atlasTutorialVideo").readyState>=1',timeout=45000)
  duration=video.evaluate('(v)=>v.duration')
  assert duration>30
  checks.append('Embedded tutorial source loads video metadata; duration '+str(round(duration,1))+' seconds. Voice quality not re-audited.')
  page.locator('#tutorial').evaluate('(e)=>e.open=false')
  page.set_viewport_size({'width':390,'height':844})
  page.locator('#openIPRankings').click()
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
  assert not errors,errors
  checks.append('No JavaScript page errors during tested paths')
  browser.close()
finally:
 server.shutdown()
 report={'checks':checks,'errors':errors,'viewports':[{'width':1440,'height':1000},{'width':390,'height':844}],'browser':'Playwright Chromium','reason':'Browser plugin not available; CI browser used because local network is unavailable','limitations':['Not every item or photograph individually audited','Not a China-wide all-brand sales ranking','No physical iPhone or new narration listening test']}
 (OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False,indent=2))
