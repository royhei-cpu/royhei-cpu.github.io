#!/usr/bin/env python3
"""Read-only source reconciliation. Never equate public-feed exhaustion with China inventory."""
import json,re,concurrent.futures as cf
from pathlib import Path
from urllib.parse import urljoin,urlparse
from bs4 import BeautifulSoup
import enhance as e
r=e.r
R=r.ROOT
catalog=json.loads((R/'catalog.json').read_text())
def norm(u):return re.sub(r'^https?://(?:www\.)?','',u).split('?')[0].rstrip('/')
existing={norm(l['url']) for p in catalog['products'] for l in p.get('listings',[])}
def audit(s):
 rows,report=e.collect(s)
 report.setdefault('scope','Accessible public storefront feed; not mainland or nationwide store inventory')
 report['new_listing_urls']=[p['listings'][0]['url'] for p in rows if norm(p['listings'][0]['url']) not in existing]
 report['already_captured']=sum(norm(p['listings'][0]['url']) in existing for p in rows)
 report['complete_current_inventory']=False
 return report,rows
sources=[s for s in r.CONFIG['sources'] if s['id']!='heartfelt']
results=[];candidates=[]
with cf.ThreadPoolExecutor(max_workers=5) as pool:
 for report,rows in pool.map(audit,sources):
  results.append(report);candidates+=rows
base='https://www.rolifeonline.com'
urls=set();pages=[];errors=[]
for page in range(1,21):
 u=base+'/collections/blind-box'+('?page='+str(page) if page>1 else '')
 try:
  response=r.fetch(u,timeout=25);soup=BeautifulSoup(response.text,'html.parser')
  found={urljoin(base,a['href']).split('?')[0] for a in soup.select('a[href]') if '/products/' in a['href']}
  new=found-urls;pages.append({'url':u,'found':len(found),'new':len(new)})
  urls|=found
  if not new:break
  if not any('page=' in a['href'] for a in soup.select('a[href]')):break
 except Exception as ex:errors.append({'url':u,'error':str(ex)[:160]});break
def detail(u):
 try:
  soup=BeautifulSoup(r.fetch(u,timeout=25).text,'html.parser');nodes=[]
  for t in soup.select('script[type="application/ld+json"]'):
   try:nodes+=list(e.json_nodes(json.loads(t.string or t.get_text())))
   except Exception:pass
  products=[n for n in nodes if n.get('@type')=='Product' or isinstance(n.get('@type'),list) and 'Product' in n['@type']]
  return {'url':u,'products':products,'title':soup.title.get_text() if soup.title else None,'h1':soup.h1.get_text(' ',strip=True) if soup.h1 else None,'script_ids':[t.get('id') for t in soup.select('script[id]')],'og_image':next((t.get('content') for t in soup.select('meta[property="og:image"]')),None)}
 except Exception as ex:return {'url':u,'error':str(ex)[:160]}
with cf.ThreadPoolExecutor(max_workers=5) as pool:rolife=list(pool.map(detail,sorted(urls)))
out={'checked':r.TODAY,'scope':'Public feeds and Rolife blind-box collection; excludes inaccessible mainland mini-program/branch inventory','sources':results,'rolife':{'pages':pages,'errors':errors,'products':rolife}}
(R/'source-reconciliation.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
(R/'source-reconciliation-candidates.json').write_text(json.dumps(candidates,ensure_ascii=False))
print('RECONCILIATION',json.dumps({'sources':[{'id':x['id'],'status':x['status'],'inspected':x['products_inspected'],'eligible':x['eligible_listings'],'new':len(x['new_listing_urls'])} for x in results],'rolife':{'pages':pages,'product_nodes':sum(bool(p.get('products')) for p in rolife),'details':len(rolife)}},ensure_ascii=False))
