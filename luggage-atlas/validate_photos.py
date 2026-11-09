import hashlib,json,re
from pathlib import Path
p=Path(__file__).parent
d=json.loads((p/'data.json').read_text());a=json.loads((p/'photos.json').read_text());w=json.loads((p/'weekly.json').read_text());ids=[x['id']for x in a['photos']]
assert len(ids)==len(set(ids))
assert set(a['byBrand'])=={b['id']for b in d['brands']}
assert all(isinstance(v,list) for v in a['byBrand'].values())  # Empty is an explicit evidence gap, not a fabricated image.
assets={}
for f in p.glob('photo-assets-*.js'):
 s=f.read_text();assets.update(json.loads(s[s.index('{',s.index('||{}')+4):s.rfind('}')+1]))
assert set(ids)==set(assets)|{x['id'] for x in a['photos'] if x.get('localPath') or x.get('remoteReference')}
for x in a['photos']:
 if x.get('localPath'):assert (p/x['localPath']).is_file()
for x in a['photos']:
 assert x['source'].startswith('https://') and x['imageUrl'].startswith(('https://','http://'))
 assert x['caption'] and x['view'] and x['scope']
photo_by_id={x['id']:x for x in a['photos']}
audits=a.get('offerAudits',[])
assert len({x['offerId'] for x in audits})==len(audits)
statuses={'model-size-color-revision-matched','model-size-color-matched','model-size-matched-color-unspecified','collection-alternative'}
linked_ids=[]
for audit in audits:
 assert any(all(offer.get(k)==v for k,v in audit['offerIdentity'].items()) for offer in d['prices']), 'Audit must identify an existing priced offer'
 assert audit['productPage'].startswith('https://') and audit['checked'] and isinstance(audit['gaps'],list)
 assert len(audit['photoIds'])==len(set(audit['photoIds']))
 for photo_id in audit['photoIds']:
  x=photo_by_id[photo_id];linked_ids.append(photo_id)
  assert x.get('offerId')==audit['offerId'], 'Photo linked to a different offer'
  assert x.get('verificationStatus') in statuses, 'Unknown photo verification status'
  assert x['evidence']['visualChecked'] is True
  local=(p/x['localPath']).resolve()
  assert local.is_relative_to((p/'offer-photo-assets').resolve()), 'Asset must stay in the offer photo directory'
  assert hashlib.sha256(local.read_bytes()).hexdigest()==x['evidence']['imageSha256'], 'Photo asset hash mismatch'
  if x['verificationStatus']!='collection-alternative':
   assert all(x['identity'].get(k)==audit['identity'].get(k) for k in ['model','size','color','revision','sku']), 'Photo and offer-audit identity disagree'
   assert x['identity']['model'] and x['identity']['size'] and x['identity']['color']
  if x['verificationStatus']=='model-size-color-revision-matched':assert x['identity']['revision']
assert len(linked_ids)==len(set(linked_ids)), 'A photo cannot be assigned to multiple offers'
assert set(linked_ids)=={x['id'] for x in a['photos'] if x.get('offerId')}, 'Every offer-linked photo must have an audit'
for brand,photo_ids in a['byBrand'].items():
 assert len(photo_ids)==len(set(photo_ids))
 assert all(photo_by_id[i]['brandId']==brand for i in photo_ids)
assert {i for photo_ids in a['byBrand'].values() for i in photo_ids}==set(ids)
assert len({x['id'] for x in w['items']}) == len(w['items'])
for x in w['items']:
 if x['status']=='Dated launch':assert w['periodStart']<=x['date']<=w['periodEnd']
 if x.get('photoId'):assert x['photoId']in ids
s=(p/'index.html').read_text()
for f in p.glob('photo-assets-*.js'):assert f.name in s
for name in ['photos','weekly']:
 s=(p/(name+'.js')).read_text();assert json.loads(s[s.index('=')+1:].strip().rstrip(';'))==json.loads((p/(name+'.json')).read_text())
print('Validated',len(ids),'photos;',len(a['byBrand']),'brands;',len({x['brandId']for x in a['photos']if x['view'].startswith('Interior')}),'interior brands; weekly dates and assets consistent.')
