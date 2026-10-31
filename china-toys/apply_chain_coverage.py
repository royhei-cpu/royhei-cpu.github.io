"""Preserve sourced chain entries across builds without inventing store inventory."""
import argparse, csv, hashlib, json, re, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def apply(data):
    supplement=json.loads((ROOT/'chain-coverage.json').read_text())
    sources={s['id']:s for s in data.get('sources',[])}
    for s in supplement['sources']:
        if s['id'] not in sources:data.setdefault('sources',[]).append(s)
    products={p['id']:p for p in data['products']}
    for p in supplement['products']:
        if p['id'] not in products:data['products'].append(p)
    data['chain_coverage_review']={k:v for k,v in supplement.items() if k not in ('sources','products')}
    ps=data['products'];stats=data.setdefault('stats',{})
    stats.update(products=len(ps),brands=len({p['brand'] for p in ps}),squishy=sum('squishy' in p['category'].lower() for p in ps),with_images=sum(bool(p.get('image')) for p in ps))
    data['brands']=sorted({p['brand'] for p in ps}) if isinstance(data.get('brands'),list) and all(isinstance(x,str) for x in data['brands']) else data.get('brands')
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
        ids={r['id'] for r in rows}
        for p in ps:
            if p['id'] in ids:continue
            l=p['listings'][0]
            row={k:p.get(k,'') for k in fields};row.update(retailer=l['source'],market=l['market'],variant=l['variant'],details_source=l['url'],product_url=l['url'],image_url=p['image_source'],image_source=p['image_source'],shop_description=p['details']['description'],description_source=l['url'],description_checked=l['checked'],audit_note=l['audit_note'])
            rows.append(row)
        with csvpath.open('w',encoding='utf-8-sig',newline='') as f:w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows)
    return data

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--cache-images',action='store_true');args=parser.parse_args()
    d=write(cache_images=args.cache_images);print(json.dumps({'products':len(d['products']),'miniso_showcase':sum(p['id'].startswith('miniso-cn-') for p in d['products'])}))
