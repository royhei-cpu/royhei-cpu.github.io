#!/usr/bin/env python3
"""Read-only live smoke test. No mutations, purchases or external-store visits."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

O=Path('/tmp/china-toys-live-navigation');O.mkdir(parents=True,exist_ok=True)
URL='https://royhei-cpu.github.io/china-toys/?v=nav-ee381c6f8607-live-check&view=trending'
result={'url':URL,'brand_checks':[],'shop_checks':[],'errors':[],'status':'RUNNING'}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch()
  page=browser.new_page(viewport={'width':1440,'height':1000})
  page.on('pageerror',lambda e:result['errors'].append(str(e)))
  page.goto(URL,wait_until='domcontentloaded',timeout=60000)
  page.wait_for_function("window.ATLAS_NAVIGATION_VERSION==='20261030-navigation-repair-1'",timeout=45000)
  page.wait_for_selector('#brandTabs button[data-brand="TOP TOY"]')
  result['script_version']=page.evaluate('window.ATLAS_NAVIGATION_VERSION')
  result['title']=page.title()
  def current_count():
   return int(''.join(c for c in page.locator('#resultsHint').inner_text().split(' products')[0] if c.isdigit()))
  for brand in ['TOP TOY','POP MART','52TOYS','Finding Unicorn','Heyone','TNT SPACE']:
   page.locator('.view-tab[data-view="trending"]').click()
   page.locator('#brandTabs button[data-brand="'+brand+'"]').click()
   page.wait_for_timeout(120)
   expected=page.evaluate('(b)=>window.TOY_ATLAS.products.filter(x=>x.brand===b).length',brand)
   count=current_count()
   assert count==expected and count>0,(brand,count,expected)
   assert page.locator('#resultsTitle').inner_text()==brand
   assert page.locator('.view-tab[data-view="catalog"]').get_attribute('aria-pressed')=='true'
   assert page.locator('.product-card').count()==min(24,expected)
   assert page.locator('#results').bounding_box()['y']<1000
   result['brand_checks'].append({'brand':brand,'expected':expected,'actual':count,'cards':page.locator('.product-card').count(),'passed':True})
  shops=page.locator('#retailer').evaluate('(e)=>[...e.options].filter(o=>o.value&&!o.disabled).map(o=>({id:o.value,label:o.textContent}))')
  for shop in shops:
   page.select_option('#retailer',shop['id'])
   page.wait_for_timeout(80)
   assert current_count()>0 and page.locator('.product-card').count()>0,shop
   assert page.locator('.view-tab[data-view="catalog"]').get_attribute('aria-pressed')=='true'
   result['shop_checks'].append({'shop':shop['label'],'count':current_count(),'passed':True})
  page.select_option('#retailer','')
  page.set_viewport_size({'width':390,'height':844})
  page.locator('.view-tab[data-view="trending"]').click()
  page.locator('#brandTabs button[data-brand="TOP TOY"]').click()
  page.wait_for_timeout(300)
  assert current_count()==result['brand_checks'][0]['actual']
  assert page.locator('#results').bounding_box()['y']<844
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.screenshot(path=str(O/'live-top-toy-brand-mobile.png'))
  page.select_option('#retailer','toptoy')
  page.wait_for_timeout(300)
  page.wait_for_function("[...document.querySelectorAll('#catalogGrid img')].filter(e=>{const r=e.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).every(e=>e.complete&&e.naturalWidth>0)",timeout=30000)
  result['top_toy_store_count']=current_count()
  page.screenshot(path=str(O/'live-top-toy-shop-mobile.png'))
  page.locator('.product-card [data-open]').first.click()
  page.wait_for_selector('#productDialog[open]')
  result['opened_product']=page.locator('#detailTitle').inner_text()
  page.locator('#closeProduct').click()
  assert not page.locator('#productDialog').evaluate('(e)=>e.open')
  assert page.locator('a[href*="home-care"]').count()==0
  assert 'home care' not in page.locator('body').inner_text().lower()
  result['home_care_removed']=True
  result['mobile_products_and_details']='PASS at 390x844'
  assert not result['errors'],result['errors']
  result['status']='PASS'
  browser.close()
finally:
 (O/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print('LIVE_NAVIGATION_RESULT '+json.dumps(result,ensure_ascii=False),flush=True)
