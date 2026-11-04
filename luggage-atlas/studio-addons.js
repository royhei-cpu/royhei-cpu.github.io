import * as THREE from './vendor/three/build/three.module.js';
// Original concept placements. No competitor mechanism or production CAD is reproduced.
const names=['cup','phone','hook','usb','bottom','brake','zipperless','expansion','mesh','laundry','shelves','tracker','scale'];
const states=new WeakMap();
function rounded(w,h,d,r=.003){const s=new THREE.Shape(),x=-w/2,y=-h/2;r=Math.min(r,w/2,h/2);s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:Math.min(.0008,d/4),bevelThickness:Math.min(.0008,d/4),curveSegments:8});g.translate(0,0,-d/2);g.computeVertexNormals();return g;}
export function installFeatureGeometry(model){if(states.has(model))return;const root=model.getObjectByName('OpenStoryConcept')||model;
const mat={metal:new THREE.MeshStandardMaterial({color:'#aab0af',metalness:.9,roughness:.29}),rubber:new THREE.MeshStandardMaterial({color:'#303432',roughness:.82}),polymer:new THREE.MeshPhysicalMaterial({color:'#d3c4ac',roughness:.35,clearcoat:.22,metalness:.01}),fabric:new THREE.MeshStandardMaterial({color:'#737974',roughness:.95}),tape:new THREE.MeshStandardMaterial({color:'#373e38',roughness:.9}),accent:new THREE.MeshStandardMaterial({color:'#a65031',roughness:.55})};
const groups={};for(const n of names){const g=new THREE.Group();g.name='Feature_'+n;g.userData={feature:n,scope:'Original design placement; untested mechanism'};root.add(g);groups[n]=g;}
function box(n,id,pos,size,m=mat.polymer){const o=new THREE.Mesh(rounded(...size),m);o.name=id;o.position.set(...pos);o.castShadow=o.receiveShadow=true;groups[n].add(o);return o;}
function ring(n,id,pos,r,t,m=mat.metal){const o=new THREE.Mesh(new THREE.TorusGeometry(r,t,10,64),m);o.name=id;o.position.set(...pos);o.castShadow=true;groups[n].add(o);return o;}
box('cup','CupMount',[.179,.34,-.015],[.008,.078,.048],mat.metal);box('cup','CupSupportArm',[.213,.302,-.015],[.067,.008,.014],mat.metal);ring('cup','CupRetentionRing',[.231,.35,-.015],.037,.0038,mat.polymer).rotation.x=Math.PI/2;box('cup','CupBase',[.231,.301,-.015],[.071,.005,.061],mat.polymer);
box('phone','PhoneCradle',[0,.565,-.082],[.09,.046,.009],mat.rubber);box('phone','PhoneLowerLip',[0,.543,-.072],[.09,.008,.02],mat.polymer);box('phone','PhoneHinge',[0,.542,-.094],[.038,.008,.014],mat.metal);
box('hook','BagHookMount',[-.178,.41,.005],[.007,.043,.025],mat.metal);box('hook','BagHookStem',[-.195,.399,.005],[.031,.007,.012],mat.metal);box('hook','BagHookReturn',[-.21,.408,.005],[.006,.023,.014],mat.metal);
box('usb','USBPortHousing',[.18,.452,.014],[.009,.035,.032],mat.rubber);const port=box('usb','USBPortInsert',[.186,.451,.014],[.002,.013,.023],mat.metal);box('usb','USBPortOpening',[.1875,.451,.014],[.001,.006,.015],mat.rubber);
box('bottom','BottomGrabRecess',[0,.068,-.018],[.105,.009,.044],mat.rubber);box('bottom','BottomGrabBar',[0,.063,.003],[.091,.01,.015],mat.polymer);
box('brake','WheelStopperButton',[.14,.43,-.112],[.028,.035,.009],mat.accent);for(const x of [-.147,.147])box('brake','BrakeTab'+x,[x,.061,-.084],[.026,.009,.028],mat.rubber);
for(const z of [-.0035,.0035]){for(const x of [-.177,.177])box('zipperless','FrameSide'+x+z,[x,.294,z],[.005,.433,.007],mat.metal);for(const y of [.076,.512])box('zipperless','FrameEnd'+y+z,[0,y,z],[.348,.006,.007],mat.metal);}
for(const y of [.18,.405]){box('zipperless','LatchBody'+y,[.181,y,0],[.011,.049,.041],mat.metal);box('zipperless','LatchRelease'+y,[.188,y,.004],[.005,.028,.021],mat.rubber);for(let i=0;i<3;i++)box('zipperless','LockDial'+y+i,[.191,y-.008+i*.007,.004],[.002,.004,.014],mat.metal);}
for(const x of [-.176,.176])box('expansion','ExpansionSide'+x,[x,.294,0],[.005,.426,.028],mat.fabric);for(const y of [.077,.511])box('expansion','ExpansionEnd'+y,[0,y,0],[.346,.005,.028],mat.fabric);
for(const n of ['mesh','tracker']){root.remove(groups[n]);model.getObjectByName('FrontOrganizer').add(groups[n]);}
// These groups use the front organizer's unrotated coordinates. Keep open apertures.
for(let row=0;row<2;row++){const cy=.20+row*.15;for(let i=0;i<26;i++)box('mesh','PocketMeshV'+row+'-'+i,[-.125+i*.01,cy,.014],[.0007,.105,.001],mat.fabric);for(let i=0;i<11;i++)box('mesh','PocketMeshH'+row+'-'+i,[0,cy-.05+i*.01,.014],[.25,.0007,.001],mat.fabric);box('mesh','PocketBinding'+row,[0,cy+.055,.015],[.26,.006,.003],mat.tape);}
box('tracker','TrackerPocket',[-.105,.44,.018],[.055,.055,.007],mat.fabric);box('tracker','TrackerFlap',[-.105,.46,.024],[.058,.012,.003],mat.tape);
box('laundry','LaundryPouch',[.06,.22,-.015],[.17,.23,.023],mat.fabric);box('laundry','LaundryDrawcord',[.06,.334,.002],[.17,.005,.005],mat.tape);box('laundry','LaundryCordLock',[.126,.33,.006],[.012,.013,.009],mat.rubber);
for(let i=0;i<3;i++){box('shelves','FoldedShelf'+i,[0,.145+i*.128,-.035],[.285,.007,.104],mat.fabric);for(const x of [-.14,.14])box('shelves','ShelfStrap'+i+x,[x,.21+i*.10,.015],[.01,.13,.004],mat.tape);}
box('scale','WeightIndicatorBezel',[.179,.32,.071],[.008,.042,.024],mat.rubber);box('scale','WeightIndicatorWindow',[.184,.32,.071],[.003,.028,.014],mat.accent);
const transforms=new Map();model.traverse(o=>{if(['FrontShell','BackBody','BackLining','FrontLining','FrontWheels','FrontRepairMarkers','Handle'].includes(o.name)||o.parent?.name==='Handle')transforms.set(o,{position:o.position.clone(),scale:o.scale.clone()});});
const materials=[];model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.name==='Shell')materials.push(m);});
states.set(model,{groups,mat,transforms,materials});return groups;
}
export function applyFeatureGeometry(model,config,view,options={}){const state=states.get(model);if(!state)return;const {groups,mat,transforms,materials}=state,has=id=>config.addons?.includes(id);mat.polymer.color.set(({sage:'#94a28a',sand:'#d3c4ac',ink:'#243a51',clay:'#b88577',silver:'#acb2af'})[config.color]||'#94a28a');
// Reset only scales and feature-specific offsets; base poses are reset by applyStudioModel first.
for(const [o,t]of transforms){o.scale.copy(t.scale);if(o.name==='FrontRepairMarkers')o.position.copy(t.position);}
for(const m of materials){m.roughness=config.finish==='gloss'?.22:config.finish==='matte'?.64:.4;m.clearcoat=config.finish==='gloss'?.65:config.finish==='matte'?.04:.22;m.clearcoatRoughness=config.finish==='gloss'?.2:.42;m.envMapIntensity=.9;}
for(const [n,g]of Object.entries(groups)){g.visible=has(n)&&!(options.isolatePart&&view==='exploded');if(!['mesh','tracker'].includes(n)){g.position.copy(model.getObjectByName('BackBody').position);g.scale.set(1,1,1);}if(['mesh','tracker','laundry','shelves'].includes(n))g.visible&&=(view!=='exterior'&&options.organizersVisible!==false);}
if(groups.phone.visible)groups.phone.position.y+=(options.handleExtended?.454:0);
if(has('wide'))model.getObjectByName('Handle').traverse(o=>{const t=transforms.get(o);if(!t||o.name==='Handle')return;o.position.x=t.position.x*1.42;if(o.name==='TrolleyGrip')o.scale.x=t.scale.x*1.42;});
if(has('shelves'))for(const n of ['CompressionPanel','PackingCubes','Divider'])model.getObjectByName(n).visible=false;
if(has('zipperless'))model.traverse(o=>{if(/^(MainClosure|MainZip|MainTape|BackZip|FrontZip)/.test(o.name))o.visible=false;});
if(has('deep')){
 groups.zipperless.position.z+=.092;groups.expansion.position.z+=.092;
 const front=model.getObjectByName('FrontShell');front.scale.z=.2;front.position.z+=.092;
 for(const n of ['BackBody','BackLining']){const o=model.getObjectByName(n);o.scale.z=1.8;o.position.z+=.092;}
 for(const n of ['FrontWheels','FrontRepairMarkers']){const o=model.getObjectByName(n);o.scale.z=5;o.position.z-=.46;}
 for(const n of ['CompressionPanel','PackingCubes','Divider'])model.getObjectByName(n).position.z+=.092;
 model.getObjectByName('FrontAccess').visible=false;
}
model.updateMatrixWorld(true);
}
