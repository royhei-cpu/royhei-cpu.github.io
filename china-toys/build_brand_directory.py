#!/usr/bin/env python3
"""Reconcile every catalog label with reviewed profiles; never equate labels with brands."""
import json, collections, hashlib, html, re
from pathlib import Path
R=Path(__file__).resolve().parent
catalog=json.loads((R/'catalog.json').read_text())
registry=json.loads((R/'brand-registry.json').read_text())
bylabel=collections.defaultdict(list)
for p in catalog['products']:bylabel[p.get('brand') or 'Brand not disclosed'].append(p)
used=set();entries=[]
def entry(name,labels,meta):
 ps=[p for l in labels for p in bylabel[l]]
 cats=collections.Counter(p.get('category','Unknown') for p in ps)
 sources=sorted({l.get('url') for p in ps for l in p.get('listings',[]) if l.get('url')})
 e=dict(meta);e.update(id=hashlib.sha256((e.get('kind','label')+'|'+name).encode()).hexdigest()[:12],name=name,labels=[{'name':l,'count':len(bylabel[l])} for l in labels],count=len(ps),squishy_count=sum('squishy' in p.get('category','').lower() for p in ps),blind_count=sum('blind' in p.get('category','').lower() for p in ps),categories=dict(cats),photo=next((p['image'] for p in ps if p.get('image')),''),photo_name=next((p['name'] for p in ps if p.get('image')),''),listing_sources=sources[:3])
 if not e.get('source') and sources:e['source']=sources[0]
 entries.append(e);used.update(labels)
for meta in registry['entries']:
 aliases=meta.get('aliases',[meta['name']]);labels=[x for x in bylabel if x not in used and x.casefold() in {a.casefold() for a in aliases}]
 entry(meta['name'],labels,meta)
for label,ps in sorted(bylabel.items()):
 if label in used:continue
 sq=any('squishy' in p.get('category','').lower() for p in ps)
 kind='unattributed' if label=='Brand not disclosed' else 'squishy' if sq else 'label'
 entry(label,[label],dict(kind=kind,region='Identity / China origin not verified',reviewed='',note='Seller-supplied maker label; brand identity and origin are not independently verified.' if sq else 'Original catalog label. It may identify a maker, character, series or collaboration; classification is pending.'))
# Retailer category names not yet represented in captured products.
for n in ['CHAWA','Kiibru','Lin’s Squishy','Sanfu','Haha Squishy','Misa Squishy','CS Squishy','Chameleon Squishy','Doki Squishy','Pinktea Squishy','Taro Squishy','Rice Deer Squishy','Taba Squishy','Yemi Squishy','ZH Squishy','Popular Boxes Squishy','Cutie Creative Squishy','Vlampo','Puni Maru','Yumeno']:
 if any(e['name'].casefold()==n.casefold() for e in entries):continue
 entry(n,[],dict(kind='squishy',region='Identity / China origin not verified',source='https://heartfeltsquishy.shoplineapp.com/categories/sweet-buns-squishy',reviewed='2026-10-31',note='Named by a specialist retailer; product listings are not yet captured. Country and maker identity need verification.'))
expo=json.loads((R/'brand-discovery.json').read_text()) if (R/'brand-discovery.json').exists() else {'entries':[],'summary':{}}
for m in expo['entries']:
 e=dict(m);e.update(id='expo-'+str(e.pop('expo_id')),kind='supplier',count=0,labels=[],categories={},squishy_count=0,blind_count=0,photo='',photo_name='',listing_sources=[])
 entries.append(e)
counts=collections.Counter(e['kind'] for e in entries)
assert used==set(bylabel)
assert sum(e['count'] for e in entries)==len(catalog['products'])
result={'reviewed':registry['reviewed'],'catalog_records':len(catalog['products']),'catalog_labels':len(bylabel),'counts':dict(counts),'discovery':expo.get('summary',{}),'entries':entries}
(R/'brand-directory-data.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
(R/'brand-directory-data.js').write_text('window.ATLAS_BRANDS='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
print(json.dumps({'entries':len(entries),'catalog_labels':len(bylabel),'records_reconciled':len(catalog['products']),'kinds':dict(counts)},ensure_ascii=False))

# Fingerprint the generated index so weekly updates replace cached directory data.
page=R/'brands.html'
if page.exists():
    text=page.read_text()
    for asset in ['brand-directory-data.js','brands.js','brands.css','atlas-navigation.js','atlas-navigation.css']:
        digest=hashlib.sha256((R/asset).read_bytes()).hexdigest()[:12]
        text=re.sub(re.escape(asset)+r'\?v=[^"\s<]+',asset+'?v='+digest,text)
    page.write_text(text)
