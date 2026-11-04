"""Keep the physical planner and its 3D module cache versions in sync."""
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parent

def build():
    scene_hash = hashlib.sha256((ROOT / 'retail-scene.js').read_bytes()).hexdigest()[:12]
    studio = ROOT / 'retail-studio.js'
    text = re.sub(r'retail-scene\.js\?v=[^\'"\s]+', 'retail-scene.js?v=' + scene_hash, studio.read_text())
    studio.write_text(text)
    index = ROOT / 'index.html'
    text = index.read_text()
    for filename in ['planogram.js', 'planogram.css', 'retail-data.js', 'retail-studio.js', 'retail-studio.css']:
        digest = hashlib.sha256((ROOT / filename).read_bytes()).hexdigest()[:12]
        text = re.sub(re.escape(filename) + r'\?v=[^"\s]+', filename + '?v=' + digest, text)
    index.write_text(text)
    assert text.index('src="planogram.js') < text.index('src="retail-data.js') < text.index('src="retail-studio.js')
    print('Dimensioned planogram and 3D module cache versions updated')

if __name__ == '__main__':
    build()
