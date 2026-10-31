#!/usr/bin/env python3
"""Apply dated, exact-offer audit corrections without refreshing unrelated facts.

Used for public builds and after weekly collection. Newer observations win.
No discovery candidate is silently promoted into the product catalog.
"""
import argparse, csv, hashlib, json, re
from pathlib import Path

from market_prices import enrich as enrich_market_prices

ROOT = Path(__file__).resolve().parent

def apply(data, audit):
    date = audit['checked']
    changes = {}
    for c in audit['variant_changes']:
        changes.setdefault(c['url'], []).append(c)
    links = {c['url']: c for c in audit['product_link_checks']}
    applied = {'variants': 0, 'broken_links': 0, 'redirects': 0}
    stores = {s['id']: s for s in audit['stores']}
    for s in data.get('sources', []):
        if s['id'] == 'toyzero':
            s['url'] = 'https://toyzeroplus.com'
        if s['id'] in stores:
            s['external_audit'] = {k: stores[s['id']][k] for k in ('checked','status','finding')}
        if (s.get('checked') or '') < date:
            if s['id'] in ('rolife','toyzero','molynk'):
                s['status'] = 'page readable; direct assortment not captured'
                s['issue'] = stores[s['id']]['finding']
            elif s['id'] == 'kouhigh':
                s['status'] = 'unavailable'
                s['issue'] = 'Maintenance page observed '+date+'; retained offers have not been revalidated.'
    for p in data.get('products', []):
        for l in p.get('listings', []):
            url = l['url']
            # Same-day or later collector observations take precedence over this snapshot.
            if (l.get('options_checked') or l.get('checked') or '') < date:
                changed = False
                for c in changes.get(url, []):
                    for v in l.get('options', []):
                        if str(v.get('id')) != c['variant_id']:
                            continue
                        if v.get('price') != c['old_price'] or v.get('available') != c['old_available']:
                            continue
                        v.update(price=c['price'], available=c['available'])
                        if l.get('variant') == v.get('name'):
                            l.update(price=c['price'], available=c['available'], checked=date)
                        changed = True
                        applied['variants'] += 1
                if changed:
                    l['options_checked'] = date
                    l['audit_checked'] = date
            if (l.get('checked') or '') < date and url in links:
                c = links[url]
                if c.get('status') == 404:
                    l.update(available=None, link_status=404, audit_checked=date,
                             audit_note='Product link returned 404 on '+date+'. Price is historical; current availability is unknown.')
                    for v in l.get('options', []):
                        v['available'] = None
                    applied['broken_links'] += 1
                elif c.get('redirected') and c.get('status') == 200:
                    l.update(url=c['final_url'], previous_url=url, link_status=200, audit_checked=date,
                             audit_note='Verified redirect to the renamed product page on '+date+'.')
                    applied['redirects'] += 1
    data['external_source_audit'] = {'checked':date, 'scope':audit['scope'], 'summary':audit['summary'], 'report':'research.html'}
    return applied

def write_outputs(root, data, audit):
    from apply_chain_coverage import apply as apply_chain_coverage
    apply_chain_coverage(data)
    enrich_market_prices(data)
    packed = json.dumps(data, ensure_ascii=False, separators=(',',':'))
    (root/'catalog.json').write_text(packed)
    (root/'catalog.js').write_text('window.TOY_ATLAS='+packed+';\n')
    # Change the asset URL whenever the published data changes, including weekly refreshes.
    indexpath = root/'index.html'
    if indexpath.exists():
        version = hashlib.sha256(packed.encode()).hexdigest()[:16]
        indexpath.write_text(re.sub(r'src="catalog\.js(?:\?[^\"]*)?"',
            'src="catalog.js?v='+version+'"', indexpath.read_text()))
    csvpath = root/'catalog.csv'
    if csvpath.exists():
        with csvpath.open(newline='',encoding='utf-8-sig') as f:
            reader=csv.DictReader(f); fields=list(reader.fieldnames); rows=list(reader)
        products={p['id']:p for p in data['products']}
        offers={l.get('previous_url',l['url']):l for p in data['products'] for l in p.get('listings',[])}
        fields += [x for x in ('link_status','audit_checked','audit_note','image_url','gallery_image_urls','shop_options_json','availability_at_check','market_prices_json','observed_low','observed_high','observed_currency','observed_market','observed_pack','observed_listing_count','observed_checked_from','observed_checked_to') if x not in fields]
        for row in rows:
            p=products.get(row.get('id'),{})
            row['market_prices_json']=json.dumps(p.get('market_prices',{}),ensure_ascii=False)
            image=p.get('image','')
            absolute=lambda u:u if u.startswith(('https://','http://')) else 'https://royhei-cpu.github.io/china-toys/'+u
            row['image_url']=absolute(image) if image else ''
            row['gallery_image_urls']=' | '.join(absolute(u) for u in p.get('gallery',[]))
            l=offers.get(row.get('product_url'))
            if not l: continue
            group=next((g for g in p.get('market_prices',{}).get('groups',[]) if any(o['url']==l['url'] and o['variant']==l.get('variant') for o in g['offers'])),{})
            for column,key in [('low','low'),('high','high'),('currency','currency'),('market','market'),('pack','basis'),('listing_count','listing_count'),('checked_from','checked_from'),('checked_to','checked_to')]:
                row['observed_'+column]=group.get(key,'')
            row['shop_options_json']=json.dumps(l.get('options',[]),ensure_ascii=False)
            row['availability_at_check']='Available' if l.get('available') is True else 'Out of stock' if l.get('available') is False else ''
            if l.get('audit_checked'):
                row.update(product_url=l['url'], audit_checked=l['audit_checked'],audit_note=l.get('audit_note',''),link_status=l.get('link_status',''))
                if row.get('variant') == l.get('variant'):
                    for field in ('source_price','retailer_price'):
                        if field in fields: row[field]=l.get('price')
                    for field in ('last_checked','price_checked'):
                        if field in fields: row[field]=l.get('checked')
        with csvpath.open('w',newline='',encoding='utf-8-sig') as f:
            writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows(rows)
    reportpath=root/'report.json'
    if reportpath.exists():
        report=json.loads(reportpath.read_text());report['external_source_audit']=data['external_source_audit'];report['sources']=data.get('sources',[])
        reportpath.write_text(json.dumps(report,ensure_ascii=False,indent=2))

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--site',type=Path,default=ROOT);parser.add_argument('--config',action='store_true');args=parser.parse_args()
    if args.config:
        p=ROOT/'sources.json';data=json.loads(p.read_text())
        for s in data['sources']:
            if s['id']=='toyzero':s['url']='https://toyzeroplus.com'
        p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');return
    audit=json.loads((ROOT/'source-audit.json').read_text());data=json.loads((args.site/'catalog.json').read_text())
    result=apply(data,audit);write_outputs(args.site,data,audit);print(json.dumps(result))

if __name__=='__main__': main()

