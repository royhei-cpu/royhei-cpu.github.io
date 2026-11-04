"""Keep the physical planner and its 3D module cache versions in sync."""
from pathlib import Path
import hashlib
import re
import json

ROOT = Path(__file__).resolve().parent

def build():
    registry = json.loads((ROOT / 'brand-registry.json').read_text())
    brands = [{key: entry.get(key, '') for key in ['name', 'kind', 'aliases', 'source', 'parent']}
              for entry in registry['entries'] if entry['kind'] not in ['supplier', 'label', 'unattributed']]
    (ROOT / 'retail-brand-data.js').write_text('window.ATLAS_RETAIL_BRANDS=' + json.dumps(brands, ensure_ascii=False, separators=(',', ':')) + ';\n')
    scene_hash = hashlib.sha256((ROOT / 'retail-scene.js').read_bytes()).hexdigest()[:12]
    studio = ROOT / 'retail-studio.js'
    text = re.sub(r'retail-scene\.js\?v=[^\'"\s]+', 'retail-scene.js?v=' + scene_hash, studio.read_text())
    studio.write_text(text)
    index = ROOT / 'index.html'
    text = index.read_text()
    for filename in ['planogram.js', 'planogram.css', 'retail-data.js', 'retail-studio.js', 'retail-studio.css', 'retail-brand-data.js', 'retail-artwork.js', 'workshop-flow.css', 'simple-navigation.js', 'retailer-stories.js']:
        digest = hashlib.sha256((ROOT / filename).read_bytes()).hexdigest()[:12]
        text = re.sub(re.escape(filename) + r'\?v=[^"\s]+', filename + '?v=' + digest, text)
    index.write_text(text)
    assert text.index('src="planogram.js') < text.index('src="retail-data.js') < text.index('src="retail-studio.js')
    print('Dimensioned planogram and 3D module cache versions updated')

if __name__ == '__main__':
    build()
