#!/usr/bin/env python3
"""Extend the public catalog with specialist squishies and auditable research.
Unknown release dates are never invented from a Shopify creation timestamp.
"""
from __future__ import annotations
import concurrent.futures as cf
import csv, hashlib, json, re
from datetime import timedelta
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import refresh as r

R=r.ROOT
ALIASES={'100% authentic':'Brand not disclosed','chocoteddy':'Choco Teddy','thingswoo':'ThingsWoo','pin yun':'PINYUN','dramavan':'Drama-Van','drama-van':'Drama-Van','firelink':'FIRELINK','come4arts':'COME4ARTS','manchao':'MAN CHAO','moowooart':'MOOWOO ART','mms toy':'MMS','nororo studio':'NORORO Studio','odistudio':'ODI STUDIO','ouogravitation':'OUO GRAVITATION','tutulong':'TUTULONG','yalli studio':'YALLI','lucky emma':'Lucky Emma','hi toys':'Hi TOY','hitoys':'Hi TOY','hitoy':'Hi TOY','f.un x shinwoo':'Finding Unicorn','molynk':'Molynk','baay':'Baay','3an':'3AN / SAN','san squishy':'3AN / SAN','mido':'MIDO','hachimi':'Hachimi','full':'FULL','sweetbuns':'SWEETBUNS','ibloom':'iBloom','i bloom':'iBloom'}
r.ALIASES.update(ALIASES)

def cleanbrand(name):
    name=re.split(r'\s+(?:Materials?|Characters?|Size|Height|Stuffing|Packing)\s*[:：]',str(name),maxsplit=1,flags=re.I)[0].strip()
    if not name or re.search(r'authentic|polyester|packing|shipping|height|cm\b|inches|\d+Regular',name,re.I):return 'Brand not disclosed'
    return r.canonical_brand(name)

original_brand=r.get_brand
def better_brand(p,s,body):
    soup=BeautifulSoup(p.get('body_html',''),'html.parser')
    lines=[x.strip() for x in soup.get_text('\n',strip=True).splitlines() if x.strip()]
    for i,line in enumerate(lines):
        m=re.match(r'^Brand\s*[:：]\s*(.*)',line,re.I)
        if m:
            b=m.group(1).strip() or (lines[i+1] if i+1<len(lines) else '')
            b=cleanbrand(re.split(r'\s+(?:Material|Size|Height|Age|Product)\b',b)[0])
            if b!='Brand not disclosed' and len(b)<60:return b
    result=cleanbrand(original_brand(p,s,body))
    if result=='Brand not disclosed':
        # Resolve only explicit brand strings, not character ownership guesses.
        for alias,b in sorted(r.ALIASES.items(),key=lambda x:-len(x[0])):
            if len(alias)>3 and re.search(r'(?<!\w)'+re.escape(alias)+r'(?!\w)',p['title'],re.I):return b
    return result
r.get_brand=better_brand

original_wave=r.wave
def wave(title):
    m=re.search(r'\b(?:V\.?\s*\d+|Series\s+(?:[IVX]+|\d+)|(?:[IVX]+|\d+)\s+Series|Series\s*\d+|Vol\.?\s*\d+|第[一二三四五六七八九十\d]+[弹代季])\b',title,re.I)
    return original_wave(title) or (m.group(0) if m else None)
r.wave=wave

new_sources=[
 {'id':'didapop','name':'DidaPop','url':'https://didapop.com','kind':'retailer','market':'International','currency':'USD','max_pages':12},
 {'id':'pawmiga','name':'Pawmiga World','url':'https://pawmiga.myshopify.com','kind':'retailer','market':'International','currency':'USD','max_pages':12},
 {'id':'iris','name':'Iris Squishy','url':'https://irissquishy.com','kind':'retailer','market':'International','currency':'USD','max_pages':12},
 {'id':'ronron','name':'RonRon Squishy','url':'https://ronronsquishy.com','kind':'brand storefront','market':'International','currency':'USD','brand':'RonRon','max_pages':8},
 {'id':'anthill','name':'ANTHILL shopNplay','url':'https://anthillshop.com','kind':'retailer','market':'United States','currency':'USD','only_brands':['Molynk'],'max_pages':15},
 {'id':'heartfelt','name':'Heartfelt Chinese-squishy specialist','url':'https://heartfeltsquishy.shoplineapp.com','kind':'specialist','market':'Hong Kong','currency':'HKD','max_pages':10}
]
r.CONFIG['sources'] += [s for s in new_sources if s['id'] not in {x['id'] for x in r.CONFIG['sources']}]
for b in ['Molynk','Meichai','MIDO','Hachimi','FULL','3AN / SAN','SWEETBUNS','RonRon','Lisa','Nunu','Dudo','Zoey','Baay','Kiibru','Sanqi Elan']:
    if b not in r.CONFIG['priority_brands']:r.CONFIG['priority_brands'].append(b)
r.CONFIG['methodology']['approximate']='Approximate release months or ranges need product-specific dated evidence. Earliest retailer listing is a separate fallback, not a verified product launch. Exact dates and estimates retain market, source and confidence.'
r.CONFIG['methodology']['trending']='Dated product-level signals only. Retailer hot/viral curation is a weak signal, labeled separately from independently reported demand. Signals expire; views are not units sold and new listings alone are not trends.'

def json_nodes(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from json_nodes(v)
    elif isinstance(x,list):
        for v in x:yield from json_nodes(v)

def page_product(url,source):
    try:
        html=r.fetch(url,timeout=22).text;soup=BeautifulSoup(html,'html.parser');ld=[]
        for tag in soup.select('script[type="application/ld+json"]'):
            try:ld.extend(json_nodes(json.loads(tag.string or tag.get_text())))
            except Exception:pass
        node=next((n for n in ld if n.get('@type')=='Product'),{})
        def meta(prop):
            el=soup.find('meta',property=prop) or soup.find('meta',attrs={'name':prop})
            return el.get('content') if el else None
        title=node.get('name') or meta('og:title') or (soup.h1.get_text(' ',strip=True) if soup.h1 else None)
        if not title or not re.search(r'squish|捏捏|slow.?ris',title,re.I):return None
        image=node.get('image') or meta('og:image')
        if isinstance(image,list):image=image[0] if image else None
        if isinstance(image,dict):image=image.get('url')
        if not image:return None
        image=urljoin(url,image)
        offers=node.get('offers') or {};offers=offers[0] if isinstance(offers,list) and offers else offers
        amount=offers.get('price') or offers.get('lowPrice') or meta('product:price:amount')
        currency=offers.get('priceCurrency') or meta('product:price:currency')
        try:amount=float(str(amount).replace(',',''))
        except (ValueError,TypeError):amount=None
        if amount is not None and not currency:amount=None
        rawbrand=node.get('brand');rawbrand=rawbrand.get('name') if isinstance(rawbrand,dict) else rawbrand
        prefix=re.match(r'^(?:\*[^*]+\*\s*)?(.{2,30}?)\s+-\s+',title)
        brand=cleanbrand(prefix.group(1) if prefix else rawbrand or ('3AN / SAN' if title.startswith('3AN') else 'Brand not disclosed'))
        body=r.text(node.get('description') or '')
        d=r.date_evidence(body,title)
        if d:d.update({'market':'Not specified (Hong Kong retailer)','source':url,'evidence':'Release date explicitly stated by specialist retailer; mainland date not independently verified','confidence':'medium'})
        pid=hashlib.sha1((brand.lower()+'|'+r.normalize(title)).encode()).hexdigest()[:16]
        return {'id':pid,'brand':brand,'name':title,'category':'Squishy blind boxes' if re.search(r'blind\s*(box|bag)',title,re.I) else 'Squishy toys','wave':wave(title),'ip':None,'image_source':image,'gallery':[image],'listings':[{'source':source['name'],'source_id':source['id'],'kind':'retailer','url':url,'market':'Hong Kong','currency':currency or 'HKD','price':amount,'variant':'See listing options','available':None,'listing_date':None,'checked':r.TODAY}],'launch':d,'first_seen':r.TODAY,'checked':r.TODAY,'china_status':'Listed in retailer Chinese-squishy category; mainland SKU availability not independently verified','sales':None}
    except Exception as e:
        print('Specialist product unavailable',url,str(e)[:100],flush=True);return None

def collect_heartfelt(s):
    base=s['url'];urls=set();status='page limit reached';trend_urls=set()
    try:
        for page in range(1,s['max_pages']+1):
            url=base+'/categories/all-chinese-squishies?limit=72&page='+str(page)
            soup=BeautifulSoup(r.fetch(url,timeout=25).text,'html.parser')
            found={urljoin(base,a['href']).split('?')[0] for a in soup.select('a[href]') if '/products/' in a['href']}
            new=found-urls
            if not new:status='complete';break
            urls|=new
        hot=BeautifulSoup(r.fetch(base+'/categories/hot-items-viral-on-social-media',timeout=25).text,'html.parser')
        trend_urls={urljoin(base,a['href']).split('?')[0] for a in hot.select('a[href]') if '/products/' in a['href']}
    except Exception as e:
        print('Specialist list issue',str(e)[:120],flush=True);status='partial' if urls else 'unavailable'
    records=[]
    with cf.ThreadPoolExecutor(max_workers=8) as pool:
        for p in pool.map(lambda u:page_product(u,s),sorted(urls)):
            if p:
                if p['listings'][0]['url'] in trend_urls:
                    p['trend']={'label':'Retailer hot pick','level':'early signal','summary':'Listed in this specialist retailer\'s Hot items viral on Social Media collection. Retailer curation only; no independent sales-growth or social-volume measurement. Not a China-wide ranking.','market':'Hong Kong / international retail','period':'Collection observed '+r.TODAY,'observed':r.TODAY,'expires_on':(r.NOW.date()+timedelta(days=14)).isoformat(),'source':base+'/categories/hot-items-viral-on-social-media'}
                records.append(p)
    report={'id':s['id'],'name':s['name'],'url':base+'/categories/all-chinese-squishies','status':status,'products_inspected':len(urls),'eligible_listings':len(records),'checked':r.TODAY,'currency':'HKD'}
    print(json.dumps(report),flush=True);return records,report

original_collect=r.collect_source
def collect(s):
    if s['id']=='heartfelt':return collect_heartfelt(s)
    ps,report=original_collect(s)
    if s.get('only_brands'):
        ps=[p for p in ps if p['brand'] in s['only_brands']];report['eligible_listings']=len(ps)
    return ps,report
r.collect_source=collect

# Make supplementary analyst fields survive the core collector.
original_enrich=r.apply_enrichment
def enrichment(items):
    original_enrich(items)
    path=R/'enrichment.json'
    if not path.exists():return
    for e in json.loads(path.read_text()).get('products',[]):
        terms=e.get('match_terms',[])
        targets=[p for p in items.values() if p['brand']==r.canonical_brand(e['brand']) and ((terms and all(t.lower() in p['name'].lower() for t in terms)) or r.normalize(e['name']) in r.normalize(p['name']))]
        for p in targets:
            for k in ['trend','launch_estimate','notes','wave','name_cn','ip']:
                if e.get(k):p[k]=e[k]
            if e.get('launch_date') and e.get('launch_source'):
                p['launch']={'date':e['launch_date'],'precision':e.get('launch_precision','day'),'market':e.get('launch_market','Not specified'),'source':e['launch_source'],'evidence':e.get('launch_evidence','Published release evidence'),'confidence':e.get('confidence','high'),'approximate':e.get('launch_precision','day')!='day'}
            if e.get('cn_price') is not None and e.get('cn_price_source'):
                p['china_price']={'price':e['cn_price'],'currency':'CNY','basis':e.get('cn_price_basis','Source-stated retail price'),'source':e['cn_price_source'],'as_of':e.get('cn_price_date',r.TODAY)}
            if e.get('sold_display') and e.get('sold_source'):
                p['sales']={'display':e['sold_display'],'period':e.get('sold_period','Not stated'),'source':e['sold_source'],'platform':e.get('sold_platform','Published reporting'),'observed':e.get('sold_observed',r.TODAY),'scope':e.get('sold_scope','Source-reported product sales')}
r.apply_enrichment=enrichment

def export():
    data=json.loads((R/'catalog.json').read_text());items=data['products'];seen={};clean=[]
    # Prefer freshly checked records to stale copies whose brand label was corrected.
    for p in sorted(items,key=lambda p:bool(p.get('stale'))):
        p['brand']=cleanbrand(p['brand']);p['wave']=p.get('wave') or wave(p['name'])
        urls={l['url'] for l in p.get('listings',[])}
        known=next((seen[u] for u in urls if u in seen),None)
        if known is not None:
            r.merge(known,p)
            for k in ['trend','launch_estimate','china_price','sales']:
                if not known.get(k) and p.get(k):known[k]=p[k]
            continue
        clean.append(p)
        for u in urls:seen[u]=p
    # Reapply notes to retained older records as well.
    enrichment({p['id']:p for p in clean})
    # baseline flags distinguish additions from genuine releases.
    for p in clean:
        if p.get('first_seen')==data['baseline_date']:p['baseline']=True
    brands={}
    for p in clean:brands[p['brand']]=brands.get(p['brand'],0)+1
    data['products']=clean;data['brands']=brands
    stats=data['stats'];stats.update({'products':len(clean),'brands':len(brands),'squishy':sum('Squishy' in p['category'] for p in clean),'with_images':len(clean),'with_launch_dates':sum(bool(p.get('launch') or p.get('launch_estimate')) for p in clean),'with_mainland_launch_dates':sum((p.get('launch') or p.get('launch_estimate') or {}).get('market')=='Mainland China' for p in clean),'with_china_prices':sum(bool(p.get('china_price')) for p in clean),'with_sales':sum(bool(p.get('sales')) for p in clean),'with_trend_signals':sum(bool(p.get('trend') and p['trend'].get('expires_on','')>=r.TODAY) for p in clean),'with_source_prices':sum(any(x.get('price') is not None for x in p.get('listings',[])) for p in clean)})
    raw=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    (R/'catalog.json').write_text(raw,encoding='utf-8');(R/'catalog.js').write_text('window.TOY_ATLAS='+raw+';',encoding='utf-8')
    (R/'report.json').write_text(json.dumps({k:data[k] for k in ['updated','stats','brands','sources']},ensure_ascii=False,indent=2),encoding='utf-8')
    fields=['brand','name','name_cn','category','ip','wave','launch_date','launch_precision','launch_market','launch_source','china_price_cny','china_price_basis','china_price_source','source_price','currency','variant','price_market','retailer','retailer_listing_date','units_sold','sales_period','sales_source','trend_label','trend_market','trend_period','trend_source','first_seen','last_checked','product_url','image_url']
    with (R/'catalog.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        for p in clean:
            d=p.get('launch') or p.get('launch_estimate') or {};c=p.get('china_price') or {};s=p.get('sales') or {};t=p.get('trend') or {};l=p['listings'][0]
            row={k:p.get(k) for k in ['brand','name','name_cn','category','ip','wave','first_seen']};row.update({'launch_date':d.get('display') or d.get('date'),'launch_precision':d.get('precision'),'launch_market':d.get('market'),'launch_source':d.get('source'),'china_price_cny':c.get('price'),'china_price_basis':c.get('basis'),'china_price_source':c.get('source'),'source_price':l.get('price'),'currency':l.get('currency'),'variant':l.get('variant'),'price_market':l.get('market'),'retailer':l.get('source'),'retailer_listing_date':l.get('listing_date'),'units_sold':s.get('display'),'sales_period':s.get('period'),'sales_source':s.get('source'),'trend_label':t.get('label'),'trend_market':t.get('market'),'trend_period':t.get('period'),'trend_source':t.get('source'),'last_checked':p.get('checked'),'product_url':l['url'],'image_url':'https://royhei-cpu.github.io/china-toys/'+p['image']})
            w.writerow({k:("'"+v if isinstance(v,str) and v.startswith(('=','+','-','@')) else v) for k,v in row.items()})
    print('ENHANCED_CATALOG '+json.dumps(stats),flush=True)

if __name__=='__main__':
    r.main();export()
