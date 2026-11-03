#!/usr/bin/env python3
"""Standalone live smoke test; sparse checkout needs only this file.

Uses the published catalog for expected counts. No purchases, external-store visits
or server-side mutations are made. Filters are exercised in an isolated browser.
"""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright, expect, TimeoutError

OUT = Path('/tmp/china-toys-live-navigation')
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('ATLAS_TEST_URL', 'https://royhei-cpu.github.io/china-toys/?v=workspace-live-20261104')
result = {'url': URL, 'status': 'FAILED', 'brand_checks': [], 'shop_checks': [], 'errors': []}
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 1080})
        page.on('pageerror', lambda e: result['errors'].append(str(e)))
        # A push can start this job while Pages is still publishing the same revision.
        for attempt in range(4):
            page.goto(URL, wait_until='domcontentloaded', timeout=60000)
            try:
                page.wait_for_selector('#workspaceSidebar', timeout=30000)
                break
            except TimeoutError:
                if attempt == 3:
                    raise
        expect(page.locator('#results')).to_have_attribute('aria-busy', 'false')
        counts = page.evaluate("Object.fromEntries((window.TOY_ATLAS.priority_brands||[]).slice(0,6).map(b=>[b,window.TOY_ATLAS.products.filter(p=>p.brand===b).length]))")
        for brand, expected in counts.items():
            if not expected:
                continue
            page.locator('#search').fill('no-product-could-match-this')
            page.locator('#brandSelect').select_option(brand)
            expect(page.locator('#search')).to_have_value('')
            expect(page.locator('#resultsHint')).to_have_text(f'{expected:,} products / series')
            result['brand_checks'].append({'brand': brand, 'records': expected})
        page.locator('#resetFilters').click()
        shops = page.locator('#retailer option:not([disabled])').evaluate_all('(es)=>es.map(e=>e.value).filter(Boolean)')
        for shop in shops:
            page.locator('#retailer').select_option(shop)
            assert page.locator('#catalogGrid .product-card').count() > 0, shop
            result['shop_checks'].append(shop)
        page.locator('#resetFilters').click()
        page.locator('.workspace-primary [data-workspace="rankings"]').click()
        assert page.locator('#workspaceRanking tbody tr').count() == 8
        assert 'global revenue' in page.locator('#workspaceRanking').inner_text()
        page.locator('.workspace-primary [data-workspace="inspiration"]').click()
        assert page.locator('.workspace-board-grid [data-board]').count() == 6
        page.locator('.workspace-primary [data-workspace="explore"]').click()
        page.screenshot(path=str(OUT / 'desktop-workspace.png'))
        page.set_viewport_size({'width': 390, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.locator('.workspace-filter-toggle').click()
        expect(page.locator('#currency')).to_be_visible()
        page.screenshot(path=str(OUT / 'mobile-workspace.png'))
        assert not result['errors'], result['errors']
        result['status'] = 'PASSED'
        browser.close()
finally:
    (OUT / 'results.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))
