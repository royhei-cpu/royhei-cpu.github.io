"""Catch missing chain coverage, not just working controls."""
import csv,io,json,subprocess,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parent
O=Path('/tmp/china-toys-clarity-qa');O.mkdir(exist_ok=True)
data=json.loads((R/'catalog.json').read_text())
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
  expect(page.locator('#chainCoverageGaps')).to_contain_text('X11')
  page.locator('#chainCoverageAudit summary').click()
  expect(page.locator('#chainCoverageAudit tbody tr')).to_have_count(11)
  for chain in ['SANFU · 三福','IPSTAR · 潮玩星球']:
   page.get_by_role('tab',name=chain,exact=True).click()
   expect(page.locator('#chainDetail')).to_contain_text('no captured assortment yet')
   assert page.locator('#chainDetail .chain-assortment').count()==0
  for width in [390,768,1440]:
   page.set_viewport_size({'width':width,'height':1000});page.locator('#retailer').select_option('miniso-china')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
   page.locator('.product-card').first.scroll_into_view_if_needed();page.screenshot(path=str(O/f'miniso-{width}.png'))
  assert not errors,errors
  browser.close()
finally:server.terminate()
print(json.dumps({'MINISO_official_showcase':7,'uncollected_chain_sources_explicit':8,'photos_and_csv':'pass','price_stock_release_invention':'none','runtime_errors':errors}))
