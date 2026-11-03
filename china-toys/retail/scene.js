/* Real-time retail presentation; all packaging dimensions remain editable estimates. */
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const themes={bright:{metal:'#ecece7',back:'#e1e1d7',trim:'#b0b3ae',floor:'#c8c8c1'},wood:{metal:'#d7b38b',back:'#e0c8a6',trim:'#675744',floor:'#c9c5ba'},dark:{metal:'#353b3c',back:'#424747',trim:'#6b7170',floor:'#aaaeb0'}};
export async function createRetailScene(container,callbacks){
 const scene=new T.Scene();scene.background=new T.Color('#e7e3db');
 const model=new T.Group();model.name='Atlas retail workshop · presentation model';scene.add(model);
 const fixture=new T.Group();fixture.name='Retail fixture';model.add(fixture);
 const stock=new T.Group();stock.name='Assortment · source-linked product groups';model.add(stock);
 const camera=new T.PerspectiveCamera(35,1,.02,80);
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.0;
 const canvas=renderer.domElement;canvas.setAttribute('aria-label','3D retail aisle. Drag to orbit, scroll to zoom, click a product to edit it, or drop a product from the retailer library.');canvas.setAttribute('role','img');canvas.tabIndex=0;
 container.append(canvas);container.querySelector('#retailSceneStatus')?.remove();
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.minDistance=.35;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,1.1,0);
 const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();scene.environmentIntensity=.35;
 scene.add(new T.HemisphereLight('#fff8e9','#8b877b',.4));
 const key=new T.DirectionalLight('#fff5e6',1.55);key.position.set(-3.5,5.5,4.2);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.camera.near=.5;key.shadow.camera.far=18;key.shadow.bias=-.00012;key.shadow.normalBias=.008;key.shadow.radius=3;scene.add(key);
 const fill=new T.DirectionalLight('#edf2ff',.35);fill.position.set(4,3,3);scene.add(fill);
 const rim=new T.DirectionalLight('#fff1d7',.4);rim.position.set(0,3,-2);scene.add(rim);
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,800,500,16);ao.kernelRadius=.17;ao.minDistance=.001;ao.maxDistance=.075;composer.addPass(ao);composer.addPass(new OutputPass());
 const geometries=new Map(),permanent=new Set(),photoCache=new Map(),dynamic=new Set(),pending=new Set();
 let state,lookup,pickables=[],selectedBox,frame=0,width=3.6,mode='orbit',generation=0,signature='',postProcessing=true,environmentReady=false;
 const register=value=>{dynamic.add(value);return value};
 function draw(){if(frame)cancelAnimationFrame(frame);frame=0;if(postProcessing){try{composer.render()}catch{postProcessing=false;renderer.render(scene,camera)}}else renderer.render(scene,camera);container.dataset.rendered=String(generation)}
 function invalidate(){if(!frame&&!container.closest('[hidden]'))frame=requestAnimationFrame(draw)}
 controls.addEventListener('change',invalidate);
 function geometry(w,h,d,r=.003){const key=[w,h,d,r].map(n=>n.toFixed(4)).join(':');if(!geometries.has(key))geometries.set(key,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4)));return geometries.get(key)}
 function mesh(parent,name,w,h,d,x,y,z,material,r=.003){const o=new T.Mesh(geometry(w,h,d,r),material);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function plane(parent,name,w,h,x,y,z,material){const o=new T.Mesh(geometry(w,h,.0005,.0001),material);o.position.set(x,y,z);o.name=name;o.receiveShadow=true;parent.add(o);return o}
 function texture(canvas){const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t}
 function surface(tex,extra={}){return register(new T.MeshStandardMaterial({map:tex,roughness:.66,metalness:0,...extra}))}
 function labelTexture(lines,{bg='#fffdf7',fg='#25372e',w=1024,h=256}={}){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);for(const line of lines){ctx.font=`${line.weight||500} ${line.size||36}px ${line.serif?'Georgia,serif':'Arial,sans-serif'}`;ctx.textAlign=line.align||'left';ctx.fillStyle=line.color||fg;let text=String(line.text||'');while(ctx.measureText(text).width>w-50&&text.length>2)text=text.slice(0,-2)+'…';ctx.fillText(text,line.x??25,line.y??70)}return register(texture(c))}
 function repeatingTexture(kind){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');if(kind==='pegboard'){ctx.fillStyle='#edede6';ctx.fillRect(0,0,512,512);for(let x=16;x<512;x+=32)for(let y=16;y<512;y+=32){ctx.fillStyle='#a3a59d';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#676d65';ctx.beginPath();ctx.arc(x,y-.8,1.6,0,Math.PI*2);ctx.fill()}}else if(kind==='wood'){ctx.fillStyle='#d8ba93';ctx.fillRect(0,0,512,512);for(let x=0;x<512;x++){ctx.fillStyle=`rgba(116,77,39,${.04+(Math.sin(x*.21)+Math.sin(x*.027))*.014})`;ctx.fillRect(x,0,1,512)}}else{ctx.fillStyle='#bfc0ba';ctx.fillRect(0,0,512,512);let seed=1729;for(let n=0;n<17000;n++){seed=(seed*1664525+1013904223)>>>0;const x=seed%512;seed=(seed*1664525+1013904223)>>>0;const y=seed%512,shade=seed%2?'#dadbd4':'#a3a69f';ctx.fillStyle=shade;ctx.globalAlpha=.16+(seed%3)*.08;ctx.fillRect(x,y,seed%3+1,seed%2+1)}ctx.globalAlpha=1;ctx.strokeStyle='#a2a69d';ctx.lineWidth=1.5;ctx.strokeRect(0,0,512,512)}const t=texture(c);t.wrapS=t.wrapT=T.RepeatWrapping;permanent.add(t);return t}
 const peg=repeatingTexture('pegboard'),wood=repeatingTexture('wood'),floorMap=repeatingTexture('floor');floorMap.repeat.set(12,12);
 const floorMaterial=new T.MeshStandardMaterial({map:floorMap,color:'#dfdfd8',roughness:.35,metalness:.06});permanent.add(floorMaterial);
 const floor=new T.Mesh(new T.PlaneGeometry(12,12),floorMaterial);floor.name='Terrazzo tile floor · presentation';floor.rotation.x=-Math.PI/2;floor.position.set(0,-.003,.2);floor.receiveShadow=true;model.add(floor);
 const brass=new T.MeshStandardMaterial({color:'#858d89',metalness:.82,roughness:.27});permanent.add(brass);
 const clear=new T.MeshPhysicalMaterial({color:'#ffffff',roughness:.12,metalness:.08,transparent:true,opacity:.16,depthWrite:false,clearcoat:1,clearcoatRoughness:.1});permanent.add(clear);
 const hookGeo=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,0,-.28),new T.Vector3(0,.012,-.12),new T.Vector3(0,.005,.13),new T.Vector3(0,.025,.18)]),12,.0028,6,false);permanent.add(hookGeo);
 const backgroundLoad=new Promise(resolve=>{new T.TextureLoader().load('retail/store-environment.jpg',map=>{map.mapping=T.EquirectangularReflectionMapping;map.colorSpace=T.SRGBColorSpace;scene.background=map;scene.backgroundBlurriness=.035;scene.backgroundIntensity=.82;environmentReady=true;invalidate();resolve()},undefined,()=>resolve())});pending.add(backgroundLoad);backgroundLoad.finally(()=>pending.delete(backgroundLoad));
 function brandColor(p){let n=0;for(const c of p.brand||p.name)n=(n*31+c.charCodeAt(0))>>>0;return ['#754d79','#738e87','#d5988b','#698cac','#bd9c55','#637c55'][n%6]}
 function photo(p){
  if(photoCache.has(p.id))return photoCache.get(p.id);
  const color=brandColor(p),front=document.createElement('canvas');front.width=512;front.height=640;
  const ctx=front.getContext('2d'),entry={front:texture(front),side:null,color};
  const side=document.createElement('canvas');side.width=256;side.height=640;const sx=side.getContext('2d');sx.fillStyle=color;sx.fillRect(0,0,256,640);sx.fillStyle='#ffffff';sx.font='700 28px Arial';sx.translate(128,320);sx.rotate(-Math.PI/2);sx.textAlign='center';sx.fillText((p.brand||'MY COLLECTION').slice(0,25).toUpperCase(),0,0);sx.font='17px Arial';sx.fillText('RETAIL PRESENTATION',0,33);entry.side=texture(side);
  function paint(img){ctx.fillStyle=color;ctx.fillRect(0,0,512,640);ctx.fillStyle='#ffffff';ctx.font='700 24px Arial';ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText((p.brand||'MY COLLECTION').slice(0,30).toUpperCase(),256,28,470);ctx.fillStyle='#fffefa';ctx.fillRect(10,56,492,512);if(img){let sx=0,sy=0,sw=img.naturalWidth,sh=img.naturalHeight;
    // Trim only blank white photography margins; all product artwork is retained.
    const sample=document.createElement('canvas');sample.width=sample.height=128;const sc=sample.getContext('2d',{willReadFrequently:true});sc.drawImage(img,0,0,128,128);const data=sc.getImageData(0,0,128,128).data;let left=128,right=0,top=128,bottom=0;for(let y=0;y<128;y++)for(let x=0;x<128;x++){const k=(y*128+x)*4;if(Math.min(data[k],data[k+1],data[k+2])<238&&data[k+3]>50){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}if(right>left&&bottom>top){const pad=4;left=Math.max(0,left-pad);top=Math.max(0,top-pad);right=Math.min(127,right+pad);bottom=Math.min(127,bottom+pad);sx=left/128*sw;sy=top/128*sh;sw=(right-left+1)/128*img.naturalWidth;sh=(bottom-top+1)/128*img.naturalHeight}const fit=Math.min(484/sw,504/sh);ctx.drawImage(img,sx,sy,sw,sh,256-sw*fit/2,312-sh*fit/2,sw*fit,sh*fit);
   }else{ctx.fillStyle=color;ctx.font='700 44px Georgia';ctx.fillText(p.custom?'Your idea':'Photo unavailable',256,296,450)}
   ctx.fillStyle='#ffffff';ctx.font='600 22px Arial';ctx.fillText(String(p.name).slice(0,34),256,594,470);ctx.font='12px Arial';ctx.fillText('SOURCE PHOTO · PRESENTATION PACK',256,623);entry.front.needsUpdate=true;invalidate();}
  paint(null);photoCache.set(p.id,entry);
  if(p.image&&!/^https?:/.test(p.image)){const load=new Promise(resolve=>{const img=new Image;img.onload=()=>{paint(img);resolve()};img.onerror=()=>resolve();img.src=p.image});pending.add(load);load.finally(()=>pending.delete(load))}
  return entry;
 }
 function disposeGroup(group){group.traverse(o=>{if(o.isMesh&&!geometries.has(o.geometry?.userData?.cacheKey)&&!permanent.has(o.geometry)){
   // Cached rounded geometries are retained across edits.
   if(![...geometries.values()].includes(o.geometry))o.geometry?.dispose();
  }});group.clear()}
 function clearModel(){disposeGroup(fixture);disposeGroup(stock);for(const r of dynamic)r.dispose?.();dynamic.clear();pickables=[];if(selectedBox){scene.remove(selectedBox);selectedBox.geometry.dispose();selectedBox.material.dispose();selectedBox=null}}
 function addPrice(parent,item,p,x,y,span){const o=callbacks.offer?.(p,item),planned=item.ticket!==null,currency=planned?state.config.currency:o?.currency;const amount=planned?item.ticket:o?.price;let value=amount==null?'Set price':new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD',maximumFractionDigits:2}).format(amount);const map=labelTexture([{text:(planned?'PLAN':'REF')+' · '+(currency||'—'),size:36,y:48,color:'#6c776b'},{text:value,size:128,weight:700,y:192}],{w:768,h:236});const mat=surface(map,{roughness:.45});mesh(parent,'Price label · '+value,Math.min(.20,span-.01),.075,.004,x,y-.018,.313,mat,.002);}
 function pack(parent,item,p,x,y,z,face,depth){const w=item.width/100,h=item.height/100,d=item.packDepth/100,art=photo(p),g=new T.Group();g.name=`${p.name} · facing ${face+1} · depth ${depth+1}`;g.position.set(x,y,z);parent.add(g);
  const front=surface(art.front),side=surface(art.side),paper=register(new T.MeshStandardMaterial({color:art.color,roughness:.68}));
  if(item.display==='hanger'){
   const card=mesh(g,'Rounded hanging card',w-.006,h,.005,0,h/2,-d/2+.01,paper,.006);plane(g,'Source photo · hanging presentation',w-.012,h-.009,0,h/2,-d/2+.013,front);
   const shell=mesh(g,'Clear blister cover',w*.89,h*.76,Math.min(.04,d*.45),0,h*.43,-d/2+.035,clear,.012);shell.castShadow=false;
   if(depth===0){const hook=new T.Mesh(hookGeo,brass);hook.position.set(0,h+.006,-.22-z);hook.name='Steel peg hook';g.add(hook);mesh(g,'Card hang tab',.028,.013,.005,0,h-.009,-d/2+.014,brass,.002)}
   card.userData={uid:item.uid};pickables.push(card);shell.userData={uid:item.uid};pickables.push(shell);
  }else{
   const body=mesh(g,'Printed carton · editable dimensions',w-.006,h,d-.006,0,h/2,0,paper,.004);
   plane(g,'Source photo · front',w-.013,h-.012,0,h/2,d/2-.002,front);
   const right=plane(g,'Printed carton side',d-.012,h-.012,w/2-.002,h/2,0,side);right.rotation.y=Math.PI/2;
   const left=plane(g,'Printed carton side',d-.012,h-.012,-w/2+.002,h/2,0,side);left.rotation.y=-Math.PI/2;
   const top=plane(g,'Printed top flap',w-.014,d-.014,0,h-.001,0,side);top.rotation.x=-Math.PI/2;
   mesh(g,'Carton fold',w-.012,.0015,.001,0,h-.005,d/2-.001,brass,.0001).castShadow=false;
   body.userData={uid:item.uid};pickables.push(body);
  }
  g.traverse(o=>{if(o.isMesh)o.userData={...o.userData,uid:item.uid}});
 }
 function update(next,product){state=next;lookup=product;generation++;const nextSignature=[next.config.bays,next.config.bayWidth,next.config.shelves,next.config.theme].join(':');const refit=signature!==nextSignature;signature=nextSignature;clearModel();const c=state.config,t=themes[c.theme]||themes.bright,bw=c.bayWidth/100,rows=c.shelves;width=bw*c.bays;
  const coating=register(new T.MeshStandardMaterial({color:t.metal,roughness:.43,metalness:.24,...(c.theme==='wood'?{map:wood}:{} )}));
  peg.repeat.set(bw/.4,1.8/.4);const back=register(new T.MeshStandardMaterial({color:t.back,map:peg,roughness:.66,metalness:.08}));
  const rail=register(new T.MeshStandardMaterial({color:t.trim,metalness:.72,roughness:.25}));const plastic=register(new T.MeshStandardMaterial({color:'#f5f4ec',roughness:.45,metalness:.05}));
  mesh(fixture,'Recessed toe kick',width+.04,.105,.5,0,.052,-.035,rail,.008);
  mesh(fixture,'Raised plinth',width+.13,.075,.61,0,.14,.005,coating,.012);
  mesh(fixture,'Back support rail',width+.03,.055,.09,0,.22,-.27,rail);
  for(let b=0;b<c.bays;b++)mesh(fixture,'Perforated back panel · Bay '+(b+1),bw-.025,1.85,.035,-width/2+(b+.5)*bw,1.13,-.28,back,.005);
  const fascia=labelTexture([{text:c.title,size:120,weight:700,serif:true,align:'center',x:1536,y:180}],{bg:c.color,fg:'#fffaf0',w:3072,h:280});
  const fasciaMaterial=surface(fascia,{roughness:.46});
  mesh(fixture,'Rounded fascia housing',width+.17,.31,.17,0,2.135,-.19,coating,.035);
  mesh(fixture,'Fascia sign · '+c.title,width+.1,.245,.02,0,2.14,-.095,fasciaMaterial,.016);
  mesh(fixture,'Fascia bottom trim',width+.14,.014,.18,0,1.985,-.18,rail,.003);
  for(let b=0;b<=c.bays;b++){const x=-width/2+b*bw;mesh(fixture,'Upright '+(b+1),.045,1.97,.105,x,1.1,-.25,coating,.008);for(let n=0;n<28;n++)mesh(fixture,'Bracket adjustment slot',.009,.018,.0015,x,.26+n*.058,-.196,rail,.001)}
  for(const x of [-width/2-.046,width/2+.046]){mesh(fixture,'Finished side panel',.065,1.84,.51,x,1.11,-.005,coating,.012);mesh(fixture,'Side foot',.095,.08,.6,x,.12,.01,coating,.012)}
  const ledMaterial=register(new T.MeshStandardMaterial({color:'#fff1bd',emissive:'#ffe5a4',emissiveIntensity:2.2,roughness:.25}));
  for(let b=0;b<c.bays;b++){
   const center=-width/2+(b+.5)*bw;
   for(let row=0;row<rows;row++){
    const y=.205+(rows-1-row)*1.7/rows,shelf=mesh(fixture,`Bay ${b+1} · Shelf ${row+1}`,bw-.04,.032,.54,center,y,.015,coating,.006);shelf.userData={shelf:{bay:b,row}};pickables.push(shelf);
    mesh(fixture,'Shelf front lip',bw-.038,.045,.025,center,y-.008,.289,rail,.004);
    mesh(fixture,'Ticket channel',bw-.05,.038,.008,center,y-.008,.305,plastic,.002);
    for(const xx of [center-bw/2+.07,center+bw/2-.07]){mesh(fixture,'Steel shelf bracket',.018,.055,.45,xx,y-.035,-.02,rail,.004);mesh(fixture,'Shelf bracket anchor',.018,.105,.024,xx,y-.026,-.24,rail,.002)}
    const lightY=row===0?1.97:y+.385;mesh(fixture,'Warm shelf LED diffuser',bw-.09,.008,.018,center,lightY,.02,ledMaterial,.002);
    let offset=-bw/2+.035;
    for(const item of state.items.filter(i=>i.bay===b&&i.row===row)){
     const p=product(item.id);if(!p)continue;const group=new T.Group(),o=callbacks.offer?.(p,item);group.name=p.brand+' · '+p.name;group.userData={atlasProductId:p.id,assortmentLine:item.uid,retailerKey:item.retailerKey||'',retailer:o?.source||'',sourceURL:o?.url||'',referencePrice:o?.price??null,referenceCurrency:o?.currency||'',referencePack:o?.variant||'',referenceChecked:o?.checked||'',sourceEvidence:o?.price_basis||o?.evidence||'',facings:item.facings,unitsDeep:item.depth,plannedTicket:item.ticket,plannedCurrency:c.currency,displayFormat:item.display||'box',dimensions:'Editable presentation pack estimates; not verified packaging or toy meshes',sourceAge:p.details?.age||'Not documented'};stock.add(group);
     const w=item.width/100,h=item.height/100,d=item.packDepth/100;
     for(let f=0;f<item.facings;f++)for(let dep=0;dep<item.depth;dep++)pack(group,item,p,center+offset+w/2+f*w,y+.018,.263-d/2-dep*d,f,dep);
     addPrice(group,item,p,center+offset+Math.min(item.facings*w/2,.13),y,item.facings*w);
     if(item.uid===state.selected){const bounds=new T.Box3().setFromObject(group);selectedBox=new T.Box3Helper(bounds,'#df6d4f');selectedBox.name='Selected assortment line';scene.add(selectedBox)}
     offset+=item.facings*w+.03;
    }
   }
  }
  container.dataset.sceneReady='true';
  if(refit)setCamera(mode==='focus'?'orbit':mode);else if(mode==='focus')setCamera('focus');else invalidate();
 }
 function fitCamera(bounds,direction,margin=1.13){const center=bounds.getCenter(new T.Vector3()),dir=direction.clone().normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),dir).normalize(),up=new T.Vector3().crossVectors(dir,right).normalize();const tanV=Math.tan(T.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;let distance=.1;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const v=new T.Vector3(x,y,z).sub(center);distance=Math.max(distance,Math.abs(v.dot(right))/tanH+v.dot(dir),Math.abs(v.dot(up))/tanV+v.dot(dir))}camera.position.copy(center).addScaledVector(dir,distance*margin);controls.target.copy(center);controls.update()}
 function setCamera(next){if(!state)return;if(next==='reset')next='orbit';mode=next;controls.enableRotate=next!=='front'&&next!=='top';let bounds=new T.Box3(new T.Vector3(-width/2-.12,.02,-.34),new T.Vector3(width/2+.12,2.3,.35));let dir=new T.Vector3(.17,.105,1);if(next==='front')dir.set(0,.015,1);if(next==='top')dir.set(0,1,.001);if(next==='focus'){const group=stock.children.find(g=>g.userData.assortmentLine===state.selected);if(group)bounds=new T.Box3().setFromObject(group);else mode='orbit'}fitCamera(bounds,dir,next==='focus'?1.5:1.035);invalidate()}
 function hitAt(x,y){const rect=canvas.getBoundingClientRect(),point=new T.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),ray=new T.Raycaster();ray.setFromCamera(point,camera);return ray.intersectObjects(pickables,false)[0]?.object}
 function shelfAt(x,y){const hit=hitAt(x,y);if(hit?.userData.shelf)return hit.userData.shelf;const i=state?.items.find(i=>i.uid===hit?.userData.uid);return i?{bay:i.bay,row:i.row}:null}
 let down;canvas.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const hit=hitAt(e.clientX,e.clientY);if(hit?.userData.uid)callbacks.select(hit.userData.uid);else if(hit?.userData.shelf)callbacks.shelf(hit.userData.shelf.bay,hit.userData.shelf.row)});
 let lastAspect=0;function resize(){const rect=container.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();composer.setSize(rect.width,rect.height);if(state&&Math.abs(lastAspect-camera.aspect)>.1){lastAspect=camera.aspect;setCamera(mode)}invalidate()}
 new ResizeObserver(resize).observe(container);resize();
 async function texturesReady(){await Promise.all([...pending])}
 return {update,resize,camera:setCamera,shelfAt,pause:()=>{if(frame)cancelAnimationFrame(frame);frame=0},image:async()=>{await texturesReady();draw();return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No image')),'image/png'))},exportGLB:async()=>{await texturesReady();return new GLTFExporter().parseAsync(model,{binary:true,maxTextureSize:512,onlyVisible:true,trs:true,copyright:'Atlas presentation fixture. Product photographs and brand names belong to their respective owners.'})},stats:()=>({generation,products:state?.items.length||0,meshes:pickables.length,textures:photoCache.size,webgl:!!renderer.getContext(),ambientOcclusion:postProcessing,environment:environmentReady})};
}
