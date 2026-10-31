#!/usr/bin/env python3
"""Idempotent integration of source-scoped IP rankings. Does not alter product facts."""
from pathlib import Path
import json,re,unicodedata,hashlib

R=Path(__file__).resolve().parent
ROOT=R.parent
VERSION='20261030-ip-market-2'
cfg=json.loads((R/'ip-market.json').read_text())
assert cfg['ranking']['unit']=='CNY thousand'
assert len(cfg['ranking']['rows'])==8
assert len({r['ip'] for r in cfg['ranking']['rows']})==8
assert all(r['revenue']>0 and r['prior_revenue']>0 for r in cfg['ranking']['rows'])
# The desktop table header is hidden on phones; retain the currency and scale
# in the visible subtitle too. Source amounts remain unchanged in CNY thousand.
if 'CNY million' not in cfg['ranking']['subtitle']:
    cfg['ranking']['subtitle']+=' · CNY million'
(R/'ip-market-data.js').write_text('window.ATLAS_IP_DATA='+json.dumps(cfg,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')

app=(R/'app.js').read_text()
if "view:'catalog',ip:'',retailer:" not in app:
    assert "view:'catalog',retailer:" in app,'State signature changed'
    app=app.replace("view:'catalog',retailer:","view:'catalog',ip:'',retailer:",1)
if '/* IP_MATCH_FILTER */' not in app:
    assert 'function matches(p){' in app
    app=app.replace('function matches(p){','function matches(p){/* IP_MATCH_FILTER */if(state.ip&&!(window.ATLAS_IP_MATCH&&window.ATLAS_IP_MATCH(p,state.ip)))return false;',1)
if "catalog:(state.ip?" not in app:
    assert "catalog:state.brand||" in app
    app=app.replace("catalog:state.brand||","catalog:(state.ip?(window.ATLAS_IP_NAMES||{})[state.ip]:null)||state.brand||",1)
app=app.replace("['retailer','brand','search','category','evidence','year','currency','change']","['ip','retailer','brand','search','category','evidence','year','currency','change']")
if '/* IP_SELECT_EVENT */' not in app:
    event="""/* IP_SELECT_EVENT */
document.addEventListener('atlas:choose-ip',e=>{const requested=e.detail?.id||'';const chosen=Object.hasOwn(window.ATLAS_IP_NAMES||{},requested)?requested:'';state.view='catalog';reset();state.ip=chosen;page=1;brands();render()});
"""
    marker="document.addEventListener('click',e=>{"
    assert marker in app,'Click handler signature changed'
    app=app.replace(marker,event+marker,1)
if '/* IP_QUERY_GUARD */' not in app:
    marker="if(!['catalog','trending','new','timeline','coverage','saved'].includes(state.view))"
    assert marker in app,'Query guard signature changed'
    app=app.replace(marker,"/* IP_QUERY_GUARD */if(state.ip&&!Object.hasOwn(window.ATLAS_IP_NAMES||{},state.ip))state.ip='';"+marker,1)
(R/'app.js').write_text(app,encoding='utf-8')

idx=(R/'index.html').read_text()
if 'src="ip-market-data.js' not in idx:
    anchor='<script src="catalog.js" defer></script>'
    assert anchor in idx,'Catalog script anchor changed'
    idx=idx.replace(anchor,anchor+'\n<script src="ip-market-data.js?v='+VERSION+'" defer></script>\n<script src="ip-directory.js?v='+VERSION+'" defer></script>',1)
for asset in ['app.js','ip-market-data.js','ip-directory.js']:
    version=hashlib.sha256((R/asset).read_bytes()).hexdigest()[:12]
    idx=re.sub(re.escape(asset)+r'\?v=[^"\s]+',asset+'?v='+version,idx)
(R/'index.html').write_text(idx,encoding='utf-8')

# Workflow hooks are managed separately through authorized repository edits.
# Builds must not try to modify workflow files with the limited build token.
publish=(ROOT/'.github/workflows/publish.yml').read_text()
weekly=(ROOT/'.github/workflows/china-toys-refresh.yml').read_text()
assert 'Copy China Toy IP ranking assets' in publish,'Publishing hook missing'
assert 'python china-toys/build_ip_directory.py' in weekly,'Weekly integration hook missing'

# Recomputed coverage is never used to infer demand or ranking.
d=json.loads((R/'catalog.json').read_text())
def norm(s):return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',str(s or '')).lower()).strip()
def match(p,ip):
    if ip.get('allowed_brands') and norm(p['brand']) not in [norm(b) for b in ip['allowed_brands']]:return False
    text=norm(p['name']+' '+str(p.get('name_cn') or ''))
    return any(re.search(r'(^|[^a-z0-9])'+re.escape(norm(t))+r'(?=$|[^a-z0-9])',text) for t in ip['terms'])
ips=[]
for ip in cfg['ips']:
    ps=[p for p in d['products'] if match(p,ip)]
    ips.append({'id':ip['id'],'name':ip['name'],'records':len(ps),'product_ids':[p['id'] for p in ps],'status':'Partial assortment' if ps else 'Not yet captured'})
brands=[{'brand':b,'records':sum(norm(p['brand'])==norm(b) for p in d['products']),'status':'Partial assortment'} for b in cfg['requested_brands']]
coverage={'catalog_date':d['updated'],'sales_evidence_reviewed':cfg['reviewed'],'requested_brands':brands,'requested_ips':[ip for ip in ips if ip['id'] in cfg['requested_ips']],'all_character_filters':ips,'scope':'Matching product/series listings, not distinct SKUs or sales. All screenshot examples present does not imply complete China-market coverage.','ranking_source':cfg['ranking']['source']}
assert all(b['records']>0 for b in brands),'A screenshot brand has no listings'
assert all(ip['records']>0 for ip in coverage['requested_ips']),'A screenshot IP has no listings'
(R/'ip-coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2))
print(json.dumps({'requested_brands':brands,'requested_ips':[{k:v for k,v in ip.items() if k!='product_ids'} for ip in coverage['requested_ips']],'character_filters':len(ips),'with_records':sum(bool(ip['records']) for ip in ips),'ranking_scope':cfg['ranking']['subtitle']},ensure_ascii=False,indent=2))

# Preserve tested product navigation after generated UI changes.
if __name__ == '__main__':
    from navigation_fix import apply as _apply_navigation_fix
    _apply_navigation_fix(R)

