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


HISTORY_FILE = 'research-history.json'
HISTORY_SCOPE = 'Historical research snapshots, not current offers, inventory or proof of product equivalence.'


def digest_record(record):
    return hashlib.sha256(json.dumps(record, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def history_index(history):
    require(history.get('schema_version') == 1, 'Unsupported research-history schema')
    result = {}
    for entry in history['records']:
        digest = digest_record(entry['record'])
        require(entry.get('sha256') == digest, 'Historical research snapshot hash mismatch')
        require(digest not in result, 'Duplicate historical research snapshot')
        require(entry.get('retained_after') and entry.get('reasons'), 'Historical snapshot provenance missing')
        result[digest] = entry
    return result


def read_history(root):
    p = root/HISTORY_FILE
    history = read(p) if p.exists() else {'schema_version': 1, 'scope': HISTORY_SCOPE, 'records': []}
    history_index(history)
    return history


def detail_facts(value):
    if isinstance(value, dict):
        return {k: detail_facts(v) for k, v in value.items() if k not in ('checked', 'description_checked')}
    if isinstance(value, list):
        return [detail_facts(v) for v in value]
    return value


def loss_reasons(old, new):
    if new is None:
        return ['Original record ID no longer in current products or leads']
    reasons = []
    if signatures(old.get('history', [])) - signatures(new.get('history', [])):
        reasons.append('Historical events replaced or truncated')
    if not option_keys(old) <= option_keys(new):
        reasons.append('Retailer or variant identity changed')
    if priced_offers(old) - priced_offers(new):
        reasons.append('Previous exact-variant price observation superseded')
    if not urls(old) <= urls(new):
        reasons.append('Previous source or photograph reference superseded')
    # Preserve prior identity, source-scoped facts and photo metadata when corrected.
    for key in ('name', 'name_cn', 'brand', 'ip', 'launch', 'china_price', 'sales', 'image', 'image_source', 'details'):
        if key in old and old.get(key) != new.get(key):
            # A detail-review date alone does not need a duplicate historical record.
            previous, latest = old.get(key), new.get(key)
            if key == 'details' and isinstance(previous, dict) and isinstance(latest, dict):
                previous, latest = detail_facts(previous), detail_facts(latest)
            if previous != latest:
                reasons.append('Previous ' + key + ' evidence superseded')
    return reasons


def archive_research(baseline, root):
    current = read(root/'catalog.json')
    require(any(s.get('status') == 'complete' and s.get('checked') == current['updated']
                for s in current.get('sources', [])), 'No source completed for this collection date')
    history = read_history(root)
    entries = history_index(history)
    previous = history_index(baseline.get('research_history', {'schema_version': 1, 'records': []}))
    # Recover an accidentally omitted archive entry from the immutable pre-collection baseline.
    for digest, entry in previous.items():
        require(digest not in entries or entries[digest] == entry, 'Historical snapshot metadata changed')
        entries.setdefault(digest, entry)
    before, after = records(baseline['catalog']), records(current)
    added = 0
    for uid, old in before.items():
        reasons = loss_reasons(old, after.get(uid))
        digest = digest_record(old)
        if reasons and digest not in entries:
            entries[digest] = {'sha256': digest, 'record': old, 'retained_after': current['updated'], 'reasons': reasons}
            added += 1
    history.update(scope=HISTORY_SCOPE, records=[entries[k] for k in sorted(entries)])
    history_index(history)
    target = root/HISTORY_FILE
    temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(history, ensure_ascii=False, separators=(',', ':')) + '\n')
    temporary.replace(target)
    print(json.dumps({'new_historical_snapshots': added, 'total_historical_snapshots': len(entries), 'scope': HISTORY_SCOPE}))
    return history


def snapshot(root):
    data = read(root/'catalog.json')
    media = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
             for folder in ('images',) for p in (root/folder).rglob('*') if p.is_file()}
    return {'catalog': data, 'research_history': read_history(root), 'media': media}


def preservation(baseline, root):
    current = read(root/'catalog.json')
    issues = []
    def record(ok, message):
        if not ok:
            issues.append(message)
    record(any(s.get('status') == 'complete' and s.get('checked') == current['updated']
               for s in current.get('sources', [])), 'No source completed for this collection date')
    archived = history_index(read_history(root))
    prior_archive = history_index(baseline.get('research_history', {'schema_version': 1, 'records': []}))
    record(all(archived.get(k) == v for k, v in prior_archive.items()), 'Historical research archive entries removed or changed')
    before, after = records(baseline['catalog']), records(current)
    retained = {uid for uid, p in before.items() if digest_record(p) in archived}
    for uid in sorted(before.keys() - after.keys() - retained):
        record(False, f'{uid}: Canonical records/retained leads disappeared')
    for uid in sorted((before.keys() & after.keys()) - retained):
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
        'archived_baseline_records': len(retained), 'historical_snapshots': len(archived), 'baseline_records_and_leads': len(before), 'refreshed_records_and_leads': len(after)}, indent=2))
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
    if (root/HISTORY_FILE).exists():
        require((site/HISTORY_FILE).is_file() and read_history(site) == read_history(root), 'Published historical research archive differs')
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
                    require(any(v.get('image') == o['image'] or (v.get('image') == p.get('image') and v.get('imageSource') == o['image']) or any(photo.get('url') == o['image'] for photo in v.get('gallery', [])) for v in matching), 'Variant photo lost: ' + p['id'])
    html = (site/'index.html').read_text()
    for name in ('app.js', 'simple-navigation.js', 'compare.js', 'catalog-guide.js'):
        require('src="' + name in html and (site/name).is_file(), 'Missing public script: ' + name)
    require('src="planogram.js' not in html and 'src="retail-studio.js' not in html, 'Retired development controller loaded')
    require('class="site-switcher"' not in html, 'Combined website navigation returned')
    for n in d['news']:
        require(n.get('sources') and any(s.get('url') for s in n['sources']), 'Unsourced news: ' + n['id'])
    return d


def browser_check(site):
    # Exercise the same native UI that is published, including exact-shop comparison,
    # CSV, saved collections, source-linked news and desktop/mobile navigation.
    import workspace_acceptance
    previous = workspace_acceptance.ROOT
    try:
        workspace_acceptance.ROOT = site.resolve()
        workspace_acceptance.run('all')
    finally:
        workspace_acceptance.ROOT = previous


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['snapshot', 'archive', 'preservation', 'site', 'check'])
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--site', type=Path)
    parser.add_argument('--browser', action='store_true')
    args = parser.parse_args()
    if args.mode in ('snapshot', 'archive', 'preservation', 'check'):
        require(args.baseline is not None, '--baseline is required')
    if args.mode == 'snapshot':
        args.baseline.write_text(json.dumps(snapshot(ROOT), ensure_ascii=False))
    elif args.mode == 'archive':
        archive_research(read(args.baseline), ROOT)
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

