(function(global){
'use strict';
// Model evidence is kept separate from a new concept's proposed feature.
const modules=[
 ['deep','Deep-well access','Access','opening','1:9|flat.top|top.open|side.open','visual','A shallow opening lid leaves one deep packing well.','Compare packing access in a narrow hotel room; capacity is not assumed to increase.','Deep body and shallow lid shown; seals, hinge loads and packing volume require prototypes.'],
 ['front','Front / laptop access','Access','opening','front|dual','base','Reach essentials without unpacking the case.','Validate device clearance and the space taken from the main compartment.','Front panel shown; hinge, laptop fit and standing access require prototypes.'],
 ['laptop','Laptop compartment','Organization','laptop','.','base','Separate tech from the main packing area.','Test padded sleeve fit and protection using the intended devices.','Front-access panel and inner document sleeve shown; exact device fit is untested.'],
 ['zipperless','Zipperless frame','Access','opening','zipperless|zip.free|latch','visual','A frame and latches replace the main zipper.','Adds hardware and mass; validate frame alignment and closure cycling.','Frame and two latch placements shown; latch action is not simulated.'],
 ['expansion','Expandable gusset','Access','expansion','.','visual','Add flexible packing depth when needed.','Compare expanded dimensions, seam strength and closure force.','A perimeter gusset is visualized; dimensions remain design targets.'],
 ['cup','Fold-out cup holder','Convenience','cup','.','visual','Free a hand while waiting at the gate.','Check cup retention, tipping and stowed clearance.','Ring, support arm and mounting plate shown; linkage is conceptual.'],
 ['phone','Phone stand','Convenience','phone','.','visual','Support a phone while waiting.','Check phone thickness, viewing angle and stability.','A cradle is mounted on the trolley grip; device and hinge fit are untested.'],
 ['hook','Bag hook','Convenience','hook','.','visual','Hang a small bag within reach.','Check snagging, load path and suitcase tipping.','A side hook placement is shown; no load rating is claimed.'],
 ['usb','USB / removable-power provision','Convenience','charging','.','visual','Route power access through a protected port.','Specify a removable power source, cable routing and destination requirements.','Port and cover placement only; no powered electronics or battery is modeled.'],
 ['wide','Wide trolley handle','Mobility','handle','wide','visual','Spread the grip across the case.','Validate wrist comfort, racking, weight and lost packing volume.','Tubes and grip widen; load and lock tests remain required.'],
 ['bottom','Bottom lifting grip','Mobility','handle','bottom','visual','Give a second hand a secure lifting point.','Check loaded lifting, hand clearance and shell reinforcement.','Recessed bottom-grip placement shown.'],
 ['brake','Wheel stopper','Mobility','brake','stop|brake|lock','visual','Keep the case from rolling during transit stops.','Check release force, slope hold and accidental activation.','Rear control and caster brake tabs shown; braking is not simulated.'],
 ['repair','Replaceable wheels','Mobility','repair','.','base','Replace a worn assembly instead of the case.','Confirm tool access, spare parts, fastening and service instructions.','Existing wheel service markers and separated assemblies show intent.'],
 ['selfalign','Self-aligning wheels','Mobility','wheels','self.align|MagnaTrac','brief','Help wheels return to the direction of travel.','Compare measured rolling force and steering; mechanism needs engineering.','Research brief only; no magnetic mechanism is modeled.'],
 ['flatfloor','Flat packing floor','Organization','handle','Outsider|external|flat packing','brief','Reduce trolley ridges under clothing.','Review external rail protection and capacity trade-offs.','Research brief only; the base rear trolley is retained.'],
 ['wet','Wet / dry pocket','Organization','wet','.','base','Separate damp items from dry packing.','Test seams, material and cleaning; do not infer waterproofing.','Separate pouch shown in the front organizer.'],
 ['divider','Removable divider','Organization','organization','removable divider|zippered divider|interior divider','base','Change the packing layout or lift the divider out.','Validate attachment, wash care and access to both packing zones.','Zippered divider is shown; use Lift organizers to inspect underneath.'],
 ['mesh','Mesh & small-item pockets','Organization','organization','mesh|small.item|pocket','visual','Keep small items visible and separated.','Check snagging, aperture size and pocket access when fully packed.','Extra mesh pocket divisions shown; textile details are illustrative.'],
 ['compression','Compression packing','Organization','compression','.','base','Hold packed clothes with an adjustable panel.','Compare closure force and clothing movement; no capacity gain is assumed.','Compression panel, webbing and buckles shown; proprietary systems are not copied.'],
 ['laundry','Laundry pouch','Organization','organization','laundry','visual','Keep used clothes separate.','Test capacity, cleaning and dry/wet separation.','A removable fabric pouch is shown in the packing well.'],
 ['shelves','Hanging packing shelves','Organization','organization','shelv|hanging closet','visual','Move packed clothing into a closet organizer.','Validate shelf suspension, compression and lost volume.','Three folded shelf layers shown inside; deployed suspension needs engineering.'],
 ['tracker','Tracker pocket','Convenience','tracking','pocket|holder','visual','Give a separately supplied tracker a dedicated place.','Check retention, accessibility and signal performance.','Pocket placement only; no tracker or location service is included.'],
 ['smarttracking','Integrated tracking module','Convenience','tracking','CaseSafe|integrated|Find My','brief','Explore a built-in location module rather than a pocket for a separate tracker.','Quote the electronics, antenna, battery, pairing, privacy, certification and service access.','Brief and BOM only; no electronics, connectivity or location tracking are simulated.'],
 ['liner','Removable / washable lining','Organization','liner','.','brief','Make interior care and replacement easier.','Validate removable fasteners, wash cycles and dimensional stability.','Research brief only; sewn liners remain in the base model.'],
 ['fold','Foldable storage','Structure','folding','.','brief','Reduce the case footprint between trips.','Requires a different shell architecture and fold-cycle testing.','Research brief only; this rigid-shell concept does not fold.'],
 ['seat','Child ride-on / seat','Structure','seat','.','brief','Add a child travel use case.','Requires a dedicated structural platform, stability, load and age testing.','Research brief only; the adult case is not a child seat.'],
 ['motor','Powered mobility','Structure','motor','.','brief','Explore assisted movement.','Requires a separate drive, braking, battery and travel-compliance development program.','Research brief only; no motor or rideable case is represented.'],
 ['scale','Weight indication','Convenience','scale','.','visual','Provide a packing-weight cue.','Distinguish threshold indicators from calibrated scales; validate accuracy.','Indicator-window placement shown; no calibrated measurement is simulated.']
].map(([id,label,category,field,pattern,mode,benefit,tradeoff,visual])=>({id,label,category,field,pattern,mode,benefit,tradeoff,visual}));
const byId=new Map(modules.map(m=>[m.id,m]));
function matches(r,m){const text=r.features?.[m.field]?.value||'';return !!text&&!/not (?:stated|verified|documented|captured)|unknown|^no\b/i.test(text)&&new RegExp(m.pattern,'i').test(text);}
function forRecord(r){return modules.filter(m=>matches(r,m));}
function records(data,id){const m=byId.get(id);return m?data.records.filter(r=>matches(r,m)):[];}
function sanitize(v){return [...new Set(Array.isArray(v)?v:[])].filter(id=>byId.has(id));}
function apply(value,ids,on=true){const c={...value,addons:sanitize(value.addons)};const chosen=new Set(c.addons);for(const id of sanitize(ids)){on?chosen.add(id):chosen.delete(id);if(!on&&['compression','divider'].includes(id))c.interior='open';
 if(id==='front'||id==='laptop')c.frontAccess=on;if(id==='wet')c.wetPocket=on;if(id==='repair')c.repairable=on;
 if(on&&id==='compression'){c.interior='compression';chosen.delete('divider');chosen.delete('shelves');}
 if(on&&id==='divider'){c.interior='divider';chosen.delete('compression');chosen.delete('shelves');}
 if(on&&id==='shelves'){c.interior='divider';chosen.delete('compression');chosen.delete('divider');}
 if(on&&id==='zipperless')chosen.delete('expansion');if(on&&id==='expansion')chosen.delete('zipperless');
 if(on&&id==='deep'){c.frontAccess=false;chosen.delete('front');chosen.delete('laptop');}
 if(on&&(id==='front'||id==='laptop'))chosen.delete('deep');
 }c.addons=[...chosen];return c;}
function selected(c,m){return m.id==='front'||m.id==='laptop'?c.frontAccess:m.id==='repair'?c.repairable:m.id==='wet'?c.wetPocket:m.id==='compression'?c.interior==='compression':m.id==='divider'?c.interior==='divider'&&!c.addons?.includes('shelves'):c.addons?.includes(m.id)||false;}
function report(c,data){return modules.filter(m=>selected(c,m)).map(m=>({...m,sources:records(data,m.id).map(r=>({id:r.id,brand:r.brand,model:r.model,url:r.source,checked:r.checked,scope:r.scope})),estimatedUnitCost:null}));}
function url(r,id){return 'studio.html?inspire='+encodeURIComponent(r.id)+(id?'&feature='+encodeURIComponent(id):'')+'#feature-library';}
global.AtlasInspiration=Object.freeze({modules,byId,forRecord,records,sanitize,apply,selected,report,url});
})(typeof window!=='undefined'?window:globalThis);
