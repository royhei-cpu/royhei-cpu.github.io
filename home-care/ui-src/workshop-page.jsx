import React,{useEffect,useState} from 'react';
import {WhiteLabelWorkshop} from './workshop-ui.jsx';
import {AudioControls} from './audio-ui.jsx';
import {workshopLibrary,workshopPath} from './workshop-logic.js';
export function WorkshopPage({initialConcept=workshopLibrary.defaultConcept}){
 const [concept,setConcept]=useState(initialConcept);
 useEffect(()=>{document.body.dataset.workshopState='interactive';},[]);
 function choose(id){setConcept(id);if(typeof window!=='undefined')history.replaceState(null,'',workshopPath(id)+'#wl-real-products');}
 return <><AudioControls/><WhiteLabelWorkshop catalog={[]} selected={[]} onOpen={()=>{}} onCompare={()=>{}} conceptId={concept} setConceptId={choose}/></>;
}
if(typeof document!=='undefined'){
 const root=document.getElementById('workshop-page-root');
 if(root){const initialConcept=root.dataset.concept;import('react-dom/client').then(({hydrateRoot})=>hydrateRoot(root,<WorkshopPage initialConcept={initialConcept}/>)).catch(()=>{document.getElementById('workshop-page-load-note').hidden=false;});}
}
