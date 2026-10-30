#!/usr/bin/env python3
"""Publish entrypoint with explicitly inspected photo overrides and plain evidence labels."""
import json,re
import review_finalize as f

R=f.R
original_save=f.save_outputs

def apply_visual_review(data):
    config=json.loads((R/'photo-overrides.json').read_text())
    excluded={x['id']:x for x in config['excluded']}
    leads={p['id']:p for p in data.get('source_leads',[])}
    keep=[];overrides={x['id']:x for x in config['photos']};checked=[]
    for p in data['products']:
        if p['id'] in excluded:
            p['exclusion_reason']=excluded[p['id']]['reason'];p['excluded_from_product_counts']=True
            if p.get('trend'):p['research_trend_context']=p.pop('trend')
            leads[p['id']]=p;continue
        o=overrides.get(p['id'])
        if o:
            gallery=p.get('gallery',[]);u=o.get('url') or (gallery[o['gallery_index']] if len(gallery)>o['gallery_index'] else None)
            if u and f.v.cache_photo(p,u):
                p['image_review'].update(status='Highlighted series photo visually checked',source_match=True,visually_reviewed=True,source=o['source'],scope=o['scope'],level='Limited visual series check plus source link and decoded-file check; not an authenticity certification',visual_checked=config['reviewed'])
                p['image_gallery_note']='Source galleries can include packaging, alternative designs and secret designs. They are reference images, not the guaranteed contents of one box.'
                checked.append(p['id'])
        keep.append(p)
    data['products']=keep;data['source_leads']=list(leads.values());data['stats']['source_leads_excluded']=len(leads)
    data['stats']['visually_reviewed_sample']=len(checked)
    data['review_summary']['visual_scope']=config['scope']
    original_save(data)
    report=json.loads((R/'review-report.json').read_text());report['visual_sample_ids']=checked;report['visual_scope']=config['scope'];report['photo_exclusions']=config['excluded']
    (R/'review-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    (R/'source-leads.json').write_text(json.dumps(list(leads.values()),ensure_ascii=False,indent=2))

f.save_outputs=apply_visual_review

POLISH=r''
/* ATLAS_PLAIN_EVIDENCE */
(() => {
const d=window.TOY_ATLAS;if(!d)return;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source=(u,t)=>{try{const url=new URL(u);return /^https?:$/.test(url.protocol)?`<a href="${escape(url.href)}" target="_blank" rel="noopener noreferrer">${escape(t)} ↗</a>`:''}catch{return ''}};
const sty=document.createElement('style');sty.textContent='.review-appeal{font-size:12px;line-height:1.6;border-top:1px solid #d1e1d6;margin-top:9px;padding-top:8px}.review-appeal strong{font-size:12px}.review-field-source{font-size:11px;display:block;margin-top:3px}.photo-scope-note{font-size:11px;line-height:1.6;color:#5a655e;margin:8px 0}@media(max-width:480px){.product-grid{grid-template-columns:minmax(0,1fr)!important}.product-card .photo-button{aspect-ratio:4/3}.product-card .photo-button img{height:100%;object-fit:contain}.review-reason,.review-spec{font-size:13px}.review-reason small{font-size:12px}.product-card .price-caption{font-size:12px}}';document.head.append(sty);
function decorate(){
 for(const card of document.querySelectorAll('.product-card[data-product-id]')){
  if(card.dataset.plainEvidence)continue;const p=d.products.find(p=>p.id===card.dataset.productId);if(!p)continue;
  const reason=card.querySelector('.review-reason');if(reason&&p.trend?.possible_appeal&&!reason.querySelector('.review-appeal')){const x=document.createElement('div');x.className='review-appeal';x.innerHTML='<strong>Possible appeal — interpretation</strong>'+escape(p.trend.possible_appeal);reason.append(x)}
  if(card.querySelector('.review-spec')||reason)card.dataset.plainEvidence='1';
 }
 const root=document.getElementById('productDetail');if(!root||!root.querySelector('.review-details'))return;
 const title=root.querySelector('#detailTitle')?.textContent;const p=d.products.find(p=>p.name===title);if(!p)return;
 const panel=root.querySelector('.review-details');if(panel.dataset.plainEvidence)return;panel.dataset.plainEvidence='1';
 const mapping={'Material':'material','Dimensions':'size','Age stated by source':'age','Scale':'scale'};
 for(const dt of panel.querySelectorAll('dl dt')){const field=mapping[dt.textContent],e=p.details?.field_sources?.[field];if(e){const small=document.createElement('small');small.className='review-field-source';small.innerHTML=source(e.url,'Field source');dt.nextElementSibling?.append(small)}}
 if(p.image_gallery_note){const note=document.createElement('p');note.className='photo-scope-note';note.textContent=p.image_gallery_note;panel.querySelector('.review-photos')?.before(note)}
 if(p.trend?.possible_appeal){const x=document.createElement('section');x.className='review-context';x.innerHTML='<strong>Possible appeal — interpretation, not proven sales causation</strong><p>'+escape(p.trend.possible_appeal)+'</p>';panel.append(x)}
}
let queued=false;const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})};
for(const id of ['catalogGrid','productDetail']){const root=document.getElementById(id);if(root)new MutationObserver(queue).observe(root,{childList:true,subtree:true})}
decorate();
})();
'''

if __name__=='__main__':
    f.main()
    app=R/'app.js';app.write_text(app.read_text().split('\n/* ATLAS_PLAIN_EVIDENCE */')[0]+POLISH)
    index=R/'index.html';index.write_text(re.sub(r'app\.js\?v=[^"\s]+','app.js?v=20261030-reviewed-photos-2',index.read_text()))
    print('Reviewed photographs and evidence explanations applied.')
