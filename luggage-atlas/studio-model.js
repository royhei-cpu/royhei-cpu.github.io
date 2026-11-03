// Shared by the WebGL studio and model-file tests; no network or browser dependency.
export function captureModelDefaults(model){const defaults=new Map();for(const name of ['FrontShell','CompressionPanel','PackingCubes','Wheels']){const obj=model.getObjectByName(name);if(obj)defaults.set(name,{position:obj.position.clone(),quaternion:obj.quaternion.clone()});}return defaults;}
export function applyStudioModel(model,settings,view,defaults){
 const [height,width,depth]=settings.dimensions;model.scale.set(width/36,height/55,depth/23);
 model.traverse(o=>{if(o.isMesh){for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.name==='Shell')m.color.set(settings.shellColor);if(m.name==='Trim')m.color.set(settings.trimColor);}}});
 for(const [name,on] of Object.entries({FrontAccess:settings.frontAccess,RepairMarkers:settings.repairable,CompressionPanel:settings.interior==='compression',PackingCubes:settings.interior==='cubes',Divider:settings.interior==='divider',WetPocket:settings.wetPocket})){const obj=model.getObjectByName(name);if(obj)obj.visible=on;}
 for(const [name,base] of defaults){const obj=model.getObjectByName(name);obj.position.copy(base.position);obj.quaternion.copy(base.quaternion);}
 const front=model.getObjectByName('FrontShell');if(front&&view==='inside')front.rotateY(-112*Math.PI/180);
 if(view==='exploded'){if(front)front.position.x-=.24;for(const name of ['CompressionPanel','PackingCubes']){const obj=model.getObjectByName(name);if(obj)obj.position.z+=.24;}const wheels=model.getObjectByName('Wheels');if(wheels)wheels.position.y-=.055;}
 model.updateMatrixWorld(true);
}
