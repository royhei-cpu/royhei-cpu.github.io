import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
export function addHomecareUpgrade(html,siteDir){
 if(html.includes('id="homecare-upgrade-loader"'))return html;
 const manifest=JSON.parse(fs.readFileSync(path.join(siteDir,'ui-assets/manifest.json'),'utf8'));
 const version=crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex').slice(0,12);
 assert.ok(html.includes('<nav class="view-nav"'),'Catalog navigation anchor changed');
 html=html.replace('<title>Home Care market catalog</title>','<title>Homecare | Catalog, global retailers & White Label Workshop</title><meta name="application-name" content="Homecare"><meta property="og:site_name" content="Homecare"><meta property="og:title" content="Homecare | Global home-care research">');
 html=html.replace('<h1>Home Care market catalog</h1>','<h1>Homecare</h1>');
 html=html.replace('</head>','<link rel="stylesheet" href="/home-care/ui-assets/'+manifest.stylesheet+'">\n</head>');
 html=html.replace(/(<nav class="view-nav"[^>]*>)([\s\S]*?)(<\/nav>)/,(_,open,inside,close)=>{
  const opp=inside.match(/<button\b[^>]*id="nav-opportunities"[\s\S]*?<\/button>/)?.[0];assert.ok(opp,'Opportunity navigation anchor changed');
  return open+inside.replace(opp,'')+'<button id="nav-global" type="button" aria-pressed="false">Global retailers & items</button><button id="nav-workshop" type="button" aria-pressed="false">White Label Workshop</button>'+opp+close;
 });
 const intro='<section class="hc-homecare-intro" id="homecare-latest" aria-label="Homecare workspace introduction"><div><p class="eyebrow">HOMECARE · GLOBAL PRODUCT RESEARCH</p><h2>Explore the market. Develop what comes next.</h2><p>Browse the U.S. catalog, find international listings—including China—and develop products in the White Label Workshop.</p><p class="hc-homecare-release">New workspace · 36 development concepts · 50 brand references · 3D models, dimensions, BOM and pricing scenarios. Concepts and costs are proposals, not production approvals or verified Target gaps.</p></div><div class="hc-homecare-actions"><a href="/home-care/?view=global#homecare-workspace" data-homecare-open="global">Browse global listings ↗</a><a href="/home-care/workshop/laundry-sorter.html#wl-real-products" data-homecare-open="workshop">White Label Workshop ↗</a><a href="/home-care/?view=global&country=China#homecare-workspace" data-homecare-open="global" data-homecare-country="China">See China listings ↗</a><a href="#category-directory">Browse U.S. categories ↓</a></div></section>';
 html=html.replace('<section id="catalog-view">','<section id="catalog-view">'+intro);
 // Keep foreign source currencies explicit in the original selected-only export.
 html=html.replace("const fields=['", "const fields=['market','referenceCurrency','sourceScope','");
 html=html.replace('const headers={', "const headers={market:'Country / market',referenceCurrency:'Reference currency',sourceScope:'Source scope',");
 const loader=`<script type="module" id="homecare-upgrade-loader">import {mount} from '/home-care/ui-assets/${manifest.entry}';let references=[],referencesError='';try{const response=await fetch('/home-care/global-reference-products.json?v=${version}');if(!response.ok)throw Error('Source library unavailable');references=await response.json();}catch(error){referencesError='International references could not load. The U.S. catalog is available; reload to retry international listings.';const note=document.createElement('p');note.setAttribute('role','status');note.textContent='International source references could not load. The U.S. catalog is available; reload to retry international listings.';document.getElementById('homecare-latest')?.append(note);}mount({items:ITEMS,byId,cached,picks,redraw:draw,references,referencesError});</script>`;
 html=html.replace('</body>',loader+'\n</body>');
 return html;
}
