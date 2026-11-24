import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createTargetFilter} from './target-exclusion-model.mjs';
export function addTargetExclusions(html,dir){
 const evidence=JSON.parse(fs.readFileSync(path.join(dir,'target-assortment-exclusions.json'),'utf8'));
 const bootstrap='<script>window.HCTargetExclusions=('+createTargetFilter.toString()+')('+JSON.stringify(evidence).replaceAll('<','\\u003c')+');</script>';
 html=html.replace('</head>',bootstrap+'</head>');
 const marker='const ITEMS=',start=html.indexOf(marker),end=html.indexOf(';\nconst COVERAGE=',start);
 assert.ok(start>=0&&end>start,'Merged catalog marker changed');
 const expression=html.slice(start+marker.length,end);
 html=html.slice(0,start)+'const CANONICAL_ITEMS='+expression+';\nconst ITEMS=CANONICAL_ITEMS.filter(window.HCTargetExclusions.isEligible)'+html.slice(end);
 // All native browse, recommendation, compare and export paths share this eligible byId.
 // International references must pass the same rule before registration/reload recovery.
 html=html.replace('references=await response.json();','references=(await response.json()).filter(window.HCTargetExclusions.isEligible);');
 const note='<p id="target-assortment-note" style="font-size:13px;color:#536349">Strict Target overlap filter: known Target brands and all unreviewed products are hidden from results, recommendations, comparisons and exports. Only reviewed competitor-exclusive references are shown. Original records and photos are preserved.</p>';
 html=html.replace('<section id="catalog-view">','<section id="catalog-view">'+note);
 html=html.replace(/(<h1>U.S. products<\/h1><p>[\d,]+) records/, '$1 retained records');
 return html;
}
