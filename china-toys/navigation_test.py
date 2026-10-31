#!/usr/bin/env python3
"""Regression tests for real product navigation, including all shop/brand pairs."""
from pathlib import Path
import json, os, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

R=Path(__file__).resolve().parent
O=Path('/tmp/china-toys-navigation-qa');O.mkdir(parents=True,exist_ok=True)
base=os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:8777/china-toys/')
server=None
if not os.environ.get('ATLAS_TEST_URL'):
    server=subprocess.Popen([sys.executable,'-m','http.server','8777','--directory',str(R.parent)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            urllib.request.urlopen(base,timeout=1).close();break
        except Exception:time.sleep(.1)
errors=[];checks=[];result={'checks':checks,'page_errors':errors,'method':'Playwright Chromium; Browser plugin unavailable','scope':'Navigation and saved-data consistency; not a complete factual or visual product audit'}
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch()
  page=browser.new_page(viewport={'width':1440,'height':1000})
  page.on('pageerror',lambda e:errors.append(str(e)))
  def ready(query=''):
   page.goto(base+query,wait_until='domcontentloaded',timeout=60000)
   page.wait_for_function("window.ATLAS_NAVIGATION_VERSION==='20261030-navigation-repair-1' && document.querySelector('#results')?.getAttribute('aria-busy')==='false'",timeout=30000)
   page.wait_for_timeout(150)
  def count():
   return int(''.join(c for c in page.locator('#resultsHint').inner_text().split(' products')[0] if c.isdigit()))
  ready('?view=trending')
  assert 'home care' not in page.locator('body').inner_text().lower()
  assert page.locator('a[href*="home-care"]').count()==0
  expected=page.evaluate("window.TOY_ATLAS.products.filter(p=>p.brand==='TOP TOY').length")
  assert expected>0
  page.locator('#brandTabs [data-brand="TOP TOY"]').click()
  page.wait_for_timeout(250)
  assert count()==expected,(count(),expected)
  assert page.locator('.view-tab[data-view="catalog"]').get_attribute('aria-pressed')=='true'
  assert not page.locator('#catalogGrid').evaluate('(e)=>e.hidden')
  assert page.locator('.product-card').count()==min(expected,24)
  assert page.locator('#results').bounding_box()['y']<page.viewport_size['height']
  result['top_toy_brand_count']=expected
  checks.append('TOP TOY brand clicked from Trending: full captured brand assortment appears, All products active, results visible')
  page.locator('#catalogGrid').screenshot(path=str(O/'desktop-top-toy-products.png'))
  for prior in ('new','timeline','saved','coverage'):
   ready('?view='+prior+'&ip=the-monsters&search=nevermatchxyz&currency=CNY')
   page.select_option('#brandSelect','TOP TOY')
   assert count()==expected,(prior,count(),expected)
  checks.append('Brand dropdown clears stale weekly/timeline/shortlist/coverage, character, search and currency restrictions')
  ready('?view=trending&ip=the-monsters&brand=POP%20MART&search=nevermatchxyz')
  page.select_option('#retailer','toptoy')
  page.wait_for_timeout(200)
  assert count()>0 and page.locator('.product-card').count()>0
  result['top_toy_shop_count']=count()
  assert page.locator('#search').input_value()==''
  checks.append('TOP TOY shop selection clears previous brand/IP/search restrictions and displays its own listings')
  # Exhaustive change-event matrix. This uses the same controls as user clicks.
  matrix=page.evaluate(r'''async () => {
   const ps=window.TOY_ATLAS.products, sources=window.TOY_ATLAS.sources||[];
   const host=u=>{try{return new URL(u).hostname.toLowerCase().replace(/^www\./,'')}catch{return ''}};
   const byHost=new Map(sources.map(s=>[host(s.url),s.id])),byName=new Map(sources.map(s=>[s.name,s.id]));
   const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
   const retail=l=>l.kind!=='source evidence'||l.price!=null||byHost.has(host(l.url))||/popmart\.com|52toys\.com|gotoptoy\.com/.test(host(l.url));
   const key=l=>l.source_id||byHost.get(host(l.url))||byName.get(l.source)||('shop-'+(host(l.url)||slug(l.source)||'unknown'));
   const tick=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const choose=async(id,value)=>{const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}));await tick()};
   const rows=[],brands=[],pairs=[],failures=[];
   const inspect=(shop,brand,kind)=>{
    const expected=ps.filter(p=>(!shop||(p.listings||[]).some(l=>retail(l)&&key(l)===shop))&&(!brand||p.brand===brand));
    const text=document.getElementById('resultsHint').textContent;
    const actual=Number((text.match(/[\d,]+/)||['0'])[0].replace(/,/g,''));
    const cards=[...document.querySelectorAll('#catalogGrid .product-card')];
    const ids=new Set(expected.map(p=>p.id));
    const entry={shop,brand,expected:expected.length,actual,cards:cards.length};
    if(actual!==expected.length||cards.length!==Math.min(24,expected.length)||cards.some(c=>!ids.has(c.dataset.productId))||document.getElementById('catalogGrid').hidden)failures.push({...entry,kind});
    return entry;
   };
   const shops=[...document.getElementById('retailer').options].filter(o=>o.value&&!o.disabled).map(o=>({id:o.value,name:o.textContent}));
   for(const shop of shops){
    await choose('retailer',shop.id);rows.push(inspect(shop.id,'','retailer'));
    const choices=[...document.getElementById('brandSelect').options].filter(o=>o.value&&!o.disabled).map(o=>o.value);
    for(const brand of choices){await choose('brandSelect',brand);pairs.push(inspect(shop.id,brand,'shop-brand'))}
   }
   await choose('retailer','');
   const all=[...document.getElementById('brandSelect').options].filter(o=>o.value&&!o.disabled).map(o=>o.value);
   for(const brand of all){await choose('brandSelect',brand);brands.push(inspect('',brand,'brand'))}
   await choose('retailer','');
   return {retailers:rows,brands,retailer_brand_pairs:pairs,failures,disabled_shops:[...document.getElementById('retailer').options].filter(o=>o.disabled).map(o=>o.textContent)};
  }''')
  result['matrix']={k:len(v) for k,v in matrix.items() if isinstance(v,list)}
  (O/'selection-matrix.json').write_text(json.dumps(matrix,ensure_ascii=False,indent=2))
  assert not matrix['failures'],matrix['failures'][:10]
  checks.append(f"All {len(matrix['retailers'])} populated retailer choices, {len(matrix['brands'])} brand choices and {len(matrix['retailer_brand_pairs'])} retailer/brand combinations match actual product identities and counts")
  checks.append('Shops without captured products are visibly unavailable instead of selectable empty assortments')
  page.set_viewport_size({'width':390,'height':844})
  ready('?view=trending')
  page.locator('#brandTabs [data-brand="TOP TOY"]').click()
  page.wait_for_timeout(300)
  assert count()==expected
  page.wait_for_function("[...document.querySelectorAll('#catalogGrid img')].filter(e=>e.getBoundingClientRect().top<innerHeight).every(e=>e.complete&&e.naturalWidth>0)",timeout=30000)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  assert page.locator('#results').bounding_box()['y']<844
  page.screenshot(path=str(O/'mobile-top-toy-products.png'))
  page.locator('.product-card [data-open]').first.click()
  page.wait_for_selector('#productDialog[open]')
  assert page.locator('#detailTitle').inner_text()
  page.screenshot(path=str(O/'mobile-top-toy-detail.png'))
  page.locator('#closeProduct').click()
  page.select_option('#retailer','toptoy')
  page.wait_for_timeout(200)
  assert count()==result['top_toy_shop_count']
  checks.append('390px phone: brand and retailer choices show products immediately; first image loads; product details open; no horizontal overflow')
  ready('?view=trending&brand=TOP%20TOY')
  page.locator('#resetFilters').click()
  assert count()==page.evaluate('window.TOY_ATLAS.products.length')
  checks.append('Reset filters exits an empty Trending selection and returns to the complete captured catalog')
  ready()
  assert page.locator('[data-executive-brief]').count()>0
  page.locator('#watchTutorialButton').click()
  assert page.locator('#tutorial').evaluate('(e)=>e.open')
  assert page.locator('#atlasTutorialVideo source').get_attribute('src').split('?', 1)[0].endswith('China_Toy_Atlas_Tutorial.mp4')
  checks.append('Weekly brief and embedded narrated-tutorial controls remain present')
  page.locator('#tutorial summary').click()
  page.evaluate('window.scrollTo(0,0)')
  page.screenshot(path=str(O/'mobile-toy-only-header.png'))
  assert not errors,errors
  browser.close()
  result['status']='PASS'
finally:
 if server:server.terminate()
 if 'status' not in result:result['status']='FAILED'
 (O/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print('NAVIGATION_QA '+json.dumps(result,ensure_ascii=False),flush=True)
