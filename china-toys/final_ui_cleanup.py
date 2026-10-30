#!/usr/bin/env python3
"""Correct presentation defects found in the functional audit; no invented facts."""
from pathlib import Path
import csv, json, re, runpy
R=Path(__file__).resolve().parent
bad=re.compile(r'Your browser does not support (?:the )?(?:video|audio) tag\.?',re.I)
p=R/'catalog.json';d=json.loads(p.read_text());changed=[]
for item in d['products']:
    detail=item.get('details',{});old=detail.get('description','')
    if not bad.search(old):continue
    cleaned=re.sub(r'\s+',' ',bad.sub('',old)).strip()
    if cleaned:detail['description']=cleaned
    else:detail.pop('description',None)
    changed.append({'id':item['id'],'name':item['name'],'removed_only_media_fallback':True,'description_retained':bool(cleaned)})
assert not any(bad.search(item.get('details',{}).get('description','')) for item in d['products'])
d['stats']['with_shop_descriptions']=sum(bool(x.get('details',{}).get('description')) for x in d['products'])
if changed:
    raw=json.dumps(d,ensure_ascii=False,separators=(',',':'))
    p.write_text(raw,encoding='utf-8');(R/'catalog.js').write_text('window.TOY_ATLAS='+raw+';',encoding='utf-8')
    for name in ('report.json','review-report.json'):
        f=R/name;report=json.loads(f.read_text());report['stats']=d['stats'];f.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    f=R/'catalog.csv'
    with f.open(encoding='utf-8-sig',newline='') as stream:
        reader=csv.DictReader(stream);columns=reader.fieldnames;rows=list(reader)
    for row in rows:
        if row.get('shop_description'):row['shop_description']=re.sub(r'\s+',' ',bad.sub('',row['shop_description'])).strip()
    with f.open('w',encoding='utf-8-sig',newline='') as stream:
        w=csv.DictWriter(stream,fieldnames=columns);w.writeheader();w.writerows(rows)
# Avoid importing HTML media fallback messages as product descriptions again.
f=R/'source_copy.py';text=f.read_text()
text=text.replace("soup(['script', 'style', 'iframe'])", "soup(['script', 'style', 'iframe', 'video', 'audio', 'noscript'])")
assert "'video', 'audio', 'noscript'" in text
f.write_text(text)
# Navigation messages must not obscure the fixed Compare action bar.
f=R/'compare.js';text=f.read_text()
if '.has-compare-selection #toast{' not in text:
    text=text.replace('.compare-notice{position:fixed;', '.has-compare-selection #toast{display:none!important}.compare-notice{position:fixed;',1)
f.write_text(text)
runpy.run_path(str(R/'install_compare.py'),run_name='__main__')
O=Path('/tmp/china-toys-final-cleanup');O.mkdir(exist_ok=True)
report={'description_rows_corrected':len(changed),'rows':changed,'products_unchanged':len(d['products']),'dates_prices_images_and_ids_unchanged':True,'scope':'Remove HTML media fallback, preserve product facts and source links; prevent messages covering Compare.'}
(O/'cleanup-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False),flush=True)
