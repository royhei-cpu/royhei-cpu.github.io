/* Physical planogram model. All stored dimensions are centimeters; views share this model. */
(() => {
'use strict';
const INCH=2.54,EPS=.02;
const PRESET={planogramVersion:1,units:'in',bayWidth:48*INCH,usableWidth:46*INCH,fixtureHeight:84*INCH,shelfDepth:19*INCH,baseHeight:8*INCH,headerHeight:6*INCH,shelfThickness:.75*INCH,aisleWidth:60*INCH,productGap:.5*INCH,liftClearance:INCH,frontSetback:.5*INCH,endAllowance:2*INCH,rearAllowance:2.5*INCH,frontAllowance:INCH,slotPitch:INCH,measurementBasis:'preset',planogramId:'',storeLocation:'',shelfOverrides:[]};
const number=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const clamp=(v,min,max,fallback)=>Math.min(max,Math.max(min,number(v,fallback)));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unit=c=>c.units==='cm'?'cm':'in';
const input=(cm,c)=>Number((number(cm)/(unit(c)==='in'?INCH:1)).toFixed(3));
const fromInput=(v,c)=>number(v)*(unit(c)==='in'?INCH:1);
const format=(cm,c)=>input(cm,c).toLocaleString('en-US',{maximumFractionDigits:2})+(unit(c)==='in'?'″':' cm');
function normalizeConfig(raw={}){
 const legacy=raw.planogramVersion!==1,bayWidth=clamp(raw.bayWidth,30,250,PRESET.bayWidth);
 const c={...PRESET,bayWidth,bays:Math.round(clamp(raw.bays,1,12,3)),shelves:Math.round(clamp(raw.shelves,1,8,4))};
 for(const [key,min,max] of [['usableWidth',10,bayWidth],['fixtureHeight',60,360],['shelfDepth',10,120],['baseHeight',2,100],['headerHeight',0,80],['shelfThickness',.3,8],['aisleWidth',30,500],['productGap',0,15],['liftClearance',0,15],['frontSetback',0,15],['endAllowance',0,30],['rearAllowance',.5,30],['frontAllowance',0,30],['slotPitch',.1,10]])c[key]=clamp(raw[key],min,max,key==='usableWidth'?bayWidth-(legacy?7:2*INCH):PRESET[key]);
 if(legacy){c.fixtureHeight=230;c.headerHeight=31;c.baseHeight=22.1;c.shelfDepth=54;c.shelfThickness=3.2;c.productGap=3;c.units='in'}else c.units=raw.units==='cm'?'cm':'in';
 c.baseHeight=Math.min(c.baseHeight,c.fixtureHeight-5);c.headerHeight=Math.min(c.headerHeight,c.fixtureHeight-c.baseHeight-1);
 c.measurementBasis=['measured','store-plan'].includes(raw.measurementBasis)?raw.measurementBasis:'preset';
 c.planogramId=String(raw.planogramId||'').slice(0,60);c.storeLocation=String(raw.storeLocation||'').slice(0,100);
 c.shelfOverrides=(raw.shelfOverrides||[]).filter(o=>Number.isInteger(o.bay)&&Number.isInteger(o.row)&&o.bay>=0&&o.bay<12&&o.row>=0&&o.row<8).slice(0,96).map(o=>({bay:o.bay,row:o.row,elevation:clamp(o.elevation,1,360,c.baseHeight),depth:clamp(o.depth,5,120,c.shelfDepth)}));
 if(legacy)for(let bay=0;bay<c.bays;bay++)for(let row=0;row<c.shelves;row++)c.shelfOverrides.push({bay,row,elevation:22.1+(c.shelves-1-row)*170/c.shelves,depth:54});
 return c;
}
function shelf(c,bay,row){
 const override=(c.shelfOverrides||[]).find(o=>o.bay===bay&&o.row===row);
 // Evenly spaced starting heights, then independently editable for each bay/shelf.
 const span=Math.max(0,c.fixtureHeight-c.headerHeight-c.baseHeight-30.48);
 const elevation=override?.elevation??c.baseHeight+(c.shelves===1?0:Math.round((c.shelves-1-row)*span/(c.shelves-1)/c.slotPitch)*c.slotPitch);
 const above=row===0?c.fixtureHeight-c.headerHeight:shelf(c,bay,row-1).elevation-c.shelfThickness;
 return {bay,row,elevation,depth:override?.depth??c.shelfDepth,clearance:above-elevation,above};
}
function setShelf(c,bay,row,patch){
 const next={...shelf(c,bay,row),...patch};c.shelfOverrides=(c.shelfOverrides||[]).filter(o=>o.bay!==bay||o.row!==row);
 c.shelfOverrides.push({bay,row,elevation:clamp(next.elevation,1,360,c.baseHeight),depth:clamp(next.depth,5,120,c.shelfDepth)});
}
function stack(item,metrics,c){
 const automatic=item.stacked&&item.display==='box'?Math.min(2,Math.max(1,Math.floor((metrics.clearance-c.liftClearance)/item.height))):1;
 return Math.max(1,Math.min(item.depth,item.stacked===false||item.display!=='box'?1:item.stackLayers||automatic));
}
function layout(state){
 const c=state.config,rows=[],lines=[];let maxDepth=c.shelfDepth;
 for(let bay=0;bay<c.bays;bay++)for(let row=0;row<c.shelves;row++){
  const m=shelf(c,bay,row);maxDepth=Math.max(maxDepth,m.depth);const placed=[];let cursor=0;
  for(const item of state.items.filter(i=>i.bay===bay&&i.row===row)){
   const layers=stack(item,m,c),deep=Math.ceil(item.depth/layers),x=item.x==null?cursor:number(item.x),width=item.width*item.facings,height=item.height*layers,depth=item.packDepth*deep;
   const line={item,bay,row,x,width,height,depth,layers,deep,quantity:item.facings*item.depth,shelf:m,slot:state.items.indexOf(item)+1,issues:[]};
   if(x<0||x+width>c.usableWidth+EPS)line.issues.push('Over shelf width');
   if(height+c.liftClearance>m.clearance+EPS)line.issues.push('Over shelf clearance');
   if(depth+c.frontSetback>m.depth+EPS)line.issues.push('Over shelf depth');
   if(m.elevation<c.shelfThickness||m.elevation>=c.fixtureHeight-c.headerHeight||m.clearance<=0)line.issues.push('Invalid shelf height');
   for(const other of placed)if(x<other.x+other.width-EPS&&x+width>other.x+EPS){line.issues.push('Overlapping products');if(!other.issues.includes('Overlapping products'))other.issues.push('Overlapping products')}
   placed.push(line);lines.push(line);cursor=Math.max(cursor,x+width)+c.productGap;
  }
  const used=placed.length?Math.max(...placed.map(l=>l.x+l.width)):0;
  rows.push({...m,lines:placed,used,remaining:c.usableWidth-used,issues:[...(m.elevation<c.shelfThickness||m.elevation>=c.fixtureHeight-c.headerHeight||m.clearance<=0?['Invalid shelf height']:[]),...(used>c.usableWidth+EPS?['Over shelf width']:[])]});
 }
 return {config:c,shelves:rows,lines,maxDepth,fixtureDepth:maxDepth+c.rearAllowance+c.frontAllowance,runWidth:c.bays*c.bayWidth+c.endAllowance,units:lines.reduce((n,l)=>n+l.quantity,0),issues:lines.filter(l=>l.issues.length).length,invalidShelves:rows.filter(s=>s.issues.includes('Invalid shelf height')).length,estimates:lines.filter(l=>!['measured','supplier'].includes(l.item.dimensionBasis)).length};
}
const safeImage=url=>/^(?:images|retail)\//.test(url||'')||/^data:image\/(?:jpeg|png|webp);base64,/.test(url||'')?url:'';
function drawing(state,product,{view='front',images={},standalone=false}={}){
 const L=layout(state),c=state.config,scale=2,left=92,top=100,bottom=95,bodyWidth=c.bays*c.bayWidth*scale;
 const plotHeight=(view==='top'?L.fixtureDepth+c.aisleWidth:c.fixtureHeight)*scale;
 const width=left+bodyWidth+62,height=top+plotHeight+bottom;
 const text=(x,y,value,cls='pg-label',anchor='middle')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`;
 const dim=(x1,y1,x2,y2,value)=>`<path d="M${x1},${y1} L${x2},${y2}" class="pg-dimension" marker-start="url(#pgArrow)" marker-end="url(#pgArrow)"/>${text((x1+x2)/2,(y1+y2)/2-7,value,'pg-dim-label')}`;
 let out=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="group" aria-label="Dimensioned ${view==='top'?'top view and clear aisle':'front elevation'} planogram" class="pg-drawing" style="min-width:${Math.max(650,c.bays*230)}px" data-pg-view="${view}" data-pg-scale="${scale}" data-pg-left="${left}" data-pg-top="${top}"><title>${esc(c.title)} · ${view==='top'?'top view':'front elevation'}</title><defs><marker id="pgArrow" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto-start-reverse"><path d="M5 0 L0 2.5 L5 5" fill="none" stroke="#53655b"/></marker></defs><style>.pg-paper{fill:#fff}.pg-frame{fill:#f3f4ef;stroke:#bec9bf;stroke-width:1}.pg-shelf{fill:#d7ded5;stroke:#8b9d8e;stroke-width:.8}.pg-active{fill:#e3eee9;stroke:#1b705c;stroke-width:1.4}.pg-line{fill:#fff;stroke:#9daa9e;stroke-width:1}.pg-line-selected{stroke:#df694c;stroke-width:2}.pg-line-bad{stroke:#b84036;stroke-width:2}.pg-label,.pg-dim-label{font:12px Arial,sans-serif;fill:#4f6458}.pg-dim-label{font-weight:600;paint-order:stroke;stroke:white;stroke-width:4px;stroke-linejoin:round}.pg-small{font:10px Arial,sans-serif;fill:#64786b}.pg-fascia-label{font:11px Arial,sans-serif;fill:white}.pg-title{font:700 17px Arial,sans-serif;fill:#173e35}.pg-dimension{fill:none;stroke:#607466;stroke-width:.8}.pg-grid{fill:none;stroke:#e0e6de;stroke-width:.6;stroke-dasharray:3 4}.pg-item{cursor:pointer;outline:none}.pg-item:focus .pg-line{stroke:#df694c;stroke-width:3}.pg-slot{font:700 10px Arial,sans-serif;fill:white}.pg-slot-bg{fill:#214f41}.pg-error{fill:#b84036}</style><rect width="100%" height="100%" class="pg-paper"/>${text(left,27,c.title,'pg-title','start')}${text(left,46,[c.planogramId,c.storeLocation,view==='top'?'TOP VIEW · SELECTED SHELF':'FRONT ELEVATION'].filter(Boolean).join(' · '),'pg-small','start')}`;
 for(let bay=0;bay<c.bays;bay++){
  const bx=left+bay*c.bayWidth*scale;
  out+=dim(bx,top-20,bx+c.bayWidth*scale,top-20,`Bay ${bay+1} · ${format(c.bayWidth,c)}`);
  if(view==='front'){
   out+=`<rect x="${bx}" y="${top}" width="${c.bayWidth*scale}" height="${plotHeight}" class="pg-frame"/>`;
   for(let mark=0;mark<c.fixtureHeight;mark+=(unit(c)==='in'?12*INCH:25))out+=`<path d="M${bx} ${top+(c.fixtureHeight-mark)*scale} h${c.bayWidth*scale}" class="pg-grid"/>`;
   out+=`<rect x="${bx}" y="${top}" width="${c.bayWidth*scale}" height="${c.headerHeight*scale}" fill="${esc(c.color)}"/>`;
   if(c.headerHeight>5)out+=text(bx+c.bayWidth*scale/2,top+c.headerHeight*scale/2+4,`B${bay+1} · ${format(c.usableWidth,c)} usable`,'pg-fascia-label');
  }
 }
 const ends=c.endAllowance*scale/2;for(const x of [left-ends,left+bodyWidth])if(ends>0)out+=`<rect x="${x}" y="${top}" width="${ends}" height="${view==='front'?plotHeight:L.fixtureDepth*scale}" class="pg-shelf"/>`;
 if(view==='front'){
  out+=dim(left-44,top,left-44,top+plotHeight,format(c.fixtureHeight,c));
  for(const s of L.shelves){
   const x=left+(s.bay*c.bayWidth+(c.bayWidth-c.usableWidth)/2)*scale,y=top+(c.fixtureHeight-s.elevation)*scale;
   out+=`<g class="retail-plan-shelf" data-drop-bay="${s.bay}" data-drop-row="${s.row}"><rect x="${x}" y="${y-Math.max(0,s.clearance)*scale}" width="${c.usableWidth*scale}" height="${Math.max(2,s.clearance)*scale}" class="${state.shelf.bay===s.bay&&state.shelf.row===s.row?'pg-active':'pg-frame'}" opacity=".45"/><rect role="button" tabindex="0" aria-label="Choose bay ${s.bay+1} shelf ${s.row+1}" data-retail-shelf="${s.bay}:${s.row}" x="${x}" y="${y}" width="${c.usableWidth*scale}" height="${c.shelfThickness*scale}" class="pg-shelf"/>${text(x+2,y+c.shelfThickness*scale+12,`S${s.row+1} · ${format(s.elevation,c)} AFF · ${format(s.clearance,c)} clear`,'pg-small','start')}`;
   for(const l of s.lines){
    const p=product(l.item.id),lx=x+l.x*scale,ly=y-l.height*scale,img=safeImage(images[p?.image]||p?.image),cls=`pg-line${l.item.uid===state.selected?' pg-line-selected':''}${l.issues.length?' pg-line-bad':''}`;
    out+=`<g class="pg-item" role="button" tabindex="0" data-retail-select="${esc(l.item.uid)}" aria-label="Select ${esc(p?.name)}"><title>${esc(p?.name)} · ${l.item.facings} facings · ${l.quantity} units${l.issues.length?' · '+esc(l.issues.join(', ')):''}</title>`;
    for(let f=0;f<l.item.facings;f++)for(let z=0;z<l.layers;z++){
     const px=lx+f*l.item.width*scale,py=y-(z+1)*l.item.height*scale;
     out+=`<rect x="${px+.4}" y="${py+.4}" width="${l.item.width*scale-.8}" height="${l.item.height*scale-.8}" rx="1" class="${cls}"/>${img?`<image href="${esc(img)}" x="${px+1.5}" y="${py+1.5}" width="${Math.max(1,l.item.width*scale-3)}" height="${Math.max(1,l.item.height*scale-3)}" preserveAspectRatio="xMidYMid meet"/>`:''}`;
    }
    out+=`<rect x="${lx+1}" y="${ly+1}" width="20" height="15" rx="2" class="pg-slot-bg${l.issues.length?' pg-error':''}"/>${text(lx+11,ly+12,String(l.slot).padStart(2,'0'),'pg-slot')}</g>`;
   }
   out+='</g>';
  }
 }else{
  out+=`<rect x="${left-ends}" y="${top+L.fixtureDepth*scale}" width="${bodyWidth+ends*2}" height="${c.aisleWidth*scale}" fill="#eaf1ef" stroke="#9bb8ad" stroke-dasharray="5 4"/>${text(left+bodyWidth/2,top+(L.fixtureDepth+c.aisleWidth/2)*scale,'CLEAR AISLE · '+format(c.aisleWidth,c),'pg-title')}`;
  out+=dim(left-40,top,left-40,top+L.fixtureDepth*scale,format(L.fixtureDepth,c));
  out+=dim(left-40,top+L.fixtureDepth*scale,left-40,top+plotHeight,format(c.aisleWidth,c));
  for(let bay=0;bay<c.bays;bay++){
   const s=L.shelves.find(s=>s.bay===bay&&s.row===state.shelf.row),x=left+(bay*c.bayWidth+(c.bayWidth-c.usableWidth)/2)*scale;
   out+=`<g class="retail-plan-shelf" data-drop-bay="${bay}" data-drop-row="${s.row}"><rect role="button" tabindex="0" data-retail-shelf="${bay}:${s.row}" aria-label="Choose bay ${bay+1} shelf ${s.row+1}" x="${x}" y="${top+c.rearAllowance*scale}" width="${c.usableWidth*scale}" height="${s.depth*scale}" class="${state.shelf.bay===bay?'pg-active':'pg-frame'}"/>${text(x+4,top-5,`S${s.row+1} · ${format(s.depth,c)} deep`,'pg-small','start')}`;
   for(const l of s.lines){
    const lx=x+l.x*scale,ly=top+(c.rearAllowance+s.depth-c.frontSetback-l.depth)*scale;
    out+=`<g class="pg-item" role="button" tabindex="0" data-retail-select="${esc(l.item.uid)}" aria-label="Select ${esc(product(l.item.id)?.name)}"><title>${esc(product(l.item.id)?.name)} · ${l.deep} deep × ${l.layers} high</title><rect x="${lx}" y="${ly}" width="${l.width*scale}" height="${l.depth*scale}" class="pg-line${l.issues.length?' pg-line-bad':''}${l.item.uid===state.selected?' pg-line-selected':''}"/>${text(lx+l.width*scale/2,ly+14,String(l.slot).padStart(2,'0'))}</g>`;
   }
   out+='</g>';
  }
 }
 out+=dim(left-ends,top+plotHeight+42,left+bodyWidth+ends,top+plotHeight+42,`Overall ${format(L.runWidth,c)} · module run ${format(c.bays*c.bayWidth,c)}`);
 out+=text(left,top+plotHeight+72,'Dimensions govern. AFF = above finished floor. Product photos illustrate the entered pack footprint.','pg-small','start');
 if(standalone)out+=text(left,top+plotHeight+88,'Planning file · '+(c.measurementBasis==='preset'?'fixture preset, verify on site':'entered fixture measurements')+' · '+L.estimates+' estimated pack lines · '+L.issues+' fit issues','pg-small','start');
 return out+'</svg>';
}
function rowsTable(state,product){const L=layout(state),c=state.config;return `<div class="pg-table-wrap"><table class="pg-table"><caption>Placement schedule · ${unit(c)} · shelves numbered from the top</caption><thead><tr><th>Slot</th><th>SKU / product</th><th>Bay / shelf</th><th>Left edge</th><th>Pack W × H × D</th><th>Faces / stock</th><th>Fit & dimensions</th></tr></thead><tbody>${L.lines.map(l=>`<tr class="${l.issues.length?'pg-row-bad':''}"><td>${String(l.slot).padStart(2,'0')}</td><td><button data-planogram-select="${esc(l.item.uid)}">${esc(l.item.sku||'SKU not entered')}<small>${esc(product(l.item.id)?.name)}</small></button></td><td>B${l.bay+1} / S${l.row+1}</td><td>${format(l.x,c)}</td><td>${[l.item.width,l.item.height,l.item.packDepth].map(n=>format(n,c)).join(' × ')}</td><td>${l.item.facings} faces · ${l.quantity} units<small>${l.deep} deep × ${l.layers} high</small></td><td>${esc(l.issues.join(' · ')||'Fits entered space')}<small>${esc(l.item.dimensionBasis==='measured'?'Measured pack':l.item.dimensionBasis==='supplier'?'Supplier dimensions':'Estimated pack')}</small></td></tr>`).join('')||'<tr><td colspan="7">Add blind boxes or squishies to begin the placement schedule.</td></tr>'}</tbody></table></div>`}
window.ATLAS_PLANOGRAM={PRESET,normalizeConfig,shelf,setShelf,stack,layout,drawing,rowsTable,input,fromInput,format,unit,esc};
})();
