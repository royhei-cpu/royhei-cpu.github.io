"""Conservative, dated asking-price comparisons within an existing product record."""
from datetime import date, datetime
from zoneinfo import ZoneInfo
from statistics import median
import re

WINDOW_DAYS = 30

def basis(name, url):
    s = re.sub(r'\s+', ' ', (name or '').strip().lower())
    if s in ('1 box', 'single box', 'a single box', 'one box', 'one box(random)', 'one box (random)'):
        return 'Single blind box'
    if re.fullmatch(r'(?:no box\s*-?\s*1\s*(?:pc|pcs)|1\s*(?:pc|pcs)\s*-?\s*no box)', s):
        return 'One item without box'
    if s in ('', 'default title', 'see listing options'):
        # Unknown packs at different URLs must never be merged.
        return 'Unspecified option @ ' + url
    return s

def enrich(data, as_of=None):
    today = date.fromisoformat(as_of) if as_of else datetime.now(ZoneInfo('Asia/Shanghai')).date()
    sources = {s['id']: s for s in data.get('sources', [])}
    counts = {'products_with_prices': 0, 'products_with_multiple_shops': 0}
    for p in data['products']:
        groups = {}
        excluded = 0
        for l in p.get('listings', []):
            src = sources.get(l.get('source_id'), {})
            checked = l.get('options_checked') if l.get('options') else l.get('checked')
            checked = checked or l.get('checked')
            try:
                age = (today - date.fromisoformat(checked)).days
            except (TypeError, ValueError):
                age = WINDOW_DAYS + 1
            if str(l.get('link_status', '')).startswith(('4', '5')) or src.get('status') == 'unavailable' or age < 0 or age > WINDOW_DAYS:
                excluded += 1
                continue
            for o in l.get('options') or [dict(name=l.get('variant'), price=l.get('price'), currency=l.get('currency'), available=l.get('available'))]:
                price = o.get('price')
                currency = o.get('currency') or l.get('currency')
                market = l.get('market')
                if not isinstance(price, (float, int)) or isinstance(price, bool) or price <= 0 or not currency or not market:
                    continue
                name = o.get('name') or 'Option not specified'
                pack = basis(name, l['url'])
                key = (currency, market, pack)
                g = groups.setdefault(key, {'currency': currency, 'market': market, 'basis': 'Option not specified' if pack.startswith('Unspecified option @ ') else pack, 'offers': []})
                offer = {'price': price, 'source': l.get('source', 'Shop'), 'url': l['url'], 'variant': name, 'checked': checked, 'available': o.get('available')}
                if offer not in g['offers']:
                    g['offers'].append(offer)
        result = []
        for g in groups.values():
            offers = g['offers']
            prices = [o['price'] for o in offers]
            dates = sorted(o['checked'] for o in offers)
            g.update(low=min(prices), high=max(prices), median=median(prices), listing_count=len({o['url'] for o in offers}), shop_count=len({o['source'] for o in offers}), available_count=sum(o['available'] is True for o in offers), checked_from=dates[0], checked_to=dates[-1])
            result.append(g)
        p['market_prices'] = {'as_of': today.isoformat(), 'window_days': WINDOW_DAYS, 'excluded_listings': excluded, 'groups': result}
        counts['products_with_prices'] += bool(result)
        counts['products_with_multiple_shops'] += any(g['shop_count'] > 1 for g in result)
    data['market_price_method'] = {'as_of': today.isoformat(), 'window_days': WINDOW_DAYS, **counts,
        'basis': 'Observed advertised asking prices, including sold-out options; not completed sales or an appraisal. Same catalog product, market, currency and pack only. Shipping, tax and discounts at checkout excluded. Broken, unavailable-source, undated and older observations excluded. No estimated ranges for missing data.'}
    return counts
