"""Measured-fixture planning journey, shared geometry and portable exports."""
import csv
import io
import json
import struct
import xml.etree.ElementTree as ET


def check_planogram(page, context, out):
    from playwright.sync_api import expect
    page.locator('.workspace-sidebar [data-workspace="retail"]').click()
    page.locator('#retailStarter').click()
    page.locator('[data-retail-view="plan"]').click()
    expect(page.locator('#retailPlan .pg-drawing')).to_be_visible()
    assert page.locator('.retail-plan-shelf').count() == 12
    page.locator('#retailClear').click()
    page.locator('#retailFixtureSetup > summary').click()
    page.locator('#pgUnits').select_option('in')
    page.locator('#pgPreset').select_option('48')
    expect(page.locator('#retailWidth')).to_have_value('48')
    page.locator('#pgFixtureBasis').select_option('measured')

    def enter(selector, value):
        page.locator(selector).fill(str(value))
        page.locator(selector).press('Tab')

    enter('#pgPlanId', 'T-TEST-48')
    enter('#pgLocation', 'Test store / A12')
    page.locator('#retailFixtureSetup > summary').click()
    page.locator('#pgShelfSelect').select_option('1:2')
    assert page.evaluate('window.ATLAS_RETAIL.getState().shelf.bay')==1
    page.locator('#pgShelfSelect').select_option('0:0')
    page.locator('#retailSourceRetailer').select_option('shop:target')
    page.locator('#retailProducts [data-retail-add="target-rms-dumpling"]').click()
    uid = page.evaluate('window.ATLAS_RETAIL.getState().selected')
    page.locator('#retailDisplay').select_option('box')
    enter('#retailPackWidth', 4)
    enter('#retailPackHeight', 6)
    enter('#retailPackDepth', 4)
    page.locator('#pgPackBasis').select_option('measured')
    enter('#pgSKU', '081-12-3456')
    enter('#retailFacings', 3)
    enter('#pgStackLayers', 1)
    enter('#pgItemX', 2)
    enter('#pgShelfHeight', 60)
    enter('#pgShelfDepth', 16)
    plan = page.evaluate('window.ATLAS_RETAIL.getState()')
    line = page.evaluate('window.ATLAS_RETAIL.getPlanogram().lines[0]')
    assert abs(plan['items'][0]['width'] - 10.16) < .001
    assert abs(line['x'] - 5.08) < .001
    assert abs(line['shelf']['elevation'] - 152.4) < .001
    assert abs(line['shelf']['depth'] - 40.64) < .001
    assert line['quantity'] == 6 and not line['issues']
    expect(page.locator('.pg-table')).to_contain_text('081-12-3456')
    expect(page.locator('.pg-table')).to_contain_text('Measured pack')
    # Width, height and depth are separate physical constraints.
    for selector, value, issue in [('#retailFacings', 12, 'Over shelf width'), ('#retailPackHeight', 50, 'Over shelf clearance'), ('#retailPackDepth', 30, 'Over shelf depth')]:
        enter(selector, value)
        expect(page.locator('#retailInspector .retail-issues')).to_contain_text(issue)
        page.locator('#retailUndo').click()
        assert not page.evaluate('window.ATLAS_RETAIL.getPlanogram().lines[0].issues')
    # Explicit coordinates can overlap; both affected lines must be flagged.
    page.locator('#retailDuplicate').click()
    enter('#pgItemX', 2)
    expect(page.locator('#retailInspector .retail-issues')).to_contain_text('Overlapping products')
    assert page.evaluate('window.ATLAS_RETAIL.getPlanogram().lines.every(l=>l.issues.includes("Overlapping products"))')
    page.locator('#retailUndo').click()
    page.locator('#retailRemove').click()
    page.locator(f'[data-retail-select="{uid}"]').click()
    # Keyboard positioning provides the same exact placement as pointer dragging.
    target=page.locator(f'[data-retail-select="{uid}"]')
    target.focus();target.press('ArrowRight')
    assert abs(page.evaluate('window.ATLAS_RETAIL.getPlanogram().lines[0].x') - 5.715) < .001
    page.locator('#retailUndo').click()
    target=page.locator(f'[data-retail-select="{uid}"]')
    target.scroll_into_view_if_needed()
    box=target.bounding_box();svg=page.locator('#retailPlan .pg-drawing')
    scale=svg.bounding_box()['width']/float(svg.get_attribute('viewBox').split()[2])
    start_x=box['x']+min(10,box['width']/4);start_y=box['y']+min(10,box['height']/2)
    page.mouse.move(start_x,start_y);page.mouse.down()
    page.mouse.move(start_x+5.08*2*scale,start_y,steps=8);page.mouse.up()
    assert abs(page.evaluate('window.ATLAS_RETAIL.getPlanogram().lines[0].x')-10.16)<.001
    page.locator('#retailUndo').click()
    before = page.evaluate('JSON.stringify(window.ATLAS_RETAIL.getState().items)')
    page.locator('#retailFixtureSetup > summary').click()
    for units in ['cm', 'in', 'cm', 'in']:
        page.locator('#pgUnits').select_option(units)
    assert page.evaluate('JSON.stringify(window.ATLAS_RETAIL.getState().items)') == before
    page.locator('#retailFixtureSetup > summary').click()
    page.locator('[data-plan-view="top"]').click()
    expect(page.locator('.pg-drawing')).to_contain_text('CLEAR AISLE')
    page.locator('[data-plan-view="front"]').click()
    # The live 3D shelf uses the exact same elevation/depth and centimeter model.
    page.locator('[data-retail-view="3d"]').click()
    page.wait_for_function('window.ATLAS_RETAIL?.getSceneStats()?.webgl')
    stats = page.evaluate('window.ATLAS_RETAIL.getSceneStats()')
    shelf = next(s for s in stats['shelves'] if s['bay'] == 0 and s['row'] == 0)
    assert abs(shelf['elevationCm'] - 152.4) < .001
    assert abs(shelf['depthCm'] - 40.64) < .001
    assert abs(stats['fixture']['bayWidthCm'] - 121.92) < .001
    page.locator('#retailExportOpen').click()

    def download(selector, filename):
        with page.expect_download(timeout=60000) as pending:
            page.locator(selector).click()
        path=out/filename;pending.value.save_as(path)
        return path

    saved=download('#retailJSON','dimensioned-plan.json')
    parsed=json.loads(saved.read_text())
    assert parsed['config']['planogramId']=='T-TEST-48'
    assert parsed['items'][0]['dimensionBasis']=='measured'
    sheet=download('#retailCSV','dimensioned-plan.csv')
    row=list(csv.DictReader(io.StringIO(sheet.read_text(encoding='utf-8-sig'))))[0]
    assert row['SKU / DPCI']=='081-12-3456'
    assert abs(float(row['Shelf elevation AFF cm'])-152.4)<.001
    assert abs(float(row['Left edge from usable start cm'])-5.08)<.001
    assert row['Physical fit']=='Fits entered space'
    drawing=download('#retailPlanSVG','dimensioned-plan.svg')
    tree=ET.parse(drawing);text=drawing.read_text()
    assert 'data:image/png;base64,' in text and '081-12-3456' in text
    assert 'FRONT ELEVATION' in text and 'CLEAR AISLE' in text and 'PLACEMENT SCHEDULE' in text
    assert tree.getroot().tag.endswith('svg')
    if page.locator('#retailBlenderGuide').get_attribute('open') is None:
        page.locator('#retailBlenderGuide > summary').click()
    glb=download('#retailGLB','dimensioned-plan.glb').read_bytes()
    length=struct.unpack('<I',glb[12:16])[0];doc=json.loads(glb[20:20+length])
    extras=next(n['extras'] for n in doc['nodes'] if n.get('extras',{}).get('assortmentLine'))
    assert abs(extras['packWidthCm']-10.16)<.001 and abs(extras['leftEdgeCm']-5.08)<.001
    assert abs(extras['shelfElevationCm']-152.4)<.001 and extras['sku']=='081-12-3456'
    assert extras['physicalFit']=='Fits entered space'
    # A saved measured plan keeps fixture overrides, exact coordinates and provenance.
    page.locator('#retailImport').set_input_files(str(saved))
    expect(page.locator('#retailExportDialog')).not_to_be_visible()
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function('window.ATLAS_RETAIL?.getState().config.planogramId==="T-TEST-48"')
    assert page.evaluate('window.ATLAS_RETAIL.getState().items[0].sku')=='081-12-3456'
    assert abs(page.evaluate('window.ATLAS_RETAIL.getPlanogram().lines[0].shelf.elevation')-152.4)<.001
    page.screenshot(path=str(out/'planogram-desktop.png'))
    for width,height in [(847,793),(390,844)]:
        page.set_viewport_size(dict(width=width,height=height))
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.locator('#retailFixtureSetup > summary').click()
        assert page.locator('.pg-fixture-body').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
        page.locator('#retailFixtureSetup > summary').click()
        page.locator('[data-plan-view="top"]').click()
        expect(page.locator('.pg-drawing')).to_contain_text('CLEAR AISLE')
        page.locator('[data-plan-view="front"]').click()
        page.screenshot(path=str(out/f'planogram-{width}.png'))
    page.set_viewport_size(dict(width=1440,height=1080))
    page.locator('#retailStarter').click()
    return 'Planogram: inch/cm input, measured fixture and pack provenance, per-shelf heights/depths, width/height/depth/overlap flags, exact coordinates, keyboard positioning, 3D shared geometry, JSON persistence, dimensioned SVG with embedded photos, placement CSV, GLB dimensions and 3 responsive layouts'
