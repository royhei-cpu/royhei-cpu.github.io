"""Build the three plain search directories from retained, canonical source records."""
import argparse,base64,hashlib,json,re,shutil,sys,gzip
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[3]
ASSETS=Path(__file__).parent/'directory'
def read(p): return json.loads(Path(p).read_text())
def extract(s,marker): return json.JSONDecoder().raw_decode(s.split(marker,1)[1])[0]
def compact(d): return json.dumps(d,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
def jsdata(p):
 s=Path(p).read_text(); return json.JSONDecoder().raw_decode(s[s.index('{'):])[0]
def text(v):
 if v is None:return ''
 if isinstance(v,str):return v
 if isinstance(v,list):return ' · '.join(filter(None,(text(x) for x in v)))
 if isinstance(v,dict):return ' · '.join(f'{k}: {text(x)}' for k,x in v.items() if x is not None)
 return str(v)
def normdate(v):
 if not v:return ''
 s=str(v);return s[:10] if re.match(r'^\d{4}-\d{2}-\d{2}',s) else s if re.match(r'^\d{4}-\d{2}$',s) else ''
def offerkey(p):
 s='|'.join(str(p.get(k,'')) for k in ['brand','product','currency','retailer','source']);h=2166136261
 # Match JavaScript for..of / charCodeAt(0), including astral characters.
 for c in s:
  code=ord(c);code=0xD800+((code-0x10000)>>10) if code>0xffff else code
  h=((h^code)*16777619)&0xffffffff
 return 'offer-'+format(h,'x')
class LegacyPhotos(HTMLParser):
 def __init__(self):super().__init__();self.photos={};self.uid=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if a.get('data-id'):self.uid=a['data-id']
  if tag=='img' and self.uid:self.photos.setdefault(self.uid,a.get('src',''))
def home_records(site):
 base=ROOT/'home-care/site';s=(base/'index.html').read_text();items=extract(s,'const ITEMS=');parser=LegacyPhotos();parser.feed(s[:s.index('const ITEMS=')]);photos=parser.photos
 ids={p['id']:p for p in items};review=read(base/'catalog-review/index.json')
 for part in ['catalog-additions.json']+['catalog-review/'+x for x in review['files']]:
  for p in read(base/part):ids.setdefault(p['id'],p)
 for path in sorted((base/'catalog-review').glob('record-updates-????-??-??.json')):
  for patch in read(path):
   assert 'datePosted' not in patch;ids[patch['id']].update(patch)
 for patch in read(base/'catalog-review/category-cross-listings.json'):ids[patch['id']].update(patch)
 for pack in review.get('photoPacks',[]):
  for name,b in json.loads(gzip.decompress((base/'catalog-review'/pack).read_bytes())).items():
   assert re.fullmatch('[a-f0-9]{24}\\.jpg',name);dest=site/'research-photos'/name;dest.parent.mkdir(exist_ok=True,parents=True);dest.write_bytes(base64.b64decode(b))
 return list(ids.values()),photos,review

def home(site):
 raw,photos,review=home_records(site);out=[]
 for p in raw:
  price=p.get('displayPrice') or p.get('price') or '';a=p.get('observedPrice');a=a if isinstance(a,(int,float)) else None
  if a is None:
   match=re.fullmatch(r'\$([\d,]+(?:\.\d{1,2})?)',str(price).strip());a=float(match[1].replace(',','')) if match else None
  direct=p.get('currentSource') or p.get('url','');broad=bool(re.search(r'/(s|clp|b|browse|category|categories|collections|search|zgbs)(/|\?|$)',direct))
  out.append(dict(id=p['id'],name=p['name'],brand=p.get('brand') or 'Not verified',retailer=p['retailer'],category=p.get('categoryLabel') or p['category'],categories=p.get('secondaryCategories',[]),market=p.get('market') or 'United States',currency=p.get('currency') or ('USD' if a is not None or '$' in str(price) else ''),amount=a,priceText=str(price) if price else '',priceDate=p.get('priceObservedDate') or (p.get('checkedDate','') if a is not None else ''),priceNote=p.get('priceBasis',''),image=p.get('image') or photos.get(p['id'],''),imageNote=p.get('photoNote') or p.get('photoVerification',''),imageSource=p.get('photoSource',''),url=direct,checked=p.get('checkedDate',''),listed=p.get('retailerListedDate',''),launch=p.get('launchDate','') if p.get('dateVerifiedThisPass') or p.get('dateEvidenceSource') else '',added=p.get('datePosted',''),catalogDateBasis=p.get('catalogDateBasis',''),variant=p.get('pack') or p.get('packSize') or p.get('size',''),material=p.get('material',''),dimensions=p.get('dimensions',''),features=p.get('description',''),manufacturer=p.get('manufacturer') or p.get('factoryName') or '',sales=' · '.join(str(x) for x in [p.get('displaySales') or p.get('sales'),p.get('salesPeriod'),p.get('metricDate'),p.get('metricNote')] if x),salesSource=p.get('salesItemSource') or p.get('metricSource',''),availability=p.get('availability') or 'Not verified',evidence=p.get('evidenceLevel') or ('Search / category reference' if broad else 'Indexed / limited evidence' if re.search(r'indexed|access issue|metadata|restriction',p.get('verificationNote',''),re.I) else 'Individual item link'),note=p.get('verificationNote','')))
 # Retain the separate international source library and every recorded retailer offer.
 existing={p['id'] for p in out}
 for p in read(ROOT/'home-care/site/global-reference-products.json'):
  if p['id'] in existing:continue
  seen=set()
  for i,o in enumerate(p.get('availability') or [p]):
   url=o.get('link') or p.get('link','');retailer=o.get('retailer') or p.get('retailer','');market=o.get('market') or p.get('market','');signature=(url,retailer,market)
   if signature in seen:continue
   seen.add(signature);primary=url==p.get('link') and retailer==p.get('retailer');rp=o.get('referencePrice') or (p.get('referencePrice') if primary else {}) or {};date=(o.get('evidence') or {}).get('checkedAt') or ((p.get('evidence') or {}).get('checkedAt') if primary else '') or ''
   image=p.get('image') or ''
   if image and not image.startswith(('https://','http://','/home-care/')):image='/cleantrend-opportunity-hub/'+image.lstrip('/')
   if 'photo-pending' in image:image=''
   out.append(dict(id=p['id'] if len(seen)==1 else p['id']+'::'+str(i),group=p['id'],groupName=p['name'],name=p['name'],brand=p.get('brand') or 'Not verified',retailer=retailer,category=p.get('category',''),market=market,currency=rp.get('currency') or '',amount=rp.get('amount'),priceText=o.get('priceLabel') or (p.get('priceLabel') if primary else '') or '',priceDate=rp.get('reviewedAt') or date,priceNote=o.get('priceNote') or p.get('priceNote',''),image=image,imageNote='Recorded reference image; exact pack must be checked',imageSource=url,url=url,checked=date,added=p.get('sourceDiscoveredAt',''),launch='',listed='',variant=p.get('packLabel') or '',features=p.get('description',''),evidence='International source reference',availability='Current stock not verified',note='Source discovery and price observation are separate. No USD conversion or demand rank is inferred.'))
 factory=read(ROOT/'home-care/site/brand-factories.json');aliases={b.strip().casefold():e for e in factory['entries'] for b in e['brands']}
 for p in out:
  e=aliases.get(p['brand'].strip().casefold())
  if e:
   p['manufacturer']=' · '.join(filter(None,[e.get('manufacturerName'),('Brand owner: '+e['brandOwnerName']) if e.get('brandOwnerName') else '',('; '.join(f['name'] for f in e.get('factories',[]))+' (brand facility; exact SKU factory unverified)') if e.get('factories') else 'Exact SKU factory not verified']))
   p['manufacturerSource']=e.get('manufacturerSource') or e.get('brandOwnerSource') or ''
 news=read(ROOT/'home-care/site/directory-news.json')
 # Exact additions stay separate from launch announcements.
 for p in raw:
  if p.get('datePosted','')>='2026-11-08':news.append(dict(id='added-'+p['id'],title=p['name'],date=p['datePosted'],type='New to directory',summary=f"{p['retailer']} · {p.get('categoryLabel') or p['category']}. Added to the research catalog; this is not a verified product launch.",dateLabel='Catalog addition date',checked=p.get('checkedDate',''),sources=[dict(label=p['retailer'],url=p.get('currentSource') or p['url'])]))
 (site/'catalog-records.json').write_text(compact(raw))
 return dict(id='home-care',title='Home Care',reviewed=review['reviewedAt'],items=out,news=news,legacyStorage='hc-merchant-picks',unit='listings')

def luggage(site):
 base=ROOT/'luggage-atlas';d=read(base/'data.json');photos=read(base/'photos.json');details={p['offerId']:p for p in read(base/'product-details.json')['records']};features={p['offerId']:p for p in read(base/'model-features.json')['records'] if p.get('offerId')};families=extract((base/'model-evidence.js').read_text(),'window.ATLAS_MODEL_EVIDENCE = ') if 'window.ATLAS_MODEL_EVIDENCE = ' in (base/'model-evidence.js').read_text() else json.loads((base/'model-evidence.js').read_text().split('=',1)[1].strip().rstrip(';'))
 members={uid:(fam,v) for fam in families for uid,v in fam['variants'].items()};br={p['name']:p for p in d['brands']};phby={}
 for p in photos['photos']:
  if p.get('offerId'):phby.setdefault(p['offerId'],[]).append(p)
 out=[]
 for p in d['prices']:
  uid=offerkey(p);detail=details.get(uid,{});feat=features.get(uid,{});fam,var=members.get(uid,({},{}));brand=br.get(p['brand'],{});ph=phby.get(uid,[]);image=var.get('photo') or p.get('sourcePhoto') or '';caption='Storefront product photo · confirm exact size and color'
  if ph:
   exterior=next((x for x in ph if 'Exterior' in x.get('view','')),ph[0]);image=exterior.get('localPath') or exterior.get('imageUrl');caption=exterior.get('scope','')
  ff=feat.get('features',{});val=lambda k:text(ff.get(k,{}).get('value'))
  out.append(dict(id=uid,name=p['product'],brand=p['brand'],aliases=brand.get('aliases',[]),retailer=p.get('retailer',''),category=p.get('format','Luggage'),market=p.get('market',''),currency=p.get('currency',''),amount=p.get('amount'),priceDate=p.get('date',''),priceNote=' · '.join(filter(None,[p.get('kind'),p.get('note')])),image=image,imageNote=caption if image else '',imageSource=p['source'],gallery=[dict(url=x.get('localPath') or x.get('imageUrl'),caption=x.get('view','')+' · '+x.get('scope','')) for x in ph],url=p['source'],checked=p.get('date',''),launch=detail.get('launchDate') or '',listed='',added='',variant=' · '.join(filter(None,[var.get('size'),var.get('color'),var.get('sku')])) or p['product'],dimensions=detail.get('dimensions') or val('dimensions'),weight=detail.get('weight') or val('weight'),material=val('material'),features=' · '.join(k+': '+text(v.get('value')) for k,v in ff.items() if k not in ['dimensions','material','weight']),specSource=detail.get('source') or feat.get('source',''),note=feat.get('scope',''),evidence='Dated price observation',availability='Unavailable at observation' if re.search('sold out|out of stock|unavailable',p.get('kind','')+' '+p.get('note',''),re.I) else 'Not verified',group=fam.get('id'),groupName=fam.get('name')))
 # Keep separately researched model/family references even when no exact priced offer is mapped.
 for ref in read(base/'model-features.json')['records']:
  if ref.get('offerId'):continue
  ff=ref.get('features',{});value=lambda k:text(ff.get(k,{}).get('value'))
  out.append(dict(id='reference-'+ref['id'],name=ref.get('model') or ref.get('brand'),brand=ref.get('brand',''),aliases=ref.get('aliases',[]),category=ref.get('format') or 'Model reference',retailer='Source model reference',market=ref.get('market') or '',currency='',amount=None,priceText='Exact offer price not verified',priceDate='',priceNote='Model / family reference; not matched to a priced size or color.',image=ref.get('image') or '',imageNote=ref.get('photoScope') or 'Model / family image; exact variant unverified',imageSource=ref.get('photoSource') or ref.get('source',''),gallery=[dict(url=u,caption='Model / family source image; exact variant unverified') for u in ref.get('gallery',[])],url=ref.get('source',''),checked=ref.get('checked',''),launch='',listed='',added='',variant=ref.get('recordType') or 'Model / family reference',dimensions=value('dimensions'),weight=value('weight'),material=value('material'),features=' · '.join(k+': '+text(v.get('value')) for k,v in ff.items() if k not in ['dimensions','material','weight']),specSource=ref.get('source',''),note=ref.get('scope',''),evidence='Model / family source reference',availability='Not verified'))
 weekly=read(base/'weekly.json');news=[]
 for n in weekly.get('items',[]):news.append(dict(id=n['id'],title=n['title'],summary=n.get('change','')+(' Observed price: '+n['price'] if n.get('price') else ''),date=n.get('date'),type=n.get('status','Source update'),dateLabel=n.get('dateType','Source observation'),market=n.get('market',''),checked=n.get('date',''),sources=[dict(label='Original source',url=n['source'])]))
 if (base/'directory-news.json').exists():news+=read(base/'directory-news.json')
 return dict(id='luggage-atlas',title='Luggage Atlas',reviewed=d['asOf'],items=out,news=news,unit='models / listings',legacyStorage='luggage-atlas-cost-desk-v1',brands=[dict(name=b['name'],aliases=b.get('aliases',[]),url=b.get('official') or b.get('source')) for b in d['brands']])

def toys(site):
 d=read(site/'catalog.json');out=[]
 for p in d['products']:
  ls=p.get('listings',[]);l=ls[0] if ls else {};launch=p.get('launch') or {};detail=p.get('details') or {};rev=p.get('image_review') or {};price=l.get('price');out.append(dict(id=p['id'],name=p['name'],brand=p.get('brand') or 'Not verified',category=p.get('category',''),character=p.get('ip') or '',retailer=l.get('source',''),retailers=[v.get('source') for v in ls],market=l.get('market',''),currency=l.get('currency',''),amount=price,priceDate=l.get('checked',''),priceNote='Offer: '+(l.get('variant') or 'Not specified'),image=p.get('image') or p.get('image_source',''),imageSource=p.get('image_source',''),imageNote=rev.get('scope') or 'Product / series image; confirm exact variant.',gallery=[dict(url=u,caption='Source gallery · designs and pack options may differ') for u in p.get('gallery',[])[:12]],url=l.get('url') or detail.get('source',''),checked=p.get('checked',''),listed='',launch=launch.get('date',''),added=p.get('first_seen',''),variant=l.get('variant',''),material=p.get('material') or detail.get('material',''),dimensions=detail.get('size',''),features=detail.get('description',''),specSource=detail.get('source',''),sales=text(p.get('sales')),evidence='Source-linked product',availability='Available at observation' if l.get('available') is True else 'Unavailable at observation' if l.get('available') is False else 'Not verified',note=(p.get('china_status') or '')+(' · Launch evidence: '+(launch.get('evidence') or '') if launch else ''),offers=[dict(url=v.get('url',''),retailer=v.get('source',''),price=str(v.get('currency',''))+' '+str(v.get('price') if v.get('price') is not None else 'Not verified'),variant=v.get('variant',''),checked=v.get('checked',''),market=v.get('market','')) for v in ls[1:]]))
 # Exact retailer and pack options share a product card, but keep independent evidence.
 base_rows={p['id']:p for p in out};expanded=[]
 ip_index={uid:r['name'] for r in read(ROOT/'china-toys/ip-coverage.json')['all_character_filters'] for uid in r.get('product_ids',[])}
 for source in d['products']:
  row=base_rows[source['id']];row['character']=ip_index.get(source['id'],row.get('character',''));variants=[];seen=set()
  for li,l in enumerate(source.get('listings') or [{}]):
   opts=[dict(name=l.get('variant'),price=l.get('price'),currency=l.get('currency'),available=l.get('available'))]+(l.get('options') or [])
   for oi,o in enumerate(opts):
    signature=(l.get('url'),o.get('name'),o.get('currency') or l.get('currency'),o.get('price'))
    if signature in seen:continue
    seen.add(signature);r=dict(row);r.update(id=source['id'] if not variants else source['id']+'::'+str(li)+'::'+str(oi),group=source['id'],groupName=source['name'],retailer=l.get('source') or '',retailers=[],market=l.get('market') or '',currency=o.get('currency') or l.get('currency') or '',amount=o.get('price'),variant=o.get('name') or '',url=l.get('url') or '',priceDate=l.get('options_checked') if oi else l.get('checked',''),priceNote='Recorded retailer offer; confirm the selected pack and conditions.',availability='Available at observation' if o.get('available') is True else 'Unavailable at observation' if o.get('available') is False else 'Not verified')
    if oi and o.get('image'):r['image']=o['image'];r['imageNote']='Storefront image mapped to this option; random designs and appearances may differ.'
    variants.append(r)
  expanded+=variants or [row]
 out=expanded
 chain=read(site/'chain-assortments.json');existing={p['id'] for p in out}
 for p in chain.get('products',[]):
  if p['id'] in existing:continue
  price=(p.get('prices') or [{}])[0];release=p.get('release') or {};out.append(dict(id=p['id'],name=p['name'],brand=p.get('brand',''),category=p.get('category',''),retailer=' / '.join(p.get('chain_ids',[])),retailers=p.get('chain_ids',[]),market='Mainland China',currency=price.get('currency',''),amount=price.get('amount'),priceDate=price.get('as_of',''),priceNote=price.get('type',''),image=p.get('image',''),imageSource=p.get('image_source',''),imageNote=p.get('image_caption',''),url=price.get('source') or release.get('source',''),checked=p.get('checked',''),listed='',launch=release.get('date',''),added=p.get('added',''),variant=p.get('pack',''),features=p.get('summary',''),evidence='Chain / series announcement',availability='Current stock not verified',note=p.get('retail_scope','')))
 story=read(ROOT/'china-toys/retailer-stories-data.json');news=[]
 for n in story.get('updates',[]):news.append(dict(id=n['id'],title=n['title'],summary=n.get('summary',''),date=n.get('published') or n.get('checked',''),eventDate=n.get('event_date',''),type=n.get('type','Source update'),dateLabel=n.get('date_kind','Publication date'),market=n.get('market',''),checked=n.get('checked',''),sources=[dict(label=n.get('publisher','Original source'),url=n.get('url',''))]))
 for p in d['products']:
  for h in p.get('history',[]):
   if isinstance(h,dict) and (h.get('date') or h.get('checked',''))>='2026-11-08':
    l=(p.get('listings') or [{}])[0];news.append(dict(id=p['id']+'-'+str(h.get('date')),title=p['name'],summary=text(h),date=h.get('date') or h.get('checked'),type='Catalog change',dateLabel='Observed catalog change',sources=[dict(label='Product source',url=l.get('url',''))]))
 if (ROOT/'china-toys/directory-news.json').exists():news+=read(ROOT/'china-toys/directory-news.json')
 return dict(id='china-toys',title='China Toy Atlas',reviewed=d['updated'],items=out,news=news,unit='products / series')

CONFIG={'home-care':('Home Care','Find your next product reference.','Search household products across retailers. Compare the details that matter.','Search products, brands or features…','household products','catalog-records.json'),'luggage-atlas':('Luggage Atlas','Find the right luggage.','Explore worldwide luggage. Compare exact offers, specifications and source photos.','Try a brand, model, front access or cabin…','worldwide luggage','data.json'),'china-toys':('China Toy Atlas','Find your next collectible.','Explore blind boxes and squishies. Compare source prices, shops and product details.','Search a brand, character, series or squishy…','blind boxes and squishies','catalog.json')}
def page(sid,datahash):
 vals=CONFIG[sid];s=(ASSETS/'page.html').read_text()
 for k,v in zip(['TITLE','HEADLINE','DESCRIPTION','PLACEHOLDER','TOPIC','RAW'],vals):s=s.replace('__'+k+'__',v)
 for k,id in [('HOME','home-care'),('LUGGAGE','luggage-atlas'),('TOYS','china-toys')]:s=s.replace('__CURRENT_'+k+'__','aria-current="page"' if id==sid else '')
 return s.replace('__DATA_HASH__',datahash)
def redirect(name,target):return f'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{name}</title><meta http-equiv="refresh" content="0;url={target}"><p><a href="{target}">Open {name}</a></p>'
def build(dest):
 for sid,fn in [('home-care',home),('china-toys',toys),('luggage-atlas',luggage)]:
  site=dest/sid;site.mkdir(parents=True,exist_ok=True);d=fn(site)
  assert d['items'] and len({p['id'] for p in d['items']})==len(d['items']),sid+' duplicate IDs'
  seen=set();d['news']=[n for n in d['news'] if not (n['id'] in seen or seen.add(n['id']))]
  keys=list(dict.fromkeys(k for row in d['items'] for k in row));pool=[];lookup={};rows=[]
  for row in d['items']:
   encoded=[]
   for k in keys:
    if k not in row:encoded.append(-1);continue
    signature=compact(row[k])
    if signature not in lookup:lookup[signature]=len(pool);pool.append(row[k])
    encoded.append(lookup[signature])
   rows.append(encoded)
  d={**d,'items':None,'packed':dict(keys=keys,pool=pool,rows=rows)}
  blob='window.DIRECTORY='+compact(d)+';\n';(site/'directory-data.js').write_text(blob);h=hashlib.sha256(blob.encode()).hexdigest()[:12]
  (site/'index.html').write_text(page(sid,h));shutil.copyfile(ASSETS/'app.js',site/'directory.js');shutil.copyfile(ASSETS/'style.css',site/'directory.css')
  shutil.copyfile(ASSETS/'guide-chapters.js',site/'guide-chapters.js')
  # Retired routes remain safe bookmarks into the simple directory. No old modules load.
  for p in site.glob('*.html'):
   if p.name!='index.html':p.write_text(redirect(d['title'],'./#guide' if p.name in ['tutorial.html','help.html'] else './#search'))
  for name in ['workshop','workshop-assets','workshop-models','workshop-reference-photos','models','studio-reference-assets','retail','vendor','design-source','tutorial']:
   if (site/name).is_dir():shutil.rmtree(site/name)
  # Ship only the new controller, data and source datasets, never retired tool scripts.
  for p in list(site.glob('*.js'))+list(site.glob('*.css')):
   if p.name not in ['directory.js','directory-data.js','directory.css','guide-chapters.js','data.js','weekly.js','catalog.js','chain-assortments-data.js'] :p.unlink()
  print(sid,len(rows),'records',len(d['news']),'updates')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--site',type=Path,default=ROOT/'_site');args=parser.parse_args();build(args.site)
