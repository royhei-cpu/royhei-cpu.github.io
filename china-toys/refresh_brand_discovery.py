#!/usr/bin/env python3
"""Refresh the public organizer's relevant exhibitor leads; preserve the last complete snapshot."""
import concurrent.futures,datetime,json,re,urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo
R=Path(__file__).resolve().parent
BASE='https://www.china-toy-expo.com/en/online/exhibitor_list'
def parse(source):
 match=re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>',source)
 if not match:raise ValueError('Organizer page structure changed')
 a=json.loads(match[1])
 def deref(i,depth=0):
  if depth>25:raise ValueError('Unexpected deeply nested page data')
  if i<0:return None
  value=a[i]
  if isinstance(value,dict):return {k:deref(v,depth+1) for k,v in value.items()}
  if isinstance(value,list):return [deref(v,depth+1) if isinstance(v,int) else v for v in value]
  return value
 block=next(x for x in a if isinstance(x,dict) and 'last_page' in x and 'list_rows' in x)
 return {k:deref(v) for k,v in block.items()}
def get(page):
 url=BASE+'?page='+str(page)
 with urllib.request.urlopen(url,timeout=40) as response:result=parse(response.read().decode())
 if result['getCurrentPage']!=page:raise ValueError('Wrong page returned for '+url)
 return page,result
if __name__=='__main__':
 today=datetime.datetime.now(ZoneInfo('Asia/Shanghai')).date().isoformat()
 page,first=get(1);total=first['last_page'];pages=[(1,first)]
 if not 1<=total<=300:raise ValueError('Unexpected directory size; review before continuing')
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:pages.extend(pool.map(get,range(2,total+1)))
 ids=[x['id'] for _,d in pages for x in d['list']]
 if len(ids)!=first['total'] or len(set(ids))!=len(ids):raise ValueError('Incomplete or duplicate source records; prior snapshot retained')
 leads=[]
 for page,d in pages:
  for x in d['list']:
   cats=[c['name_en'] for c in x['category_data']]
   titles=' '.join((p.get('title_en') or '')+' '+(p.get('title_cn') or '') for p in x['product_list'])
   profile=re.sub('<[^>]+>',' ',(x.get('info') or {}).get('content_cn') or '')
   blind='Blind Boxes' in cats;squishy=bool(re.search('squishy|捏捏',titles+' '+profile,re.I))
   region=x['country']['name_en']
   if not (blind or squishy) or region not in ['China','Hong Kong, China']:continue
   leads.append(dict(expo_id=x['id'],name=x['company_en'] or x['company_cn'],name_cn=x['company_cn'],region='Hong Kong exhibitor' if region=='Hong Kong, China' else 'Mainland-listed exhibitor',source=BASE+'?page='+str(page),source_page=page,reviewed=today,topics=(['Blind boxes'] if blind else [])+(['Squishies'] if squishy else []),note='Organizer-listed company with '+('blind-box and squishy references' if blind and squishy else 'a blind-box category' if blind else 'a squishy reference')+'. Supplier / distributor lead; not automatically a Chinese-owned consumer brand. Products and capabilities require verification.',booth=x['booth_num']))
 summary=dict(source=BASE,reviewed=today,pages_read=total,pages_total=total,exhibitor_records_read=len(ids),source_total=first['total'],failures=[],relevant_leads=len(leads),method='Full organizer-directory sweep. Retain mainland/Hong Kong-listed exhibitors with an explicit Blind Boxes category or squishy reference in supplied profile/product titles. Company leads, not manufacturer certification or a national brand census.')
 destination=R/'brand-discovery.json';temporary=destination.with_suffix('.tmp')
 temporary.write_text(json.dumps({'summary':summary,'entries':leads},ensure_ascii=False,indent=2)+'\n');temporary.replace(destination)
 print(json.dumps(summary,ensure_ascii=False))
