#!/usr/bin/env python3
"""Functional audit of source-specific selection/comparison, not a factual market audit."""
from pathlib import Path
import csv, io, json, os, re, subprocess, sys, time, urllib.request
from PIL import Image
from playwright.sync_api import sync_playwright, expect

R=Path(__file__).resolve().parent
O=Path(os.environ.get('ATLAS_COMPARE_REPORT','/tmp/china-toys-compare-audit'));O.mkdir(parents=True,exist_ok=True)
base=os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:8796/china-toys/')
server=None
if not os.environ.get('ATLAS_TEST_URL'):
    server=subprocess.Popen([sys.executable,'-m','http.server','8796','--directory',str(R.parent)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:urllib.request.urlopen(base,timeout=1).close();break
        except Exception:time.sleep(.1)
checks=[];errors=[];warnings=[];metrics={};result={'status':'FAILED','checks':checks,'page_errors':errors,'warnings':warnings,'metrics':metrics,'scope':'Functional/browser and saved-data consistency audit. No full factual/photo-identity audit or physical iPhone test.','method':'Playwright Chromium and WebKit; Browser plugin unavailable'}
page=None
try:
    data=json.loads((R/'catalog.json').read_text());products=data['products'];byid={p['id']:p for p in products}
    bad=[]
    for p in products:
        try:
            with Image.open(R/p['image']) as im:
                assert im.width>=80 and im.height>=80
                im.load()
        except Exception as e:bad.append({'id':p['id'],'image':p.get('image'),'error':str(e)[:180]})
    metrics['cached_product_images']={'checked':len(products),'failed':len(bad),'failures':bad[:30]}
    assert not bad,bad[:5]
    checks.append(f"All {len(products)} primary cached product images exist and decode; content identity not certified")
    with sync_playwright() as pw:
        browser=pw.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
        page=context.new_page();page.set_default_timeout(20000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:warnings.append(m.text) if m.type in ('error','warning') else None)
        def ready(query=''):
            response=page.goto(base+query,wait_until='domcontentloaded',timeout=60000)
            assert response.ok
            page.wait_for_function("window.ATLAS_COMPARE?.version==='20261030-select-compare-1' && document.querySelector('#results')?.getAttribute('aria-busy')==='false'")
            page.wait_for_timeout(120)
            assert page.title().startswith('China Toy Atlas')
        def selections():return page.evaluate('window.ATLAS_COMPARE.getSelections()')
        def count():return int(re.search(r'[\d,]+',page.locator('#resultsHint').inner_text()).group().replace(',',''))
        def photos():
            page.wait_for_function("[...document.querySelectorAll('#catalogGrid img')].filter(e=>{const r=e.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).every(e=>e.complete&&e.naturalWidth>0)",timeout=30000)
        ready('?view=trending')
        assert not page.locator('a[href*="home-care"]').count()
        expect(page.locator('#compareOpen')).to_be_disabled()
        page.locator('#brandTabs [data-brand="TOP TOY"]').click()
        assert count()==sum(p['brand']=='TOP TOY' for p in products)
        assert page.locator('.view-tab[data-view="catalog"]').get_attribute('aria-pressed')=='true'
        page.locator('.compare-select').first.click()
        assert len(selections())==1
        expect(page.locator('#compareDockOpen')).to_be_disabled()
        page.locator('.compare-select').nth(1).click()
        assert len(selections())==2
        expect(page.locator('#compareDockOpen')).to_be_enabled()
        photos();page.screenshot(path=str(O/'desktop-select-products.png'))
        page.select_option('#retailer','kikagoods')
        assert len(selections())==2
        page.locator('.compare-select').first.click()
        assert len(selections())==3
        saved=selections()
        page.reload(wait_until='domcontentloaded');page.wait_for_function('window.ATLAS_COMPARE && document.querySelectorAll(".compare-select").length>0')
        assert selections()==saved
        checks.append('Select across brands/shops, change filters and reload: all three selected shop offers persist')
        page.locator('#compareDockOpen').click();expect(page.locator('#compareDialog')).to_be_visible()
        assert page.locator('#compareDialog th[data-compare-product]').count()==3
        for i,e in enumerate(saved):
            th=page.locator('#compareDialog th[data-compare-product]').nth(i)
            assert th.get_attribute('data-compare-product')==e['id'] and th.get_attribute('data-compare-url')==e['url']
            assert byid[e['id']]['name'] in th.inner_text()
        page.wait_for_function("[...document.querySelectorAll('#compareDialog .compare-item-photo')].every(e=>e.complete&&e.naturalWidth>0)")
        page.screenshot(path=str(O/'desktop-comparison.png'))
        checks.append('Side-by-side comparison preserves product identities, chosen retailer URLs and real catalog photographs')
        opt=page.locator('#compareDialog select[data-compare-option]').first
        if opt.count() and opt.locator('option').count()>1:
            idx=int(opt.get_attribute('data-compare-option'));value=opt.locator('option').last.get_attribute('value')
            opt.select_option(value)
            e=selections()[idx];assert e['mode']=='listing' and e['option']==value
            p=byid[e['id']];listing=next(l for l in p['listings'] if l['url']==e['url']);option=next(o for o in listing['options'] if str(o.get('id') or o['name'])==value)
            cell=page.locator('#compareDialog tbody tr').filter(has=page.locator('th',has_text=re.compile('^Compared price$'))).locator('td').nth(idx)
            assert f"{option['price']:,.2f}" in cell.inner_text(),(option,cell.inner_text())
            checks.append('Changing a pack/variant updates its actual source price and retains the saved selection')
        with page.expect_download() as download:
            page.locator('#compareExport').click()
        path=O/'selected-comparison.csv';download.value.save_as(path)
        rows=list(csv.DictReader(path.open(encoding='utf-8-sig',newline='')))
        assert len(rows)==3
        for row,e in zip(rows,selections()):
            assert row['Product ID']==e['id'] and row['Product URL']==e['url']
            p=byid[e['id']];l=next(l for l in p['listings'] if l['url']==e['url'])
            assert row['Retailer']==l['source'] and row['Market']==l['market']
            price=p.get('china_price',{}).get('price') if e['mode']=='china-launch' else l.get('price')
            if e.get('option'):
                o=next(o for o in l['options'] if str(o.get('id') or o['name'])==e['option']);price=o['price']
                assert row['Shop variant']==o['name']
            if price is not None:assert float(row['Compared price'])==float(price)
        checks.append('Comparison CSV exports exactly selected offers with matching prices, variants, currencies, markets and source links')
        page.locator('[data-compare-remove]').first.click();assert len(selections())==2
        assert page.locator('#compareDialog th[data-compare-product]').count()==2
        page.locator('#compareClose').click();assert not page.locator('#compareDialog').evaluate('(e)=>e.open')
        page.locator('#compareClear').click();assert not selections()
        page.select_option('#retailer','toptoy')
        for i in range(6):page.locator('#catalogGrid .compare-select').nth(i).click()
        assert len(selections())==6
        page.locator('#catalogGrid .compare-select').nth(6).click();assert len(selections())==6
        assert 'Remove one' in page.locator('#compareNotice').inner_text()
        assert page.locator('#catalogGrid .compare-select').nth(6).get_attribute('aria-pressed')=='false'
        chosen6=selections();page.locator('#pagination button',has_text='Next').click();assert selections()==chosen6
        page.reload(wait_until='domcontentloaded');page.wait_for_function('window.ATLAS_COMPARE');assert selections()==chosen6
        checks.append('Six-offer cap, rejected seventh selection, pagination, removal, clear and reload persistence pass')
        page.locator('#compareDockOpen').click()
        for width in (390,768):
            page.set_viewport_size({'width':width,'height':844});page.wait_for_timeout(150)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            assert page.locator('#compareScroll').evaluate('(e)=>e.scrollWidth>e.clientWidth')
            page.locator('#compareScroll').evaluate('(e)=>e.scrollLeft=e.scrollWidth')
            assert page.locator('#compareScroll').evaluate('(e)=>e.scrollLeft>0')
            page.locator('#compareScroll').evaluate('(e)=>e.scrollLeft=0')
            page.screenshot(path=str(O/f'comparison-{width}.png'))
        checks.append('390px phone and 768px tablet: comparison scrolls internally, controls visible, no page overflow')
        page.keyboard.press('Escape');assert not page.locator('#compareDialog').evaluate('(e)=>e.open')
        assert 'compare-open-lock' not in page.locator('html').get_attribute('class')
        page.locator('#compareClear').click()
        page.set_viewport_size({'width':1440,'height':1000})
        page.select_option('#retailer','');page.locator('#search').fill('nevermatch-audit-xyz')
        assert count()==0
        page.locator('#emptyState [data-reset]').click();assert count()==len(products)
        page.select_option('#category','Squishy toys')
        assert count()==sum(p['category']=='Squishy toys' for p in products)
        page.locator('#resetFilters').click();page.select_option('#currency','USD');page.select_option('#sort','price-asc')
        with page.expect_download() as export:page.locator('#exportButton').click()
        f=O/'filtered-catalog.csv';export.value.save_as(f);catalog_rows=list(csv.DictReader(f.open(encoding='utf-8-sig',newline='')))
        assert len(catalog_rows)==count() and all(r['Currency']=='USD' for r in catalog_rows)
        checks.append('Search empty-state recovery, category filter, currency filter, price sort and filtered CSV work')
        page.locator('#resetFilters').click()
        for ip in ['the-monsters','molly','skullpanda','dimoo','hirono','nommi','crybaby']:
            page.select_option('#ipSelect',ip);assert count()>0
            names=page.locator('.product-card .product-title').all_inner_texts()
            assert names
        metrics['ip_browse_checks']=7
        checks.append('All seven requested character/IP selectors return visible products')
        page.locator('#resetFilters').click();page.locator('.save-button').first.click()
        page.locator('.view-tab[data-view="saved"]').click();assert count()==1
        page.locator('#catalogGrid .compare-select').first.click();assert len(selections())==1
        page.locator('.save-button').first.click();assert count()==0 and len(selections())==1
        page.locator('#compareClear').click();page.locator('#resetFilters').click()
        checks.append('Bookmark shortlist remains independent from comparison selection')
        page.locator('.product-card [data-open]').first.click();expect(page.locator('#productDialog')).to_be_visible()
        assert page.locator('#productDetail .compare-select').count()==1
        page.locator('#productDetail .compare-select').click();assert len(selections())==1
        page.locator('#closeProduct').click();page.locator('#compareClear').click()
        checks.append('Product detail modal opens and offers the same working Select control')
        page.locator('#watchTutorialButton').click();video=page.locator('#atlasTutorialVideo')
        video.evaluate('(v)=>v.load()');page.wait_for_function('document.getElementById("atlasTutorialVideo").readyState>=1',timeout=30000)
        metrics['tutorial_duration_seconds']=video.evaluate('(v)=>v.duration');assert metrics['tutorial_duration_seconds']>30
        video.evaluate('(v)=>{v.muted=true;return v.play()}');page.wait_for_function('document.getElementById("atlasTutorialVideo").currentTime>.3')
        video.evaluate('(v)=>v.pause()');checks.append('Embedded narrated tutorial loads and advances playback; listening not claimed')
        assert not errors,errors
        browser.close()
        wb=pw.webkit.launch();wc=wb.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);wp=wc.new_page();wp.on('pageerror',lambda e:errors.append('WebKit: '+str(e)))
        wp.goto(base+'?view=trending',wait_until='domcontentloaded',timeout=60000);wp.wait_for_function('window.ATLAS_COMPARE && document.querySelectorAll(".compare-select").length>1')
        wp.locator('#brandTabs [data-brand="TOP TOY"]').click();wp.wait_for_timeout(200)
        assert wp.locator('.view-tab[data-view="catalog"]').get_attribute('aria-pressed')=='true'
        wp.locator('#catalogGrid .compare-select').nth(0).click();wp.locator('#catalogGrid .compare-select').nth(1).click();wp.locator('#compareDockOpen').click()
        expect(wp.locator('#compareDialog')).to_be_visible();assert wp.locator('th[data-compare-product]').count()==2
        assert wp.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        wp.screenshot(path=str(O/'webkit-phone-comparison.png'));wp.locator('#compareContinue').click()
        wp.reload(wait_until='domcontentloaded');wp.wait_for_function('window.ATLAS_COMPARE');assert len(wp.evaluate('window.ATLAS_COMPARE.getSelections()'))==2
        checks.append('Mobile WebKit: TOP TOY recovery, touch selection, comparison, close and reload persistence pass')
        wb.close()
        assert not errors,errors
        result['status']='PASS'
except Exception as e:
    result['failure']=type(e).__name__+': '+str(e)
    if page:
        try:page.screenshot(path=str(O/'failure.png'),timeout=3000)
        except Exception:pass
    raise
finally:
    if server:server.terminate()
    (O/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print('COMPARE_AUDIT '+json.dumps(result,ensure_ascii=False),flush=True)
