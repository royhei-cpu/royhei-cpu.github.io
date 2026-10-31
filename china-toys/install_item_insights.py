"""Keep concise summaries and export columns through scheduled catalog rebuilds."""
from pathlib import Path
import re,hashlib
r=Path(__file__).resolve().parent
p=r/'index.html';s=p.read_text()
if 'src="item-insights.js' not in s:s=s.replace('<script src="app.js', '<script src="item-insights.js?v=20261031-1" defer></script><script src="app.js')
for f in ['app','catalog-guide','simple-navigation','retail-chains','item-insights']:
 s=re.sub(rf'{f}\.js\?v=[^"\s]+',f'{f}.js?v='+hashlib.sha256((r/(f+'.js')).read_bytes()).hexdigest()[:12],s)
p.write_text(s)
p=r/'app.js';s=p.read_text()
if "'Item overview'" not in s:
 s=s.replace("'Observed market prices JSON']", "'Observed market prices JSON','Item overview','Comparison angle (interpretation)','Questions to verify','Analysis sources','Analysis review scope']")
 s=s.replace('window.ATLAS_MARKET_PRICES?.csv(p)]','window.ATLAS_MARKET_PRICES?.csv(p),...(window.ATLAS_ITEM_INSIGHT_FIELDS?.(p)||Array(5).fill(\'\'))]')
p.write_text(s)
