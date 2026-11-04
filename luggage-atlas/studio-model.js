import * as THREE from './vendor/three/build/three.module.js';
// Shared by the WebGL studio and model-file tests; no network or browser dependency.
export function captureModelDefaults(model){const defaults=new Map();for(const name of ['FrontShell','CompressionPanel','PackingCubes','Wheels','FrontWheels']){const obj=model.getObjectByName(name);if(obj)defaults.set(name,{position:obj.position.clone(),quaternion:obj.quaternion.clone()});}const handle=model.getObjectByName('Handle');handle?.traverse(o=>{if(o!==handle)defaults.set(o.name,{position:o.position.clone(),quaternion:o.quaternion.clone()});});return defaults;}
export function applyStudioModel(model,settings,view,defaults){
 const [height,width,depth]=settings.dimensions;model.scale.set(width/36,height/55,depth/23);
 model.traverse(o=>{if(o.isMesh){for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.name==='Shell')m.color.set(settings.shellColor);if(m.name==='Trim')m.color.set(settings.trimColor);}}});
 for(const [name,on] of Object.entries({FrontAccess:settings.frontAccess,RepairMarkers:settings.repairable,FrontRepairMarkers:settings.repairable,CompressionPanel:settings.interior==='compression',PackingCubes:settings.interior==='cubes',Divider:settings.interior==='divider',WetPocket:settings.wetPocket})){const obj=model.getObjectByName(name);if(obj)obj.visible=on;}
 for(const [name,base] of defaults){const obj=model.getObjectByName(name);obj.position.copy(base.position);obj.quaternion.copy(base.quaternion);}
 if(settings.handleExtended===false){const shift=(defaults.get('TrolleyGrip')?.position.y||.994)-.54;const handle=model.getObjectByName('Handle');handle?.traverse(o=>{if(o!==handle)o.position.y-=shift*(/^(LowerTrolleyTube|TubeCollar)/.test(o.name) ? .5 : 1);});}
 const front=model.getObjectByName('FrontShell');if(front&&view==='inside')front.rotateY(-112*Math.PI/180);
 if(view==='exploded'){if(front)front.position.x-=.24;for(const name of ['CompressionPanel','PackingCubes']){const obj=model.getObjectByName(name);if(obj)obj.position.z+=.24;}for(const name of ['Wheels','FrontWheels']){const wheels=model.getObjectByName(name);if(wheels)wheels.position.y-=.055;}}
 model.updateMatrixWorld(true);
}

// Surface visualization only; no material grade or physical performance is inferred.
export function prepareStudioMaterials(model){
 model.traverse(o=>{if(!o.isMesh)return;const upgrade=m=>{if(m.name!=='Shell')return m;const material=new THREE.MeshPhysicalMaterial({name:m.name,color:m.color.clone(),roughness:.4,metalness:.02,clearcoat:.12,clearcoatRoughness:.45,envMapIntensity:.7,normalMap:m.normalMap,normalScale:m.normalScale.clone()});m.dispose();return material;};o.material=Array.isArray(o.material)?o.material.map(upgrade):upgrade(o.material);});
}
