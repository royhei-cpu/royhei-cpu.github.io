"""Catch missing chain coverage, not just working controls."""
import csv,io,json,subprocess,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parent
O=Path('/tmp/china-toys-clarity-qa');O.mkdir(exist_ok=True)
data=json.loads((R/'catalog.json').read_text())
supplement=json.loads((R/'chain-assortments.json').read_text())
expected={c['nav_name']:sum(c['id'] in p['chain_ids'] for p in supplement['products']) for c in supplement['chains']}
official=sum(p['evidence_type']=='official_sale_announcement' for p in supplement['products'])
miniso_official=sum('miniso' in p['chain_ids'] and p['evidence_type']=='official_sale_announcement' for p in supplement['products'])
sample=[p for p in data['products'] if p['id'].startswith('miniso-cn-')]
assert len(sample)==7 and any(p['category']=='Squishy toys' for p in sample)
assert all(p['image_source'].startswith('https://www.miniso.cn/') and p['editorial_profile']['sources'] for p in sample)
assert all(not p.get('launch') and not p.get('sales') and all(l['price'] is None and l['available'] is None for l in p['listings']) for p in sample)
assert len({p['editorial_profile']['summary'] for p in sample})==7
server=subprocess.Popen([sys.executable,'-m','http.server','8799','--directory',str(R.parent)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
errors=[]
try:
 time.sleep(.3)
 with sync_playwright() as pw:
  browser=pw.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:8799/china-toys/',wait_until='domcontentloaded')
  expect(page.locator('#retailer option[value="miniso-china"]')).to_be_enabled()
  assert page.locator('#retailer option[value="miniso-china"]').evaluate('(e)=>e.parentElement.label').startswith('Official product showcases')
  for source in ['miniso-tmall','chain-x11','chain-kkv','chain-jiumu','chain-kule','chain-green-party','chain-sanfu','chain-ipstar']:
   expect(page.locator('#retailer option[value="'+source+'"]').first).to_have_attribute('disabled','')
  page.locator('#search').fill('a search that cannot match')
  page.locator('#retailer').select_option('miniso-china')
  expect(page.locator('#search')).to_have_value('')
  expect(page.locator('#resultsHint')).to_have_text('7 products / series')
  expect(page.locator('#retailerStatus')).to_contain_text('Official product showcase only')
  assert page.locator('.product-card').count()==7
  assert page.locator('.product-card .price-row strong').all_text_contents()==['Price not published']*7
  page.locator('.product-card .photo-button').first.scroll_into_view_if_needed()
  page.wait_for_function("[...document.querySelectorAll('.product-card img')].filter(i=>i.getBoundingClientRect().top<innerHeight).every(i=>i.complete&&i.naturalWidth>0)",timeout=45000)
  page.locator('.product-card .title-button').first.click()
  expect(page.locator('#productDialog .about-source')).to_contain_text('current store price')
  page.keyboard.press('Escape')
  with page.expect_download() as d:page.locator('#exportButton').click()
  rows=list(csv.DictReader(io.StringIO(Path(d.value.path()).read_text(encoding='utf-8-sig'))))
  assert len(rows)==7 and all(r['Image URL'] and r['Analysis sources'] for r in rows)
  page.get_by_role('tab',name='MINISO',exact=True).click()
  expect(page.locator('#chainDetail')).to_contain_text('7 official showcase entries')
  expect(page.locator('#chainDetail')).to_contain_text('Tmall inventory')
  expect(page.locator('#chainDetail a[href="https://miniso.tmall.com/"]')).to_be_visible()
  expect(page.locator('#chainCoverageGaps')).to_contain_text(f'{official} first-party sale records')
  page.locator('#chainCoverageAudit summary').click()
  expect(page.locator('#chainCoverageAudit tbody tr')).to_have_count(len(expected))
  for chain,count in expected.items():
   page.get_by_role('tab',name=chain,exact=True).click()
   expect(page.locator('.ca-product')).to_have_count(count)
   expect(page.locator('.ca-count')).to_have_text(f'{count} product / series records')
   page.locator('.ca-search').fill('no matching product here')
   expect(page.locator('.ca-product')).to_have_count(0)
   page.locator('.ca-search').fill('')
   expect(page.locator('.ca-product')).to_have_count(count)
  page.get_by_role('tab',name='52TOYS',exact=True).click()
  expect(page.locator('.ca-product')).to_have_count(expected['52TOYS'])
  for reference in supplement['brand_release_references']:
   assert page.locator('[data-product-id="'+reference['id']+'"]').count()==0
  page.locator('.ca-evidence').select_option('official_sale_announcement')
  expect(page.locator('.ca-product')).to_have_count(sum('52toys' in p['chain_ids'] and p['evidence_type']=='official_sale_announcement' for p in supplement['products']))
  assert len(supplement['brand_release_references'])>=5
  page.get_by_role('tab',name='MINISO',exact=True).click()
  page.locator('.ca-evidence').select_option('official_sale_announcement')
  expect(page.locator('.ca-product')).to_have_count(miniso_official)
  expect(page.locator('.ca-secondary')).to_have_count(0)
  page.locator('.ca-evidence').select_option('secondary_flagship_report')
  expect(page.locator('.ca-product')).to_have_count(sum('miniso' in p['chain_ids'] and p['evidence_type']=='secondary_flagship_report' for p in supplement['products']))
  page.goto('http://127.0.0.1:8799/china-toys/?chain=x11#retailChains',wait_until='domcontentloaded')
  expect(page.locator('#retailChains')).to_have_attribute('data-selected-chain','x11')
  expect(page.locator('.ca-product')).to_have_count(expected['X11'])
  for chain,date in [('March Monster · 三月兽','2026-01-16'),('X11','2026-01-17'),('TOP TOY','2026-01-23')]:
   page.get_by_role('tab',name=chain,exact=True).click()
   expect(page.locator('[data-product-id="one-piece-paldolce-dessert"] .ca-date')).to_have_text('Chain release: '+date)
  page.get_by_role('tab',name='TOYCITY · 玩具城市',exact=True).click()
  expect(page.locator('.ca-photo-error')).to_have_count(sum('toycity' in p['chain_ids'] and not p['image'] for p in supplement['products']))
  assert page.locator('img[src="null"]').count()==0
  page.get_by_role('tab',name='KKV',exact=True).click()
  page.locator('.ca-evidence').select_option('secondary_flagship_report')
  expect(page.locator('[data-product-id="kkv-reported-chimitan-food"]')).to_contain_text('CHIMITAN')
  for width in [390,768,1440]:
   page.set_viewport_size({'width':width,'height':1000});page.locator('#retailer').select_option('miniso-china')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
   page.locator('.product-card').first.scroll_into_view_if_needed();page.screenshot(path=str(O/f'miniso-{width}.png'))
  assert not errors,errors
  browser.close()
finally:server.terminate()
print(json.dumps({'MINISO_official_showcase':7,'chain_sources_reviewed':len(expected),'first_party_records':official,'secondary_reports':sum(p['evidence_type']=='secondary_flagship_report' for p in supplement['products']),'photos_and_csv':'pass','price_stock_release_invention':'none','runtime_errors':errors}))
