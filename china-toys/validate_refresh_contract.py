"""Fail before saving if research is lost or the simplified directory drops offers."""
import argparse
import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import threading
from collections import Counter

ROOT = Path(__file__).resolve().parent


def require(ok, message):
    if not ok:
        raise ValueError(message)


def read(path):
    return json.loads(path.read_text())


def signatures(values):
    return Counter(json.dumps(v, sort_keys=True, ensure_ascii=False) for v in values)


def records(data):
    result = {}
    for p in data.get('products', []) + data.get('source_leads', []):
        require(p['id'] not in result, 'Duplicate canonical/lead ID: ' + p['id'])
        result[p['id']] = p
    return result


def urls(value):
    if isinstance(value, str):
        return {value} if value.startswith(('https://', 'http://')) else set()
    if isinstance(value, dict):
        value = value.values()
    if isinstance(value, (list, tuple)) or type(value).__name__ == 'dict_values':
        return set().union(*(urls(v) for v in value)) if value else set()
    return set()


def option_keys(p):
    return {(l.get('previous_url') or l.get('url'), l.get('source_id') or l.get('source'),
             o.get('name') or '', o.get('currency') or l.get('currency'))
            for l in p.get('listings', [])
            for o in [dict(name=l.get('variant'), currency=l.get('currency'))] + (l.get('options') or [])}


def priced_offers(p):
    return {(l.get('previous_url') or l.get('url'), o.get('name') or '',
             o.get('currency') or l.get('currency'), o.get('price'))
            for l in p.get('listings', [])
            for o in [dict(name=l.get('variant'), price=l.get('price'), currency=l.get('currency'))] + (l.get('options') or [])
            if o.get('price') is not None}


def snapshot(root):
    data = read(root/'catalog.json')
    media = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
             for folder in ('images',) for p in (root/folder).rglob('*') if p.is_file()}
    return {'catalog': data, 'media': media}


def preservation(baseline, root):
    current = read(root/'catalog.json')
    issues = []
    def record(ok, message):
        if not ok:
            issues.append(message)
    record(any(s.get('status') == 'complete' and s.get('checked') == current['updated']
               for s in current.get('sources', [])), 'No source completed for this collection date')
    before, after = records(baseline['catalog']), records(current)
    for uid in sorted(before.keys() - after.keys()):
        record(False, f'{uid}: Canonical records/retained leads disappeared')
    for uid in sorted(before.keys() & after.keys()):
        old, new = before[uid], after[uid]
        record(not (signatures(old.get('history', [])) - signatures(new.get('history', []))),
               f'{uid}: historical events removed; archive/reconcile before saving')
        record(option_keys(old) <= option_keys(new), f'{uid}: retailer/variant identity removed')
        for source, variant, currency, price in sorted(priced_offers(old) - priced_offers(new), key=repr):
            record(any(h.get('type') == 'price' and h.get('source') == source
                       and h.get('variant') == variant and h.get('currency') == currency
                       and (h.get('from') == price or h.get('to') == price)
                       for h in new.get('history', []) if isinstance(h, dict)),
                   f'{uid}: previous exact-variant price lost: {currency} {price}, {variant}; reconcile/archive before saving')
        record(urls(old) <= urls(new), f'{uid}: recorded source or photograph URL removed')
    for name, digest in sorted(baseline['media'].items()):
        p = root/name
        record(p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest() == digest,
               'Existing media removed or overwritten: ' + name)
    out = Path('/tmp/china-toys-directory-qa'); out.mkdir(exist_ok=True)
    (out/'preservation.json').write_text(json.dumps({'passed': not issues, 'issues': issues,
        'baseline_records_and_leads': len(before), 'refreshed_records_and_leads': len(after)}, indent=2))
    require(not issues, '\n'.join(issues))
    return current


def unpack(site):
    raw = (site/'directory-data.js').read_text()
    require(raw.startswith('window.DIRECTORY='), 'Missing public directory payload')
    d = json.loads(raw[len('window.DIRECTORY='):].rstrip(';\n'))
    if d.get('packed'):
        p = d['packed']
        d['items'] = [{k: p['pool'][i] for k, i in zip(p['keys'], row) if i >= 0} for row in p['rows']]
    return d


def validate_site(site, root):
    d = unpack(site)
    require(d['id'] == 'china-toys' and d['items'], 'Wrong or empty directory')
    rows = d['items']
    require(len({p['id'] for p in rows}) == len(rows), 'Duplicate public IDs')
    coverage = read(root/'ip-coverage.json')
    catalog = read(site/'catalog.json')
    require(coverage['catalog_date'] == catalog['updated'], 'Stale IP coverage date')
    canonical_ids = {p['id'] for p in read(root/'catalog.json')['products']}
    require(all(set(ip['product_ids']) <= canonical_ids for ip in coverage['all_character_filters']),
            'IP index references missing canonical products')
    ip_index = {uid: ip['name'] for ip in coverage['all_character_filters'] for uid in ip['product_ids']}
    for p in catalog['products']:
        variants = [r for r in rows if r.get('group', r['id']) == p['id']]
        require(variants, 'Missing product: ' + p['id'])
        expected_character = ip_index.get(p['id'], p.get('ip') or '')
        require(all(v.get('character') == expected_character for v in variants), 'Character mapping changed: ' + p['id'])
        for l in p.get('listings') or []:
            for o in [dict(name=l.get('variant'), price=l.get('price'), currency=l.get('currency'))] + (l.get('options') or []):
                matching = [v for v in variants if v.get('url') == (l.get('url') or '')
                            and v.get('retailer') == (l.get('source') or '')
                            and v.get('variant') == (o.get('name') or '')
                            and v.get('currency') == (o.get('currency') or l.get('currency') or '')
                            and v.get('amount') == o.get('price')]
                require(matching, 'Exact offer missing or changed: ' + p['id'])
                if o.get('image'):
                    require(any(v.get('image') == o['image'] for v in matching), 'Variant photo lost: ' + p['id'])
    html = (site/'index.html').read_text()
    for name in ('directory-data.js', 'directory.js', 'guide-chapters.js'):
        require('src="' + name in html and (site/name).is_file(), 'Missing public script: ' + name)
    require('src="app.js' not in html and 'src="ip-directory.js' not in html, 'Retired controller loaded')
    for n in d['news']:
        require(n.get('sources') and any(s.get('url') for s in n['sources']), 'Unsourced news: ' + n['id'])
    return d


def browser_check(site):
    from playwright.sync_api import sync_playwright, expect
    out = Path('/tmp/china-toys-directory-qa'); out.mkdir(exist_ok=True)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(site.parent))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True); worker.start()
    errors = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE"))
            for width in (1440, 390):
                page = browser.new_page(viewport={'width': width, 'height': 900})
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.goto(f'http://127.0.0.1:{server.server_port}/china-toys/', wait_until='domcontentloaded')
                expect(page.locator('#cards [data-detail]').first).to_be_visible()
                character = page.locator('#f-character option').nth(1).get_attribute('value')
                page.locator('.more-filters').evaluate('(e)=>e.open=true')
                page.locator('#f-character').select_option(character)
                require(page.evaluate('(c)=>DirectoryTest.filtered().length>0 && DirectoryTest.filtered().every(p=>p.character===c)', character), 'Character filter failed')
                page.locator('[data-reset]').first.click()
                page.locator('#search').fill(character)
                require(page.evaluate('DirectoryTest.filtered().length>0'), 'Character search failed')
                page.locator('#cards [data-pick]').first.check()
                page.locator('[data-route="compare"]').click()
                expect(page.locator('#comparison table')).to_be_visible()
                with page.expect_download() as download:
                    page.locator('#export-selected').click()
                require(download.value.suggested_filename.endswith('.csv'), 'CSV export failed')
                page.locator('[data-route="news"]').click()
                expect(page.locator('#news-status')).to_be_visible()
                page.locator('[data-route="search"]').click()
                require(page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Horizontal overflow')
                page.screenshot(path=str(out/f'directory-{width}.png'))
                page.close()
            browser.close()
        require(not errors, 'Browser errors: ' + repr(errors))
        (out/'results.json').write_text(json.dumps({'passed': True, 'viewports': [1440, 390], 'scope': 'Search, character filter, compare, CSV, news; not a live source or tutorial media audit'}))
    finally:
        server.shutdown(); server.server_close(); worker.join()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['snapshot', 'preservation', 'site', 'check'])
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--site', type=Path)
    parser.add_argument('--browser', action='store_true')
    args = parser.parse_args()
    if args.mode in ('snapshot', 'preservation', 'check'):
        require(args.baseline is not None, '--baseline is required')
    if args.mode == 'snapshot':
        args.baseline.write_text(json.dumps(snapshot(ROOT), ensure_ascii=False))
    elif args.mode == 'preservation':
        preservation(read(args.baseline), ROOT)
        print('Research preservation passed')
    else:
        require(args.site is not None, '--site is required')
        if args.mode == 'check':
            preservation(read(args.baseline), ROOT)
        d = validate_site(args.site, ROOT)
        if args.browser:
            browser_check(args.site)
        print(json.dumps({'validated_directory_records': len(d['items']), 'scope': 'Directory contract; source coverage remains partial'}))
