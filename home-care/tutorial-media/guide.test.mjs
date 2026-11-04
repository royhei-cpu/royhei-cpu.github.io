import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {primaryNavigation} from '../ui-src/upgrade-model.js';
const root=path.dirname(fileURLToPath(import.meta.url)),site=path.join(root,'../site');
const guide=JSON.parse(fs.readFileSync(path.join(root,'guide-scenes.json')));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const normalize=value=>value.replace(/\s+/g,' ').trim();

test('the tutorial covers the current navigation and controls, with Opportunities last',()=>{
 const map={'nav-catalog':'Browse competitors','nav-global':'Global retailers & items','nav-analysis':'Sales & analysis','nav-workshop':'White Label Workshop','brand-factories':'Brands & factories','video-guide':'Video guide','nav-opportunities':'Opportunities'};
 assert.deepEqual(guide.navigation,primaryNavigation.filter(id=>id!=='nav-target').map(id=>map[id]));assert.equal(guide.navigation.at(-1),'Opportunities');
 assert.equal(guide.scenes.length,12);assert.equal(guide.release,manifest.release);
 const transcript=fs.readFileSync(path.join(root,'transcript.txt'),'utf8');assert.equal(normalize(transcript),normalize(guide.scenes.map(s=>s.speech).join(' ')));
 for(const name of ['China listings','Real products','Why and what changes','Design and costs','National-brand photo references','View full-size photo','Manufacturer data','Photo source','Suggested changes','Specs and dimensions','BOM and pricing','Save brief with comparison photos','Joseph Joseph','Brabantia'])assert.ok(transcript.includes(name),name);
 assert.ok(!transcript.includes('View larger'));assert.ok(!transcript.includes('Dimensions and source details'));
 for(const [file,expected] of Object.entries(manifest.interfaceSources)){assert.equal(hash(fs.readFileSync(path.join(root,'..',file))),expected,'Interface changed; review and refresh the tutorial: '+file);}
 for(const label of ['Studio','Front','Inside','Details','Exploded','Rotate in 3D','A1 is a visual revision'])assert.ok(transcript.includes(label),label);
 for(const id of ['workshop','benchmarks','changes','specs','pricing','downloads'])assert.ok(guide.scenes.find(scene=>scene.id===id).url.startsWith('/home-care/workshop/laundry-sorter.html#'));
 assert.ok(fs.readFileSync(path.join(root,'render_guide.py'),'utf8').includes('workshop-models/laundry-sorter-a1-inside.jpg'));
 assert.match(guide.format,/not a screen recording/);
});

test('the shipped video transport, captions, timeline and chapter links describe one release',()=>{
 const data=Buffer.from(manifest.parts.map(file=>fs.readFileSync(path.join(root,file),'utf8').trim()).join(''),'base64');assert.equal(data.length,manifest.size);assert.equal(hash(data),manifest.sha256);assert.ok(data.subarray(0,40).includes(Buffer.from('ftyp')));
 const timeline=JSON.parse(fs.readFileSync(path.join(root,'timeline.json')));assert.equal(timeline.sourceRelease,manifest.release);assert.equal(timeline.voice,manifest.voice);assert.ok(Math.abs(timeline.duration-manifest.duration)<.001);
 let end=0;for(const cue of timeline.cues){assert.ok(cue.start>=end-.001);assert.ok(cue.end>cue.start);assert.ok(cue.holdEnd>=cue.end);assert.ok(cue.holdEnd<=manifest.duration+.001);end=cue.holdEnd;}
 assert.equal(normalize(timeline.cues.map(c=>c.text).join(' ')),normalize(guide.scenes.map(s=>s.speech).join(' ')));
 const html=fs.readFileSync(path.join(site,'tutorial.html'),'utf8');assert.match(html,/Homecare_Workspace_Guide\.mp4/);assert.ok(!html.includes('20261028'));assert.equal((html.match(/data-time=/g)||[]).length,12);assert.ok(html.includes(manifest.release));assert.match(html,/illustrated|Illustrated/);
 const vtt=fs.readFileSync(path.join(site,'videos/tutorial.en.vtt'),'utf8');assert.ok(vtt.startsWith('WEBVTT'));assert.equal((vtt.match(/-->/g)||[]).length,timeline.cues.length);for(const cue of timeline.cues)assert.ok(vtt.includes(cue.text));
 assert.ok(fs.statSync(path.join(site,'videos/tutorial-poster.jpg')).size>10000);
});

test('both the current video/download URLs and legacy URLs assemble to the new video',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'homecare-guide-'));
 try{const result=spawnSync(process.env.PYTHON||'python3',[path.join(root,'assemble.py'),'--site-dir',temp],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  for(const folder of ['videos','downloads'])for(const name of ['Homecare_Workspace_Guide.mp4','Home_Care_Catalog_Excel_Tutorial.mp4'])assert.equal(hash(fs.readFileSync(path.join(temp,folder,name))),manifest.sha256);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('chapter buttons seek to the requested chapter and indicate the current chapter',()=>{
 let update;const status={textContent:''};const video={readyState:1,currentTime:0,focused:false,focus(){this.focused=true;},scrollIntoView(){},addEventListener(event,fn){if(event==='timeupdate')update=fn;}};
 const buttons=[0,22,44].map(time=>({dataset:{time:String(time)},attrs:{},querySelector(){return {textContent:'Chapter '+time};},addEventListener(event,fn){this.click=fn;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}}));
 const document={getElementById:id=>id==='guide-video'?video:status,querySelectorAll:()=>buttons};
 vm.runInNewContext(fs.readFileSync(path.join(site,'tutorial.js'),'utf8'),{document,matchMedia:()=>({matches:true})});buttons[1].click();assert.equal(video.currentTime,22);assert.equal(video.focused,true);assert.match(status.textContent,/Chapter 22/);update();assert.equal(buttons[1].attrs['aria-current'],'true');assert.equal(buttons[0].attrs['aria-current'],undefined);
});
