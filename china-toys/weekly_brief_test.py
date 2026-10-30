#!/usr/bin/env python3
"""Rendered regression checks; not a product-by-product accuracy audit."""
import json
from pathlib import Path
import re
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright, expect

R = Path(__file__).resolve().parent
O = Path('/tmp/china-toys-weekly-brief-qa')
O.mkdir(exist_ok=True)
checks, errors = [], []
passed = False
server = subprocess.Popen([sys.executable, '-m', 'http.server', '8792', '--directory', str(R.parent)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
metrics = {}
try:
    time.sleep(0.4)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('http://127.0.0.1:8792/china-toys/', wait_until='networkidle')
        expect(page.locator('[data-executive-brief]')).to_be_visible()
        expect(page.locator('.brief-heading h2')).to_have_text('What changed this week')
        assert page.evaluate("document.querySelector('main.shell').firstElementChild.id") == 'weeklyOverview'
        assert page.title().startswith('China Toy Atlas')
        metrics['all_shops'] = page.locator('.brief-kpi').all_inner_texts()
        checks.append('Weekly brief is the first content section and all four metrics render')
        assert page.locator('.brief-story').count() <= 5
        assert page.locator('.brief-story').count() == page.locator('.brief-story .brief-next').count()
        assert page.locator('.brief-story a').count() >= page.locator('.brief-story').count()
        assert page.locator('.brief-watch').count() == 0 or 'not new weekly news' in page.locator('.brief-watch').inner_text()
        checks.append('Every highlight has sources and next checks; older trend evidence is separate')
        page.screenshot(path=str(O / 'desktop-weekly-brief.png'))
        page.locator('#weeklyOverview').screenshot(path=str(O / 'desktop-full-brief.png'))
        for key in ['added', 'launch', 'price', 'restock']:
            selector = f'#weeklyOverview [data-weekly="{key}"]'
            button = page.locator(selector)
            expected = int(re.search(r'[\d,]+', button.inner_text()).group(0).replace(',', ''))
            button.click()
            page.wait_for_function('(k) => new URLSearchParams(location.search).get("change") === k', arg=key)
            actual = int(re.search(r'[\d,]+', page.locator('#resultsHint').inner_text()).group(0).replace(',', ''))
            assert actual == expected, (key, expected, actual)
            checks.append(f'{key} counter opens exactly {actual} matching entries')
        page.locator('#retailer').select_option('toptoy')
        expect(page.locator('.brief-scope')).to_contain_text('TOP TOY')
        expect(page.locator('[data-brief-shops] b')).to_have_text('1')
        metrics['toptoy'] = page.locator('.brief-kpi').all_inner_texts()
        assert int(re.search(r'[\d,]+', page.locator('#resultsHint').inner_text()).group(0).replace(',', '')) > 0
        checks.append('Retailer selection updates brief scope, counters and product results')
        page.locator('#retailer').select_option('')
        expect(page.locator('.brief-scope')).to_contain_text('All tracked shops')
        if page.locator('#weeklyOverview [data-open]').count():
            expected_title = page.locator('#weeklyOverview [data-open]').first.inner_text()
            page.locator('#weeklyOverview [data-open]').first.click()
            expect(page.locator('#productDialog')).to_be_visible()
            expect(page.locator('#detailTitle')).to_have_text(expected_title)
            page.locator('#closeProduct').click()
            checks.append('Highlighted product opens the correct existing details dialog')
        page.locator('[data-brief-rankings]').click()
        assert page.locator('#ip-rankings').evaluate('(el)=>el.open')
        expect(page.locator('.ip-subtitle')).to_contain_text('global revenue')
        assert page.locator('.ip-rank-row').count() == 8
        checks.append('IP ranking opens with source period and global-revenue scope intact')
        page.locator('#ip-rankings').evaluate('(el)=>el.open=false')
        page.locator('[data-brief-tutorial]').click()
        assert page.locator('#tutorial').evaluate('(el)=>el.open')
        video = page.locator('#atlasTutorialVideo')
        video.evaluate('(v)=>v.load()')
        page.wait_for_function('document.getElementById("atlasTutorialVideo").readyState >= 1')
        metrics['tutorial_duration_seconds'] = video.evaluate('(v)=>v.duration')
        assert metrics['tutorial_duration_seconds'] > 30
        video.evaluate('(v)=>{v.muted=true;return v.play()}')
        page.wait_for_function('document.getElementById("atlasTutorialVideo").currentTime > 0.2')
        video.evaluate('(v)=>v.pause()')
        checks.append('Existing narrated tutorial opens, loads metadata and advances playback')
        page.locator('#tutorial').evaluate('(el)=>el.open=false')
        for width in [390, 768]:
            page.set_viewport_size({'width': width, 'height': 844})
            page.evaluate('scrollTo(0,0)')
            expect(page.locator('[data-executive-brief]')).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), width
            page.screenshot(path=str(O / f'weekly-brief-{width}.png'))
            if width == 390 and page.locator('.brief-story').count():
                page.locator('.brief-story .brief-next summary').first.click()
                assert page.locator('.brief-story .brief-next').first.evaluate('(el)=>el.open')
                page.locator('.brief-story').first.screenshot(path=str(O / 'mobile-highlight-expanded.png'))
            checks.append(f'{width}px layout: no horizontal overflow; weekly panel readable')
        assert not errors, errors
        browser.close()
    # Read ISO-BMFF handler boxes to prove the existing MP4 retains audio.
    # Browser playback above is a separate decoding/interaction check.
    def handlers(buf):
        offset = 0
        while offset + 8 <= len(buf):
            size = int.from_bytes(buf[offset:offset+4], 'big')
            kind = buf[offset+4:offset+8]
            header = 8
            if size == 1:
                assert offset + 16 <= len(buf)
                size = int.from_bytes(buf[offset+8:offset+16], 'big')
                header = 16
            if size == 0:
                size = len(buf) - offset
            assert size >= header and offset + size <= len(buf), 'Invalid MP4 box'
            payload = buf[offset+header:offset+size]
            if kind in (b'moov', b'trak', b'mdia'):
                yield from handlers(payload)
            elif kind == b'hdlr' and len(payload) >= 12:
                yield payload[8:12].decode('ascii', errors='replace')
            offset += size
    track_handlers = list(handlers((R/'tutorial/China_Toy_Atlas_Tutorial.mp4').read_bytes()))
    assert 'soun' in track_handlers and 'vide' in track_handlers
    metrics['tutorial_track_handlers'] = track_handlers
    checks.append('Tutorial MP4 retains video and audio tracks; no physical listening test claimed')
    passed = True
finally:
    server.terminate()
    result = {'passed': passed, 'checks': checks, 'page_errors': errors, 'metrics': metrics, 'viewports': ['1440x1000','390x844','768x844'], 'method':'Playwright Chromium; Browser plugin unavailable', 'scope':'Interface behavior and saved-data consistency only; not exhaustive product/source verification'}
    (O / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
