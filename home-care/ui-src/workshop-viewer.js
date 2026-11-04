import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export function prepareModel(model){
 const meshes=[],materials=new Set(),textures=new Set(),assemblies=[];
 model.traverse(o=>{if(o.userData.assemblyId&&Array.isArray(o.userData.explodeOffset))assemblies.push({object:o,id:o.userData.assemblyId,label:o.userData.assemblyLabel,role:o.userData.viewRole,origin:o.position.clone(),offset:new THREE.Vector3(...o.userData.explodeOffset)});if(o.isMesh){meshes.push(o);o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}}});
 assemblies.sort((a,b)=>(a.object.userData.assemblyOrder??0)-(b.object.userData.assemblyOrder??0));
 const groups=[...new Set(meshes.map(o=>o.userData.partCode||o.parent?.userData.partCode||'Unassigned'))].sort();
 const initial=new THREE.Box3().setFromObject(model),span=Math.max(...initial.getSize(new THREE.Vector3()).toArray());
 const origins=new Map(meshes.map(o=>[o,o.position.clone()]));
 function explode(active){
  if(assemblies.length){for(const a of assemblies){a.object.position.copy(a.origin);if(active)a.object.position.add(a.offset);}model.updateMatrixWorld(true);return;}
  // Older schematic files retain a consistent vertical parts stack, without radial scattering.
  for(const o of meshes){o.position.copy(origins.get(o));if(active){const key=o.userData.partCode||o.parent?.userData.partCode||'Unassigned',i=groups.indexOf(key);const delta=new THREE.Vector3(0,i*span*.09,0),q=o.parent.getWorldQuaternion(new THREE.Quaternion()).invert(),scale=o.parent.getWorldScale(new THREE.Vector3());o.position.add(delta.applyQuaternion(q).divide(scale));}}model.updateMatrixWorld(true);
 }
 return {
  assemblies,
  bounds:()=>new THREE.Box3().setFromObject(model),
  setColor(hex){for(const m of materials)if(m.name.startsWith('HA_body'))m.color.set(hex);},
  explode,
  setView(mode){explode(mode==='exploded');for(const a of assemblies)if(a.role==='lid')a.object.visible=mode!=='inside';},
  dispose(){for(const o of meshes)o.geometry.dispose();for(const texture of textures)texture.dispose();for(const m of materials)m.dispose();},
 };
}

export async function createWorkshopViewer(host,url,{color,view='perspective',signal}={}){
 if(signal?.aborted)throw new Error('Cancelled');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor('#e6e5de');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const canvas=renderer.domElement;canvas.setAttribute('aria-label','Textured development model; drag to orbit and pinch or scroll to zoom');canvas.setAttribute('role','img');host.appendChild(canvas);
 const scene=new THREE.Scene(),perspective=new THREE.PerspectiveCamera(35,1,.001,100),front=new THREE.OrthographicCamera(-1,1,1,-1,.001,100);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.05);scene.environment=environment.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
 let camera=perspective,controls=new OrbitControls(camera,canvas),disposed=false,model,prepared,ground,viewMode=view,observer;
 const pins=[];controls.enableDamping=false;controls.enablePan=false;controls.minDistance=.02;
 const render=()=>{if(!disposed)renderer.render(scene,camera);};controls.addEventListener('change',render);
 const hemi=new THREE.HemisphereLight(0xffffff,0x777a70,.8);scene.add(hemi);
 const key=new THREE.DirectionalLight(0xfff6e9,2.6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00005;scene.add(key);scene.add(key.target);
 const fill=new THREE.DirectionalLight(0xeaf0ff,.9);scene.add(fill);
 function createPins(){
  prepared.assemblies.forEach((a,i)=>{
   const surface=document.createElement('canvas');surface.width=surface.height=128;const ctx=surface.getContext('2d');if(!ctx)return;ctx.fillStyle='#754731';ctx.beginPath();ctx.arc(64,64,48,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fffdf5';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#fffdf5';ctx.font='bold 62px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),64,67);
   const texture=new THREE.CanvasTexture(surface),material=new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true,toneMapped:false}),sprite=new THREE.Sprite(material);sprite.renderOrder=10;scene.add(sprite);pins.push({assembly:a,sprite,texture});
  });
 }
 function fit(){
  if(!prepared||disposed)return;const box=prepared.bounds(),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z,.05);
  if(ground){ground.visible=viewMode!=='exploded';ground.position.set(center.x,box.min.y-.001,center.z);}
  const width=host.clientWidth||600,height=host.clientHeight||450,aspect=width/height;renderer.setSize(width,height,false);
  perspective.aspect=aspect;perspective.updateProjectionMatrix();
  const heightNeeded=Math.max(size.y,size.x/aspect,size.z*.65)*1.28,dist=heightNeeded/(2*Math.tan(THREE.MathUtils.degToRad(perspective.fov/2))),direction=viewMode==='inside'?new THREE.Vector3(.8,1.7,1.6):new THREE.Vector3(1.1,.7,1.8);
  perspective.position.copy(center).add(direction.normalize().multiplyScalar(dist*1.38));perspective.near=span/1000;perspective.far=span*100;perspective.updateProjectionMatrix();
  const half=Math.max(size.y,size.x/aspect)*.61;front.left=-half*aspect;front.right=half*aspect;front.top=half;front.bottom=-half;front.position.copy(center).add(new THREE.Vector3(0,0,span*4));front.near=span/1000;front.far=span*100;front.updateProjectionMatrix();
  camera=viewMode==='front'?front:perspective;controls.object=camera;controls.target.copy(center);controls.maxDistance=span*12;controls.update();camera.lookAt(center);
  key.position.copy(center).add(new THREE.Vector3(-1,2,2).multiplyScalar(span*2));key.target.position.copy(center);key.shadow.camera.left=-span*2;key.shadow.camera.right=span*2;key.shadow.camera.top=span*2;key.shadow.camera.bottom=-span*2;key.shadow.camera.near=span/100;key.shadow.camera.far=span*15;key.shadow.normalBias=span*.0005;key.shadow.camera.updateProjectionMatrix();fill.position.copy(center).add(new THREE.Vector3(2,1,-1).multiplyScalar(span));
  for(const pin of pins){pin.sprite.visible=viewMode==='exploded';const b=new THREE.Box3().setFromObject(pin.assembly.object);pin.sprite.position.copy(b.getCenter(new THREE.Vector3()));pin.sprite.position.y=b.max.y+span*.045;pin.sprite.scale.setScalar(span*.055);}
  render();
 }
 const dispose=()=>{if(disposed)return;disposed=true;observer?.disconnect();controls.removeEventListener('change',render);controls.dispose();prepared?.dispose();for(const p of pins){p.texture.dispose();p.sprite.material.dispose();scene.remove(p.sprite);}scene.traverse(o=>{if(o.userData.studio){o.geometry?.dispose();o.material?.dispose();}});environment.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();signal?.removeEventListener('abort',dispose);};
 signal?.addEventListener('abort',dispose,{once:true});
 try{
  const gltf=await new GLTFLoader().loadAsync(url);model=gltf.scene;prepared=prepareModel(model);
  if(disposed){prepared.dispose();throw new Error('Cancelled');}
  scene.add(model);prepared.setColor(color||'#93a183');prepared.setView(viewMode);createPins();
  const b=prepared.bounds(),span=Math.max(...b.getSize(new THREE.Vector3()).toArray());
  ground=new THREE.Mesh(new THREE.PlaneGeometry(span*12,span*12),new THREE.ShadowMaterial({opacity:.2}));ground.rotation.x=-Math.PI/2;ground.position.y=b.min.y-.001;ground.receiveShadow=true;ground.userData.studio=true;scene.add(ground);
  observer=new ResizeObserver(fit);observer.observe(host);fit();
  return {setColor(hex){prepared.setColor(hex);render();},setView(mode){viewMode=mode;prepared.setView(mode);fit();},reset(){fit();},dispose};
 }catch(error){dispose();throw error;}
}
