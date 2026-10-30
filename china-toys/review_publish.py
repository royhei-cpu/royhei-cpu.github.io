#!/usr/bin/env python3
"""Apply inspected photo overrides and then publish plain evidence UI."""
import json
import re
import review_finalize as f
import source_copy
source_copy.install(f.v)

R=f.R
original_save=f.save_outputs

def apply_visual_review(data):
    config=json.loads((R/'photo-overrides.json').read_text())
    excluded={x['id']:x for x in config['excluded']}
    leads={p['id']:p for p in data.get('source_leads',[])}
    keep=[]
    overrides={x['id']:x for x in config['photos']}
    checked=[]
    for p in data['products']:
        if p['id'] in excluded:
            p['exclusion_reason']=excluded[p['id']]['reason']
            p['excluded_from_product_counts']=True
            if p.get('trend'):
                p['research_trend_context']=p.pop('trend')
            leads[p['id']]=p
            continue
        o=overrides.get(p['id'])
        if o:
            gallery=p.get('gallery',[])
            u=o.get('url') or (gallery[o['gallery_index']] if len(gallery)>o['gallery_index'] else None)
            if u and f.v.cache_photo(p,u):
                p.setdefault('image_review',{}).update(
                    status='Highlighted series photo visually checked',source_match=True,
                    visually_reviewed=True,source=o['source'],scope=o['scope'],
                    level='Limited visual series check plus source link and decoded-file check; not an authenticity certification',
                    visual_checked=config['reviewed'])
                p['image_gallery_note']='Source galleries can include packaging, alternative designs and secret designs. They are reference images, not the guaranteed contents of one box.'
                checked.append(p['id'])
        keep.append(p)
    data['products']=keep
    data['source_leads']=list(leads.values())
    data['stats']['source_leads_excluded']=len(leads)
    data['stats']['visually_reviewed_sample']=len(checked)
    data['review_summary']['visual_scope']=config['scope']
    original_save(data)
    report=json.loads((R/'review-report.json').read_text())
    report['visual_sample_ids']=checked
    report['visual_scope']=config['scope']
    report['photo_exclusions']=config['excluded']
    (R/'review-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    (R/'source-leads.json').write_text(json.dumps(list(leads.values()),ensure_ascii=False,indent=2))

f.save_outputs=apply_visual_review

if __name__=='__main__':
    f.main()
    source_copy.export(R)
    app=R/'app.js'
    base=app.read_text().split('\n/* ATLAS_PLAIN_EVIDENCE */')[0]
    app.write_text(base+'\n'+(R/'review-polish.js').read_text())
    index=R/'index.html'
    index.write_text(re.sub(r'app\.js\?v=[^"\s]+','app.js?v=20261030-reviewed-photos-2',index.read_text()))
    data=json.loads((R/'catalog.json').read_text())
    f.v.make_sheet(data['products'])
    print('Reviewed photographs and evidence explanations applied.')
