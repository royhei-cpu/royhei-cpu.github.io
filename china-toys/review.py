#!/usr/bin/env python3
"""Repeatable, conservative detail review. Source-linked does not mean visually audited."""
from __future__ import annotations
import concurrent.futures as cf
import csv, hashlib, io, json, re, time
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from bs4 import BeautifulSoup
from PIL import Image, ImageOps, ImageDraw
import refresh as r

R=Path(__file__).resolve().parent
CFG=json.loads((R/'review-sources.json').read_text())
TODAY=r.TODAY
REPORT={'reviewed':TODAY,'version':CFG['version'],'source_checks':[], 'corrections':[], 'new_ids':[], 'image_repairs':[], 'image_failures':[]}
ALIASES={'popmart':'POP MART','pop mart':'POP MART','all for play':'ALL FOR PLAY','fun cinating':'FUNCINATING','funchiting':'FUNCINATING','funcinating':'FUNCINATING','chocoteddy':'Choco Teddy','thingswoo':'ThingsWoo','pin yun':'PINYUN','dramavan':'Drama-Van','firelink':'FIRELINK','come4arts':'COME4ARTS','manchao':'MAN CHAO','mms toy':'MMS','nororo studio':'NORORO Studio','odistudio':'ODI STUDIO','ouogravitation':'OUO GRAVITATION','tutulong':'TUTULONG','yalli studio':'YALLI','hi toys':'Hi TOY','hitoys':'Hi TOY','hitoy':'Hi TOY','7700 squishy':'7700','lisa squishy':'Lisa','lisa':'Lisa','lisa handmade':'Lisa','labuladuo':'Labuladuo','lbl duo':'Labuladuo','sonny angel':'Sonny Angel','smiski':'SMISKI','sanqi elan':'Sanqi Elan','3an':'3AN / SAN','ibloom':'iBloom','i bloom':'iBloom'}
VALID_UNKNOWN={'didapop','toybeta','kouhigh','kikagoods','100% authentic'}

def urlkey(u):
    q=urlsplit(u if not u.startswith('//') else 'https:'+u)
    return q.netloc.lower().removeprefix('www.')+q.path.rstrip('/')

def imagekey(u):
    q=urlsplit(str(u).replace('&amp;','&'))
    return q.netloc.lower().removeprefix('www.')+re.sub(r'_(?:\d+x\d*|small|medium|large|grande)(?=\.[a-z]+$)','',q.path)

def norm(s): return re.sub(r'[^\w]+','',s.lower())

def brand(b):
    b=re.split(r'\s+(?:Materials?|Characters?|Size|Stuffing|Packing)\s*[:：]',str(b),maxsplit=1,flags=re.I)[0].strip()
    if re.match(r'^POP\s*MART(?:\s+|$)',b,re.I): return 'POP MART'
    if b.lower() in VALID_UNKNOWN: return 'Brand not disclosed'
    return ALIASES.get(b.lower(),r.canonical_brand(b))

def asfloat(x):
    try: return float(x) if x not in (None,'') else None
    except (TypeError,ValueError): return None

def getfeed(s):
    records=[];status='complete';currency=s.get('currency');seen=set()
    try:
        for page in range(1,s.get('max_pages',20)+1):
            obj=r.fetch(s['url'].rstrip('/')+f'/products.json?limit=250&page={page}',timeout=18).json()
            batch=obj.get('products')
            if not isinstance(batch,list):raise ValueError('No public product list')
            if not batch:break
            fresh=[p for p in batch if p.get('id') not in seen]
            if not fresh:status='pagination stopped';break
            records+=fresh;seen.update(p.get('id') for p in fresh)
            if len(batch)<250:break
            if page==s.get('max_pages',20):status='page limit reached'
        if records:
            try:
                c=r.fetch(s['url'].rstrip('/')+'/cart.js',timeout=10).json().get('currency')
                if re.fullmatch('[A-Z]{3}',str(c)):currency=c
            except Exception: pass
    except Exception:
        status='partial' if records else 'unavailable'
    report={'id':s['id'],'name':s['name'],'url':s['url'],'status':status,'checked':TODAY,'raw_products_read':len(records),'currency':currency}
    print('DETAIL_SOURCE '+json.dumps(report),flush=True)
    return s,records,report

LABELS={'material':'(?:materials?|fabric|composition)','size':'(?:size|dimensions?|height|product size)','age':'(?:recommended age|age recommendation|age range|age|applicable age)','scale':'scale','brand':'brand','release':'(?:release date|launch date|date of release)'}
ALL_LABEL=re.compile(r'^(?:brand|material|materials|fabric|size|height|dimensions|age|recommended age|release date|scale|packing|package|note|warning|shipping|manufacturer)\b\s*[:：]?',re.I)

def specs(raw):
    soup=BeautifulSoup(raw.get('body_html') or '', 'html.parser')
    for el in soup(['script','style']):el.decompose()
    lines=[re.sub(r'\s+',' ',x).strip() for x in soup.get_text('\n',strip=True).splitlines() if x.strip()]
    out={};alltext=' '.join(lines)
    for key,pat in LABELS.items():
        for i,line in enumerate(lines):
            m=re.match(r'^'+pat+r'\s*[:：]\s*(.*)',line,re.I)
            if not m:continue
            v=m.group(1).strip()
            if not v and i+1<len(lines) and not ALL_LABEL.match(lines[i+1]):v=lines[i+1]
            v=re.split(r'\s+(?:Size|Height|Age|Brand|Material|Note|Warning|Shipping|Dimensions)\s*[:：]',v,1,flags=re.I)[0].strip()
            if 1<len(v)<230:out[key]=v
            break
    for field,kind in [('regular_designs','(?:regular|basic|normal|standard)'),('secret_designs','(?:secret|hidden|chase)')]:
        m=re.search(r'\b(\d{1,2})\s*'+kind+r'\s*(?:designs?|styles?|figures?|models?|editions?|\+|and|$)',alltext,re.I)
        if m and 0<int(m.group(1))<40:out[field]=int(m.group(1))
    return out,alltext

def reason_not_item(p):
    n=p['name']
    if re.search(r'proxy service',n,re.I):return 'Shopping service, not one product'
    if re.search(r'compilation of cooler bags|tote bags/ merch|fashion outfits|outfits motorcycle|GDragon clothes',n,re.I):return 'Accessory or merchandise listing, not a blind-box or squishy toy'
    if re.search(r'compilation of|recent chinese squishies new releases ready stock',n,re.I):return 'Mixed-product collection listing; separate items need individual records'
    return None

def variant_image(raw,variant):
    fi=variant.get('featured_image') or {}
    if isinstance(fi,str):return fi
    if fi.get('src'):return fi['src']
    for img in raw.get('images') or []:
        if variant.get('id') in (img.get('variant_ids') or []):return img.get('src')
    return None

def cache_photo(p,url):
    if not url:return False
    if url.startswith('//'):url='https:'+url
    name=p['id']+'-'+hashlib.sha1(url.encode()).hexdigest()[:8]+'.jpg'
    target=R/'images'/name
    try:
        if not target.exists():
            u=url+('&' if '?' in url else '?')+'width=640' if 'shopify' in url or '/cdn/shop/' in url else url
            raw=r.fetch(u,timeout=18).content
            if len(raw)>18000000:return False
            im=ImageOps.exif_transpose(Image.open(io.BytesIO(raw)));im.load()
            if min(im.size)<80:return False
            im.thumbnail((640,640))
            if im.mode in ('RGBA','LA'):
                bg=Image.new('RGB',im.size,'white');bg.paste(im,mask=im.getchannel('A'));im=bg
            else:im=im.convert('RGB')
            im.save(target,'JPEG',quality=85,optimize=True)
        p['image']='images/'+name;p['image_source']=url;return True
    except Exception:return False

def add_details(p,raw,s,currency,listing):
    fields,body=specs(raw)
    if fields.get('brand'):
        b=brand(fields['brand'])
        if b!='Brand not disclosed' and len(b)<60 and len(b.split())<7 and not re.search('shipping|polyester|authentic',b,re.I):
            if p['brand'] in ('Brand not disclosed','DidaPop','POP MART CRYBABY','POP MART DIMOO'):p['brand']=b
    for f in ['material','regular_designs','secret_designs']:
        if fields.get(f):p[f]=fields[f]
    det=p.setdefault('details',{});det['source']=listing['url'];det['checked']=TODAY
    for f in ['material','size','age','scale']:
        if fields.get(f):det[f]=fields[f]
    if raw.get('product_type'):det['source_product_type']=raw['product_type']
    variantdata=[]
    for v in raw.get('variants') or []:
        variantdata.append({'name':v.get('title'),'sku':v.get('sku') or None,'price':asfloat(v.get('price')),'currency':currency,'available':v.get('available'),'image':variant_image(raw,v),'id':str(v.get('id'))})
    listing['options']=variantdata;listing['options_checked']=TODAY
    matched=next((v for v in raw.get('variants',[]) if v.get('title')==listing.get('variant')),None)
    if matched and asfloat(matched.get('price')) is not None and currency==listing.get('currency'):
        before=listing.get('price');after=asfloat(matched['price'])
        if before!=after:
            event={'date':TODAY,'type':'price','from':before,'to':after,'currency':currency,'source':listing['url']}
            if event not in p.setdefault('history',[]):p['history'].append(event)
        if listing.get('available') is False and matched.get('available') is True:p.setdefault('history',[]).append({'date':TODAY,'type':'restock','source':listing['url']})
        listing.update(price=after,available=matched.get('available'),checked=TODAY)
    pics=[i['src'] for i in raw.get('images',[]) if i.get('src')]
    for u in pics:
        if u not in p.setdefault('gallery',[]):p['gallery'].append(u)
    # An image appearing in the exact listing proves association, not visual identity of every variant.
    associated=any(imagekey(p.get('image_source',''))==imagekey(u) for u in pics)
    desired=variant_image(raw,matched) if matched else None
    source_for_main=associated or (not p.get('image_review') and listing['url']==p['listings'][0]['url'])
    if source_for_main:
        status='Same-product source image' if associated else 'Image needs source recheck'
        p['image_review']={'status':status,'source':listing['url'],'checked':TODAY,'level':'Source-link and file check; not a full visual audit','scope':'Series / example photo; random blind-box contents may differ.','visually_reviewed':False}
        if desired and imagekey(desired)!=imagekey(p.get('image_source','')):
            REPORT['image_repairs'].append({'id':p['id'],'name':p['name'],'source':listing['url'],'reason':'Store supplies an image for the selected price variant'})
            p['_new_photo']=desired;p['image_review']['scope']='Store-linked image for selected variant; see options for other variants.'
        elif associated:p['image_review']['source_match']=True
    if not p.get('launch'):
        d=r.date_evidence(body,p['name'])
        if d:
            d.update({'market':s['market'],'source':listing['url'],'confidence':'medium','evidence':'Release date explicitly printed in this source listing. Not automatically the mainland-China launch.'})
            p['launch']=d
    p['details_checked']=TODAY

def specific_facts(ps):
    for p in ps:
        ids={p['id'],*p.get('merged_ids',[])}
        for f in CFG['product_facts']:
            if not ids.intersection(f['ids']):continue
            if f.get('brand'):p['brand']=f['brand']
            p['name_cn']=f['name_cn'];p.pop('launch_estimate',None)
            p['launch']={'date':f['launch_date'],'precision':'day','market':'Mainland China','source':f['source'],'confidence':f.get('confidence','high'),'evidence':f['basis'],'offline_date':f.get('offline_date')}
            p['china_status']='Product-specific mainland release evidence'
            if 'cn_price' in f:p['china_price']={'price':f['cn_price'],'currency':'CNY','basis':'Historical launch RRP per single blind box; not a current selling price','as_of':f['launch_date'],'source':f['source'],'set_price':f.get('set_price')}
            for k in ['regular_designs','secret_designs','secret_odds']:
                if k in f:p[k]=f[k]
            if f.get('features'):p.setdefault('details',{}).update(features=f['features'],source=f['source'],checked=TODAY)
        for f in CFG['official_details']:
            if not ids.intersection(f['ids']):continue
            p.setdefault('details',{}).update({k:f[k] for k in ['material','size','age'] if f.get(k)})
            p['details'].update(source=f['url'],checked=TODAY)
            p['official_product_url']=f['url']
        for t in CFG['trend_annotations']:
            if ids.intersection(t['ids']):p['trend']={k:v for k,v in t.items() if k!='ids'}
        # Older broad notes must not leak a plush date into accessories.
        if p.get('launch') and 'dimoo' in p['name'].lower() and 'disney' in p['name'].lower() and not re.search(r'figures?',p['name'],re.I):
            if '/2067' in p['launch'].get('source',''):p['launch_removed_reason']='Figure-series date does not establish this accessory launch';p.pop('launch',None)


def make_sheet(ps):
    targets=[]
    selected=set(x for f in CFG['product_facts'] for x in f['ids'])
    targets=[p for p in ps if p['id'] in selected]
    targets += [p for p in ps if p.get('id') in REPORT['new_ids']][:12]
    targets += [p for p in ps if p.get('trend') and p not in targets][:12]
    targets=targets[:32]
    if not targets:return
    cellw,cellh,cols=240,290,4
    im=Image.new('RGB',(cols*cellw,((len(targets)+cols-1)//cols)*cellh),'white');draw=ImageDraw.Draw(im)
    for i,p in enumerate(targets):
        x=(i%cols)*cellw;y=(i//cols)*cellh
        try:
            src=Image.open(R/p['image']).convert('RGB');src.thumbnail((225,220));im.paste(src,(x+(240-src.width)//2,y))
        except Exception:pass
        draw.text((x+5,y+222),p['id'],fill='black')
        label=p['brand']+' / '+p['name']
        for j in range(3):draw.text((x+5,y+238+j*14),label[j*34:(j+1)*34],fill='black')
    (R/'review-media').mkdir(exist_ok=True)
    im.save(R/'review-media'/'sample-contact-sheet.jpg',quality=90)
    (R/'review-media'/'sample-identities.json').write_text(json.dumps([{'id':p['id'],'name':p['name'],'image_source':p.get('image_source'),'sources':[l['url'] for l in p['listings']]} for p in targets],ensure_ascii=False,indent=2))


def main():
    data=json.loads((R/'catalog.json').read_text());ps=data['products'];previous_count=len(ps)
    sources=json.loads((R/'sources.json').read_text())['sources']
    known={s['id'] for s in sources}
    for s in data.get('sources',[]):
        if s['id'] not in known and 'shoplineapp' not in s['url']:
            u=urlsplit(s['url']);sources.append({'id':s['id'],'name':s['name'],'url':u.scheme+'://'+u.netloc,'kind':'retailer','market':'International','currency':s.get('currency','USD'),'max_pages':15});known.add(s['id'])
    sources += [s for s in CFG['new_feeds'] if s['id'] not in known]
    newids={s['id'] for s in CFG['new_feeds']}
    byurl={urlkey(l['url']):(p,l) for p in ps for l in p.get('listings',[])}
    for p in ps:
        old=p['brand'];p['brand']=brand(old)
        if old!=p['brand']:REPORT['corrections'].append({'id':p['id'],'from':old,'to':p['brand'],'type':'brand label'})
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        for s,raws,sr in pool.map(getfeed,sources):
            REPORT['source_checks'].append(sr)
            for raw in raws:
                url=s['url'].rstrip('/')+'/products/'+raw.get('handle','');pair=byurl.get(urlkey(url))
                if pair:
                    p,l=pair;add_details(p,raw,s,sr['currency'] or l.get('currency'),l)
                elif s['id'] in newids:
                    body=BeautifulSoup(raw.get('body_html') or '','html.parser').get_text(' ',strip=True)
                    if re.search(r'bag|tote|case|sticker|outfit|clothes|display stand|pouch|keychain holder',raw['title'],re.I):continue
                    if s['id']=='sonnyangel-jp':
                        if not re.search(r'random|blind|ランダム|シークレット',body,re.I):continue
                        raw['product_type']='Blind Box'
                    item=r.product_record(raw,s,sr['currency'] or s['currency'])
                    if not item:continue
                    if re.search('smiski',item['name'],re.I):item['brand']='SMISKI'
                    item['baseline']=False;item['history']=[];item['china_status']='Official overseas reference; mainland SKU availability needs confirmation'
                    add_details(item,raw,s,sr['currency'],item['listings'][0]);item['_new_photo']=item.get('image_source');ps.append(item);byurl[urlkey(url)]=(item,item['listings'][0]);REPORT['new_ids'].append(item['id'])
            if s['id'] in newids:
                count=sum(any(l.get('source_id')==s['id'] for l in p['listings']) for p in ps)
                data['sources']=[x for x in data.get('sources',[]) if x['id']!=s['id']]+[{**sr,'products_inspected':len(raws),'eligible_listings':count}]
    specific_facts(ps)
    # Preserve excluded records as reviewable source leads; never count bags/services as toys.
    leads={p['id']:p for p in data.get('source_leads',[])};keep=[]
    for p in ps:
        why=reason_not_item(p)
        if why:
            p['exclusion_reason']=why;p['excluded_from_product_counts']=True;p.pop('trend',None);leads[p['id']]=p
        else:keep.append(p)
    ps=keep;dedup={};clean=[]
    for p in ps:
        key=(p['brand'].casefold(),norm(p['name']),p['category'])
        if key in dedup:
            target=dedup[key];r.merge(target,p)
            target.setdefault('merged_ids',[]).append(p['id'])
            for k in ['details','image_review','china_price','trend','launch','official_product_url']:
                if not target.get(k) and p.get(k):target[k]=p[k]
            REPORT['corrections'].append({'type':'exact-title duplicate merge','id':p['id'],'into':target['id']})
        else:dedup[key]=p;clean.append(p)
    ps=clean;specific_facts(ps)
    todo=[p for p in ps if p.get('_new_photo') or not p.get('image')]
    def repair(p):
        ok=cache_photo(p,p.get('_new_photo') or p.get('image_source'));p.pop('_new_photo',None)
        if not ok:REPORT['image_failures'].append(p['id'])
        return ok
    with cf.ThreadPoolExecutor(max_workers=10) as pool:list(pool.map(repair,todo))
    valid=[]
    for p in ps:
        file=R/p.get('image','missing-file')
        try:
            with Image.open(file) as im:
                width,height=im.size;im.verify()
            review=p.setdefault('image_review',{'status':'Source photo recorded; page match not rechecked','source':p['listings'][0]['url'],'level':'Cached file check only','scope':'Product / series example photograph','visually_reviewed':False})
            review.update(file_ok=True,width=width,height=height,file_checked=TODAY)
            valid.append(p)
        except Exception:
            p['exclusion_reason']='No usable decoded product photo';p['excluded_from_product_counts']=True;leads[p['id']]=p;REPORT['image_failures'].append(p['id'])
    ps=valid
    # Updated review date is separate from last all-feed catalog refresh.
    data['products']=ps;data['source_leads']=list(leads.values());data['detail_reviewed']=TODAY;data['brand_context']=CFG['brand_context']
    counts=Counter(p['brand'] for p in ps);data['brands']=dict(counts)
    checklist=[]
    for group in CFG['brand_groups']:
        for b in group['brands']:
            matches=[p for p in ps if p['brand'].casefold()==b.casefold() or (b=='SOWII' and 'sowii' in p['name'].lower())]
            checklist.append({'brand':b,'group':group['label'],'basis':group['basis'],'source':group['source'],'records':len(matches),'with_details':sum(bool(p.get('details',{}).get('size') or p.get('details',{}).get('material') or p.get('material')) for p in matches),'with_china_price':sum(bool(p.get('china_price')) for p in matches),'with_release':sum(bool(p.get('launch') or p.get('launch_estimate')) for p in matches),'status':'Partial — more series and China evidence needed' if matches else 'Missing — product research needed'})
    data['brand_checklist']=checklist
    stats=data['stats'];stats.update(products=len(ps),brands=len(counts),squishy=sum('Squishy' in p['category'] for p in ps),with_images=len(ps),with_launch_dates=sum(bool(p.get('launch') or p.get('launch_estimate')) for p in ps),with_mainland_launch_dates=sum((p.get('launch') or p.get('launch_estimate') or {}).get('market')=='Mainland China' for p in ps),with_china_prices=sum(bool(p.get('china_price')) for p in ps),with_sales=sum(bool(p.get('sales')) for p in ps),with_source_prices=sum(any(l.get('price') is not None for l in p['listings']) for p in ps),with_trend_signals=sum(bool(p.get('trend') and p['trend'].get('expires_on','')>=TODAY) for p in ps),with_specifications=sum(bool(p.get('details',{}).get('size') or p.get('details',{}).get('material') or p.get('material')) for p in ps),with_dimensions=sum(bool(p.get('details',{}).get('size')) for p in ps),with_variant_options=sum(any(l.get('options') for l in p['listings']) for p in ps),source_linked_images=sum(bool(p.get('image_review',{}).get('source_match')) for p in ps),source_leads_excluded=len(leads))
    REPORT.update(before_products=previous_count,after_products=len(ps),stats=stats,checklist=checklist,limitations=['Source-image association is not a visual inspection of every SKU.','Source listings and current prices are mostly overseas references.','Historical China launch prices are not current checkout prices.','Brand checklist is prioritized coverage, not a proof of complete China assortment.'])
    data['review_summary']={k:REPORT[k] for k in ['reviewed','version','limitations']}
    raw=json.dumps(data,ensure_ascii=False,separators=(',',':'));(R/'catalog.json').write_text(raw);(R/'catalog.js').write_text('window.TOY_ATLAS='+raw+';')
    (R/'report.json').write_text(json.dumps({k:data[k] for k in ['updated','detail_reviewed','stats','brands','sources']},ensure_ascii=False,indent=2))
    (R/'review-report.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2));(R/'source-leads.json').write_text(json.dumps(list(leads.values()),ensure_ascii=False,indent=2))
    cols=['id','brand','name','name_cn','category','ip','wave','material','dimensions','age','regular_designs','secret_designs','details_source','china_launch','launch_market','launch_source','china_launch_rrp','china_price_source','retailer','retailer_price','currency','market','variant','price_checked','listing_date','units_sold','sales_source','why_trending','trend_level','trend_period','trend_source','image_check','image_source','product_url']
    with (R/'catalog.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=cols);w.writeheader()
        for p in ps:
            l=p['listings'][0];det=p.get('details') or {};date=p.get('launch') or p.get('launch_estimate') or {};price=p.get('china_price') or {};t=p.get('trend') or {};s=p.get('sales') or {}
            row={k:p.get(k) for k in ['id','brand','name','name_cn','category','ip','wave','material','regular_designs','secret_designs']}
            row.update(dimensions=det.get('size'),age=det.get('age'),details_source=det.get('source'),china_launch=date.get('date') if date.get('market')=='Mainland China' else None,launch_market=date.get('market'),launch_source=date.get('source'),china_launch_rrp=price.get('price'),china_price_source=price.get('source'),retailer=l.get('source'),retailer_price=l.get('price'),currency=l.get('currency'),market=l.get('market'),variant=l.get('variant'),price_checked=l.get('checked'),listing_date=l.get('listing_date'),units_sold=s.get('display'),sales_source=s.get('source'),why_trending=t.get('summary'),trend_level=t.get('level'),trend_period=t.get('period'),trend_source=t.get('source'),image_check=p['image_review'].get('status'),image_source=p.get('image_source'),product_url=l['url'])
            w.writerow({k:("'"+v if isinstance(v,str) and v.startswith(('=','+','-','@')) else v) for k,v in row.items()})
    # Inline the independent UI enhancement into app.js; publishing keeps its existing asset list.
    ui=R/'review-ui.js';app=R/'app.js'
    if ui.exists():
        original=app.read_text().split('\n/* ATLAS_REVIEW_UI */')[0]
        app.write_text(original+'\n/* ATLAS_REVIEW_UI */\n'+ui.read_text())
        index=R/'index.html';text=index.read_text();text=re.sub(r'app\.js\?v=[^"\s]+','app.js?v='+CFG['version'],text);index.write_text(text)
    make_sheet(ps)
    print('REVIEW_RESULT '+json.dumps(stats),flush=True)

if __name__=='__main__':main()
