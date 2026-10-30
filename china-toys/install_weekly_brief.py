#!/usr/bin/env python3
"""Install the weekly brief into the already-published guide bundle, idempotently."""
from pathlib import Path
import hashlib
import re

R = Path(__file__).resolve().parent
marker = '/* ATLAS_EXECUTIVE_BRIEF_START */'
guide_path = R / 'catalog-guide.js'
guide = guide_path.read_text(encoding='utf-8').split(marker, 1)[0].rstrip()
module = (R / 'weekly-brief.js').read_text(encoding='utf-8').strip()
assert 'atlasTutorialVideo' in guide, 'Preserve the existing narrated tutorial'
assert 'data-executive-brief' in module
combined = guide + '\n\n' + marker + '\n' + module + '\n'
guide_path.write_text(combined, encoding='utf-8')
version = hashlib.sha256(combined.encode()).hexdigest()[:12]
index_path = R / 'index.html'
index = index_path.read_text(encoding='utf-8')
index, n = re.subn(r'catalog-guide\.js(?:\?[^"\s]*)?', 'catalog-guide.js?v=weekly-brief-' + version, index)
assert n == 1, 'Expected exactly one guide script'
index_path.write_text(index, encoding='utf-8')
print('Installed weekly brief. Tutorial, product data and ranking evidence preserved. Version:', version)
