/* Real-time retail presentation; all packaging dimensions remain editable estimates. */
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {WebGLPathTracer,DenoiseMaterial} from 'three-gpu-pathtracer';

const themes={bright:{metal:'#ecece7',back:'#e1e1d7',trim:'#b0b3ae',floor:'#c8c8c1'},wood:{metal:'#d7b38b',back:'#e0c8a6',trim:'#675744',floor:'#c9c5ba'},dark:{metal:'#353b3c',back:'#424747',trim:'#6b7170',floor:'#aaaeb0'}};
export async function createRetailScene(container,callbacks){
 const scene=new T.Scene();scene.background=new T.Color('#efefea');
 const model=new T.Group();model.name='Atlas retail workshop · presentation model';scene.add(model);
 const fixture=new T.Group();fixture.name='Retail fixture';model.add(fixture);
 const stock=new T.Group();stock.name='Assortment · source-linked product groups';model.add(stock);
 const camera=new T.PerspectiveCamera(35,1,.02,80);
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.VSMShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.0;
 const canvas=renderer.domElement;canvas.setAttribute('aria-label','3D retail aisle. Drag to orbit, scroll to zoom, click a product to edit it, or drop a product from the retailer library.');canvas.setAttribute('role','img');canvas.tabIndex=0;
 container.append(canvas);container.querySelector('#retailSceneStatus')?.remove();
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.minDistance=.35;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,1.1,0);
 const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();scene.environmentIntensity=.55;RectAreaLightUniformsLib.init();
 for(const [x,y,z,w,h,power] of [[-2,3.0,2.1,3,2,5],[3,2.7,1.2,2,2,3]]){const light=new T.RectAreaLight('#fff9ef',power,w,h);light.position.set(x,y,z);light.lookAt(0,1,0);scene.add(light)}
 scene.add(new T.HemisphereLight('#fff8e9','#8b877b',.3));
 const key=new T.DirectionalLight('#fff5e6',1.1);key.position.set(-3.5,5.5,4.2);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.camera.near=.5;key.shadow.camera.far=18;key.shadow.bias=-.00012;key.shadow.normalBias=.001;key.shadow.radius=4;key.shadow.blurSamples=8;scene.add(key);
 const fill=new T.DirectionalLight('#edf2ff',.35);fill.position.set(4,3,3);scene.add(fill);
 const rim=new T.DirectionalLight('#fff1d7',.4);rim.position.set(0,3,-2);scene.add(rim);
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,800,500,16);ao.kernelRadius=.045;ao.minDistance=.0005;ao.maxDistance=.035;composer.addPass(ao);composer.addPass(new OutputPass());
 const geometries=new Map(),permanent=new Set(),photoCache=new Map(),dynamic=new Set(),pending=new Set();
 let pathTracer=null,photoreal=false,tracerDirty=true;
 let state,lookup,pickables=[],selectedBox,frame=0,width=3.6,mode='orbit',generation=0,signature='',postProcessing=true,environmentReady=false;
 const register=value=>{dynamic.add(value);return value};
 function draw(){if(frame)cancelAnimationFrame(frame);frame=0;if(photoreal&&pathTracer){try{if(tracerDirty){pathTracer.setScene(scene,camera);tracerDirty=false}pathTracer.renderSample();container.dataset.renderSamples=String(Math.floor(pathTracer.samples));if(pathTracer.samples<256&&!container.closest('[hidden]')){if(pathTracer.samples%32<.25)callbacks.quality?.('Refining lighting · '+Math.floor(pathTracer.samples/256*100)+'%');frame=requestAnimationFrame(draw)}else callbacks.quality?.('Studio render ready')}catch(err){container.dataset.renderError=err.message;console.warn('Studio renderer: '+err.message);photoreal=false;container.dataset.renderQuality='interactive';callbacks.quality?.('Interactive preview · studio render unavailable on this device');composer.render()}}else if(postProcessing){try{composer.render()}catch{postProcessing=false;renderer.render(scene,camera)}}else renderer.render(scene,camera);container.dataset.rendered=String(generation)}
 function invalidate(){pathTracer?.updateCamera();if(!frame&&!container.closest('[hidden]'))frame=requestAnimationFrame(draw)}
 controls.addEventListener('change',invalidate);
 async function quality(enabled){await texturesReady();photoreal=enabled;if(enabled&&scene.environment&&scene.environment.mapping!==T.EquirectangularReflectionMapping)scene.environment=null;if(enabled){if(!pathTracer){pathTracer=new WebGLPathTracer(renderer);pathTracer.bounces=4;pathTracer.transmissiveBounces=4;pathTracer.renderScale=1;pathTracer.lowResScale=.35;pathTracer.dynamicLowRes=true;pathTracer.renderDelay=100;pathTracer.fadeDuration=150;pathTracer.textureSize.set(512,512);pathTracer.tiles.set(2,2);const denoise=new DenoiseMaterial({sigma:3,kSigma:1,threshold:.3});denoise.transparent=true;denoise.blending=T.NormalBlending;pathTracer.renderToCanvasCallback=(target,r,quad)=>{const old=quad.material;denoise.map=target.texture;denoise.opacity=old.opacity;quad.material=denoise;const auto=r.autoClear;r.autoClear=false;quad.render(r);r.autoClear=auto;quad.material=old}}tracerDirty=true;container.dataset.renderQuality='photoreal';callbacks.quality?.('Studio lighting · refining…')}else{container.dataset.renderQuality='interactive';callbacks.quality?.('Interactive preview')}invalidate()}
 function geometry(w,h,d,r=.003){const key=[w,h,d,r].map(n=>n.toFixed(4)).join(':');if(!geometries.has(key))geometries.set(key,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4)));return geometries.get(key)}
 function mesh(parent,name,w,h,d,x,y,z,material,r=.003){const o=new T.Mesh(geometry(w,h,d,r),material);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function plane(parent,name,w,h,x,y,z,material){const o=new T.Mesh(geometry(w,h,.0005,.0001),material);o.position.set(x,y,z);o.name=name;o.receiveShadow=true;parent.add(o);return o}
 function texture(canvas){const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t}
 function surface(tex,extra={}){return register(new T.MeshStandardMaterial({map:tex,roughness:.66,metalness:0,...extra}))}
 function labelTexture(lines,{bg='#fffdf7',fg='#25372e',w=1024,h=256}={}){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);for(const line of lines){ctx.font=`${line.weight||500} ${line.size||36}px ${line.serif?'Georgia,serif':'Arial,sans-serif'}`;ctx.textAlign=line.align||'left';ctx.fillStyle=line.color||fg;let text=String(line.text||'');while(ctx.measureText(text).width>w-50&&text.length>2)text=text.slice(0,-2)+'…';ctx.fillText(text,line.x??25,line.y??70)}return register(texture(c))}
 function repeatingTexture(kind){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');if(kind==='pegboard'){ctx.fillStyle='#edede6';ctx.fillRect(0,0,512,512);for(let x=16;x<512;x+=32)for(let y=16;y<512;y+=32){ctx.fillStyle='#a3a59d';ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#676d65';ctx.beginPath();ctx.arc(x,y-.8,1.6,0,Math.PI*2);ctx.fill()}}else if(kind==='wood'){ctx.fillStyle='#d8ba93';ctx.fillRect(0,0,512,512);for(let x=0;x<512;x++){ctx.fillStyle=`rgba(116,77,39,${.04+(Math.sin(x*.21)+Math.sin(x*.027))*.014})`;ctx.fillRect(x,0,1,512)}}else{ctx.fillStyle='#e1e0d9';ctx.fillRect(0,0,512,512);let seed=1729;for(let n=0;n<17000;n++){seed=(seed*1664525+1013904223)>>>0;const x=seed%512;seed=(seed*1664525+1013904223)>>>0;const y=seed%512,shade=seed%2?'#dadbd4':'#a3a69f';ctx.fillStyle=shade;ctx.globalAlpha=.16+(seed%3)*.08;ctx.fillRect(x,y,seed%3+1,seed%2+1)}ctx.globalAlpha=1;ctx.strokeStyle='#a2a69d';ctx.lineWidth=1.5;ctx.strokeRect(0,0,512,512)}const t=texture(c);t.wrapS=t.wrapT=T.RepeatWrapping;permanent.add(t);return t}
 const peg=repeatingTexture('pegboard'),wood=repeatingTexture('wood'),floorMap=repeatingTexture('floor');floorMap.repeat.set(12,12);
 const floorMaterial=new T.MeshStandardMaterial({map:floorMap,color:'#fffdf6',roughness:.3,metalness:.03});permanent.add(floorMaterial);
 const floor=new T.Mesh(new T.PlaneGeometry(12,12),floorMaterial);floor.name='Terrazzo tile floor · presentation';floor.rotation.x=-Math.PI/2;floor.position.set(0,-.003,.2);floor.receiveShadow=true;model.add(floor);
 const brass=new T.MeshStandardMaterial({color:'#858d89',metalness:.82,roughness:.27});permanent.add(brass);
 const clear=new T.MeshPhysicalMaterial({color:'#ffffff',roughness:.12,metalness:.08,transparent:true,opacity:.16,depthWrite:false,clearcoat:1,clearcoatRoughness:.1});permanent.add(clear);
 const hookGeo=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,0,-.28),new T.Vector3(0,.012,-.12),new T.Vector3(0,.005,.13),new T.Vector3(0,.025,.18)]),12,.0028,6,false);permanent.add(hookGeo);
 // The room uses the same geometry and perspective as the aisle, avoiding a photo/ground seam.
 const roomMat=new T.MeshStandardMaterial({color:'#f8f7f2',roughness:.82});permanent.add(roomMat);
 const roomGeometry=new T.BoxGeometry(18,3.8,.12),roomWall=new T.Mesh(roomGeometry,roomMat);permanent.add(roomGeometry);roomWall.position.set(0,1.9,-1.15);roomWall.name='Store architecture · neutral wall';roomWall.receiveShadow=true;scene.add(roomWall);
 const architecture=new T.Group();architecture.name='Store architecture · presentation';scene.add(architecture);
 const ceilingMat=new T.MeshStandardMaterial({color:'#fafbf8',roughness:.9});permanent.add(ceilingMat);const ceilingGeo=new T.BoxGeometry(18,.08,12);permanent.add(ceilingGeo);const ceiling=new T.Mesh(ceilingGeo,ceilingMat);ceiling.position.set(0,3.15,0);ceiling.receiveShadow=true;architecture.add(ceiling);
 const panelMat=new T.MeshStandardMaterial({color:'#f7f5ec',emissive:'#fff9e8',emissiveIntensity:.8,roughness:.55});permanent.add(panelMat);const panelGeo=new T.BoxGeometry(1.15,.012,.55);permanent.add(panelGeo);for(const x of [-3,0,3])for(const z of [-.25,2.1]){const panel=new T.Mesh(panelGeo,panelMat);panel.position.set(x,3.098,z);architecture.add(panel)}
 const postGeo=new T.BoxGeometry(.14,3.15,.15);permanent.add(postGeo);for(const x of [-3.1,3.1]){const post=new T.Mesh(postGeo,roomMat);post.position.set(x,1.575,-1.02);post.castShadow=true;post.receiveShadow=true;architecture.add(post)}
 const skirtingMat=new T.MeshStandardMaterial({color:'#c7cbc8',metalness:.45,roughness:.38});permanent.add(skirtingMat);const skirtGeometry=new T.BoxGeometry(18,.09,.025);permanent.add(skirtGeometry);const skirt=new T.Mesh(skirtGeometry,skirtingMat);skirt.position.set(0,.045,-1.07);scene.add(skirt);environmentReady=true;
 const envLoad=new Promise(resolve=>{new HDRLoader().load('retail/studio-lighting.hdr',map=>{map.mapping=T.EquirectangularReflectionMapping;scene.environment=map;scene.environmentIntensity=.5;tracerDirty=true;invalidate();resolve()},undefined,()=>resolve())});pending.add(envLoad);envLoad.finally(()=>pending.delete(envLoad));
 function brandColor(p){let n=0;for(const c of p.brand||p.name)n=(n*31+c.charCodeAt(0))>>>0;return ['#754d79','#738e87','#d5988b','#698cac','#bd9c55','#637c55'][n%6]}
 function photo(p){
  if(photoCache.has(p.id))return photoCache.get(p.id);
  const color=brandColor(p),front=document.createElement('canvas');front.width=512;front.height=640;
  const ctx=front.getContext('2d'),entry={front:texture(front),side:null,color};
  const side=document.createElement('canvas');side.width=256;side.height=640;const sx=side.getContext('2d');sx.fillStyle=color;sx.fillRect(0,0,256,640);sx.fillStyle='#ffffff';sx.font='700 28px Arial';sx.translate(128,320);sx.rotate(-Math.PI/2);sx.textAlign='center';sx.fillText((p.brand||'MY COLLECTION').slice(0,25).toUpperCase(),0,0);sx.font='17px Arial';sx.fillText('RETAIL PRESENTATION',0,33);entry.side=texture(side);
  function paint(img){ctx.fillStyle='#fbfaf6';ctx.fillRect(0,0,512,640);ctx.textBaseline='middle';ctx.textAlign='center';if(img){let sx=0,sy=0,sw=img.naturalWidth,sh=img.naturalHeight;
    // Trim only blank white photography margins; all product artwork is retained.
    const sample=document.createElement('canvas');sample.width=sample.height=128;const sc=sample.getContext('2d',{willReadFrequently:true});sc.drawImage(img,0,0,128,128);const data=sc.getImageData(0,0,128,128).data;let left=128,right=0,top=128,bottom=0;for(let y=0;y<128;y++)for(let x=0;x<128;x++){const k=(y*128+x)*4;if(Math.min(data[k],data[k+1],data[k+2])<238&&data[k+3]>50){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}if(right>left&&bottom>top){const pad=4;left=Math.max(0,left-pad);top=Math.max(0,top-pad);right=Math.min(127,right+pad);bottom=Math.min(127,bottom+pad);sx=left/128*sw;sy=top/128*sh;sw=(right-left+1)/128*img.naturalWidth;sh=(bottom-top+1)/128*img.naturalHeight}const fit=Math.min(504/sw,628/sh);ctx.drawImage(img,sx,sy,sw,sh,256-sw*fit/2,320-sh*fit/2,sw*fit,sh*fit);
   }else{ctx.fillStyle=color;ctx.font='700 44px Georgia';ctx.fillText(p.custom?'Your idea':'Photo unavailable',256,296,450)}
   entry.front.needsUpdate=true;tracerDirty=true;invalidate();}
  paint(null);photoCache.set(p.id,entry);
  if(p.image&&!/^https?:/.test(p.image)){const load=new Promise(resolve=>{const img=new Image;img.onload=()=>{paint(img);resolve()};img.onerror=()=>resolve();img.src=p.image});pending.add(load);load.finally(()=>pending.delete(load))}
  return entry;
 }
 function disposeGroup(group){group.traverse(o=>{if(o.isMesh&&!geometries.has(o.geometry?.userData?.cacheKey)&&!permanent.has(o.geometry)){
   // Cached rounded geometries are retained across edits.
   if(![...geometries.values()].includes(o.geometry))o.geometry?.dispose();
  }});group.clear()}
 function clearModel(){disposeGroup(fixture);disposeGroup(stock);for(const r of dynamic)r.dispose?.();dynamic.clear();pickables=[];if(selectedBox){scene.remove(selectedBox);selectedBox.geometry.dispose();selectedBox.material.dispose();selectedBox=null}}
 function addPrice(parent,item,p,x,y,span){const o=callbacks.offer?.(p,item),planned=item.ticket!==null,currency='USD';const original=planned?item.ticket:o?.price,amount=planned?item.ticket:callbacks.usd.convert(o?.price,o?.currency);let value=amount==null?'Set price':(planned?'':o?.currency!=='USD'?'≈':'')+new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(amount);const map=labelTexture([{text:(planned?'PLAN':'REF')+' · '+(currency||'—'),size:36,y:48,color:'#6c776b'},{text:value,size:128,weight:700,y:192}],{w:768,h:236});const mat=surface(map,{roughness:.45});mesh(parent,'Price label · '+value,Math.min(.16,span-.01),.048,.004,x,y-.012,.313,mat,.002);}
 const packageTextures=new Map(),packageGeometry=new Map(),shapeCache=new Map();
 function packageTexture(p){if(packageTextures.has(p.id))return packageTextures.get(p.id);const profile=window.ATLAS_RETAIL_PACKS[p.id],map=new T.TextureLoader().load(profile.image,()=>{tracerDirty=true;invalidate();done?.()},undefined,()=>done?.());map.colorSpace=T.SRGBColorSpace;map.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());packageTextures.set(p.id,map);let done;const load=new Promise(resolve=>done=resolve);pending.add(load);load.finally(()=>pending.delete(load));return map}
 function mappedFace(parent,p,face,w,h,x,y,z,rx,ry){const profile=window.ATLAS_RETAIL_PACKS[p.id],key=p.id+':'+face;let geo=packageGeometry.get(key);if(!geo){geo=new T.PlaneGeometry(1,1,12,12);const [A,B,C,D]=profile[face],dx1=B[0]-C[0],dx2=D[0]-C[0],dy1=B[1]-C[1],dy2=D[1]-C[1],sx=A[0]-B[0]+C[0]-D[0],sy=A[1]-B[1]+C[1]-D[1],den=dx1*dy2-dx2*dy1,g=den?(sx*dy2-dx2*sy)/den:0,j=den?(dx1*sy-sx*dy1)/den:0,a=B[0]-A[0]+g*B[0],b=D[0]-A[0]+j*D[0],d=B[1]-A[1]+g*B[1],e=D[1]-A[1]+j*D[1];const uv=geo.attributes.uv;for(let n=0;n<uv.count;n++){const u=uv.getX(n),v=1-uv.getY(n),q=g*u+j*v+1;uv.setXY(n,(a*u+b*v+A[0])/q/profile.size[0],1-(d*u+e*v+A[1])/q/profile.size[1])}packageGeometry.set(key,geo);permanent.add(geo)}const mat=surface(packageTexture(p),{roughness:.53,metalness:0});const o=new T.Mesh(geo,mat);o.name='Reviewed source packaging · '+face;o.position.set(x,y,z);o.rotation.set(rx,ry,0);o.scale.set(w,h,1);o.receiveShadow=true;parent.add(o);return o}
 function shapeMaterial(kind){if(shapeCache.has(kind))return shapeCache.get(kind);let mat;if(kind==='bun'){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.fillStyle='#fffdf1';x.fillRect(0,0,1024,512);x.fillStyle='#c6b3d5';for(const [cx,cy,w,h] of [[90,170,75,45],[280,290,60,40],[470,190,65,48],[690,310,85,44],[900,150,60,40]]){x.beginPath();x.ellipse(cx,cy,w,h,.25,0,Math.PI*2);x.fill();x.beginPath();x.ellipse(cx+w*.6,cy+h*.25,w*.6,h*.75,-.4,0,Math.PI*2);x.fill()}const map=texture(c);permanent.add(map);mat=new T.MeshStandardMaterial({map,color:'#fffdf4',roughness:.82,metalness:0})}else mat=new T.MeshStandardMaterial({color:'#d0a0cb',roughness:.25,metalness:0,transparent:true,opacity:.91});shapeCache.set(kind,mat);permanent.add(mat);return mat}
 function squishy(parent,item,p,face,depth){const w=item.width/100,h=item.height/100,d=item.packDepth/100,bun=p.id==='b4d02b231d54bcfc',key=bun?'bun':'dumpling';let geo=packageGeometry.get(key);if(!geo){geo=new T.SphereGeometry(1,56,36);const pos=geo.attributes.position;for(let n=0;n<pos.count;n++){const xx=pos.getX(n),yy=pos.getY(n),zz=pos.getZ(n),fold=bun?1:1+.065*Math.sin(Math.atan2(zz,xx)*7)*Math.max(0,yy);pos.setXYZ(n,xx*fold,Math.max(-.72,yy),zz*fold)}geo.computeVertexNormals();packageGeometry.set(key,geo);permanent.add(geo)}const body=new T.Mesh(geo,shapeMaterial(key));body.name=bun?'Cow-print bun · illustrative squishy shape':'Confetti dumpling · illustrative squishy shape';body.scale.set(w*.45,h*.3,d*.43);body.position.y=h*.23;body.castShadow=true;body.receiveShadow=true;body.userData={uid:item.uid};parent.add(body);pickables.push(body);
  if(!bun){const fillGeo=packageGeometry.get('confetti')||new T.BoxGeometry(.0022,.0007,.0022);packageGeometry.set('confetti',fillGeo);permanent.add(fillGeo);const colors=['#f8d648','#e66b9b','#65c6c2','#fff2f1','#b796d1'];for(let n=0;n<24;n++){const matKey='confetti-'+n%5;let material=shapeCache.get(matKey);if(!material){material=new T.MeshStandardMaterial({color:colors[n%5],roughness:.6});shapeCache.set(matKey,material);permanent.add(material)}const flake=new T.Mesh(fillGeo,material);const angle=n*2.399963;flake.position.set(Math.cos(angle)*w*.32*Math.sqrt(n/24),h*(.17+(n%5)*.035),Math.sin(angle)*d*.32*Math.sqrt(n/24));flake.rotation.set(n*.7,n*.3,n);parent.add(flake)}let eyeMaterial=shapeCache.get('eye');if(!eyeMaterial){eyeMaterial=new T.MeshPhysicalMaterial({color:'#241725',roughness:.18,clearcoat:1});shapeCache.set('eye',eyeMaterial);permanent.add(eyeMaterial)}for(const xx of [-w*.09,w*.09]){const eyeGeo=packageGeometry.get('eye')||new T.SphereGeometry(.004,16,12);packageGeometry.set('eye',eyeGeo);permanent.add(eyeGeo);const eye=new T.Mesh(eyeGeo,eyeMaterial);eye.scale.set(1,1.2,.45);eye.position.set(xx,h*.31,d*.394);parent.add(eye)}}
 }

 function pack(parent,item,p,x,y,z,face,depth){const w=item.width/100,h=item.height/100,d=item.packDepth/100,art=photo(p),g=new T.Group();g.name=`${p.name} · facing ${face+1} · depth ${depth+1}`;g.position.set(x,y,z);parent.add(g);
  const front=surface(art.front),side=surface(art.side),profile=window.ATLAS_RETAIL_PACKS?.[p.id],paper=register(new T.MeshStandardMaterial({color:profile?.color||'#efeee6',roughness:.63,metalness:0}));
  if(item.display==='tray'&&['target-rms-dumpling','b4d02b231d54bcfc'].includes(p.id)){squishy(g,item,p,face,depth);return}
  if(item.display==='hanger'){
   const card=mesh(g,'Rounded hanging card',w-.006,h,.005,0,h/2,-d/2+.01,paper,.006);plane(g,'Source photo · hanging presentation',w-.012,h-.009,0,h/2,-d/2+.013,front);
   const shell=mesh(g,'Clear blister cover',w*.89,h*.76,Math.min(.04,d*.45),0,h*.43,-d/2+.035,clear,.012);shell.castShadow=false;
   if(depth===0){const hook=new T.Mesh(hookGeo,brass);hook.position.set(0,h+.006,-.22-z);hook.name='Steel peg hook';g.add(hook);mesh(g,'Card hang tab',.028,.013,.005,0,h-.009,-d/2+.014,brass,.002)}
   card.userData={uid:item.uid};pickables.push(card);shell.userData={uid:item.uid};pickables.push(shell);
  }else{
   const body=mesh(g,'Printed carton · editable dimensions',w-.006,h,d-.006,0,h/2,0,paper,profile ? .0008 : .003);
   if(profile){mappedFace(g,p,'front',w-.005,h-.005,0,h/2,d/2+.0005,0,0);mappedFace(g,p,'right',d-.005,h-.005,w/2+.0005,h/2,0,0,Math.PI/2);mappedFace(g,p,'top',w-.005,d-.005,0,h+.0005,0,-Math.PI/2,0)}else plane(g,'Source photo · front',w-.013,h-.012,0,h/2,d/2+.0005,front);
   if(!profile){const right=plane(g,'Printed carton side',d-.012,h-.012,w/2-.002,h/2,0,side);right.rotation.y=Math.PI/2;
   const left=plane(g,'Printed carton side',d-.012,h-.012,-w/2+.002,h/2,0,side);left.rotation.y=-Math.PI/2;
   const top=plane(g,'Printed top flap',w-.014,d-.014,0,h+.0005,0,side);top.rotation.x=-Math.PI/2;}
   mesh(g,'Carton fold',w-.012,.0015,.001,0,h-.005,d/2-.001,paper,.0001).castShadow=false;
   body.userData={uid:item.uid};pickables.push(body);
  }
  g.traverse(o=>{if(o.isMesh)o.userData={...o.userData,uid:item.uid}});
 }
 function update(next,product){tracerDirty=true;state=next;lookup=product;generation++;const nextSignature=[next.config.bays,next.config.bayWidth,next.config.shelves,next.config.theme].join(':');const refit=signature!==nextSignature;signature=nextSignature;clearModel();const c=state.config,t=themes[c.theme]||themes.bright,bw=c.bayWidth/100,rows=c.shelves;width=bw*c.bays;
  const coating=register(new T.MeshStandardMaterial({color:t.metal,roughness:.36,metalness:.08,...(c.theme==='wood'?{map:wood}:{} )}));
  peg.repeat.set(bw/.4,1.8/.4);const back=register(new T.MeshStandardMaterial({color:t.back,map:peg,roughness:.66,metalness:.08}));
  const rail=register(new T.MeshStandardMaterial({color:t.trim,metalness:.72,roughness:.25}));const plastic=register(new T.MeshStandardMaterial({color:'#f5f4ec',roughness:.45,metalness:.05}));
  mesh(fixture,'Recessed toe kick',width+.04,.105,.5,0,.052,-.035,rail,.008);
  mesh(fixture,'Raised plinth',width+.13,.075,.61,0,.14,.005,coating,.012);
  mesh(fixture,'Back support rail',width+.03,.055,.09,0,.22,-.27,rail);
  for(let b=0;b<c.bays;b++)mesh(fixture,'Perforated back panel · Bay '+(b+1),bw-.025,1.85,.035,-width/2+(b+.5)*bw,1.13,-.28,back,.005);
  const fascia=labelTexture([{text:c.title,size:110,weight:600,serif:false,align:'center',x:1536,y:180}],{bg:c.color,fg:'#fffaf0',w:3072,h:280});
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
     const p=product(item.id);if(!p)continue;const group=new T.Group(),o=callbacks.offer?.(p,item);group.name=p.brand+' · '+p.name;group.userData={atlasProductId:p.id,assortmentLine:item.uid,retailerKey:item.retailerKey||'',retailer:o?.source||'',sourceURL:o?.url||'',referencePriceUSD:callbacks.usd.convert(o?.price,o?.currency),referenceIsConverted:!!o&&o.currency!=='USD',fxDate:callbacks.usd.fx.date,referencePrice:o?.price??null,referenceCurrency:o?.currency||'',referencePack:o?.variant||'',referenceChecked:o?.checked||'',sourceEvidence:o?.price_basis||o?.evidence||'',facings:item.facings,unitsDeep:item.depth,stockArrangement:item.stacked?'Stack small cartons':'Front to back',packagingSource:window.ATLAS_RETAIL_PACKS?.[p.id]?.source||'',plannedTicket:item.ticket,plannedCurrency:c.currency,displayFormat:item.display||'box',dimensions:'Editable presentation dimensions; artwork mapped from reviewed packaging when available. Squishy meshes are illustrative shape studies.',sourceAge:p.details?.age||'Not documented'};stock.add(group);
     const w=item.width/100,h=item.height/100,d=item.packDepth/100;
     if(item.display==='tray')mesh(group,'Clear squishy display tray',item.facings*w+.01,.028,Math.min(.48,item.depth*d+.025),center+offset+item.facings*w/2,y+.026,.263-Math.min(.48,item.depth*d+.025)/2,clear,.008);
     const stack=item.stacked&&item.display==='box'&&h*2<1.7/rows-.015?2:1;
     for(let f=0;f<item.facings;f++)for(let dep=0;dep<item.depth;dep++)pack(group,item,p,center+offset+w/2+f*w,y+.018+(dep%stack)*h,.263-d/2-Math.floor(dep/stack)*d,f,dep);
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
 function setCamera(next){if(!state)return;if(next==='reset')next='orbit';mode=next;controls.enableRotate=next!=='front'&&next!=='top';let bounds=new T.Box3(new T.Vector3(-width/2-.12,.02,-.34),new T.Vector3(width/2+.12,2.3,.35));let dir=new T.Vector3(.27,.07,1);if(next==='front')dir.set(0,.015,1);if(next==='top')dir.set(0,1,.001);if(next==='focus'){const group=stock.children.find(g=>g.userData.assortmentLine===state.selected);if(group)bounds=new T.Box3().setFromObject(group);else mode='orbit'}fitCamera(bounds,dir,next==='focus'?1.5:1.035);invalidate()}
 function hitAt(x,y){const rect=canvas.getBoundingClientRect(),point=new T.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),ray=new T.Raycaster();ray.setFromCamera(point,camera);return ray.intersectObjects(pickables,false)[0]?.object}
 function shelfAt(x,y){const hit=hitAt(x,y);if(hit?.userData.shelf)return hit.userData.shelf;const i=state?.items.find(i=>i.uid===hit?.userData.uid);return i?{bay:i.bay,row:i.row}:null}
 let down;canvas.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const hit=hitAt(e.clientX,e.clientY);if(hit?.userData.uid)callbacks.select(hit.userData.uid);else if(hit?.userData.shelf)callbacks.shelf(hit.userData.shelf.bay,hit.userData.shelf.row)});
 let lastAspect=0,lastWidth=0,lastHeight=0;function resize(){const rect=container.getBoundingClientRect();if(!rect.width||!rect.height)return;const nextWidth=Math.round(rect.width),nextHeight=Math.round(rect.height);if(nextWidth===lastWidth&&nextHeight===lastHeight)return;lastWidth=nextWidth;lastHeight=nextHeight;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();composer.setSize(rect.width,rect.height);if(state&&Math.abs(lastAspect-camera.aspect)>.1){lastAspect=camera.aspect;setCamera(mode)}invalidate()}
 new ResizeObserver(resize).observe(container);resize();
 async function texturesReady(){await Promise.all([...pending])}
 return {update,resize,quality,camera:setCamera,shelfAt,pause:()=>{if(frame)cancelAnimationFrame(frame);frame=0},image:async()=>{await texturesReady();const started=performance.now();while(photoreal&&pathTracer&&pathTracer.samples<256&&performance.now()-started<20000){await new Promise(resolve=>requestAnimationFrame(resolve));draw()}draw();return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No image')),'image/png'))},exportGLB:async()=>{await texturesReady();return new GLTFExporter().parseAsync(model,{binary:true,maxTextureSize:512,onlyVisible:true,trs:true,copyright:'Atlas presentation fixture. Product photographs and brand names belong to their respective owners.'})},stats:()=>({generation,products:state?.items.length||0,meshes:pickables.length,textures:photoCache.size,webgl:!!renderer.getContext(),ambientOcclusion:postProcessing,environment:environmentReady,quality:photoreal?'photoreal':'interactive',samples:pathTracer?.samples||0})};
}
