import library from './workshop-data.json' with {type:'json'};
import photoLibrary from './benchmark-photos.json' with {type:'json'};
import evidence from './workshop-reference-evidence.json' with {type:'json'};
import {csvCell} from './global-logic.js';

export const workshopLibrary=library;
export const benchmarkPhotos=photoLibrary;
export const referenceEvidence=evidence;
export function proposalEvidenceNote(id){return evidence.conceptNotes?.[id]||'';}
export const photoMatchLabels={'variant-matched':'Model, capacity & color matched','model-matched':'Named model matched','range-reference':'Range / variant reference','size-alternative':'Different size shown','pack-alternative':'Different pack shown',unavailable:'Photo unavailable'};
export function benchmarkEvidence(id){return evidence.references[id]||{match:'unavailable',verificationNote:'A verified product photograph has not been recorded.',checkedAt:evidence.checkedAt};}
export function proposalBenchmarks(p){return p.benchmarks.map(id=>library.benchmarks.find(b=>b.id===id));}
export function referencePhotoURL(id,origin='https://royhei-cpu.github.io'){const photo=benchmarkEvidence(id);return photo.path?new URL(photo.path,origin).href:'';}
export const USD=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
export function money(value){return Number.isFinite(value)?USD.format(value):'Not calculated';}
export function benchmarkPrice(row){return row.price===null?'Price check needed':new Intl.NumberFormat('en-US',{style:'currency',currency:row.currency}).format(row.price);}
export function envelopeText(values,unit='mm'){return unit==='in'?values.map(v=>(v/25.4).toFixed(2)).join(' × ')+' in':values.join(' × ')+' mm';}
export function defaultScenario(p){return {volume:String(p.planningVolume),retail:String(p.retail),tooling:String(p.tooling),assembly:String(p.assembly),packaging:String(p.pack),qa:String(p.qa),scrap:String(p.scrapPercent),supplierMargin:String(p.supplierMargin),retailMargin:String(p.retailMargin),freight:String(p.freight),duty:'',partCosts:Object.fromEntries(p.parts.map(row=>[row.code,((row.unitLow+row.unitHigh)/2).toFixed(3)]))};}
const number=value=>String(value??'').trim()===''?NaN:Number(value);

export function costScenario(p,s,color=library.palette[0]){
 const n=Object.fromEntries(Object.entries(s).filter(([key])=>key!=='partCosts').map(([key,value])=>[key,number(value)]));
 const unitCosts=p.parts.map(row=>number(s.partCosts?.[row.code]));
 const valid=unitCosts.every(v=>Number.isFinite(v)&&v>=0)&&['volume','retail'].every(k=>Number.isFinite(n[k])&&n[k]>0)&&Number.isSafeInteger(n.volume)&&['tooling','assembly','packaging','qa','freight','scrap'].every(k=>Number.isFinite(n[k])&&n[k]>=0)&&n.scrap<=100&&['supplierMargin','retailMargin'].every(k=>Number.isFinite(n[k])&&n[k]>=0&&n[k]<100);
 if(!valid)return {valid:false,error:'Enter positive retail and whole-unit volume, nonnegative costs, scrap from 0–100%, and margins below 100%.'};
 if(!color||!Number.isFinite(color.delta)||color.delta<0)return {valid:false,error:'Select a valid color allowance.'};
 const components=p.parts.reduce((sum,row,i)=>sum+row.qty*unitCosts[i],0);
 const scrap=components*n.scrap/100,amortization=n.tooling/n.volume;
 const factory=components+scrap+n.assembly+n.packaging+n.qa+color.delta+amortization;
 const fob=factory/(1-n.supplierMargin/100),ceiling=n.retail*(1-n.retailMargin/100);
 const dutyValid=Number.isFinite(n.duty)&&n.duty>=0&&n.duty<=100;
 const duty=dutyValid?fob*n.duty/100:null;
 const landed=dutyValid?fob+n.freight+duty:null;
 if(![components,scrap,amortization,factory,fob,ceiling].every(Number.isFinite)||(landed!==null&&!Number.isFinite(landed)))return {valid:false,error:'These values exceed the calculator range. Use finite, realistic costs and volumes.'};
 return {valid:true,components,scrap,amortization,factory,fob,duty,landed,ceiling,headroom:landed===null?null:ceiling-landed,belowMoq:n.volume<p.moq,unitCosts,inputs:n,colorAllowance:color.delta,dutyError:String(s.duty).trim()!==''&&!dutyValid?'Enter a duty rate from 0–100%.':null};
}

export function bomCSV(p,s,color){
 const c=costScenario(p,s,color);
 const rows=[['White Label Workshop',p.code,p.name,'Revision '+p.revision],['Status',p.status,p.quoteStatus],['Color',color.name,color.hex,'Screen reference only'],['Part ID','Component','Material','Process','Qty per kit','Nominal mass g per part','Allowance low USD','Allowance high USD','Scenario unit USD','Scenario extended USD','Status'],...p.parts.map((row,i)=>[row.code,row.name,row.material,row.process,row.qty,row.massG,row.unitLow,row.unitHigh,s.partCosts[row.code],c.valid?row.qty*c.unitCosts[i]:'Invalid input',row.status]),['Scenario input','Value'],...Object.entries(s).filter(([key])=>key!=='partCosts').map(([key,value])=>[key,value]),['Factory cost',c.valid?c.factory:'Invalid input'],['Proposed FOB',c.valid?c.fob:'Invalid input'],['Landed cost',c.valid&&c.landed!==null?c.landed:'Duty input missing or invalid'],['Limit','Planning assumptions; no supplier quotation. Formula, tooling, origin, freight and duty require validation.']];
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}

// CSV retains image URLs and provenance; HTML briefs display the photographs.
export function benchmarkCSV(p){
 const rows=[['Concept code','Concept','Record type','Brand / decision','National-brand product / reality','Proposed change','Validation','Saved observed price','Currency','Price market','Price reviewed','Price note','Manufacturer data source','Photo URL','Original photo URL','Photo source','Photo match','Photo qualification','Photo checked','Why consider white label','Target baseline','Stop condition']];
 for(const b of proposalBenchmarks(p)){const r=benchmarkEvidence(b.id);rows.push([p.code,p.name,'National-brand reference',b.brand,b.name+' — '+[...b.facts,...(r.specFacts||[])].join(' ')+' '+(r.specDimensions||b.dimensions),'','',b.price??'',b.currency,b.market,b.reviewedAt,b.priceNote,r.specSourceUrl||b.url,referencePhotoURL(b.id),r.imageUrl||'',r.sourceUrl||b.url,photoMatchLabels[r.match],r.verificationNote,r.checkedAt,p.why+' '+proposalEvidenceNote(p.id),p.targetBaseline,p.killCriterion]);}
 for(const row of p.changes){const cells=Array(22).fill('');cells.splice(0,7,p.code,p.name,'Proposed change',...row);cells[19]=p.why+' '+proposalEvidenceNote(p.id);cells[20]=p.targetBaseline;cells[21]=p.killCriterion;rows.push(cells);}
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}

export function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function configuredBriefHTML(p,s,color,assetBase){
 const e=escapeHTML,c=costScenario(p,s,color),benchmarks=proposalBenchmarks(p);
 const rows=(values)=>values.map(row=>'<tr>'+row.map(value=>`<td>${e(value)}</td>`).join('')+'</tr>').join('');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><title>White Label Workshop · ${e(p.code)}</title><style>body{font:14px/1.6 Arial,sans-serif;color:#153f34;max-width:1050px;margin:40px auto;padding:0 24px}h1,h2{font-family:Georgia,serif}h1{font-size:38px}table{border-collapse:collapse;width:100%;margin:18px 0}td,th{border:1px solid #b9c4ac;padding:9px;text-align:left;vertical-align:top}img{max-width:100%;max-height:480px;object-fit:contain}small{color:#52644e}a{color:#905137}@media print{body{margin:0}h2{break-after:avoid}tr,img{break-inside:avoid}}</style><body><p>Homecare · White Label Workshop · ${e(p.code)} · Revision A0 · authored ${library.authoredAt}</p><h1>${e(p.name)}</h1><p><b>${e(p.status)}</b>. ${e(library.stage)}</p><p>Chosen CMF: ${e(color.name)} ${e(color.hex)}. The studio render below shows Sage; open the GLB or Blender file to apply the chosen finish.</p><img src="${e(assetBase+p.id+'.jpg')}" alt="Sage exterior concept render"><h2>Why consider white label</h2><p>${e(p.recommendation)}</p><p>${e(p.why)}</p><p>${e(proposalEvidenceNote(p.id))}</p><h2>National-brand references</h2>${benchmarks.map(b=>{const r=benchmarkEvidence(b.id);return `<article><h3>${e(b.brand)} — ${e(b.name)}</h3>${r.path?`<a href="${e(r.sourceUrl)}"><img src="${e(referencePhotoURL(b.id,assetBase))}" alt="${e(b.brand+' '+b.name)}"></a>`:'<p>Photo unavailable; no substitute model is shown.</p>'}<p>Photo: ${e(r.sourceTitle)}.</p><p><b>${e(photoMatchLabels[r.match])}</b> · photo checked ${e(r.checkedAt)}<br>${e(r.verificationNote)}</p><p>Saved observed price: ${e(benchmarkPrice(b))} · ${e(b.market)} · reviewed ${e(b.reviewedAt)}<br>${e([...b.facts,...(r.specFacts||[])].join(' '))}<br>${e(r.specDimensions||b.dimensions)}<br>${e(b.priceNote)}</p><p><a href="${e(r.specSourceUrl||b.url)}">Manufacturer data source</a> · <a href="${e(r.sourceUrl||b.url)}">Photo source</a>${r.imageUrl?` · <a href="${e(r.imageUrl)}">Original image</a>`:''}</p></article>`;}).join('')}<p><b>Target baseline:</b> ${e(p.targetBaseline)}</p><p><b>Proceed only if validated:</b> ${e(p.killCriterion)}</p><h2>Suggested changes</h2><table><tr><th>Attribute</th><th>Benchmark reality</th><th>Proposed change</th><th>Validation</th></tr>${rows(p.changes)}</table><h2>Specifications and dimensions</h2><p>Primary envelope: ${e(envelopeText(p.envelope))}. Target kit mass including any fill: ${p.mass} g. All values are proposed.</p><table>${rows(p.specs.map(row=>[row.label,row.value]))}</table><p>${e(p.wallSpec)}</p><p>${e(p.materialNote)}</p><p>${e(p.special)}</p><p>Pack: ${e(envelopeText(p.package.dimensionsMm))}, disassembled where applicable; fit and transit design unresolved. ${e(p.package.type)}</p><img src="${e(assetBase+p.id+'-dimensions.svg')}" alt="Dimension reference"><h2>BOM and scenario</h2><p>USD per finished kit; no supplier quotes. ${e(color.name)} kit color allowance: ${money(color.delta)}.</p><table><tr><th>Part</th><th>Material / process</th><th>Qty</th><th>Unit USD</th><th>Extended USD</th></tr>${rows(p.parts.map((row,i)=>[row.code+' '+row.name,row.material+' / '+row.process,row.qty,s.partCosts[row.code],c.valid?money(row.qty*c.unitCosts[i]):'Invalid input']))}</table><table>${rows(Object.entries(s).filter(([key])=>key!=='partCosts'))}</table><p>Factory cost: ${c.valid?money(c.factory):'Invalid inputs'} · Proposed FOB: ${c.valid?money(c.fob):'Invalid inputs'} · Landed: ${c.valid&&c.landed!==null?money(c.landed):'Duty input missing or invalid'} · Proposed retail: ${money(number(s.retail))}</p><p>Components × (1 + scrap rate) + assembly + packaging + QA + color allowance + tooling / amortization volume = factory cost. FOB = factory cost / (1 − assumed supplier margin). Landed = FOB + freight + FOB × entered duty rate. Retail cost ceiling = proposed retail × (1 − assumed retail margin). Excludes destination handling, insurance, warehousing, returns, promotions and taxes unless included in input costs. Margins are planning assumptions, not Target requirements.</p><h2>Validation plan</h2><table>${rows(p.validation.map(row=>[row.gate,row.test,row.status]))}</table><p>Stop condition: ${e(p.killCriterion)}</p><p>${e(library.colorNote)}</p><h2>Files</h2><p><a href="${e(assetBase+p.id+'.glb')}">Portable GLB</a> · <a href="${e(assetBase+p.id+'.blend')}">Editable Blender scene</a> · <a href="${e(assetBase+p.id+'-development-pack.zip')}">Base A0 development pack</a></p></body></html>`;
}
