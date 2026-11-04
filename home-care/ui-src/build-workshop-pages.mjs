import {build} from 'esbuild';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {renderToString} from 'react-dom/server';
import React from 'react';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {workshopLibrary as library,escapeHTML,workshopPath} from './workshop-logic.js';
export async function buildWorkshopPages(dir,manifest){
 const temp=path.join(dir,'.workshop-ssr.mjs'),site=path.join(dir,'../site'),folder=path.join(site,'workshop');await mkdir(folder,{recursive:true});
 try{
  await build({entryPoints:[path.join(dir,'workshop-page.jsx')],bundle:true,packages:'external',platform:'node',format:'esm',outfile:temp,logLevel:'silent'});
  const {WorkshopPage}=await import(pathToFileURL(temp).href+'?built='+Date.now());
  for(const p of library.concepts){
   const e=escapeHTML,url='https://royhei-cpu.github.io'+workshopPath(p.id),app=renderToString(React.createElement(WorkshopPage,{initialConcept:p.id}));
   const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#153f34"><title>${e(p.name)} · Homecare White Label Workshop</title><meta name="description" content="Real national-brand product photographs, sourced facts, a white-label development case and a Blender concept study."><link rel="canonical" href="${url}"><link rel="stylesheet" href="/home-care/ui-assets/${manifest.stylesheet}"></head><body class="hc-workshop-page" data-sound-scene="workshop"><header><a class="workshop-wordmark" href="/home-care/">Homecare / Workshop</a><nav aria-label="Homecare navigation"><a href="/home-care/">Product catalog</a><a href="/home-care/?view=global#homecare-workspace">Global retailers</a><a href="#wl-real-products">Real brand photos</a></nav></header><main><p class="hc-workshop-edition">Photo reference edition · 4 November 2026 · real national-brand photographs first. Laundry sorter: A1 Blender visualization; other concepts remain A0 schematic studies.</p><p id="workshop-page-load-note" hidden>Interactive controls could not load. Product photographs and the saved proposal remain below. Reload to retry.</p><noscript><p>Photographs and the proposal are available below. Enable JavaScript for concept selection, pricing controls and 3D rotation.</p><nav>${library.concepts.map(c=>`<a href="${workshopPath(c.id)}">${e(c.code+' '+c.name)}</a>`).join(' · ')}</nav></noscript><div id="workshop-page-root" class="hc-upgrade-panel" data-concept="${e(p.id)}">${app}</div></main><footer>Brand photos are sourced product references. Rendered concepts are development visualizations; engineering targets, costs and performance remain unvalidated. <a href="/home-care/">Return to Homecare</a></footer><script type="module" src="/home-care/ui-assets/${manifest.workshopEntry}"></script></body></html>`;
   await writeFile(path.join(folder,p.id+'.html'),html);
  }
  await writeFile(path.join(site,'workshop.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${workshopPath(library.defaultConcept)}"><title>Homecare White Label Workshop</title></head><body><a href="${workshopPath(library.defaultConcept)}">Open the workshop with real brand photographs</a></body></html>`);
 }finally{await rm(temp,{force:true});}
}
