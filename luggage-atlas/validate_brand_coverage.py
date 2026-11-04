"""Reject orphan brand references and stale coverage counts before publication."""
import json
from pathlib import Path
p=Path(__file__).parent
d=json.loads((p/'data.json').read_text());r=json.loads((p/'brand-coverage.json').read_text());ph=json.loads((p/'photos.json').read_text())
def resolve(name):
 return next((b for b in d['brands'] if name.casefold() in [b['name'].casefold(),b['id'].casefold(),*[a.casefold() for a in b.get('aliases',[])]]),None)
for section in ('prices','launches','ranks','marketplaceSignals','reviews','guest','featureModels'):
 for item in d.get(section,[]):
  if item.get('brand'):assert resolve(item['brand']), (section,item['brand'])
assert r['totalBrands']==len(d['brands'])==len(r['records'])
assert r['totalPricedOffers']==len(d['prices'])
assert r['totalPhotoReferences']==len(ph['photos'])
assert {x['brandId'] for x in r['records']}=={x['id'] for x in d['brands']}
assert not r['unmatchedInternalBrands']
assert len(r['newBrandIds'])==len(set(r['newBrandIds']))==r['addedBrands']
assert resolve('DTA')['id']==resolve('DTA Nova')['id']=='dta-nova'
assert next(x for x in d['prices'] if x['brand']=='DTA / DTA Nova')['amount']==129.99
for rec in r['records']:
 pics=[x for x in ph['photos'] if x['brandId']==rec['brandId']]
 assert rec['photoReferences']==len(pics)
 assert rec['interiorReferences']==sum(x['view'].startswith('Interior') for x in pics)
 assert rec['assortmentComplete'] is False
print(f"Validated {len(d['brands'])} brand profiles: no orphan structured brand references, consistent coverage counts and DTA full-price evidence.")
