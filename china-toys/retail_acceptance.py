"""Retail planner journey shared by local/CI workspace acceptance."""
import csv
import io
import json
import struct


def check_retail(page, context, out):
    from playwright.sync_api import expect
    page.locator('.workspace-sidebar [data-workspace="retail"]').click()
    expect(page.locator('#workspace-retail')).to_be_visible()
    page.wait_for_function('window.ATLAS_RETAIL?.getSceneStats()?.webgl')
    # Scope is shared by browsing, chain references, imports and the aisle library.
    assert page.evaluate('window.TOY_ATLAS.products.every(window.ATLAS_PRODUCT_SCOPE.eligible)')
    assert page.evaluate('window.CHAIN_ASSORTMENTS.products.every(window.ATLAS_PRODUCT_SCOPE.eligible)')
    assert page.evaluate('window.ATLAS_RETAIL.getProduct("72cd90b800079520") === undefined')
    assert page.evaluate('window.ATLAS_RETAIL.getProduct("chain-motor-nuclear-hero-vol2") === undefined')
    assert page.locator('#retailCategory option').count() == 6
    assert page.evaluate('''() => {
      const D=window.ATLAS_RETAIL_DATA,p=D.newPlan();
      p.customs=[{id:'custom-nope',name:'LEGO building blocks',category:'Blind-box figures'},
                 {id:'custom-yes',name:'My blind-box plush',category:'Blind-box plush'}];
      p.items=[{uid:'bad',id:'custom-nope'},{uid:'good',id:'custom-yes'}];
      const n=D.validate(p,[]);return n.customs.length===1&&n.items.length===1&&n.items[0].uid==='good';
    }''')
    page.locator('#retailClear').click()
    page.locator('#retailSourceRetailer').select_option('chain:miniso')
    expect(page.locator('#retailStockHeading')).to_contain_text('MINISO')
    page.locator('#retailProducts [data-retail-add]').first.click()
    chain_item=page.evaluate('window.ATLAS_RETAIL.getState().items[0]')
    assert chain_item['retailerKey']=='chain:miniso' and chain_item['offerUrl'].startswith('https://')
    expect(page.locator('#retailInspector')).to_contain_text('MINISO')
    page.locator('#retailDisplay').select_option('hanger')
    assert page.evaluate('window.ATLAS_RETAIL.getState().items[0].display') == 'hanger'
    page.locator('.retail-appearance summary').click()
    page.locator('#retailTheme').select_option('wood')
    page.locator('#retailPlanCurrency').select_option('CNY')
    page.locator('.retail-appearance summary').click()
    page.locator('#retailSourceRetailer').select_option('shop:52toys')
    assert page.evaluate('window.ATLAS_RETAIL.getState().items.length') == 1
    page.locator('#retailStarter').click()
    original = page.evaluate('window.ATLAS_RETAIL.getState()')
    assert len(original['items']) == 12
    assert page.evaluate('window.ATLAS_RETAIL.getSceneStats().products') == 12
    page.locator('[data-retail-view="plan"]').click()
    assert page.locator('.retail-plan-shelf').count() == 12
    first = original['items'][0]['uid']
    page.locator(f'[data-retail-select="{first}"]').click()
    page.locator('#retailFacings').fill('2')
    page.locator('#retailFacings').press('Tab')
    page.locator('#retailTicket').fill('9.99')
    page.locator('#retailTicket').press('Tab')
    page.locator('#retailMove').select_option('1:2')
    current = page.evaluate('window.ATLAS_RETAIL.getState()')
    item = next(i for i in current['items'] if i['uid'] == first)
    assert (item['facings'], item['ticket'], item['bay'], item['row']) == (2, 9.99, 1, 2)
    page.locator('#retailUndo').click()
    assert page.evaluate('window.ATLAS_RETAIL.getState().items[0].bay') == 0
    page.locator('#retailRedo').click()
    assert page.evaluate('window.ATLAS_RETAIL.getState().items[0].bay') == 1
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function('window.ATLAS_RETAIL?.getState().items.length===12')
    assert page.evaluate('window.ATLAS_RETAIL.getState().items[0].ticket') == 9.99
    page.locator('#retailScope').select_option('target')
    expect(page.locator('#retailProducts .retail-product')).to_have_count(2)
    expect(page.locator('#retailProducts')).to_contain_text('$4.99')
    expect(page.locator('#retailProducts')).to_contain_text('$19.99')
    page.locator('#retailSourceRetailer').select_option('shop:52toys')
    page.locator('#retailSearch').fill('Cat Fight Showdown')
    expect(page.locator('#retailProducts')).to_contain_text('$9.99')
    page.locator('#retailProducts [data-retail-add="cda530057d017fb2"]').click()
    assert page.evaluate('window.ATLAS_RETAIL.getState().items.length') == 13
    assert page.evaluate('window.ATLAS_RETAIL.getState().items.at(-1).retailerKey') == 'shop:52toys'
    expect(page.locator('#retailInspector')).to_contain_text('Reference $9.99')
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function('window.ATLAS_RETAIL?.getState().items.length===13')
    assert page.evaluate('window.ATLAS_RETAIL.getState().items.at(-1).retailerKey') == 'shop:52toys'
    # The selected offer can change without replacing the product or planned ticket.
    page.locator('#retailItemRetailer').select_option('shop:kikagoods')
    expect(page.locator('#retailInspector')).to_contain_text('Reference $8.99')
    page.locator('#retailItemRetailer').select_option('shop:52toys')
    page.locator('#retailOwnProduct').click()
    page.locator('#retailCustomForm [name="name"]').fill('=QA Custom Toy')
    page.locator('#retailCustomForm [name="brand"]').fill('My shop')
    page.locator('#retailCustomForm button[type="submit"]').click()
    expect(page.locator('#retailCustomDialog')).not_to_be_visible()
    assert page.evaluate('window.ATLAS_RETAIL.getState().customs.length') == 1
    page.locator('#retailExportOpen').click()

    def download(selector, name):
        with page.expect_download(timeout=60000) as pending:
            page.locator(selector).click()
        target = out / name
        pending.value.save_as(target)
        return target

    plan = download('#retailJSON', 'retail-plan.json')
    parsed = json.loads(plan.read_text())
    assert parsed['items'] and parsed['customs'][0]['name'] == '=QA Custom Toy'
    sheet = download('#retailCSV', 'retail-plan.csv')
    rows = list(csv.DictReader(io.StringIO(sheet.read_text(encoding='utf-8-sig'))))
    assert len(rows) == len(parsed['items'])
    assert next(r for r in rows if r['Product ID'] == 'target-mofusand-clip')['Reference URL'].startswith('https://www.target.com/p/')
    selected_offer=next(r for r in rows if r['Product ID']=='cda530057d017fb2' and r['Selected retailer key']=='shop:52toys')
    assert selected_offer['Reference currency']=='USD' and float(selected_offer['Reference price (original currency)'])==9.99
    custom_rows = [r for r in rows if r['Brand'] == 'My shop']
    assert custom_rows and custom_rows[0]['Product / series'].startswith("'=QA")
    glb = download('#retailGLB', 'retail-plan.glb')
    b = glb.read_bytes()
    assert b[:4] == b'glTF' and struct.unpack('<I', b[4:8])[0] == 2
    assert struct.unpack('<I', b[8:12])[0] == len(b)
    length = struct.unpack('<I', b[12:16])[0]
    document = json.loads(b[20:20+length])
    assert len(document['meshes']) > 50 and len(document['images']) >= 10
    lines = [n for n in document['nodes'] if n.get('extras', {}).get('assortmentLine')]
    assert len(lines) == len(parsed['items'])
    assert all('dimensions' in n['extras'] for n in lines)
    exact=next(n['extras'] for n in lines if n['extras'].get('retailerKey')=='shop:52toys')
    assert exact['referenceCurrency']=='USD' and exact['referencePrice']==9.99 and exact['sourceURL'].startswith('https://')
    page.locator('#retailImport').set_input_files(str(plan))
    expect(page.locator('#retailMessage')).to_contain_text('Opened your saved aisle')
    page.locator('[data-retail-close="retailExportDialog"]').click()
    page.locator('[data-retail-view="3d"]').click()
    for view in ['front', 'top', 'reset']:
        page.locator(f'[data-retail-camera="{view}"]').click()
    photo = download('#retailPhoto', 'retail-aisle.png')
    assert photo.read_bytes().startswith(b'\x89PNG')
    from PIL import Image, ImageStat
    with Image.open(photo) as image:
        assert min(image.size)>300 and sum(ImageStat.Stat(image.convert('RGB')).stddev)>45
    page.locator('#retailClear').click()
    assert not page.evaluate('window.ATLAS_RETAIL.getState().items')
    page.locator('#retailUndo').click()
    assert page.evaluate('window.ATLAS_RETAIL.getState().items.length') == len(parsed['items'])
    page.screenshot(path=str(out / 'retail-desktop.png'))
    for width, height in [(847, 793), (390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.locator('[data-retail-view="plan"]').click()
        expect(page.locator('#retailPlan')).to_be_visible()
        assert page.locator('.retail-plan-shelf').count() == 12
        page.screenshot(path=str(out / f'retail-{width}.png'))
    page.set_viewport_size({'width': 1440, 'height': 1080})
    # Leave clean planner state for subsequent suite sections.
    page.locator('#retailStarter').click()
    return 'Retail: blind-box/squishy scope, retailer library, exact source persistence and switching, display format, finish/currency, selection, facings/tickets, move, undo/redo, custom concept, JSON restore, CSV, source-linked GLB textures, nonblank PNG, 3 responsive layouts'
