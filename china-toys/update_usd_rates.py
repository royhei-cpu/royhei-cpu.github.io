"""Refresh the dated USD presentation snapshot without changing source prices."""
from pathlib import Path
import hashlib
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
ROOT = Path(__file__).resolve().parent
URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'

def refresh(root=ROOT):
    try:
        req = urllib.request.Request(URL, headers={'User-Agent':'ChinaToyAtlas/1.0'})
        with urllib.request.urlopen(req, timeout=25) as response:
            doc = ET.fromstring(response.read())
        day = next(e for e in doc.iter() if 'time' in e.attrib)
        rates = {e.attrib['currency']:float(e.attrib['rate']) for e in day if 'currency' in e.attrib}
        rates['EUR'] = 1
        assert all(rates.get(c, 0)>0 for c in ('USD','CNY','HKD','EUR','JPY','GBP'))
        fx = dict(date=day.attrib['time'],base='USD',to_usd={c:rates['USD']/n for c,n in rates.items()},source=URL,publisher='European Central Bank',checked=datetime.now(timezone.utc).date().isoformat())
        (root/'retail/fx-rates.json').write_text(json.dumps(fx,indent=2)+'\n')
        p=root/'currency.js';text=p.read_text();text=re.sub(r'const fx=.*?;\n', 'const fx='+json.dumps(fx,separators=(',',':'))+';\n',text,count=1);p.write_text(text)
        p=root/'index.html';p.write_text(re.sub(r'currency.js\?v=[^"\s]+','currency.js?v='+hashlib.sha256(text.encode()).hexdigest()[:12],p.read_text()))
        print('USD estimates: ECB reference rates dated',fx['date'])
    except Exception as exc:
        # Cached rates keep their real date; never claim an unsuccessful refresh is current.
        print('USD rate refresh unavailable; retaining dated snapshot:',type(exc).__name__)

if __name__=='__main__':
    refresh()
