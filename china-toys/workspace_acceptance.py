#!/usr/bin/env python3
"""Acceptance coverage for the discovery workspace and the retained evidence engines.

CI uses Playwright; interactive development verification uses the Codex browser.
The legacy entry points delegate here so weekly refreshes test current user flows.
"""
from pathlib import Path
import csv
import io
import json
import os
import re
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
REPORTS = {
    'navigation': 'navigation-qa', 'weekly': 'weekly-brief-qa',
    'compare': 'compare-audit', 'research': 'china-desk-qa',
    'review': 'review-qa', 'clarity': 'clarity-qa', 'ip': 'ip-qa',
    'chains': 'clarity-qa', 'live': 'live-navigation',
}


def run(scope='all'):
    from playwright.sync_api import sync_playwright, expect
    data = json.loads((ROOT / 'catalog.json').read_text())
    products = data['products']
    by_id = {p['id']: p for p in products}
    assert len(by_id) == len(products) == data['stats']['products']
    assert all(p.get('image') and (ROOT / p['image']).is_file() and p.get('listings') for p in products)
    assert all(not p.get('trend') or p['trend'].get('source') for p in products)
    # Official showcases retain their unknown fields; no invented inventory.
    showcases = [p for p in products if p['id'].startswith('miniso-cn-')]
    assert len(showcases) == 7
    assert any(p['category'] == 'Squishy toys' for p in showcases)
    assert all(not p.get('launch') and not p.get('sales') and
               all(l['price'] is None and l['available'] is None for l in p['listings']) for p in showcases)
    # Research snapshots retain audit history; the user-facing directory has a narrower scope.
    from product_scope import eligible
    products = [p for p in products if eligible(p)]
    by_id = {p['id']: p for p in products}
    if scope == 'compare':
        from PIL import Image
        for p in products:
            with Image.open(ROOT / p['image']) as image:
                image.load()
                assert min(image.size) >= 80
    server = None
    base = os.environ.get('ATLAS_TEST_URL') or ('https://royhei-cpu.github.io/china-toys/?v=workspace-20261104-live' if scope == 'live' else None)
    if not base:
        handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT.parent))
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}/china-toys/'
    base = base.split('#')[0]
    out = Path('/tmp/china-toys-' + REPORTS.get(scope, 'workspace-qa'))
    out.mkdir(parents=True, exist_ok=True)
    errors, checks = [], []
    report = {'scope': scope, 'status': 'FAILED', 'checks': checks, 'errors': errors,
              'limits': 'Interface, stored-data consistency and image decoding; not a full SKU identity or national-market audit.'}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=os.environ.get('ATLAS_CHROMIUM_PATH') or None,
                                         args=['--enable-unsafe-swiftshader'])
            context = browser.new_context(viewport={'width': 1440, 'height': 1080}, accept_downloads=True)
            page = context.new_page()
            page.set_default_timeout(20000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(base, wait_until='domcontentloaded', timeout=60000)
            page.wait_for_selector('#workspaceSidebar')
            expect(page.locator('#results')).to_have_attribute('aria-busy', 'false')
            assert page.locator('#catalogGrid .product-card').count() == min(24, len(products))
            assert not page.locator('a[href*="home-care"]').count()
            checks.append('Workspace mounts over the original catalog with current counts and 24-card pagination')

            def nav(key):
                if key in ('rankings','chains','stories','weekly','sources') and page.locator('#workspaceResearch').get_attribute('open') is None:
                    page.locator('#workspaceResearch > summary').click()
                page.locator(f'.workspace-sidebar [data-workspace="{key}"]').click()
                panel = 'explore' if key == 'saved' else key
                expect(page.locator('#workspace-' + panel)).to_be_visible()

            def count():
                return int(re.search(r'[\d,]+', page.locator('#resultsHint').inner_text()).group().replace(',', ''))

            def reset():
                nav('explore')
                if page.viewport_size['width'] <= 680 and page.locator('.workspace-filter-toggle').get_attribute('aria-expanded') != 'true':
                    page.locator('.workspace-filter-toggle').click()
                page.locator('#resetFilters').click()

            def download(button):
                with page.expect_download() as pending:
                    button.click()
                result = pending.value
                return result, list(csv.DictReader(io.StringIO(Path(result.path()).read_text(encoding='utf-8-sig'))))

            def no_overflow():
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')

            if scope in ('navigation', 'live', 'all'):
                for brand in data['priority_brands'][:6]:
                    if not any(p['brand'] == brand for p in products):
                        continue
                    page.locator('#search').fill('impossible-filter-before-brand-change')
                    page.locator('#brandSelect').select_option(brand)
                    expect(page.locator('#search')).to_have_value('')
                    assert count() == sum(p['brand'] == brand for p in products)
                    assert page.locator('#workspaceActiveFilters').inner_text().startswith('Brand:')
                reset()
                shops = page.locator('#retailer option:not([disabled])').evaluate_all('(es)=>es.map(e=>e.value).filter(Boolean)')
                for shop in shops:
                    page.locator('#retailer').select_option(shop)
                    assert count() > 0, shop
                    page.locator('#catalogGrid .photo-button').first.click()
                    expect(page.locator('#productDialog')).to_be_visible()
                    assert page.locator('#productDetail a').count() > 0
                    page.locator('#closeProduct').click()
                reset()
                page.locator('#search').fill('no-product-could-match-this')
                assert count() == 0
                expect(page.locator('#emptyState')).to_be_visible()
                reset()
                page.locator('[data-layout="table"]').click()
                expect(page.locator('#workspaceCatalog')).to_have_attribute('data-layout', 'table')
                page.locator('[data-layout="grid"]').click()
                checks.append('Brand reset, all captured shops, empty state, details and grid/table navigation')

            if scope in ('compare', 'all'):
                selections = lambda: page.evaluate('window.ATLAS_COMPARE.getSelections()')
                for i in range(7):
                    page.locator('#catalogGrid .compare-select').nth(i).click()
                assert len(selections()) == 6
                saved = selections()
                page.reload(wait_until='domcontentloaded')
                page.wait_for_selector('#workspaceSidebar')
                assert selections() == saved
                nav('compare')
                assert page.locator('.workspace-compare-preview-grid article').count() == 6
                page.locator('#workspaceOpenCompare').click()
                assert page.locator('#compareScroll thead th').count() == 7
                for i, entry in enumerate(saved):
                    header = page.locator('#compareScroll thead th').nth(i + 1)
                    assert header.get_attribute('data-compare-product') == entry['id']
                    assert header.get_attribute('data-compare-url') == entry['url']
                    assert entry['url'] in [l['url'] for l in by_id[entry['id']]['listings']]
                assert 'Historical mainland launch price' in page.locator('#compareScroll').inner_text()
                option = page.locator('#compareScroll [data-compare-option]').first
                values = option.locator('option').evaluate_all('(es)=>es.map(e=>e.value).filter(Boolean)')
                if len(values) > 1:
                    option.select_option(values[-1])
                    assert selections()[0].get('option')
                    assert selections()[0]['mode'] == 'listing'
                _, rows = download(page.locator('#compareExport'))
                assert len(rows) == 6 and all(r['Product URL'] for r in rows)
                page.locator('[data-compare-remove]').first.click()
                assert len(selections()) == 5
                page.locator('#compareClose').click()
                page.locator('#workspaceClearCompare').click()
                assert not selections()
                checks.append('Six-offer limit, persistence, source identity, option-specific prices, CSV and remove/clear')

            if scope in ('ip', 'research', 'all'):
                nav('rankings')
                cfg = json.loads((ROOT / 'ip-market.json').read_text())['ranking']
                rows = sorted(cfg['rows'], key=lambda r: -r['revenue'])
                assert page.locator('#workspaceRanking tbody tr').count() == len(rows) == 8
                for i, row in enumerate(rows):
                    text = page.locator('#workspaceRanking tbody tr').nth(i).inner_text()
                    assert row['name'] in text and f"{row['revenue']/1000:,.1f}" in text
                assert 'global revenue' in page.locator('#workspaceRanking').inner_text()
                assert page.locator('.workspace-source-link').get_attribute('href') == cfg['source']
                _, exported = download(page.locator('#workspaceExportRanking'))
                assert len(exported) == 8 and all(r['Source'] == cfg['source'] for r in exported)
                page.locator('[data-rank-ip]').first.click()
                assert count() > 0
                assert page.locator('#ipSelect').input_value() == rows[0]['ip']
                nav('rankings')
                page.locator('[data-rank-basis="signals"]').click()
                assert 'unranked' in page.locator('#workspaceRanking').inner_text()
                page.locator('[data-rank-basis="coverage"]').click()
                assert page.locator('#workspaceRanking tbody tr').count() == 20
                assert 'not sales' in page.locator('#workspaceRanking').inner_text()
                checks.append('Eight source-matched revenue values/export, IP drilldown and separate signal/coverage scopes')

            if scope in ('weekly', 'all'):
                nav('weekly')
                expect(page.locator('#weeklyOverview')).to_be_visible()
                button = page.locator('#weeklyOverview [data-weekly="added"]').first
                expected = int(button.locator('b').inner_text().replace(',', ''))
                button.click()
                expect(page.locator('#workspace-explore')).to_be_visible()
                assert count() == expected
                assert 'catalog' in page.locator('#weeklyBanner').inner_text().lower()
                checks.append('Dated weekly brief and additions drilldown with matching count')

            if scope in ('chains', 'all'):
                nav('chains')
                assert page.locator('#retailChains [role="tab"]').count() == 18
                page.locator('#retailChains [role="tab"]').filter(has_text='MINISO').click()
                expect(page.locator('#chainDetail')).to_contain_text('MINISO')
                assert 'sample' in page.locator('#retailChains').inner_text().lower() or 'unverified' in page.locator('#retailChains').inner_text().lower()
                checks.append('Eighteen retail-chain tabs, MINISO assortment and preserved unknown showcase fields')

            if scope in ('clarity', 'review', 'all'):
                reset()
                page.locator('#catalogGrid .save-button').first.click()
                nav('saved')
                assert count() == 1
                page.reload(wait_until='domcontentloaded')
                page.wait_for_selector('#workspaceSidebar')
                assert count() == 1
                page.locator('#catalogGrid .photo-button').first.click()
                page.wait_for_selector('#productDetail .review-details', state='attached')
                assert page.locator('#productDetail .review-details').count() == 1
                assert page.locator('#productDetail a').count() > 0
                page.locator('#closeProduct').click()
                nav('inspiration')
                assert page.locator('.workspace-board-grid [data-board]').count() == 6
                page.locator('.workspace-board-grid [data-board="soft-spot"]').click()
                assert page.locator('.workspace-inspire-product').count() == 12
                page.locator('[data-inspiration-compare]').first.click()
                expect(page.locator('[data-inspiration-compare]').first).to_have_attribute('aria-pressed', 'true')
                nav('sources')
                expect(page.locator('#workspaceSourceDetails')).to_be_visible()
                page.locator('#tutorial > summary').click()
                assert page.locator('#atlasTutorialVideo source').get_attribute('src').split('?')[0].endswith('China_Toy_Atlas_Tutorial.mp4')
                reset()
                page.locator('#category').select_option('Squishy toys')
                _, exported = download(page.locator('.workspace-export-results'))
                assert len(exported) == count() == sum(p['category'] == 'Squishy toys' for p in products)
                checks.append('Persistent saved collection, full details, inspiration-to-compare, tutorial and filtered CSV')

            # Every scope checks responsive chrome; tables scroll inside their own region.
            for width, height in [(1440, 1080), (847, 793), (390, 844)]:
                page.set_viewport_size({'width': width, 'height': height})
                nav('explore')
                no_overflow()
                if width <= 680:
                    toggle = page.locator('.workspace-filter-toggle')
                    if toggle.get_attribute('aria-expanded') != 'true':
                        toggle.click()
                    expect(page.locator('#currency')).to_be_visible()
                    page.locator('#currency').select_option('USD')
                    no_overflow()
                page.screenshot(path=str(out / f'workspace-{width}.png'))
            assert page.locator('[data-workspace="retail"], [data-workspace="planogram"]').count() == 0
            assert page.locator('script[src*="planogram.js"], script[src*="retail-studio.js"]').count() == 0
            checks.append('Original standalone Toy Atlas navigation; retired development tools absent')
            if scope in ('stories', 'all'):
                from retailer_stories_acceptance import check_stories
                page.set_viewport_size({'width': 1440, 'height': 1080})
                checks.append(check_stories(page, context, out))
            assert not errors, errors
            report['status'] = 'PASSED'
            checks.append('1440px, 847px and 390px layouts fit; mobile filters work; no JavaScript errors')
            browser.close()
    finally:
        if server:
            server.shutdown()
            server.server_close()
        (out / 'results.json').write_text(json.dumps(report, indent=2))
        print(json.dumps(report, indent=2))


if __name__ == '__main__':
    run(os.environ.get('ATLAS_QA_SCOPE', 'all'))
