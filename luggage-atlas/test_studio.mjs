import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import path from 'node:path';import {fileURLToPath} from 'node:url';
import * as THREE from './vendor/three/build/three.module.js';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {GLTFExporter} from './vendor/three/examples/jsm/exporters/GLTFExporter.js';
import {captureModelDefaults,applyStudioModel,prepareStudioMaterials,inspectionParts,inspectionAnchor,frameStudioCamera,visibleBounds,inspectionLinks} from './studio-model.js';
// Decode and re-encode the actual embedded textures using the bundled CPU canvas.
// Outside the Codex runtime, install @napi-rs/canvas as a development dependency.
const require=(await import('node:module')).createRequire(import.meta.url);let canvas;
try{canvas=require('@napi-rs/canvas');}catch{canvas=require(path.resolve(path.dirname(process.execPath),'../node_modules/@napi-rs/canvas'));}
globalThis.self=globalThis;globalThis.ImageBitmap=canvas.Image;globalThis.ImageData=canvas.ImageData;globalThis.OffscreenCanvas=canvas.CanvasElement;
canvas.CanvasElement.prototype.convertToBlob=async function({type='image/png'}={}){return new Blob([await this.encode(type.split('/')[1])],{type});};
globalThis.createImageBitmap=async(blob,options={})=>{const image=await canvas.loadImage(Buffer.from(await blob.arrayBuffer()));if(options.imageOrientation==='flipY'){const c=canvas.createCanvas(image.width,image.height),context=c.getContext('2d');context.translate(0,image.height);context.scale(1,-1);context.drawImage(image,0,0);return c;}return image;};
const dir=path.dirname(fileURLToPath(import.meta.url)),ctx={window:{},Date};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(dir,'studio-config.js'),'utf8'),ctx);const D=ctx.window.OpenStoryDesign;
assert.equal(D.sanitize({color:'<script>',format:'invalid',frontAccess:'true'}).color,'sage');assert.equal(D.sanitize({color:'__proto__'}).color,'sage');assert.equal(D.sanitize({frontAccess:false}).frontAccess,false);
const raw=fs.readFileSync(process.env.STUDIO_MODEL_PATH||path.join(dir,'models/open-story-concept.glb'));assert.equal(raw.toString('utf8',0,4),'glTF');assert.equal(raw.readUInt32LE(4),2);
const gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');const model=gltf.scene,defaults=captureModelDefaults(model);prepareStudioMaterials(model);assert(model.getObjectByName('FrontShellFace').material.isMeshPhysicalMaterial);assert.equal(model.getObjectByName('FrontShellFace').material.clearcoat,.12);assert.equal(model.getObjectByName('FrontShellFace').material.normalMap.image.width,128);
for(const name of ['BackLining','FrontLining','FrontOrganizer','HingeBridge','FrontShell','FrontAccess','CompressionPanel','PackingCubes','Divider','WetPocket','RepairMarkers','Wheels','FrontWheels','FrontRepairMarkers','Handle'])assert(model.getObjectByName(name),name);
// Pixel-level texture regression: generated images must contain data, not packed black placeholders.
function meanColor(image){const c=canvas.createCanvas(image.width,image.height),context=c.getContext('2d');context.drawImage(image,0,0);const pixels=context.getImageData(0,0,image.width,image.height).data,mean=[0,0,0];for(let i=0;i<pixels.length;i+=4)for(let k=0;k<3;k++)mean[k]+=pixels[i+k]/(pixels.length/4);return mean;}
const normalMean=meanColor(model.getObjectByName('FrontShellFace').material.normalMap.image);assert(normalMean[0]>115&&normalMean[0]<140);assert(normalMean[1]>115&&normalMean[1]<140);assert(normalMean[2]>240);
const cloth=model.getObjectByName('BackQuiltedFloor').material;const clothMean=meanColor(cloth.map.image);assert(clothMean.every(x=>x>125&&x<165),'woven lining color pixels');assert(cloth.normalMap);
const mesh=model.getObjectByName('FrontOrganizationOpenMesh'),pos=mesh.geometry.attributes.position,index=mesh.geometry.index;let area=0;const v=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];for(let i=0;i<index.count;i+=3){v.forEach((p,k)=>p.fromBufferAttribute(pos,index.getX(i+k)));area+=new THREE.Vector3().subVectors(v[1],v[0]).cross(new THREE.Vector3().subVectors(v[2],v[0])).length()/2;}mesh.geometry.computeBoundingBox();const size=mesh.geometry.boundingBox.getSize(new THREE.Vector3());assert(area/(size.x*size.y)<.45,'open mesh must leave real apertures');
let meshes=0;model.traverse(o=>{if(o.isMesh){meshes++;assert(o.geometry.attributes.position.count>0);for(const n of o.geometry.attributes.position.array)assert(Number.isFinite(n));}});assert(meshes>60);
for(const format of Object.keys(D.formats))for(const color of Object.keys(D.colors))for(const interior of ['compression','cubes','divider']){
 const c=D.sanitize({format,color,interior,frontAccess:false,wetPocket:false,repairable:true});applyStudioModel(model,{dimensions:D.formats[format].dimensions,shellColor:D.colors[color].hex,trimColor:'#183e34',...c},'exterior',defaults);
 assert.equal(model.getObjectByName('FrontAccess').visible,false);assert.equal(model.getObjectByName('WetPocket').visible,false);assert.equal(model.getObjectByName('CompressionPanel').visible,interior==='compression');assert.equal(model.getObjectByName('PackingCubes').visible,interior==='cubes');assert.equal(model.getObjectByName('Divider').visible,interior==='divider');
 const mat=model.getObjectByName('FrontShellFace').material;assert.equal(mat.color.getHexString(THREE.SRGBColorSpace),D.colors[color].hex.slice(1));
 const b=D.brief(c,['offer-a8bb8cf6']);assert.equal(b.configuration.format,format);assert.equal(b.designTargets.emptyMassKg,null);assert.equal(b.designTargets.unitCost,null);assert(b.recommendation.tests.length>=3);
}
const settings={dimensions:[55,36,23],shellColor:'#94a28a',trimColor:'#183e34',interior:'compression',frontAccess:true,wetPocket:true,repairable:true};
applyStudioModel(model,{...settings,handleExtended:false},'exterior',defaults);const retracted=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());assert(retracted.y<.58);
applyStudioModel(model,{...settings,handleExtended:true},'exterior',defaults);const extended=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());assert(extended.y>.99);assert(extended.y-retracted.y>.4);
const frontWheelBefore=model.getObjectByName('FrontWheels').getWorldPosition(new THREE.Vector3());
applyStudioModel(model,settings,'inside',defaults);assert(model.getObjectByName('FrontWheels').getWorldPosition(new THREE.Vector3()).distanceTo(frontWheelBefore)>.1);assert(Math.abs(model.getObjectByName('FrontShell').quaternion.y)>.5);
applyStudioModel(model,settings,'exploded',defaults);assert(model.getObjectByName('Wheels').position.y<defaults.get('Wheels').position.y);
applyStudioModel(model,settings,'exterior',defaults);assert(model.getObjectByName('FrontShell').quaternion.equals(defaults.get('FrontShell').quaternion));
// View transforms return to a single baseline and every format fits portrait and wide cameras.
for(const format of Object.keys(D.formats))for(const view of ['exterior','inside','exploded'])for(const aspect of [360/410,900/500]){
 applyStudioModel(model,{...settings,dimensions:D.formats[format].dimensions,handleExtended:false},view,defaults);
 const camera=new THREE.PerspectiveCamera(36,aspect,.01,20),frame=frameStudioCamera(model,camera,view);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const bounds=visibleBounds(model);for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const projected=new THREE.Vector3(x,y,z).project(camera);assert(Math.abs(projected.x)<.99&&Math.abs(projected.y)<.99,'fitted camera must retain the full view');assert(projected.z>-1&&projected.z<1);}
 if(view==='exploded')for(const part of inspectionParts){const p=inspectionAnchor(model,part);assert(p&&[p.x,p.y,p.z].every(Number.isFinite));}
 assert(frame.distance>frame.minDistance);
}
applyStudioModel(model,{...settings,handleExtended:false,organizersVisible:false},'inside',defaults);assert.equal(model.getObjectByName('FrontOrganizer').visible,false);assert.equal(model.getObjectByName('CompressionPanel').visible,false);assert.equal(model.getObjectByName('BackLining').visible,true);assert(Math.abs(model.rotation.x+Math.PI/2)<1e-8);
applyStudioModel(model,{...settings,handleExtended:false,explodeAmount:.25},'exploded',defaults);const compact=model.getObjectByName('CompressionPanel').position.z;
applyStudioModel(model,{...settings,handleExtended:false,explodeAmount:1},'exploded',defaults);assert(model.getObjectByName('CompressionPanel').position.z>compact+.15);assert(model.getObjectByName('FrontLining').position.z<defaults.get('FrontLining').position.z);
applyStudioModel(model,{...settings,handleExtended:false},'exterior',defaults);assert(model.position.length()===0);assert(model.quaternion.equals(new THREE.Quaternion()));
for(const part of inspectionParts){applyStudioModel(model,{...settings,handleExtended:false,isolatedPart:part.id},'exploded',defaults);assert(!visibleBounds(model).isEmpty());const visibleParts=inspectionParts.filter(p=>inspectionAnchor(model,p));assert.equal(visibleParts.length,1);assert.equal(visibleParts[0].id,part.id);}
applyStudioModel(model,{...settings,handleExtended:false},'exploded',defaults);assert.equal(inspectionLinks(model).length,6);
applyStudioModel(model,{...settings,handleExtended:false},'exterior',defaults);
// Node provides Blob; this FileReader adapter tests the same exporter used by the browser.
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;if(this.onloadend)this.onloadend();});}readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64');if(this.onloadend)this.onloadend();});}};
const exported=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true});assert(exported instanceof ArrayBuffer);const roundtrip=await new GLTFLoader().parseAsync(exported,'');assert(roundtrip.scene.getObjectByName('FrontShell'));assert(!roundtrip.scene.getObjectByName('PackingCubes'));assert(!roundtrip.scene.getObjectByName('Divider'));
applyStudioModel(model,{...settings,handleExtended:false,isolatedPart:'lining'},'exploded',defaults);
const isolatedExport=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true});const isolatedRoundtrip=(await new GLTFLoader().parseAsync(isolatedExport,'')).scene;
assert(isolatedRoundtrip.getObjectByName('BackQuiltedFloor'));assert(isolatedRoundtrip.getObjectByName('FrontQuiltedFloor'));assert(!isolatedRoundtrip.getObjectByName('FrontShellFace'));assert(!isolatedRoundtrip.getObjectByName('FrontOrganizationOpenMesh'));
applyStudioModel(model,{...settings,handleExtended:false},'exterior',defaults);
console.log('PASS: real Blender GLB imports; '+meshes+' meshes have finite geometry; 45 format/color/interior configurations, embedded-texture decode/export, nonblank correctly encoded textile/normal textures, physical shell materials, real mesh apertures, handle retraction/extension, attached front wheels, 18 camera fits, 6 part isolations, packing-well visibility, exploded spacing/reset transforms, honest brief fields and customized GLB export/re-import.');
