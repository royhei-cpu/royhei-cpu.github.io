import json,re
from pathlib import Path
p=Path(__file__).parent
d=json.loads((p/'data.json').read_text());a=json.loads((p/'photos.json').read_text());w=json.loads((p/'weekly.json').read_text());ids=[x['id']for x in a['photos']]
assert len(ids)==len(set(ids))
assert set(a['byBrand'])=={b['id']for b in d['brands']}
assert all(a['byBrand'].values())
assets={}
for f in p.glob('photo-assets-*.js'):
 s=f.read_text();assets.update(json.loads(s[s.index('{',s.index('||{}')+4):s.rfind('}')+1]))
assert set(ids)==set(assets)
for x in a['photos']:
 assert x['source'].startswith('https://') and x['imageUrl'].startswith(('https://','http://'))
 assert x['caption'] and x['view'] and x['scope']
assert len([x for x in w['items']if x['status']=='Dated launch'])==2
for x in w['items']:
 if x['status']=='Dated launch':assert w['periodStart']<=x['date']<=w['periodEnd']
 if x.get('photoId'):assert x['photoId']in ids
s=(p/'index.html').read_text()
for f in p.glob('photo-assets-*.js'):assert f.name in s
for name in ['photos','weekly']:
 s=(p/(name+'.js')).read_text();assert json.loads(s[s.index('=')+1:].strip().rstrip(';'))==json.loads((p/(name+'.json')).read_text())
print('Validated',len(ids),'photos;',len(a['byBrand']),'brands;',len({x['brandId']for x in a['photos']if x['view'].startswith('Interior')}),'interior brands; weekly dates and assets consistent.')
