#!/usr/bin/env python3
"""Install the comparison module without changing product data or other catalogs."""
from pathlib import Path
import hashlib
import re

R = Path(__file__).resolve().parent
module = R / 'compare.js'
code = module.read_text(encoding='utf-8')
# Selection belongs to the product at a shop; changing its pack/price basis
# must not lose the selected state or create a duplicate of the same offer.
code = code.replace("JSON.stringify([e.id,e.url||'',e.mode||'listing'])", "JSON.stringify([e.id,e.url||''])")
if '.compare-table caption{' not in code:
    code = code.replace('.compare-table{border-collapse:', '.compare-table caption{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.compare-table{border-collapse:')
module.write_text(code, encoding='utf-8')
version = hashlib.sha256(code.encode()).hexdigest()[:12]
p = R / 'index.html'
s = p.read_text(encoding='utf-8')
assert 'nav-' in s and 'catalog-guide.js' in s, 'Preserve tested navigation and narrated guide'
assert 'home-care' not in s, 'Toy directory must stay toy-only'
if re.search(r'<script[^>]+src="compare\.js', s):
    s = re.sub(r'compare\.js(?:\?[^"\s]*)?', 'compare.js?v='+version, s)
else:
    s = s.replace('</head>', '<script src="compare.js?v='+version+'" defer></script>\n</head>', 1)
assert s.count('src="compare.js') == 1
p.write_text(s, encoding='utf-8')
print('Comparison installed:', version, '; product data unchanged')
