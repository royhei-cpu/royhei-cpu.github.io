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

const {installFeatureGeometry,applyFeatureGeometry}=await import('./studio-addons.js');installFeatureGeometry(model);
vm.runInContext(fs.readFileSync(path.join(dir,'feature-inspiration.js'),'utf8'),ctx);
const settings={dimensions:[55,36,23],shellColor:'#d3c4ac',trimColor:'#343837',interior:'compression',frontAccess:false,wetPocket:true,repairable:true,handleExtended:false};
for(const id of ['cup','phone','hook','usb','bottom','brake','zipperless','expansion','mesh','laundry','shelves','tracker','scale','wide','deep'])for(const view of ['exterior','inside','exploded']){
 const c={color:'sand',finish:'satin',addons:[id],interior:'compression'};applyStudioModel(model,settings,view,defaults);applyFeatureGeometry(model,c,view,{handleExtended:false,organizersVisible:true});const a=visibleBounds(model);
 applyStudioModel(model,settings,view,defaults);applyFeatureGeometry(model,c,view,{handleExtended:false,organizersVisible:true});const b=visibleBounds(model);assert(a.min.distanceTo(b.min)<1e-6&&a.max.distanceTo(b.max)<1e-6,'Transforms must be idempotent '+id+' '+view);assert(!b.isEmpty());assert(b.getSize(new THREE.Vector3()).length()<2);
 const camera=new THREE.PerspectiveCamera(36,.8,.01,20);frameStudioCamera(model,camera,view);assert(Number.isFinite(camera.position.length()));
}
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64');this.onloadend?.();});}};
for(const view of ['exterior','inside']){applyStudioModel(model,settings,view,defaults);applyFeatureGeometry(model,{color:'sand',finish:'satin',addons:['cup','phone','hook','usb','brake','bottom','tracker','mesh','laundry'],interior:'compression'},view,{handleExtended:false,organizersVisible:true});const exported=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true});const roundtrip=(await new GLTFLoader().parseAsync(exported,'')).scene;assert(roundtrip.getObjectByName('Feature_cup'));assert(!roundtrip.getObjectByName('Feature_zipperless'));if(view==='inside')assert(roundtrip.getObjectByName('Feature_mesh'));if(process.env.STUDIO_FEATURE_EXPORT){fs.mkdirSync(process.env.STUDIO_FEATURE_EXPORT,{recursive:true});fs.writeFileSync(path.join(process.env.STUDIO_FEATURE_EXPORT,'feature-'+view+'.glb'),Buffer.from(exported));}}
console.log('PASS: 45 real-geometry feature/view combinations, repeatable transforms, finite camera framing, actual exported add-on geometry and GLB re-import.');
