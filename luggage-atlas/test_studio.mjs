import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import path from 'node:path';import {fileURLToPath} from 'node:url';
import * as THREE from './vendor/three/build/three.module.js';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {GLTFExporter} from './vendor/three/examples/jsm/exporters/GLTFExporter.js';
import {captureModelDefaults,applyStudioModel,prepareStudioMaterials} from './studio-model.js';
// Decode and re-encode the actual embedded textures using the bundled CPU canvas.
// Outside the Codex runtime, install @napi-rs/canvas as a development dependency.
const require=(await import('node:module')).createRequire(import.meta.url);let canvas;
try{canvas=require('@napi-rs/canvas');}catch{canvas=require(path.resolve(path.dirname(process.execPath),'../node_modules/@napi-rs/canvas'));}
globalThis.self=globalThis;globalThis.ImageBitmap=canvas.Image;globalThis.ImageData=canvas.ImageData;globalThis.OffscreenCanvas=canvas.CanvasElement;
canvas.CanvasElement.prototype.convertToBlob=async function({type='image/png'}={}){return new Blob([await this.encode(type.split('/')[1])],{type});};
globalThis.createImageBitmap=async(blob,options={})=>{const image=await canvas.loadImage(Buffer.from(await blob.arrayBuffer()));if(options.imageOrientation==='flipY'){const c=canvas.createCanvas(image.width,image.height),context=c.getContext('2d');context.translate(0,image.height);context.scale(1,-1);context.drawImage(image,0,0);return c;}return image;};
const dir=path.dirname(fileURLToPath(import.meta.url)),ctx={window:{},Date};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(dir,'studio-config.js'),'utf8'),ctx);const D=ctx.window.OpenStoryDesign;
assert.equal(D.sanitize({color:'<script>',format:'invalid',frontAccess:'true'}).color,'sage');assert.equal(D.sanitize({color:'__proto__'}).color,'sage');assert.equal(D.sanitize({frontAccess:false}).frontAccess,false);
const raw=fs.readFileSync(path.join(dir,'models/open-story-concept.glb'));assert.equal(raw.toString('utf8',0,4),'glTF');assert.equal(raw.readUInt32LE(4),2);
const gltf=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'');const model=gltf.scene,defaults=captureModelDefaults(model);prepareStudioMaterials(model);assert(model.getObjectByName('FrontShellFace').material.isMeshPhysicalMaterial);assert.equal(model.getObjectByName('FrontShellFace').material.clearcoat,.12);assert.equal(model.getObjectByName('FrontShellFace').material.normalMap.image.width,128);
for(const name of ['FrontShell','FrontAccess','CompressionPanel','PackingCubes','Divider','WetPocket','RepairMarkers','Wheels','FrontWheels','FrontRepairMarkers','Handle'])assert(model.getObjectByName(name),name);
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
// Node provides Blob; this FileReader adapter tests the same exporter used by the browser.
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;if(this.onloadend)this.onloadend();});}readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64');if(this.onloadend)this.onloadend();});}};
const exported=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true});assert(exported instanceof ArrayBuffer);const roundtrip=await new GLTFLoader().parseAsync(exported,'');assert(roundtrip.scene.getObjectByName('FrontShell'));assert(!roundtrip.scene.getObjectByName('PackingCubes'));assert(!roundtrip.scene.getObjectByName('Divider'));
console.log('PASS: real Blender GLB imports; '+meshes+' meshes have finite geometry; 45 format/color/interior configurations, embedded-texture decode/export, physical shell materials, handle retraction/extension, attached front wheels, feature visibility, open/exploded/reset transforms, honest brief fields and customized GLB export/re-import.');
