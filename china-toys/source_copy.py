"""Keep a short attributed shop-description excerpt; do not guess missing facts."""
import csv
import json
import re
from bs4 import BeautifulSoup


def install(review):
    original = review.add_details
    def add(product, raw, source, currency, listing):
        original(product, raw, source, currency, listing)
        soup = BeautifulSoup(raw.get('body_html') or '', 'html.parser')
        for el in soup(['script', 'style', 'iframe', 'video', 'audio', 'noscript']):
            el.decompose()
        candidates = []
        for el in soup.find_all(['p', 'li']):
            value = re.sub(r'\s+', ' ', el.get_text(' ', strip=True)).strip()
            if not 35 <= len(value) <= 1400:
                continue
            if re.search(r'refund|shipping|delivery|subscribe|newsletter|cookies|contact us|customer service|return policy|payment method|order cancellation|your order|tracking number', value, re.I):
                continue
            if re.match(r'^(?:Please note|Note:|Warning:|Disclaimer|What is a blind|A blind box is)', value, re.I):
                continue
            candidates.append(value)
        if not candidates:
            return
        excerpt = ' '.join(candidates[:3]).split()
        excerpt = ' '.join(excerpt[:75]) + ('…' if len(excerpt) > 75 else '')
        if len(excerpt) > 600:
            excerpt = excerpt[:599] + '…'
        detail = product.setdefault('details', {})
        detail.update(description=excerpt, description_source=listing['url'], description_checked=review.TODAY)
        detail.setdefault('field_sources', {})['description'] = {'url': listing['url'], 'checked': review.TODAY, 'kind': 'Attributed shop excerpt'}
    review.add_details = add


def export(root):
    path = root / 'catalog.json'
    data = json.loads(path.read_text())
    products = {p['id']: p for p in data['products']}
    data['stats']['with_shop_descriptions'] = sum(bool(p.get('details', {}).get('description')) for p in products.values())
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    path.write_text(raw)
    (root/'catalog.js').write_text('window.TOY_ATLAS='+raw+';')
    for name in ('report.json', 'review-report.json'):
        f = root / name
        if f.exists():
            report = json.loads(f.read_text()); report['stats'] = data['stats']; f.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    f = root / 'catalog.csv'
    with f.open(encoding='utf-8-sig', newline='') as stream:
        reader=csv.DictReader(stream); columns=list(reader.fieldnames or []); rows=list(reader)
    for key in ('shop_description', 'description_source', 'description_checked'):
        if key not in columns: columns.append(key)
    for row in rows:
        detail=products.get(row.get('id'),{}).get('details',{})
        row.update(shop_description=detail.get('description',''), description_source=detail.get('description_source',''), description_checked=detail.get('description_checked',''))
    with f.open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=columns);writer.writeheader()
        for row in rows:writer.writerow({k:("'"+v if isinstance(v,str) and v.startswith(('=','+','-','@')) else v) for k,v in row.items()})
    print('Attributed shop descriptions:',data['stats']['with_shop_descriptions'],flush=True)
    app=root/'app.js'
    text=app.read_text()
    old=",'Weekly changes'];"
    if old in text:
        text=text.replace(old,",'Weekly changes','Material','Dimensions','Source age label','Regular designs','Secret designs','Shop description','Description source','Specification source','Shop options JSON','Image review','Trend reason'];",1)
        marker=".map(([k])=>updateLabels[k]).join('; ')]});"
        assert marker in text, 'Filtered CSV row layout changed; inspect before patching'
        text=text.replace(marker,".map(([k])=>updateLabels[k]).join('; '),p.details?.material||p.material,p.details?.size,p.details?.age,p.regular_designs,p.secret_designs,p.details?.description,p.details?.description_source,p.details?.source,JSON.stringify(l.options||[]),p.image_review?.status,t?.summary]});",1)
        app.write_text(text)
