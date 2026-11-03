"""Validate provenance and cross-file integrity; no external dependencies."""
import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent
data = json.loads((ROOT / 'data.json').read_text())
js = (ROOT / 'data.js').read_text()
assert json.loads(js.removeprefix('window.ATLAS=').rstrip(';\n')) == data
ids = [b['id'] for b in data['brands']]
assert len(ids) == len(set(ids)), 'Duplicate brand identifiers'

def url(value):
    assert urlparse(value).scheme in ('http', 'https'), value
    assert urlparse(value).netloc, value

for brand in data['brands']:
    assert all(brand[k] for k in ('id', 'name', 'country', 'region', 'collection', 'source'))
    url(brand['source'])
    for channel in brand['channels']:
        url(channel['url'])
for price in data['prices']:
    assert price['amount'] > 0 and len(price['currency']) == 3
    assert price['product'] and price['kind'] and price['date'] and price['market']
    url(price['source'])
for launch in data['launches']:
    assert launch['date'] and launch['dateType'] and launch['detail']
    url(launch['source'])
for retailer in data['retailers']:
    assert retailer['sku_catalogue_complete'] is False
    assert retailer['status'] and retailer['scope_note']
    url(retailer['source_url'])
for entry in data['guest']:
    assert entry['sample'] and entry['date'] and entry['evidence']
    url(entry['source'])
for entry in data['featureModels']:
    url(entry['source'])
assert [r['rank'] for r in data['ranks']] == list(range(1, 8))
for filename in ('index.html', 'styles.css', 'hero.css', 'assets.js', 'app.js'):
    assert (ROOT / filename).stat().st_size > 0, filename
print(f"Validated {len(ids)} brands, {len(data['prices'])} prices, {len(data['retailers'])} retailers and linked evidence.")

import runpy
runpy.run_path(str(ROOT / "validate_photos.py"))

runpy.run_path(str(ROOT / "validate_fashion.py"))
