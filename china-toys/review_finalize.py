#!/usr/bin/env python3
"""Reviewed entrypoint: keep per-field provenance and finalize public data/UI together."""
from __future__ import annotations
import csv,json,re
from collections import Counter
from pathlib import Path
import review as v

R=v.R
v.ALIASES.update({'pop sunday':'POPSUNDAY','popsunday':'POPSUNDAY','sonnyangel':'Sonny Angel','lisa lisa':'Lisa','sweet squishy':'Sweet Squishy','san-x':'San-X'})
original_add=v.add_details

def add(p,raw,s,currency,listing):
    original_add(p,raw,s,currency,listing)
    fields,_=v.specs(raw);det=p.setdefault('details',{});sources=det.setdefault('field_sources',{})
    for k in ['material','size','age','scale']:
        if fields.get(k):sources[k]={'url':listing['url'],'checked':v.TODAY}
    p['stale']=False
    # Exact brand words in a product name can repair a missing label, not an inferred IP owner.
    if p['brand']=='Brand not disclosed':
        for spelling,canonical in [('Sonny Angel','Sonny Angel'),('Smiski','SMISKI'),('Funism','Funism'),('POP SUNDAY','POPSUNDAY'),('iBloom','iBloom')]:
            if re.search(r'(?<!\w)'+re.escape(spelling)+r'(?!\w)',raw['title'],re.I):p['brand']=canonical;break
    review=p.get('image_review',{});matched=next((x for x in raw.get('variants',[]) if x.get('title')==listing.get('variant')),None)
    image=v.variant_image(raw,matched) if matched else None
    if review.get('source')==listing['url'] and image:
        p['_variant_image']=image;p['_variant_image_source']=listing['url']
    if review.get('source')==listing['url'] and review.get('status')=='Same-product source image':review['source_match']=True
v.add_details=add
original_reason=v.reason_not_item
v.reason_not_item=lambda p:original_reason(p) or ('Mixed-series bundle; not an individual series' if p['name']=="Blind Box Collector's Bundle" else None)

EXTRA=[
 {'ids':['23d11410d5e889e9'],'date':'2026-10-15','cn':79,'set':316,'zh':'小黄人与大怪兽-片场大冒险系列','source':'https://www.sina.cn/news/detail/5352078538440919.html','note':'52TOYS official announcement. Each design uses a wind-up or mechanical action; movements differ by design.','features':['Wind-up or mechanical-action figures','Different movement for each design']},
 {'ids':['cda530057d017fb2'],'date':'2026-10-22','cn':29,'set':174,'zh':'猫猫干架行为大赏PVC盲盒','source':'https://www.sina.cn/news/detail/5353920588154612.html','note':'52TOYS official release announcement; PVC blind-box cat figures.','material':'PVC'},
 {'ids':['bfb2757720f8298d','9839a0c7b075327a'],'date':'2026-08-13','cn':69,'set':414,'zh':'驯龙高手 光夜交织','source':'https://www.sina.cn/news/detail/5328217059624973.html','note':'52TOYS official announcement for Intertwined Light & Night. Historical single-box launch price.','features':['Toothless has a soft-touch body finish; Light Fury has a pearlescent finish','Glow-in-the-dark eyes, according to the brand']},
 {'ids':['94fb8f025dd0a0a2','38b921675ccc731e'],'date':'2026-10-15','cn':69,'set':414,'regular':6,'secret':1,'zh':'苏州丝绸博物馆 × Molinta 藏梦录系列','source':'https://mowanmi.com/post/8444.html','note':'October 14 trade reporting quotes the announced October 15 release, six regular designs and one secret. Actual launch completion not independently observed.','confidence':'medium','status':'Announced release date'},
 {'ids':['5318f353a2038cbb'],'date':'2026-09-10','zh':'Q宝闪光的小热爱系列毛绒挂件盲盒','source':'https://www.sina.cn/news/detail/5340973257461374.html','note':'JOTOYS verified account post dated September 8, 2026 announces online launch September 10 at 20:00. No China price was supplied.'}
]
APPEAL={
 'a6352811fd423b78':'Travel-themed characters in a wearable vinyl-plush pendant format; a possible gifting and bag-accessory appeal, not a measured cause of sales.',
 '25883b4f5b30a725':'Weather-themed plush characters and a CNY79 historical entry price; collectible gifting appeal is an interpretation, not a measured cause of demand.',
 '5496b7c05a7bcbb0':'Theatre-themed DIMOO costumes in vinyl-plush pendants; character styling and wearable display are plausible attractions, not proven sales drivers.',
 '6795ac535d4629da':'Tactile cake slices can be shared or assembled, with cake-box gift presentation. These features may support gifting and hands-on play; the source only verifies launch interest.'
}

def save_outputs(d):
    ps=d['products'];counts=Counter(p['brand'] for p in ps);d['brands']=dict(counts);stats=d['stats']
    stats.update(products=len(ps),brands=len(counts),squishy=sum('Squishy' in p['category'] for p in ps),with_images=len(ps),with_launch_dates=sum(bool(p.get('launch') or p.get('launch_estimate')) for p in ps),with_mainland_launch_dates=sum((p.get('launch') or p.get('launch_estimate') or {}).get('market')=='Mainland China' for p in ps),with_china_prices=sum(bool(p.get('china_price')) for p in ps),with_sales=sum(bool(p.get('sales')) for p in ps),source_linked_images=sum(bool(p.get('image_review',{}).get('source_match')) for p in ps),with_trend_signals=sum(bool(p.get('trend') and p['trend'].get('expires_on','')>=v.TODAY) for p in ps),with_specifications=sum(bool(p.get('details',{}).get('size') or p.get('details',{}).get('material') or p.get('material')) for p in ps),with_dimensions=sum(bool(p.get('details',{}).get('size')) for p in ps),with_variant_options=sum(any(l.get('options') for l in p['listings']) for p in ps),with_source_prices=sum(any(l.get('price') is not None for l in p['listings']) for p in ps))
    for b in d['brand_checklist']:
        ms=[p for p in ps if p['brand'].casefold()==b['brand'].casefold() or (b['brand']=='SOWII' and 'sowii' in p['name'].lower())]
        b.update(records=len(ms),with_details=sum(bool(p.get('details',{}).get('size') or p.get('details',{}).get('material') or p.get('material')) for p in ms),with_china_price=sum(bool(p.get('china_price')) for p in ms),with_release=sum(bool(p.get('launch') or p.get('launch_estimate')) for p in ms),status='Partial — more series and China evidence needed' if ms else 'Missing — product research needed')
    raw=json.dumps(d,ensure_ascii=False,separators=(',',':'));(R/'catalog.json').write_text(raw);(R/'catalog.js').write_text('window.TOY_ATLAS='+raw+';')
    report=json.loads((R/'review-report.json').read_text());report['stats']=stats;report['checklist']=d['brand_checklist'];report['additional_exact_product_sources']=EXTRA
    (R/'review-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));(R/'report.json').write_text(json.dumps({k:d[k] for k in ['updated','last_full_collection','detail_reviewed','stats','brands','sources']},ensure_ascii=False,indent=2))
    # Update the full download after exact product facts and image corrections, not before.
    with (R/'catalog.csv').open(encoding='utf-8-sig',newline='') as f:reader=csv.DictReader(f);cols=reader.fieldnames;rows=list(reader)
    byid={p['id']:p for p in ps}
    for row in rows:
        p=byid.get(row['id'])
        if not p:continue
        ld=p.get('launch') or p.get('launch_estimate') or {};cp=p.get('china_price') or {};det=p.get('details') or {};tr=p.get('trend') or {}
        row.update(brand=p['brand'],name_cn=p.get('name_cn'),material=det.get('material',p.get('material')),dimensions=det.get('size'),age=det.get('age'),regular_designs=p.get('regular_designs'),secret_designs=p.get('secret_designs'),details_source=det.get('source'),china_launch=ld.get('date') if ld.get('market')=='Mainland China' else '',launch_market=ld.get('market'),launch_source=ld.get('source'),china_launch_rrp=cp.get('price'),china_price_source=cp.get('source'),image_check=p.get('image_review',{}).get('status'),image_source=p.get('image_source'),why_trending=tr.get('summary'),trend_source=tr.get('source'),trend_period=tr.get('period'),trend_level=tr.get('level'))
    with (R/'catalog.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=cols);w.writeheader()
        for row in rows:
            if row['id'] in byid:w.writerow({k:("'"+x if isinstance(x,str) and x.startswith(('=','+','-','@')) else x) for k,x in row.items()})


def main():
    before=json.loads((R/'catalog.json').read_text());lastfull=before.get('last_full_collection',before['updated'])
    v.main()
    d=json.loads((R/'catalog.json').read_text());ps=d['products'];repaired=0
    for p in ps:
        det=p.setdefault('details',{});ids={p['id'],*p.get('merged_ids',[])}
        for f in EXTRA:
            if not ids.intersection(f['ids']):continue
            p['name_cn']=f['zh'];p['launch']={'date':f['date'],'precision':'day','market':'Mainland China','source':f['source'],'confidence':f.get('confidence','high'),'evidence':f['note'],'status':f.get('status','Source-announced release')};p.pop('launch_estimate',None);p['china_status']='Product-specific mainland release evidence'
            if 'cn' in f:p['china_price']={'price':f['cn'],'currency':'CNY','set_price':f.get('set'),'basis':'Historical announced RRP per blind box; not a current transaction price','as_of':f['date'],'source':f['source']}
            if f.get('regular'):p['regular_designs']=f['regular']
            if f.get('secret'):p['secret_designs']=f['secret']
            for k in ['material','features']:
                if k in f:det[k]=f[k];det.setdefault('field_sources',{})[k]={'url':f['source'],'checked':v.TODAY}
        for f in v.CFG['official_details']:
            if ids.intersection(f['ids']):
                for k in ['material','size','age']:
                    if k in f:det.setdefault('field_sources',{})[k]={'url':f['url'],'checked':v.TODAY}
        for key,appeal in APPEAL.items():
            if key in ids and p.get('trend'):p['trend']['possible_appeal']=appeal
        desired=p.pop('_variant_image',None);src=p.pop('_variant_image_source',None)
        if desired:
            if v.imagekey(desired)!=v.imagekey(p.get('image_source','')):
                if v.cache_photo(p,desired):repaired+=1
            if v.imagekey(desired)==v.imagekey(p.get('image_source','')):
                p.setdefault('image_review',{}).update(status='Source-linked variant image',source_match=True,source=src,checked=v.TODAY,scope='Store image associated with the priced variant. Other options and random designs may differ.',level='Exact source/variant mapping and file check; not a complete visual audit')
        p['brand']=v.brand(p['brand'])
    d['last_full_collection']=lastfull;d['updated']=v.TODAY;d['detail_reviewed']=v.TODAY
    d['review_summary']['catalog_date_note']='Catalog updated after this detail review. Each offer retains its own successful price/source check date; this was not a complete mainland-market refresh.'
    save_outputs(d)
    # Exact photo selections and field-level sources are tested on the final exported data.
    assert all(p.get('image') and (R/p['image']).is_file() for p in ps)
    assert not any(v.reason_not_item(p) for p in ps)
    assert all(not p.get('trend') or p['trend'].get('source') for p in ps)
    v.make_sheet(ps)
    app=R/'app.js';ui=R/'review-ui.js'
    if ui.exists():
        app.write_text(app.read_text().split('\n/* ATLAS_REVIEW_UI */')[0]+'\n/* ATLAS_REVIEW_UI */\n'+ui.read_text())
    print('FINAL_REVIEW '+json.dumps({'stats':d['stats'],'variant_images_corrected':repaired,'last_full_collection':lastfull,'detail_reviewed':v.TODAY}),flush=True)

if __name__=='__main__':main()
