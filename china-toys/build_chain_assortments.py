"""Build the reviewed chain supplement without changing historical evidence dates.

--check-sources records reachability only. It never promotes a notice to live stock,
changes a release/price date, or automatically approves a new product.
"""
import argparse,csv,hashlib,json,concurrent.futures,urllib.request
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def validate(d):
    assert d['schema_version']==1
    ids=[p['id'] for p in d['products']];assert len(ids)==len(set(ids))
    sources={s['id']:s for s in d['sources']}
    chain_ids={c['id'] for c in d['chains']}
    assert len(chain_ids)==len(d['chains'])
    assert len(sources)==len(d['sources'])
    for p in d['products']:
        assert p['source_id'] in sources and p['chain_ids'] and p['name'] and p['name_cn']
        assert p['evidence_type'] in {'official_sale_announcement','secondary_flagship_report','independent_store_report'}
        assert p['current_stock'] is None and p['units_sold'] is None
        assert set(p['chain_ids'])<=chain_ids and len(p['chain_ids'])==len(set(p['chain_ids']))
        if p['image']:
            assert p['image_source'].startswith('https://')
            if not p['image'].startswith('https://'):assert (ROOT/p['image']).is_file(),p['image']
        else:assert p['image_source'] is None and p['image_caption']
        for chain,release in p.get('chain_releases',{}).items():
            assert chain in p['chain_ids'] and release['date']<=p['checked'] and release['source']
        assert p['checked']<=d['reviewed']
        for o in p['prices']:
            assert o['amount']>0 and o['currency']=='CNY' and o['basis'] and o['as_of'] and o['source'].startswith('https://')
        if p['release']:
            assert p['release']['date']<=p['checked'] and p['release']['source']
        if p['evidence_type']=='secondary_flagship_report':assert p['release'] is None
    assert {'miniso','x11','kkv','jiumu','kule','green-party','sanfu','ipstar'}<=chain_ids
    assert all(c['coverage_status']=='partial' and c['nav_name'] for c in d['chains'])
    assert all(any(c['id'] in p['chain_ids'] for p in d['products']) for c in d['chains'])

def source_health(d):
    checked=datetime.now(timezone.utc).isoformat()
    urls=sorted({s['url'] for s in d['sources']}|{c['official_reference'] for c in d['chains']})
    def get(url):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'ChinaToyAtlas evidence-link check'})
            with urllib.request.urlopen(req,timeout=20) as r:
                raw=r.read(2000000)
                return {'url':url,'status':'reachable','http_status':r.status,'final_url':r.url,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
        except Exception as e:return {'url':url,'status':'unavailable','error':str(e)[:220]}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:rows=list(pool.map(get,urls))
    (ROOT/'chain-source-health.json').write_text(json.dumps({'checked_at':checked,'scope':'Link reachability only; not inventory, identity, price or stock revalidation. HTTP 200 may still contain a login or challenge page.','sources':rows},ensure_ascii=False,indent=2)+'\n')

def build(check_sources=False):
    d=json.loads((ROOT/'chain-assortments.json').read_text());validate(d)
    sources={s['id']:s for s in d['sources']}
    official=[p for p in d['products'] if p['evidence_type']=='official_sale_announcement']
    reported=[p for p in d['products'] if p['evidence_type']=='secondary_flagship_report']
    store_reports=[p for p in d['products'] if p['evidence_type']=='independent_store_report']
    d['summary']={'new_product_series_records':len(d['products']),'first_party_sale_records':len(official),'secondary_flagship_reports':len(reported),'current_stock_confirmed':0,'complete_chain_inventories':0,'independent_store_reports':len(store_reports),'brand_references_excluded':len(d.get('brand_release_references',[])),'retailers_reviewed':len(d['chains']),'records_with_photos':sum(bool(p['image']) for p in d['products']),'records_with_prices':sum(bool(p['prices']) for p in d['products'])}
    for c in d['chains']:
        ps=[p for p in d['products'] if c['id'] in p['chain_ids']]
        c['first_party_records']=sum(p['evidence_type']=='official_sale_announcement' for p in ps)
        c['store_report_records']=sum(p['evidence_type']=='independent_store_report' for p in ps)
        c['secondary_records']=sum(p['evidence_type']=='secondary_flagship_report' for p in ps)
    packed=json.dumps(d,ensure_ascii=False,separators=(',',':'))
    (ROOT/'chain-assortments-data.js').write_text('window.CHAIN_ASSORTMENTS='+packed+';\n')
    with (ROOT/'chain-assortments.csv').open('w',encoding='utf-8-sig',newline='') as f:
        keys=['id','name','name_cn','brand','chains','category','evidence_type','retail_scope','variants','pack','prices','chain_release','chain_specific_releases','image_status','source_published','evidence_checked','current_stock','units_sold','image_source','source_url']
        w=csv.DictWriter(f,fieldnames=keys,lineterminator='\n');w.writeheader()
        for p in d['products']:
            w.writerow({**{k:p.get(k,'') for k in ['id','name','name_cn','brand','category','evidence_type','retail_scope','pack','image_source']},'chains':' | '.join(p['chain_ids']),'variants':json.dumps(p['variants'],ensure_ascii=False),'prices':json.dumps(p['prices'],ensure_ascii=False),'chain_release':(p['release'] or {}).get('date',''),'chain_specific_releases':json.dumps(p.get('chain_releases',{}),ensure_ascii=False),'image_status':'Captured source photo' if p['image'] else p['image_caption'],'source_published':sources[p['source_id']].get('published_date'),'evidence_checked':p['checked'],'current_stock':'Not verified','units_sold':'Not disclosed','source_url':sources[p['source_id']]['url']})
    report=['# Retail-chain assortment review — '+d['reviewed'],'','Live directory: https://royhei-cpu.github.io/china-toys/?chain=miniso#retailChains','',f"Added **{len(official)} first-party sale-announcement product/series records** and **{len(reported)} separately labeled secondary flagship reports**, plus **{len(store_reports)} independent store-report records**. General brand releases are excluded from these totals. Shared products are stored once, with multiple documented chain relationships. These are dated assortment records, not proof of current inventory or completed transactions.",'','The original seven MINISO China showcase records remain intact. They are not converted into Tmall stock or price records. The original eight requested source reviews and all tracked additional retailers are recorded; **no chain is marked complete**.','', '| Chain | First-party product/series records | Flagship reports | Store reports | Remaining limitation |','|---|---:|---:|---:|---|']
    report.insert(4,f"Registry: **{len(d['chains'])} retailers**. This expanding registry does not establish coverage of every retailer in China. The latest expansion adds **{d.get('review_batches',[{}])[-1].get('new_records',0)} records**; original catalog product records are preserved.")
    report.insert(5,'')
    for c in d['chains']:report.append(f"| {c['name']} | {c['first_party_records']} | {c['secondary_records']} | {c['store_report_records']} | {c['gap']} Squishies: {c['squishy_status']}. |")
    report+=['','## Newly documented products','', '| Product / series | Chain(s) | Evidence | Source date | Chain release | Price basis |','|---|---|---|---|---|---|']
    for p in d['products']:
        s=sources[p['source_id']];price='; '.join(f"CNY {o['amount']:g} / {o['basis']} ({o['type']}, {o['as_of']})" for o in p['prices']) or 'Not established'
        release='; '.join(c+': '+r['date'] for c,r in p.get('chain_releases',{}).items()) or (p['release'] or {}).get('date','Not established')
        report.append(f"| {p['name']} · {p['name_cn']} | {', '.join(p['chain_ids'])} | [{p['evidence_type']}]({s['url']}) | {s.get('published_date') or 'Not stated'} | {release} | {price} |")
    report+=['','## Unresolved evidence','', '- MINISO Tmall redirected to its world.tmall.com store and was inaccessible to the retrieval tool. Third-party seller labels are reports, not an authenticated flagship inventory.', '- No live stock quantities, units sold or complete chain SKU totals are asserted. Product variant counts are not inventory counts.', '- Several chains use mini-programs or per-store assortments. Corporate profiles and retailer opening notices are excluded from product evidence.', '- Manufacturer notices may establish suggested/announced prices, not the price charged today. New record date is not launch date.', '- No first-party product-level squishy assortment was established for X11, KKV, Jiumu, The Green Party, SANFU or IPSTAR in this pass. KKV and Jiumu now have separately labeled secondary squishy reports. Category-level references and ambiguous reseller offers were not promoted into confirmed products.', '- Some secondary MINISO price fields conflict or mix pack sizes. Those prices were left blank. Sales counters were not imported.', '', '## Weekly maintenance','', 'The existing Monday collector and research automation are retained. Reviewed additions live in `chain-assortments.json`; generated JS, CSV and this report are rebuilt from it. `--check-sources` records link reachability separately and never advances evidence, launch, price or stock dates. The weekly research pass must revisit every chain in the expanded registry, discover additional China toy retailers, examine new retailer/manufacturer listings and announcements, validate chain-specific sale evidence, and update the source JSON before publishing. A successful HTTP request is not a completed inventory refresh.']
    report+=['','## Latest retailer review findings','']+[f"- {x['chain_id']} ({x['checked']}): {x['result']} [Source]({x['source']})" for x in d.get('review_findings',[])]
    report+=['','## Brand releases excluded from chain counts','']+[f"- {p['name']} · {p['name_cn']}: manufacturer release only; chain sale not established. [Source]({sources[p['source_id']]['url']})" for p in d.get('brand_release_references',[])]
    report+=['','## Unavailable images','']+[f"- {p['name']}: {p['image_caption']}. [Source]({sources[p['source_id']]['url']})" for p in d['products'] if not p['image']]
    report += ['','## Rejected or insufficient sources','']
    report += [f"- {x['url']} — {x['reason']}" for x in d['rejected_evidence']]
    (ROOT/'CHAIN_ASSORTMENT_REVIEW.md').write_text('\n'.join(report)+'\n')
    if check_sources:source_health(d)
    return d

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--check-sources',action='store_true');args=a.parse_args();print(json.dumps(build(args.check_sources)['summary']))
