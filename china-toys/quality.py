#!/usr/bin/env python3
"""Final evidence guardrails. Run after enhance.py before committing generated data."""
import json,re
import enhance as h

PLUSH_SOURCE='https://www.bilibili.com/video/BV1nA5ezJEDL/'

def guard(items):
    for p in items.values():
        name=p['name'].lower()
        # The source is specifically the 3.0 VINYL PLUSH pendant. Accessories
        # share the series name, but have different launch dates and prices.
        if 'big into energy' in name and 'plush' not in name:
            if (p.get('launch') or {}).get('source')==PLUSH_SOURCE:
                p.pop('launch',None)
            if (p.get('china_price') or {}).get('source')==PLUSH_SOURCE:
                p.pop('china_price',None)
            if p.get('wave')=='Plush pendant generation 3 (3.0)':p.pop('wave',None)
            if 'China online and offline release dates differ' in p.get('notes',''):p.pop('notes',None)
            p['china_status']='Mainland SKU availability not yet verified'
        if not p.get('wave'):
            m=re.search(r'\bPart\s+(?:[IVX]+|\d+)\b',p['name'],re.I)
            if m:p['wave']=m.group(0)
        if p.get('image') and not (h.R/p['image']).is_file():
            raise ValueError('Cached product image missing: '+p['id'])

if __name__=='__main__':
    # Export reuses the deduplication, coverage and CSV code, but does not
    # reapply the broader research matcher after this stricter guard.
    h.enrichment=guard
    h.export()
    data=json.loads((h.R/'catalog.json').read_text())
    for p in data['products']:
        if 'big into energy' in p['name'].lower() and 'plush' not in p['name'].lower():
            assert (p.get('china_price') or {}).get('source')!=PLUSH_SOURCE
            assert (p.get('launch') or {}).get('source')!=PLUSH_SOURCE
    print('Product-form price/date guard: passed')
