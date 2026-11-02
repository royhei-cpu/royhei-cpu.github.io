#!/usr/bin/env python3
"""Collect the public Rolife blind-box collection without assuming a Shopify feed."""
import concurrent.futures as cf
import hashlib,json,re
from urllib.parse import urljoin,urlparse
from bs4 import BeautifulSoup
import refresh as r
def nodes(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from nodes(v)
 elif isinstance(x,list):
  for v in x:yield from nodes(v)
def parse(url,s):
 soup=BeautifulSoup(r.fetch(url,timeout=25).text,'html.parser')
 found=[]
 for tag in soup.select('script[type="application/ld+json"]'):
  try:found+=list(nodes(json.loads(tag.string or tag.get_text())))
  except (ValueError,TypeError):pass
 n=next((n for n in found if n.get('@type')=='Product' and n.get('url','').split('?')[0].rstrip('/')==url.rstrip('/')),None)
 if not n:return None
 title=re.sub(r'\s+',' ',n.get('name','')).strip()
 # Header recommendations include unrelated miniature-house kits.
 if not re.search(r'Surprise (?:Figure|Plush) Dolls|blind.?box',title,re.I):return None
 photos=n.get('image') or []
 if isinstance(photos,str):photos=[photos]
 photos=[x for x in photos if isinstance(x,str) and x.startswith('https://')]
 if not photos:return None
 offers=n.get('offers') or []
 if isinstance(offers,dict):offers=[offers]
 options=[]
 for o in offers:
  try:price=float(o['price'])
  except (ValueError,TypeError,KeyError):continue
  if price<=0 or not re.fullmatch('[A-Z]{3}',o.get('priceCurrency','')):continue
  sku=o.get('sku') or n.get('sku') or ''
  pack=re.search(r'SET/(\d+)',sku,re.I)
  label=('Set of '+pack.group(1)+' · SKU '+sku) if pack else ('SKU '+sku+' · check pack on shop')
  availability=o.get('availability','')
  available=True if availability.endswith('/InStock') else False if availability.endswith('/OutOfStock') else None
  options.append({'name':label,'sku':sku,'price':price,'currency':o['priceCurrency'],'available':available,'url':o.get('url') or url,'id':o.get('url') or sku})
 chosen=min(options,key=lambda x:('SET/' in x['sku'].upper(),x['price'])) if options else {}
 listing={'source':s['name'],'source_id':s['id'],'kind':s['kind'],'url':url,'market':s['market'],'currency':chosen.get('currency',s['currency']),'price':chosen.get('price'),'variant':chosen.get('name'),'available':chosen.get('available'),'listing_date':None,'checked':r.TODAY,'options':options,'options_checked':r.TODAY}
 ip='Nanci' if 'nanci' in (title+url).lower() else 'Suri' if 'suri' in (title+url).lower() else None
 pid=hashlib.sha1(('rolife|'+r.normalize(title)).encode()).hexdigest()[:16]
 return {'id':pid,'brand':'Rolife','name':title,'ip':ip,'category':'Blind-box plush' if 'plush' in title.lower() else 'Blind-box figures','wave':None,'image_source':photos[0],'gallery':photos[:6],'listings':[listing],'launch':None,'first_seen':r.TODAY,'checked':r.TODAY,'china_status':'Chinese brand; international storefront offer. Mainland availability unverified.','sales':None,'image_gallery_note':'Series reference photos; the design inside a random box may differ.','image_review':{'source':url,'source_match':True,'visually_reviewed':False,'checked':r.TODAY,'status':'Exact product-page image association','scope':'Source association only; not a complete visual audit'}}
def collect(s):
 base=s['url'].rstrip('/');urls=set();pages=[];issues=[]
 for page in range(1,31):
  u=base+'/collections/blind-box'+('?page='+str(page) if page>1 else '')
  try:
   soup=BeautifulSoup(r.fetch(u,timeout=25).text,'html.parser')
   found={urljoin(base,a['href']).split('?')[0] for a in soup.select('a[href]') if '/products/' in a['href'] and urlparse(urljoin(base,a['href'])).hostname==urlparse(base).hostname}
   new=found-urls;pages.append({'url':u,'product_links':len(found),'new_links':len(new)});urls|=found
   if not new:break
   if not any('page=' in a['href'] for a in soup.select('a[href]')):break
  except Exception as ex:issues.append({'url':u,'reason':type(ex).__name__});break
 rows=[]
 def safe(u):
  try:return parse(u,s)
  except Exception as ex:issues.append({'url':u,'reason':type(ex).__name__});return None
 with cf.ThreadPoolExecutor(max_workers=5) as pool:
  rows=[p for p in pool.map(safe,sorted(urls)) if p]
 report={'id':s['id'],'name':s['name'],'url':base+'/collections/blind-box','status':'partial' if rows else 'unavailable','products_inspected':len(urls),'eligible_listings':len(rows),'checked':r.TODAY,'currency':s['currency'],'scope':'Public blind-box collection links; no advertised inventory denominator captured','pages':pages,'issues':issues,'complete_current_inventory':False}
 print(json.dumps(report),flush=True)
 return rows,report
