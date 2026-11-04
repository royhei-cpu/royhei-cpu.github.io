import * as THREE from './vendor/three/build/three.module.js';
// Shared model poses, component information and bounds; tested on the actual GLB.
const movingGroups=['BackBody','FrontShell','BackLining','FrontLining','FrontOrganizer','CompressionPanel','PackingCubes','Divider','Wheels','FrontWheels','RepairMarkers','Handle'];
export const inspectionParts=[
 {id:'shell',number:'01',label:'Shell halves',groups:['BackBody','FrontShell'],anchor:'BackBody',description:'Two formed shell halves and their closure edges. The front half turns outward to reveal the interior; shell thickness and joints still need engineering.'},
 {id:'lining',number:'02',label:'Sewn liners',groups:['BackLining','FrontLining'],anchor:'BackLining',description:'Recessed fabric floors, sewn side gussets, bound rims and a padded document sleeve. The lining lifts away from each shell in this view.'},
 {id:'organizer',number:'03',label:'Front organization',groups:['FrontOrganizer'],anchor:'FrontOrganizer',description:'A see-through mesh compartment, perimeter zipper and optional wet-item pouch. The apertures are modeled as open geometry; water resistance remains untested.'},
 {id:'packing',number:'04',label:'Packing system',groups:['CompressionPanel','PackingCubes','Divider'],description:'Your selected compression panel, three removable packing cubes or zippered divider. Open mesh, webbing, stitching and adjusting hardware are separate details.'},
 {id:'wheels',number:'05',label:'Spinner assemblies',groups:['Wheels','FrontWheels'],anchor:'Wheels',description:'Four twin-spinners, each with rubber tires, yoke, swivel and axle caps. The separation shows their position; it is not a proven repair procedure.'},
 {id:'trolley',number:'06',label:'Trolley assembly',groups:['Handle'],anchor:'Handle',description:'Two aluminum tube stages, collars, grip and release button. The assembly lifts above the rear shell; locking and load performance are untested.'}
];
export function captureModelDefaults(model){const defaults=new Map();for(const name of movingGroups){const obj=model.getObjectByName(name);if(obj)defaults.set(name,{position:obj.position.clone(),quaternion:obj.quaternion.clone()});}model.getObjectByName('Handle')?.traverse(o=>{if(o.name!=='Handle')defaults.set(o.name,{position:o.position.clone(),quaternion:o.quaternion.clone()});});return defaults;}
export function applyStudioModel(model,settings,view,defaults){
 const [height,width,depth]=settings.dimensions;model.scale.set(width/36,height/55,depth/23);model.position.set(0,0,0);model.quaternion.identity();
 model.traverse(o=>{if(o.isMesh){o.visible=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.name==='Shell')m.color.set(settings.shellColor);if(m.name==='Trim')m.color.set(settings.trimColor);}}});
 const showOrganizers=view!=='inside'||settings.organizersVisible!==false;
 for(const [name,on] of Object.entries({FrontAccess:settings.frontAccess,RepairMarkers:settings.repairable,FrontRepairMarkers:settings.repairable,FrontOrganizer:showOrganizers,HingeBridge:view==='inside',CompressionPanel:showOrganizers&&settings.interior==='compression',PackingCubes:showOrganizers&&settings.interior==='cubes',Divider:showOrganizers&&settings.interior==='divider',WetPocket:settings.wetPocket})){const obj=model.getObjectByName(name);if(obj)obj.visible=on;}
 for(const [name,base] of defaults){const obj=model.getObjectByName(name);obj.position.copy(base.position);obj.quaternion.copy(base.quaternion);}
 if(settings.handleExtended===false){const shift=(defaults.get('TrolleyGrip')?.position.y||.994)-.54;model.getObjectByName('Handle')?.traverse(o=>{if(o.name!=='Handle')o.position.y-=shift*(/^(LowerTrolleyTube|TubeCollar)/.test(o.name) ? .5 : 1);});}
 const front=model.getObjectByName('FrontShell');if(front&&(view==='inside'||view==='exploded'))front.rotateY(-Math.PI);
 if(view==='inside'){
  // Lay the 180-degree open case on its outer shells, with both packing wells facing up.
  model.rotation.x=-Math.PI/2;model.position.set(width/200,depth/200,height/200);
 }
 if(view==='exploded'){
  const amount=THREE.MathUtils.clamp(Number.isFinite(settings.explodeAmount)?settings.explodeAmount:1,.25,1);
  model.position.set(width/200,.08*height/55,0);
  if(front)front.position.x-=.08*amount;
  for(const name of ['BackBody','BackLining','RepairMarkers','Wheels','Handle','CompressionPanel','PackingCubes','Divider']){const o=model.getObjectByName(name);if(o)o.position.x+=.08*amount;}
  model.getObjectByName('BackLining').position.z+=.10*amount;
  model.getObjectByName('FrontLining').position.z-=.10*amount;
  model.getObjectByName('FrontOrganizer').position.z-=.30*amount;
  for(const name of ['CompressionPanel','PackingCubes','Divider'])model.getObjectByName(name).position.z+=.34*amount;
  for(const name of ['Wheels','FrontWheels'])model.getObjectByName(name).position.y-=.075*amount;
  model.getObjectByName('Handle').position.y+=.13*amount;
  if(inspectionParts.some(p=>p.id===settings.isolatedPart))model.traverse(o=>{if(!o.isMesh)return;let part=null;for(let parent=o.parent;parent&&parent!==model;parent=parent.parent){part=inspectionParts.find(p=>p.groups.includes(parent.name));if(part)break;}o.visible=part?.id===settings.isolatedPart;});
 }
 model.updateMatrixWorld(true);
}
export function visibleBounds(object){const bounds=new THREE.Box3();object?.traverseVisible(o=>{if(o.isMesh){o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});return bounds;}
export function inspectionAnchor(model,part){const name=part.anchor||part.groups.find(n=>model.getObjectByName(n)?.visible),object=model.getObjectByName(name);if(!object)return null;const box=visibleBounds(object);if(box.isEmpty())return null;const point=box.getCenter(new THREE.Vector3());if(part.id==='shell')point.x=box.max.x;if(part.id==='lining')point.y=box.min.y+(box.max.y-box.min.y)*.25;return point;}
export function frameStudioCamera(model,camera,view){
 const box=visibleBounds(model),target=box.getCenter(new THREE.Vector3());
 const direction=new THREE.Vector3(...(view==='inside'?[.28,1.45,1]:view==='exploded'?[.85,.32,1.8]:[.85,.55,1.5])).normalize();
 const right=new THREE.Vector3().crossVectors(camera.up,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize(),tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));let distance=0;
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).sub(target),depth=p.dot(direction);distance=Math.max(distance,depth+Math.abs(p.dot(right))/(tan*camera.aspect),depth+Math.abs(p.dot(up))/tan);}
 distance=Math.max(.5,distance*1.15);camera.position.copy(target).addScaledVector(direction,distance);camera.lookAt(target);camera.updateMatrixWorld(true);
 return {target,distance,minDistance:Math.max(.2,box.getSize(new THREE.Vector3()).length()*.3),maxDistance:Math.max(3,distance*2.5)};
}

export function inspectionLinks(model){
 const pairs=[['BackShellFace','BackQuiltedFloor'],['FrontShellFace','FrontQuiltedFloor'],['FrontQuiltedFloor','FrontOrganizationOpenMesh'],['BackQuiltedFloor',['CompressionPanel','PackingCubes','Divider'].find(n=>model.getObjectByName(n)?.visible)],['BackShellFace','Wheels'],['BackShellFace','Handle']];
 return pairs.map(([a,b])=>{const first=visibleBounds(model.getObjectByName(a)),second=visibleBounds(model.getObjectByName(b));if(first.isEmpty()||second.isEmpty())return null;const from=first.getCenter(new THREE.Vector3()),to=second.getCenter(new THREE.Vector3());if(b==='Wheels')from.y=first.min.y;if(b==='Handle')from.y=first.max.y;return [from,to];}).filter(Boolean);
}
// Surface visualization only; no material grade or physical performance is inferred.
export function prepareStudioMaterials(model){
 model.traverse(o=>{if(!o.isMesh)return;const upgrade=m=>{if(m.name!=='Shell')return m;const material=new THREE.MeshPhysicalMaterial({name:m.name,color:m.color.clone(),roughness:.4,metalness:.02,clearcoat:.12,clearcoatRoughness:.45,envMapIntensity:.7,normalMap:m.normalMap,normalScale:m.normalScale.clone()});m.dispose();return material;};o.material=Array.isArray(o.material)?o.material.map(upgrade):upgrade(o.material);});
}
