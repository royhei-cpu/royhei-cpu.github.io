import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {decoratePage,homeStart} from './navigation-build.mjs';
export function addHomecareUpgrade(html,siteDir){
 if(html.includes('id="homecare-upgrade-loader"'))return html;
 const manifest=JSON.parse(fs.readFileSync(path.join(siteDir,'ui-assets/manifest.json'),'utf8'));
 const version=crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex').slice(0,12);
 assert.ok(html.includes('<nav class="view-nav"'),'Catalog navigation anchor changed');
 html=html.replace('<title>Home Care market catalog</title>','<title>Homecare | Catalog, global retailers & White Label Workshop</title><meta name="application-name" content="Homecare"><meta property="og:site_name" content="Homecare"><meta property="og:title" content="Homecare | Global home-care research">');
 html=html.replace('<h1>Home Care market catalog</h1>','<h1>U.S. products</h1>').replace('<header>','<header class="hc-catalog-header">');
 html=html.replace('<body>','<body data-homecare-view="home"><script>var hcRequestedView=new URLSearchParams(location.search).get("view");document.body.dataset.homecareView=hcRequestedView==="retailers"?"global":["home","catalog","global","analysis","target","compare","opportunities","workshop"].includes(hcRequestedView)?hcRequestedView:(location.hash==="#category-directory"?"catalog":"home");</script>');
 html=decoratePage(html,siteDir,'home');
 html=html.replace('</head>','<link rel="stylesheet" href="/home-care/ui-assets/'+manifest.stylesheet+'">\n</head>');
 html=html.replace(/(<nav class="view-nav"[^>]*>)([\s\S]*?)(<\/nav>)/,(_,open,inside,close)=>{
  const opp=inside.match(/<button\b[^>]*id="nav-opportunities"[\s\S]*?<\/button>/)?.[0];assert.ok(opp,'Opportunity navigation anchor changed');
  return open.replace('>',' hidden aria-hidden="true">')+inside.replace(opp,'')+'<button id="nav-global" type="button" aria-pressed="false">Global retailers & items</button><button id="nav-workshop" type="button" aria-pressed="false">White Label Workshop</button>'+opp+close+'<p id="hc-location" class="hc-breadcrumb" hidden><a href="/home-care/" data-homecare-view="home">Home</a> / <span></span></p>'+homeStart()+'<noscript><style>body[data-homecare-view=home] #catalog-view{display:block!important}</style><p>Enable JavaScript for all filters and comparisons. A product preview is available below.</p></noscript>';
 });
 const intro='<p class="hc-context-intro" id="homecare-latest">Browse U.S. products by category and retailer. Use <a href="/home-care/?view=global#homecare-workspace" data-homecare-view="global">Global retailers &amp; items</a> for other countries. Select products to compare, or export your shortlist to Excel.</p>';
 html=html.replace('<section id="catalog-view">','<section id="catalog-view">'+intro);
 // Keep foreign source currencies explicit in the original selected-only export.
 const exportFields = 'const fields=[';
 assert.equal(html.split(exportFields).length,2,'Selected CSV field list changed');
 html=html.replace(exportFields,exportFields+"'market','referenceCurrency','sourceScope',");
 html=html.replace('const headers={', "const headers={market:'Country / market',referenceCurrency:'Reference currency',sourceScope:'Source scope',");
 const loader=`<script type="module" id="homecare-upgrade-loader">import {mount} from '/home-care/ui-assets/${manifest.entry}';let references=[],referencesError='';try{const response=await fetch('/home-care/global-reference-products.json?v=${version}');if(!response.ok)throw Error('Source library unavailable');references=await response.json();}catch(error){referencesError='International references could not load. The U.S. catalog is available; reload to retry international listings.';const note=document.createElement('p');note.setAttribute('role','status');note.textContent='International source references could not load. The U.S. catalog is available; reload to retry international listings.';document.getElementById('homecare-latest')?.append(note);}mount({items:ITEMS,byId,cached,picks,redraw:draw,references,referencesError});</script>`;
 html=html.replace('</body>',loader+'\n</body>');
 return html;
}
