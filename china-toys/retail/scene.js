/* Build with esbuild; see package.json. Geometry is an editable retail concept. */
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

export async function createRetailScene(container,callbacks){
 const scene=new T.Scene();scene.background=new T.Color('#ece9e4');
 const model=new T.Group();model.name='Atlas editable retail concept';scene.add(model);
 const camera=new T.PerspectiveCamera(38,1,.03,80);
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
 renderer.domElement.setAttribute('aria-label','Interactive 3D toy aisle. Drag to orbit and click a product to edit it. Use Shelf plan for keyboard editing.');renderer.domElement.setAttribute('role','img');renderer.domElement.tabIndex=0;
 container.append(renderer.domElement);const status=container.querySelector('#retailSceneStatus');status?.remove();
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=1.1;controls.maxDistance=15;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,.95,0);
 scene.add(new T.HemisphereLight('#fffaf1','#767f74',2));
 const key=new T.DirectionalLight('#fff9ed',2.7);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.015;scene.add(key);
 const fill=new T.DirectionalLight('#eaf4ff',1.4);fill.position.set(4,3,2);scene.add(fill);
 const ground=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshStandardMaterial({color:'#e5e0d9',roughness:.9}));ground.rotation.x=-Math.PI/2;ground.position.y=-.005;ground.receiveShadow=true;ground.name='Studio floor';scene.add(ground);
 const grid=new T.GridHelper(12,24,'#cfc9c0','#ded8cf');grid.position.y=.001;grid.material.transparent=true;grid.material.opacity=.2;scene.add(grid);
 const textureCache=new Map(),raycaster=new T.Raycaster(),pointer=new T.Vector2();let pickables=[],state,lookup,frame=0,width=3.6,selectedBox=null,first=true,textureLoads=new Set(),modelGeneration=0;
 const white=new T.MeshStandardMaterial({color:'#f4f3ef',roughness:.58,metalness:.12});
 const metal=new T.MeshStandardMaterial({color:'#b8bdb9',roughness:.45,metalness:.55});
 const backMat=new T.MeshStandardMaterial({color:'#deded4',roughness:.8});
 function invalidate(){if(frame||container.closest('[hidden]'))return;frame=requestAnimationFrame(()=>{frame=0;renderer.render(scene,camera)})}
 controls.addEventListener('change',invalidate);
 function box(parent,name,w,h,d,x,y,z,material){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
 function canvasTexture(text,{bg='#cc3937',fg='#ffffff',size=96,width=1536,height=192}={}){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${size}px Georgia,serif`;let label=String(text);while(ctx.measureText(label).width>width*.92&&label.length>3)label=label.slice(0,-2)+'…';ctx.fillText(label,width/2,height/2);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;return tex}
 function photoTexture(p){if(textureCache.has(p.id))return textureCache.get(p.id);const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,512,512);ctx.fillStyle='#173e35';ctx.font='24px sans-serif';ctx.textAlign='center';ctx.fillText(p.brand||'My product',256,256);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;textureCache.set(p.id,tex);
  if(p.image){const load=new Promise(resolve=>{const img=new Image;img.onload=()=>{ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,512);const factor=480/Math.max(img.naturalWidth,img.naturalHeight);ctx.drawImage(img,(512-img.naturalWidth*factor)/2,(512-img.naturalHeight*factor)/2,img.naturalWidth*factor,img.naturalHeight*factor);tex.needsUpdate=true;invalidate();resolve()};img.onerror=()=>{callbacks.error('One product photo could not load. Its labeled concept pack is still available.');resolve()};img.src=p.image});textureLoads.add(load);load.finally(()=>textureLoads.delete(load));}
  return tex;
 }
 function freeModel(){model.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){if(![white,metal,backMat].includes(m)){if(m.map&&!textureCache.has(m.map.userData?.productId)){
       // Product textures live in the cache; only label textures are disposed here.
       if(![...textureCache.values()].includes(m.map))m.map.dispose();
      }m.dispose()}}}});model.clear();pickables=[];selectedBox=null;}
 function update(next,product){state=next;lookup=product;modelGeneration++;freeModel();const c=state.config,bw=c.bayWidth/100,bays=c.bays,rows=c.shelves; width=bw*bays;
  const fasciaMat=new T.MeshStandardMaterial({color:c.color,roughness:.6});
  box(model,'Plinth',width+.12,.17,.55,0,.085,0,white);
  box(model,'Back panel',width,.0+1.9,.045,0,1.12,-.24,backMat);
  const sign=new T.MeshBasicMaterial({map:canvasTexture(c.title,{bg:c.color}),toneMapped:false});
  box(model,'Fascia frame',width+.13,.3,.14,0,2.17,-.11,white);
  box(model,'Fascia sign · '+c.title,width+.06,.24,.025,0,2.17,-.025,sign);
  box(model,'Fascia red edge',width+.1,.025,.16,0,2.01,-.11,fasciaMat);
  for(let b=0;b<=bays;b++){
   const x=-width/2+b*bw;box(model,'Upright '+(b+1),.045,2.02,.1,x,1.1,-.2,white);
   for(let n=0;n<28;n++)box(model,'Upright slot',.012,.016,.003,x,.28+n*.058,-.147,metal);
  }
  for(let b=0;b<bays;b++){
   const center=-width/2+(b+.5)*bw;
   // Pegboard holes provide scale without expensive custom geometry.
   const pegPositions=[];for(let x=0;x<Math.floor(bw/.065);x++)for(let y=0;y<24;y++)pegPositions.push(center-bw*.46+x*.065,.27+y*.07,-.214);
   const pegGeo=new T.BufferGeometry();pegGeo.setAttribute('position',new T.Float32BufferAttribute(pegPositions,3));const pegs=new T.Points(pegGeo,new T.PointsMaterial({color:'#a6a69e',size:.009}));pegs.name='Pegboard detail '+(b+1);model.add(pegs);
   for(let row=0;row<rows;row++){
    const y=.2+(rows-1-row)*(1.7/rows),shelf=box(model,`Bay ${b+1} shelf ${row+1}`,bw-.045,.038,.49,center,y,.01,white);shelf.userData={shelf:{bay:b,row}};pickables.push(shelf);
    box(model,'Shelf label rail',bw-.04,.045,.022,center,y-.006,.267,metal);
    const tag=canvasTexture(`B${b+1} · S${row+1}`,{bg:'#f9f7f1',fg:'#536359',size:32,width:256,height:64});
    box(model,'Bay / shelf label',.16,.04,.004,center-bw/2+.12,y-.003,.281,new T.MeshBasicMaterial({map:tag}));
    let offset=-bw/2+.04;
    for(const item of state.items.filter(i=>i.bay===b&&i.row===row)){
     const p=product(item.id);if(!p)continue;const group=new T.Group();group.name=p.brand+' · '+p.name;group.userData={atlasProductId:p.id,assortmentLine:item.uid,facings:item.facings,unitsDeep:item.depth,plannedTicketUSD:item.ticket,dimensions:'Editable concept pack estimates; not verified packaging',sourceURL:p.listings?.[0]?.url||'',sourceAge:p.details?.age||'Not documented'};model.add(group);
     const w=item.width/100,h=item.height/100,d=item.packDepth/100,mat=new T.MeshStandardMaterial({color:'#f3eee5',roughness:.7}),front=new T.MeshBasicMaterial({map:photoTexture(p),toneMapped:false});
     for(let face=0;face<item.facings;face++)for(let depth=0;depth<Math.min(item.depth,6);depth++){
      const x=center+offset+w/2+face*w,z=.245-d/2-depth*d,pack=box(group,`${p.name} · face ${face+1} depth ${depth+1}`,w-.007,h,d-.007,x,y+.02+h/2,z,[mat,mat,mat,mat,front,mat]);pack.userData={uid:item.uid};pickables.push(pack);
     }
     const text=item.ticket===null?'PLANNED · —':'PLAN $'+Number(item.ticket).toFixed(2),price=canvasTexture(text,{bg:'#fffdf5',fg:'#253a32',size:27,width:512,height:96});
     box(group,'Planned ticket label',Math.min(item.facings*w-.01,.35),.04,.006,center+offset+item.facings*w/2,y-.002,.285,new T.MeshBasicMaterial({map:price}));
     if(item.uid===state.selected){const outline=new T.Box3().setFromCenterAndSize(new T.Vector3(center+offset+item.facings*w/2,y+.02+h/2,.245-d*item.depth/2),new T.Vector3(item.facings*w+.015,h+.025,d*item.depth+.02));selectedBox=new T.Box3Helper(outline,'#e46b4e');selectedBox.name='Selection outline';scene.add(selectedBox)}
     offset+=item.facings*w+.03;
    }
   }
  }
  if(first){setCamera('orbit');first=false}else invalidate();
 }
 // Selection helper lives outside the exported group and is replaced on updates.
 const originalFree=freeModel;freeModel=function(){if(selectedBox){scene.remove(selectedBox);selectedBox.geometry.dispose();selectedBox.material.dispose();selectedBox=null}model.traverse(o=>{if(o.isPoints){o.geometry.dispose();o.material.dispose()}});originalFree()};
 function setCamera(mode){const distance=Math.max(3.7,width*1.1);controls.enableRotate=mode==='orbit'||mode==='reset';if(mode==='front'){camera.position.set(0,1.16,distance);controls.target.set(0,1.15,0)}else if(mode==='top'){camera.position.set(0,distance,.01);controls.target.set(0,.8,0)}else{camera.position.set(width*.26,2.1,distance);controls.target.set(0,1.13,0)}controls.update();resize();invalidate()}
 let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY}});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(pickables,false)[0];if(hit?.object.userData.uid)callbacks.select(hit.object.userData.uid);else if(hit?.object.userData.shelf){const s=hit.object.userData.shelf;callbacks.shelf(s.bay,s.row)}});
 function resize(){const rect=container.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.fov=Math.max(38,Math.min(70,38*1.65/Math.max(.7,camera.aspect)));camera.updateProjectionMatrix();invalidate()}
 const observer=new ResizeObserver(resize);observer.observe(container);resize();
 async function exportGLB(){await Promise.all([...textureLoads]);const exporter=new GLTFExporter();return exporter.parseAsync(model,{binary:true,maxTextureSize:512,onlyVisible:true,trs:true,copyright:'Concept fixture by China Toy Atlas. Product photos and trademarks belong to their respective owners.'})}
 return {update,resize,camera:setCamera,pause:()=>{if(frame)cancelAnimationFrame(frame);frame=0},image:async()=>{await Promise.all([...textureLoads]);renderer.render(scene,camera);return new Promise((resolve,reject)=>renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(new Error('No image')),'image/png'))},exportGLB,stats:()=>({generation:modelGeneration,products:state?.items.length||0,meshes:pickables.length,textures:textureCache.size,webgl:!!renderer.getContext()})};
}
