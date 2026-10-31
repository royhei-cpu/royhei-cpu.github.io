"""Exercise concise cards, real navigation, exports and mute persistence."""
import csv,io,json,subprocess,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parent
O=Path('/tmp/china-toys-clarity-qa');O.mkdir(exist_ok=True)
server=subprocess.Popen([sys.executable,'-m','http.server','8797','--directory',str(R.parent)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
errors=[];checks=[]
try:
 time.sleep(.3)
 with sync_playwright() as pw:
  browser=pw.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
  root='http://127.0.0.1:8797/china-toys/'
  page.goto(root,wait_until='domcontentloaded')
  expect(page.locator('.product-card[data-clean-card="1"]').first).to_be_visible()
  audit=page.evaluate('''() => ({total:TOY_ATLAS.products.length, reviewed:ATLAS_ITEM_INSIGHTS_COUNT, missing:TOY_ATLAS.products.filter(p=>{const x=ATLAS_ITEM_INSIGHTS(p);return !x.summary||!x.angle||!x.question}).length})''')
  assert audit['missing']==0 and audit['reviewed']==17,audit
  expect(page.locator('#atlasBrandNav').get_by_role('link',name='Brands & makers')).to_be_visible()
  # A real brand change must clear restrictive search and land on products.
  page.locator('#search').fill('a deliberately impossible product')
  page.locator('#brandSelect').select_option('POP MART')
  expect(page.locator('#search')).to_have_value('')
  expect(page.locator('#resultsTitle')).to_have_text('POP MART')
  expect(page.locator('.product-card').first).to_be_visible()
  # First-row prices should be scannable without traversing long descriptions.
  metrics=page.locator('.product-card').first.evaluate('''e => {const r=e.getBoundingClientRect(),p=e.querySelector('.price-row').getBoundingClientRect();return {priceOffset:p.top-r.top,photoRatio:e.querySelector('.photo-button').getBoundingClientRect().width/e.querySelector('.photo-button').getBoundingClientRect().height}}''')
  assert metrics['priceOffset']<520 and metrics['photoRatio']>1.3,metrics
  assert page.evaluate('''() => ['ip-rankings','openIPRankings','chinaIntelligencePanel','tutorial'].every(id=>{const e=document.getElementById(id);return !e||!!(document.getElementById('results').compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING)})''')
  assert page.evaluate('''() => !ATLAS_ITEM_INSIGHTS({name:'Test',details:{material:'PVC | 100% authentic POP MART'}}).summary.includes('authentic')''')
  checks.append('Price visible within 520px of card top; landscape photos; research follows products; seller authenticity claims excluded from factual overview')
  page.locator('#search').fill('Secret Theatre')
  card=page.locator('.product-card').filter(has_text='Secret Theatre').first
  expect(card.locator('.item-overview')).to_contain_text('animal costumes')
  assert card.locator('.card-facts>.fact').count()<=4
  expect(card.locator('.review-reason')).not_to_be_visible()
  card.get_by_text('Trend evidence & product angle',exact=True).click()
  expect(card.locator('.review-reason')).to_be_visible()
  card.locator('.title-button').click()
  expect(page.locator('#productDialog')).to_be_visible()
  expect(page.locator('.about-source')).to_contain_text('animal costumes')
  expect(page.locator('.review-details')).not_to_be_visible()
  page.get_by_text('Specifications, photos & variants',exact=True).click()
  expect(page.locator('.review-details')).to_be_visible()
  page.keyboard.press('Escape')
  with page.expect_download() as download:page.locator('#exportButton').click()
  rows=list(csv.DictReader(io.StringIO(Path(download.value.path()).read_text(encoding='utf-8-sig'))))
  assert rows and all(r['Image URL'] and r['Item overview'] and r['Analysis sources'] for r in rows)
  checks.append('Every record has a summary; 17 curated profiles; brand reset; folded evidence and specifications; CSV retains images and adds analysis')
  page.goto(root,wait_until='domcontentloaded')
  expect(page.locator('#chainDetail .chain-assortment')).to_contain_text('POP MART US')
  page.get_by_role('tab',name='TOP TOY',exact=True).click()
  expect(page.locator('#chainDetail')).to_contain_text('Brand products across all shops')
  page.locator('#chainDetail .chain-assortment').first.click()
  expect(page.locator('.product-card').first).to_be_visible()
  assert page.locator('#retailer').input_value()
  page.goto(root,wait_until='domcontentloaded')
  page.get_by_role('tab',name='X11',exact=True).click()
  expect(page.locator('#chainDetail')).to_contain_text('no captured assortment yet')
  assert page.locator('#chainDetail .chain-assortment').count()==0
  assert page.locator('#retailChains [role="tab"]').count()==9
  # User gestures unlock audio. Mute survives page navigation/reload.
  expect(page.locator('#atlasSound')).to_have_attribute('aria-pressed','true')
  page.locator('#atlasSound').click()
  expect(page.locator('#atlasSound')).to_have_text('♫ Sound off')
  page.reload(wait_until='domcontentloaded')
  expect(page.locator('#atlasSound')).to_have_text('♫ Sound off')
  page.locator('#atlasBrandNav').get_by_role('link',name='Products',exact=True).click()
  expect(page.locator('#atlasSound')).to_have_text('♫ Sound off')
  checks.append('Nine retail references; TOP TOY assortment opens; uncaptured chains have no empty browse link; audio starts on gesture and mute persists')
  for width in [390,768,1440]:
   page.set_viewport_size({'width':width,'height':1000})
   page.goto(root,wait_until='domcontentloaded')
   expect(page.locator('.product-card[data-clean-card="1"]').first).to_be_attached()
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),width
   page.locator('#atlasBrandNav').get_by_role('link',name='Products',exact=True).click()
   page.screenshot(path=str(O/f'products-{width}.png'))
  checks.append('Phone, tablet and desktop layouts fit without horizontal overflow')
  assert not errors,errors
  browser.close()
finally:
 server.terminate()
 result={'checks':checks,'errors':errors}
 (O/'results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
