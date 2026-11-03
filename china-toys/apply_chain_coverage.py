"""Preserve sourced chain entries across builds without inventing store inventory."""
import argparse, csv, hashlib, json, re, urllib.request
from collections import Counter
from datetime import date
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def apply(data):
    supplement=json.loads((ROOT/'chain-coverage.json').read_text())
    sources={s['id']:s for s in data.get('sources',[])}
    for s in supplement['sources']:
        if s['id'] not in sources:data.setdefault('sources',[]).append(s)
        elif sources[s['id']].get('checked','') <= s.get('checked',''):
            sources[s['id']].update(s)
    products={p['id']:p for p in data['products']}
    for p in supplement['products']:
        if p['id'] not in products:data['products'].append(p)
    data['chain_coverage_review']={k:v for k,v in supplement.items() if k not in ('sources','products')}
    # The supplement is applied after the reviewed export. Recount the final
    # population, not just the original collector population, without changing
    # collection/review dates or the evidence on any product.
    ps=data['products'];stats=data.setdefault('stats',{})
    counts=Counter(p['brand'] for p in ps)
    data['brands']=dict(counts)
    stats.update(
        products=len(ps), brands=len(counts),
        squishy=sum('squishy' in p['category'].lower() for p in ps),
        with_images=sum(bool(p.get('image')) for p in ps),
        with_launch_dates=sum(bool(p.get('launch') or p.get('launch_estimate')) for p in ps),
        with_mainland_launch_dates=sum((p.get('launch') or p.get('launch_estimate') or {}).get('market')=='Mainland China' for p in ps),
        with_china_prices=sum(bool(p.get('china_price')) for p in ps),
        with_sales=sum(bool(p.get('sales')) for p in ps),
        with_trend_signals=sum(bool(p.get('trend') and p['trend'].get('expires_on','')>=date.today().isoformat()) for p in ps),
        with_source_prices=sum(any(l.get('price') is not None for l in p.get('listings',[])) for p in ps),
        source_linked_images=sum(bool(p.get('image_review',{}).get('source_match')) for p in ps),
        with_specifications=sum(bool(p.get('details',{}).get('size') or p.get('details',{}).get('material') or p.get('material')) for p in ps),
        with_dimensions=sum(bool(p.get('details',{}).get('size')) for p in ps),
        with_variant_options=sum(any(l.get('options') for l in p.get('listings',[])) for p in ps),
        with_shop_descriptions=sum(bool(p.get('details',{}).get('description')) for p in ps),
    )
    for entry in data.get('brand_checklist', []):
        matches=[p for p in ps if p['brand'].casefold()==entry['brand'].casefold() or (entry['brand']=='SOWII' and 'sowii' in p['name'].lower())]
        entry.update(records=len(matches),
                     with_details=sum(bool(p.get('details',{}).get('size') or p.get('details',{}).get('material') or p.get('material')) for p in matches),
                     with_china_price=sum(bool(p.get('china_price')) for p in matches),
                     with_release=sum(bool(p.get('launch') or p.get('launch_estimate')) for p in matches),
                     status='Partial — more series and China evidence needed' if matches else 'Missing — product research needed')
    return data

def write(root=ROOT,cache_images=False):
    root=Path(root);data=apply(json.loads((root/'catalog.json').read_text()))
    ps=[p for p in data['products'] if p['id'].startswith('miniso-cn-')]
    def photo(p):
        ext=Path(p['image_source']).suffix;rel='images/'+p['id']+ext;dest=root/rel
        if cache_images and not dest.exists():
            try:
                req=urllib.request.Request(p['image_source'],headers={'User-Agent':'ChinaToyAtlas/1.0','Referer':'https://www.miniso.cn/'})
                with urllib.request.urlopen(req,timeout=25) as response:raw=response.read()
                if not (raw.startswith(b'\xff\xd8') or raw.startswith(b'\x89PNG')):raise ValueError('Not a JPEG or PNG')
                dest.parent.mkdir(exist_ok=True);dest.write_bytes(raw)
            except Exception as exc:print('Image cache unavailable:',p['id'],type(exc).__name__)
        if dest.exists():p['image']=rel
    with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(photo,ps))
    packed=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    (root/'catalog.json').write_text(packed);(root/'catalog.js').write_text('window.TOY_ATLAS='+packed+';\n')
    index=root/'index.html'
    if index.exists():index.write_text(re.sub(r'src="catalog\.js(?:\?[^\"]*)?"','src="catalog.js?v='+hashlib.sha256(packed.encode()).hexdigest()[:16]+'"',index.read_text()))
    csvpath=root/'catalog.csv'
    if csvpath.exists():
        with csvpath.open(encoding='utf-8-sig',newline='') as f:reader=csv.DictReader(f);fields=reader.fieldnames;rows=list(reader)
        ids={r.get('id') or (r.get('name'),r.get('product_url')) for r in rows}
        for p in ps:
            if p['id'] in ids or (p['name'],p['listings'][0]['url']) in ids:continue
            l=p['listings'][0]
            row={k:p.get(k,'') for k in fields};row.update(first_seen=p['first_seen'],last_checked=l['checked'],price_market=l['market'],retailer=l['source'],market=l['market'],variant=l['variant'],details_source=l['url'],product_url=l['url'],image_url=p['image_source'],image_source=p['image_source'],shop_description=p['details']['description'],description_source=l['url'],description_checked=l['checked'],audit_note=l['audit_note'])
            rows.append(row)
        with csvpath.open('w',encoding='utf-8-sig',newline='') as f:w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows)
    # Keep report metadata (including visual-review scope) intact while making
    # all exported summary counts describe exactly the catalog just written.
    for name in ('report.json', 'review-report.json'):
        path=root/name
        report=json.loads(path.read_text()) if path.exists() else {}
        if name=='report.json':
            report.update({k:data[k] for k in ('updated','last_full_collection','detail_reviewed','brands','sources') if k in data})
        if name=='review-report.json' and 'brand_checklist' in data:
            report['checklist']=data['brand_checklist']
        report['stats']=data['stats']
        path.write_text(json.dumps(report,ensure_ascii=False,indent=2))
    return data

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--cache-images',action='store_true');args=parser.parse_args()
    d=write(cache_images=args.cache_images);print(json.dumps({'products':len(d['products']),'miniso_showcase':sum(p['id'].startswith('miniso-cn-') for p in d['products'])}))

