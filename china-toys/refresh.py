#!/usr/bin/env python3
"""Source-backed toy directory. No generated prices, launch dates or sales estimates."""
from __future__ import annotations
import concurrent.futures as cf
import csv, hashlib, html, io, json, re, sys, time, unicodedata
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT/'sources.json').read_text())
NOW = datetime.now(timezone(timedelta(hours=8)))
TODAY = NOW.date().isoformat()
HEADERS = {'User-Agent':'ChinaToyAtlas/1.0 (public product directory; weekly research)','Accept':'application/json,text/html;q=0.9,*/*;q=0.8'}
ALIASES = CONFIG['brand_aliases']
REPORT = []

def fetch(url, timeout=35):
    last = None
    for attempt in range(2):
        try:
            r = requests.get(url, headers=HEADERS, timeout=timeout)
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            last = e
            if attempt == 0: time.sleep(1.2)
    raise last

def text(s):
    return re.sub(r'\s+', ' ', BeautifulSoup(s or '', 'html.parser').get_text(' ',strip=True)).strip()

def canonical_brand(s):
    s = re.sub(r'\s+', ' ', str(s or '')).strip(' :;|')
    return ALIASES.get(s.lower(), s)

def normalize(s):
    s = unicodedata.normalize('NFKC',s).lower()
    s = re.sub(r'\[(?:pre.?order|sale|restock)[^\]]*\]|【(?:sale|pre.?order)[^】]*】','',s)
    s = re.sub(r'^\s*(pre.?order|new arrival|sale)\s*[:\-]?', '',s)
    return re.sub(r'[^\w\u4e00-\u9fff]+','',s)

def get_brand(p,s,body):
    if s.get('brand'): return s['brand']
    m = re.search(r'\bBrand\s*[:：]\s*(.{1,70}?)(?=\s+(?:Material|Size|Age|Design|Product|Character|Manufacturer|Height|The|Quantity|Collection|Country|Content|Packing|Specification)\b|$)',body,re.I)
    if m:
        b = canonical_brand(m.group(1))
        if len(b)<65 and len(b.split())<8: return b
    vendor = canonical_brand(p.get('vendor',''))
    for alias,b in sorted(ALIASES.items(),key=lambda kv:-len(kv[0])):
        if len(alias)>2 and re.search(r'(?<!\w)'+re.escape(alias)+r'(?!\w)',p['title'],re.I): return b
    if vendor and not re.search(r'kika|kouhigh|toybeta|blind.?box.?shop|shopify',vendor,re.I): return vendor
    return 'Brand not disclosed'

def category(p,s):
    title = p.get('title','')
    typ = p.get('product_type','')
    tags = ' '.join(p.get('tags',[])) if isinstance(p.get('tags'),list) else str(p.get('tags',''))
    if re.search(r'lucky bag|gift card|protective case|display case|doll clothes|outfit only',title,re.I): return None
    blind = bool(re.search(r'blind\s*(box|bag)|盲盒|盲袋',title+' '+typ,re.I))
    squish = bool(re.search(r'squish|slow.?ris|slow.?rebound|捏捏|慢回弹|squeez',title+' '+typ,re.I) or s.get('squishy_all'))
    if not blind and not squish: return None
    if squish and not re.search(r'fuzzy family squishy',title,re.I): return 'Squishy blind boxes' if blind else 'Squishy toys'
    if re.search(r'plush|毛绒',title,re.I): return 'Blind-box plush'
    if re.search(r'\bBJD\b|\bMJD\b|jointed',title,re.I): return 'Blind-box dolls'
    return 'Blind-box figures'

def date_evidence(body,title):
    match = re.search(r'(?:Release\s*Date|Launch\s*Date|Date\s*of\s*Release|发售日期|上市日期)\s*[:：]?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*|\s+)\d{4}|\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}日?)',body+' '+title,re.I)
    if not match: return None
    raw = match.group(1)
    cleaned = re.sub(r'(\d)(st|nd|rd|th)',r'\1',raw)
    for fmt in ('%B %d, %Y','%b %d, %Y','%B %d %Y','%b %d %Y','%Y-%m-%d','%Y/%m/%d','%Y.%m.%d','%Y年%m月%d日'):
        try: return {'date':datetime.strptime(cleaned,fmt).date().isoformat(),'precision':'day','quote':match.group(0)}
        except ValueError: pass
    return None

def wave(title):
    m = re.search(r'(?:\b(?:series|season|vol(?:ume)?\.?|generation|ver(?:sion)?\.?)\s*\d+(?:\.\d+)?|\b\d+(?:st|nd|rd|th)\s+(?:series|generation)|第[一二三四五六七八九十\d]+[弹代季])',title,re.I)
    return m.group(0) if m else None

def identify_ip(title):
    known = ['THE MONSTERS','LABUBU','SKULLPANDA','DIMOO','MOLLY','HIRONO','HACIPUPU','CRYBABY','PUCKY','Zsiga','Twinkle Twinkle','Nommi','WAKUKU','SIINONO','ZIYULI','FARMER BOB','RiCO','SHINWOO','REPOLAR','AAMY','DORA','Rayan','Zoraa','ANMOO','DUDOO','Nanci','Suri','Laura','Cassy','MR.PA','MIMI','OZAI','FurFur','OONA','R3NA','Joy','Hudodo','FAYA','PANDA ROLL','Pandaroll','NOOK','SLEEP','NINNIC','POUKAPOUKA','CiCiLu','LAPLLY','LuLu','Emma','Molinta','DunDun','Ziyuli','FAYA','Teennar','Liroro','Peach Riot','Mitao Cat','Capybara','Muni Bear']
    return next((x for x in known if x.lower() in title.lower()),None)

def pick_variant(variants):
    good = [v for v in variants if float(v.get('price') or 0)>0]
    single = [v for v in good if re.search(r'\b(single|one|1)\s*(box|piece|pc)|\bone random\b|\bsingle\b',v.get('title',''),re.I) and not re.search(r'whole|set|case|confirmed',v.get('title',''),re.I)]
    avail = [v for v in (single or good) if v.get('available')]
    return min(avail or single or good, key=lambda v:float(v.get('price') or 0)) if good else None

def product_record(p,s,currency):
    cat = category(p,s)
    if not cat: return None
    imgs = p.get('images') or []
    pics = [i.get('src') for i in imgs if isinstance(i,dict) and i.get('src')]
    if not pics: return None
    body = text(p.get('body_html',''))
    title = html.unescape(p.get('title','')).strip()
    brand = get_brand(p,s,body)
    keytitle = title
    for alias,b in ALIASES.items():
        if b==brand: keytitle = re.sub(r'^\s*(?:\[|【)?'+re.escape(alias)+r'(?:\]|】)?\s*[:\-]?\s*','',keytitle,flags=re.I)
    pid = hashlib.sha1((brand.lower()+'|'+normalize(keytitle)).encode()).hexdigest()[:16]
    v = pick_variant(p.get('variants',[]))
    url = s['url'].rstrip('/')+'/products/'+p['handle']
    listing = {'source':s['name'],'source_id':s['id'],'kind':s['kind'],'url':url,'market':s['market'],'currency':currency,'checked':TODAY,'price':float(v['price']) if v else None,'variant':v.get('title','') if v else None,'available':bool(v.get('available')) if v else None,'listing_date':(p.get('published_at') or '')[:10] or None}
    if v and v.get('compare_at_price'):
        try: listing['compare_at']=float(v['compare_at_price'])
        except (ValueError,TypeError): pass
    d = date_evidence(body,title)
    if d: d.update({'market':s['market'],'source':url,'evidence':'Source-stated release date; not verified as mainland launch'})
    m = re.search(r'(?:There are|contains|includes)\s+(\d+)\s+(?:regular|basic|normal|different)',body,re.I)
    secret = re.search(r'(\d+)\s+(?:secret|hidden)\s+(?:designs?|figures?|editions?)',body,re.I)
    material = re.search(r'\bMaterial\s*[:：]\s*(.{1,100}?)(?=\s+(?:Size|Height|Age|Brand|Product|Note|Please|Feature|Dimensions)\b|$)',body,re.I)
    return {'id':pid,'brand':brand,'name':title,'ip':identify_ip(title),'category':cat,'wave':wave(title),'image_source':pics[0],'gallery':pics[:6],'listings':[listing],'launch':d,'regular_designs':int(m.group(1)) if m else None,'secret_designs':int(secret.group(1)) if secret else None,'material':material.group(1) if material else None,'first_seen':TODAY,'checked':TODAY,'china_status':'Mainland SKU availability not yet verified','sales':None}

def collect_source(s):
    records=[]; currency=s['currency']; inspected=0; status='complete'; error=None
    try:
        try:
            cart=fetch(s['url'].rstrip('/')+'/cart.js',timeout=15).json()
            if isinstance(cart,dict) and re.fullmatch(r'[A-Z]{3}',str(cart.get('currency',''))): currency=cart['currency']
        except Exception: pass
        seen=set()
        for page in range(1,s.get('max_pages',15)+1):
            u=s['url'].rstrip('/')+f'/products.json?limit=250&page={page}'
            payload=fetch(u).json()
            products=payload.get('products') if isinstance(payload,dict) else None
            if not isinstance(products,list): raise ValueError('Public product feed unavailable')
            if not products: break
            new=[p for p in products if p.get('id') not in seen]
            if not new: status='pagination stopped'; break
            for p in new:
                seen.add(p.get('id')); inspected+=1
                try:
                    r=product_record(p,s,currency)
                    if r: records.append(r)
                except Exception as e: print('Skipped malformed record',s['id'],p.get('id'),str(e)[:100],flush=True)
            if len(products)<250: break
            if page==s.get('max_pages',15): status='page limit reached'
            time.sleep(.25)
    except Exception as e:
        status='unavailable' if not records else 'partial'; error=type(e).__name__+': '+str(e)[:140]
    report={'id':s['id'],'name':s['name'],'url':s['url'],'status':status,'products_inspected':inspected,'eligible_listings':len(records),'checked':TODAY,'currency':currency}
    if error: report['issue']='Source could not be fully read; previously collected data retained.'
    print(json.dumps(report,ensure_ascii=False),flush=True)
    return records,report

def merge(a,b):
    existing={x['url'] for x in a['listings']}
    a['listings'].extend(x for x in b['listings'] if x['url'] not in existing)
    a['listings'].sort(key=lambda x:(x.get('market')!='Mainland China',x.get('kind')!='brand storefront'))
    if not a.get('launch') and b.get('launch'): a['launch']=b['launch']
    for k in ('ip','wave','material','regular_designs','secret_designs'):
        if not a.get(k) and b.get(k): a[k]=b[k]
    return a

def cache_image(p):
    target=ROOT/'images'/(p['id']+'.jpg')
    if target.exists() and target.stat().st_size>100:
        p['image']='images/'+target.name; return p
    imageurl=p.get('image_source','')
    if imageurl.startswith('//'): imageurl='https:'+imageurl
    if not imageurl.startswith(('https://','http://')): return None
    if 'cdn.shopify.com' in imageurl or '/cdn/shop/' in imageurl:
        imageurl+=('&' if '?' in imageurl else '?')+'width=640'
    try:
        raw=fetch(imageurl,timeout=25).content
        if len(raw)>20000000: return None
        image=Image.open(io.BytesIO(raw)); image=ImageOps.exif_transpose(image)
        if image.width<80 or image.height<80: return None
        image.thumbnail((640,640))
        if image.mode in ('RGBA','LA'):
            background=Image.new('RGB',image.size,'white'); background.paste(image,mask=image.getchannel('A')); image=background
        else: image=image.convert('RGB')
        image.save(target,'JPEG',quality=85,optimize=True)
        p['image']='images/'+target.name
        return p
    except Exception: return None

def apply_enrichment(items):
    path=ROOT/'enrichment.json'
    if not path.exists(): return
    enrich=json.loads(path.read_text()).get('products',[])
    for e in enrich:
        brand=canonical_brand(e['brand']); name=e['name']
        target=next((p for p in items.values() if p['brand']==brand and (normalize(p['name'])==normalize(name) or normalize(name) in normalize(p['name']))),None)
        if not target:
            if not e.get('image') or not e.get('url'): continue
            key=hashlib.sha1((brand+'|'+normalize(name)).encode()).hexdigest()[:16]
            target={'id':key,'brand':brand,'name':name,'category':e.get('category','Blind-box figures'),'image_source':e['image'],'gallery':[e['image']],'first_seen':TODAY,'checked':TODAY,'listings':[],'china_status':'Mainland SKU availability not yet verified','sales':None}
            items[key]=target
        for k in ('name_cn','ip','wave','notes'):
            if e.get(k): target[k]=e[k]
        if e.get('launch_date') and e.get('launch_source'):
            target['launch']={'date':e['launch_date'],'precision':e.get('launch_precision','day'),'market':e.get('launch_market','Not specified'),'source':e['launch_source'],'evidence':e.get('launch_evidence','Published release evidence')}
            if e.get('launch_market')=='Mainland China': target['china_status']='Mainland launch evidence'
        if e.get('cn_price') is not None and e.get('cn_price_source'):
            target['china_price']={'price':e['cn_price'],'currency':'CNY','basis':e.get('cn_price_basis','Source-stated price'),'source':e['cn_price_source'],'as_of':e.get('cn_price_date',TODAY)}
        if e.get('sold_display') and e.get('sold_source'):
            target['sales']={'display':e['sold_display'],'period':e.get('sold_period','Not stated'),'source':e['sold_source'],'platform':e.get('sold_platform','Source report'),'observed':e.get('sold_observed',TODAY),'scope':e.get('sold_scope','Source-reported product sales')}
        if not target['listings']:
            target['listings']=[{'source':e.get('source_name','Product evidence'),'url':e['url'],'kind':'source evidence','market':e.get('price_market','Not specified'),'currency':e.get('currency'),'price':e.get('price'),'variant':e.get('variant'),'checked':TODAY,'listing_date':None,'available':None}]

def main():
    (ROOT/'images').mkdir(exist_ok=True)
    oldpath=ROOT/'catalog.json'
    old=json.loads(oldpath.read_text()) if oldpath.exists() else {}
    previous={p['id']:p for p in old.get('products',[])}
    combined={}
    with cf.ThreadPoolExecutor(max_workers=5) as ex:
        for records,report in ex.map(collect_source,CONFIG['sources']):
            REPORT.append(report)
            for p in records:
                if p['id'] in combined: merge(combined[p['id']],p)
                else: combined[p['id']]=p
    apply_enrichment(combined)
    if not combined and not previous: raise RuntimeError('No real product records collected; refusing empty publication')
    for pid,p in combined.items():
        before=previous.get(pid)
        p['baseline']=not bool(previous)
        if before:
            p['first_seen']=before['first_seen']; p['baseline']=before.get('baseline',False)
            p['history']=before.get('history',[])
            if not p.get('china_price') and before.get('china_price'): p['china_price']=before['china_price']
            if not p.get('sales') and before.get('sales'): p['sales']=before['sales']
            if not p.get('launch') and before.get('launch'): p['launch']=before['launch']
            oldlist={x['url']:x for x in before.get('listings',[])}
            for listing in p['listings']:
                oldl=oldlist.get(listing['url'])
                if not oldl: continue
                if oldl.get('price')!=listing.get('price') and oldl.get('currency')==listing.get('currency') and oldl.get('variant')==listing.get('variant'):
                    p['history'].append({'date':TODAY,'type':'price','from':oldl.get('price'),'to':listing.get('price'),'currency':listing.get('currency'),'source':listing['url']})
                if oldl.get('available') is False and listing.get('available') is True:
                    p['history'].append({'date':TODAY,'type':'restock','source':listing['url']})
            p['history']=p['history'][-30:]
    # A missing feed record is not proof of discontinuation. Keep it, visibly stale.
    for pid,p in previous.items():
        if pid not in combined:
            p['stale']=True; combined[pid]=p
    good=[]; failed=[]
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        futures={ex.submit(cache_image,p):p for p in combined.values()}
        for f in cf.as_completed(futures):
            p=f.result()
            if p: good.append(p)
            else: failed.append({'id':futures[f]['id'],'brand':futures[f]['brand'],'name':futures[f]['name'],'url':futures[f]['listings'][0]['url']})
    good.sort(key=lambda p:(CONFIG['priority_brands'].index(p['brand']) if p['brand'] in CONFIG['priority_brands'] else 999,p['brand'],p['name']))
    brands={}
    for p in good: brands[p['brand']]=brands.get(p['brand'],0)+1
    mainland_dates=sum(bool(p.get('launch') and p['launch'].get('market')=='Mainland China') for p in good)
    stats={'products':len(good),'brands':len(brands),'squishy':sum('Squishy' in p['category'] for p in good),'with_images':len(good),'with_launch_dates':sum(bool(p.get('launch')) for p in good),'with_mainland_launch_dates':mainland_dates,'with_china_prices':sum(bool(p.get('china_price')) for p in good),'with_sales':sum(bool(p.get('sales')) for p in good),'with_source_prices':sum(any(x.get('price') is not None for x in p['listings']) for p in good),'image_research_queue':len(failed)}
    data={'title':CONFIG['title'],'updated':TODAY,'updated_at':NOW.isoformat(),'baseline_date':old.get('baseline_date',TODAY),'weekly_schedule':'Mondays, 08:30 China time','stats':stats,'brands':brands,'priority_brands':CONFIG['priority_brands'],'sources':REPORT,'methodology':CONFIG['methodology'],'products':good}
    raw=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    oldpath.write_text(raw,encoding='utf-8')
    (ROOT/'catalog.js').write_text('window.TOY_ATLAS='+raw+';',encoding='utf-8')
    (ROOT/'report.json').write_text(json.dumps({'updated':TODAY,'stats':stats,'brands':brands,'sources':REPORT},ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'research-queue.json').write_text(json.dumps(failed,ensure_ascii=False,indent=2),encoding='utf-8')
    columns=['brand','name','name_cn','category','ip','wave','launch_date','launch_market','launch_source','china_price_cny','china_price_basis','china_price_source','source_price','currency','variant','price_market','retailer','retailer_listing_date','units_sold','sales_period','sales_source','first_seen','last_checked','product_url','image_url']
    with (ROOT/'catalog.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=columns); w.writeheader()
        for p in good:
            d=p.get('launch') or {}; c=p.get('china_price') or {}; sale=p.get('sales') or {}; listing=p['listings'][0]
            row={k:p.get(k) for k in ('brand','name','name_cn','category','ip','wave','first_seen')}
            row.update({'launch_date':d.get('date'),'launch_market':d.get('market'),'launch_source':d.get('source'),'china_price_cny':c.get('price'),'china_price_basis':c.get('basis'),'china_price_source':c.get('source'),'source_price':listing.get('price'),'currency':listing.get('currency'),'variant':listing.get('variant'),'price_market':listing.get('market'),'retailer':listing.get('source'),'retailer_listing_date':listing.get('listing_date'),'units_sold':sale.get('display'),'sales_period':sale.get('period'),'sales_source':sale.get('source'),'last_checked':p.get('checked'),'product_url':listing['url'],'image_url':'https://royhei-cpu.github.io/china-toys/'+p['image']})
            # Avoid spreadsheet formula injection from third-party titles.
            row={k:('\''+v if isinstance(v,str) and v.startswith(('=','+','-','@')) else v) for k,v in row.items()}
            w.writerow(row)
    print('DIRECTORY_RESULT '+json.dumps(stats),flush=True)

if __name__=='__main__': main()
