"""Check coverage, evidence scope and structured/served data consistency."""
import json
from pathlib import Path
p=Path(__file__).parent
d=json.loads((p/'data.json').read_text());f=json.loads((p/'fashion.json').read_text())
assert json.loads((p/'fashion.js').read_text().removeprefix('window.ATLAS_FASHION=').strip().rstrip(';'))==f
assert set(f['records'])=={b['id'] for b in d['brands']}
for bid,r in f['records'].items():
 assert r['brandId']==bid and r['group'] in f['groups']
 assert all(r[k] for k in ['why','audienceBasis','signalStatus','signal','test','checked'])
 assert r['signalSource'].startswith('https://')
 s=r['supplier'];assert s['skuFactoryVerified'] is False
 assert all(s[k] for k in ['status','entity','factory','origin','scope','checked'])
 if s['status']!='Not verified':assert s['source'].startswith('https://')
assert 'PT Jinlin' in f['records']['quince']['supplier']['entity']
assert 'packer' in f['records']['amazon-basics']['supplier']['factory']
assert 'B071VG5N9D' in f['records']['amazon-basics']['supplier']['records'][0]['reference']
for r in f['records'].values():
 s=r['supplier']
 for x in s.get('sources',[]):
  assert all(x[k] for k in ['label','kind','checked']) and x['url'].startswith('https://')
 for x in s.get('records',[]):
  assert all(x[k] for k in ['date','reference','finding'])
 if s.get('records'):assert s.get('sources') and s.get('modelMatch')
assert any(r['name']=='Amazon US' for r in d['retailers'])
assert any(r['name']=='Quince' for r in d['retailers'])
assert len([x for x in d['prices'] if x['brand']=='Quince'])==2
assert all(x in (p/'index.html').read_text() for x in ['fashion.js','fashion-ui.js','fashion.css','photo-assets-7.js'])
print('Validated',len(f['records']),'style/shopper assessments and supplier scope; Amazon and Quince coverage present.')
