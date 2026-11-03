"""Rebuild the original Open Story development concept with Blender 5.2.
Usage: blender --background --python build_open_story.py -- --output DIR [--config concept.json]
The model is a design study, not an existing product scan or manufacturing CAD.
"""
import bpy, math, json, sys, argparse
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p=argparse.ArgumentParser();p.add_argument('--output',default=str(Path(__file__).resolve().parents[1]/'models'));p.add_argument('--config');a=p.parse_args(args)
out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
config=json.loads(Path(a.config).read_text()) if a.config else {}
config=config.get('configuration',config)
fmt=config.get('format','cabin'); dims={'cabin':(.36,.23,.55),'medium':(.45,.29,.68),'trunk':(.45,.34,.75)}
w,depth,height=dims.get(fmt,dims['cabin']); bottom=.07;top=height-.025;bh=top-bottom;zc=(top+bottom)/2
colors={'sage':'#94a28a','sand':'#d3c4ac','ink':'#243a51','clay':'#b88577','silver':'#acb2af'}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,rough=.4,metal=0):
 c=color.lstrip('#');rgb=tuple(((int(c[i:i+2],16)/255+.055)/1.055)**2.4 if int(c[i:i+2],16)/255>.04045 else int(c[i:i+2],16)/255/12.92 for i in (0,2,4));m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal;return m
shell=mat('Shell',colors.get(config.get('color','sage'),colors['sage']),.31,.08);trim=mat('Trim','#183e34' if config.get('trim','forest')=='forest' else '#343837',.38,.12);rubber=mat('Rubber','#242927',.72);metal=mat('Hardware','#8a9390',.24,.8);lining=mat('Lining','#dbd4c2',.9);mesh=mat('InteriorMesh','#a9b4a2',.85);white=mat('Marking','#f6f4e9',.6)
def group(name,parent=None,loc=(0,0,0)):
 ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);ob.location=loc;ob.parent=parent;return ob
root=group('OpenStoryConcept');root['scope']='Original development concept; not verified production specifications';root['nominal_dimensions_cm']=json.dumps([height*100,w*100,depth*100]);root['config']=json.dumps(config)
body=group('BackBody',root);front=group('FrontShell',root,(-w/2,0,zc));wheels=group('Wheels',root);repair=group('RepairMarkers',root);handle=group('Handle',root)
def box(name,loc,size,material,parent=body,bevel=.009):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  m=o.modifiers.new('Soft engineered edges','BEVEL');m.width=min(bevel,min(size)*.48);m.segments=4
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
 for f in o.data.polygons:f.use_smooth=True
 o.data.materials.append(material);o.parent=parent
 if parent==front:o.location-=front.location
 return o
def tube(name,points,r,material,parent=body):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=2;c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('POLY');s.points.add(len(points)-1)
 for pt,co in zip(s.points,points):pt.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(material)
 if parent==front:o.location=-front.location
 return o
def frame(name,y,hwidth,hheight,z,radius,material,parent):
 pts=[]
 for cx,cz,start in [(hwidth-radius,z+hheight-radius,0),(-hwidth+radius,z+hheight-radius,90),(-hwidth+radius,z-hheight+radius,180),(hwidth-radius,z-hheight+radius,270)]:
  for j in range(9):
   ang=math.radians(start+j*90/8);pts.append((cx+radius*math.cos(ang),y,cz+radius*math.sin(ang)))
 pts.append(pts[0]);return tube(name,pts,.0035,material,parent)
# Two hollow halves: outer back panels and rounded rails leave real interior volume.
for parent,sgn,label in [(body,1,'Back'),(front,-1,'Front')]:
 y=sgn*(depth/2-.008);box(label+'ShellFace',(0,y,zc),(w-.014,.014,bh-.014),shell,parent,.018)
 box(label+'Liner',(0,y-sgn*.012,zc),(w-.032,.006,bh-.032),lining,parent,.016)
 for x in [-w/2+.008,w/2-.008]:box(label+'SideWall',(x,sgn*depth/4,zc),(.015,depth/2-.014,bh-.012),shell,parent,.007)
 for z in [bottom+.009,top-.009]:box(label+'EndWall',(0,sgn*depth/4,z),(w-.014,depth/2-.014,.017),shell,parent,.008)
 frame(label+'Closure',sgn*.002,w/2-.006,bh/2-.006,zc,.023,trim,parent)
# Horizontal protective ribs. Front-access hatch has its own identity and can be switched off.
for i in range(10):
 z=bottom+.06+i*(bh-.12)/9;box('ShellRib_%02d'%i,(0,-depth/2-.003,z),(w-.065,.006,.008),shell,front,.003)
access=group('FrontAccess',front);access.location=-front.location
box('QuickAccessPanel',(0,-depth/2-.012,zc), (w-.045,.011,bh-.065),shell,access,.02)
frame('AccessZip',-depth/2-.02,w/2-.027,(bh-.07)/2,zc,.021,trim,access)
for i in range(8):box('AccessRib_%02d'%i,(0,-depth/2-.02,bottom+.075+i*(bh-.15)/7),(w-.083,.006,.006),shell,access,.002)
box('AccessPull',(w/2-.038,-depth/2-.027,top-.075),(.009,.009,.038),metal,access,.003)
# Paired caster wheels with hubs, forks and accessible fastener markers.
for x in [-w/2+.031,w/2-.031]:
 for y in [-depth/2+.033,depth/2-.033]:
  box('CasterFork',(x,y,.062),(.026,.034,.03),trim,wheels,.008)
  for off in [-.014,.014]:
   bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.026,depth=.012,location=(x+off,y,.028),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='TwinSpinnerWheel';o.data.materials.append(rubber);o.parent=wheels
   for f in o.data.polygons:f.use_smooth=True
   bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.012,depth=.013,location=(x+off,y,.028),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='WheelHub';o.data.materials.append(metal);o.parent=wheels
  box('ServiceFastener',(x,y,.079),(.012,.018,.004),metal,repair,.002)
# Extended trolley and carry handles. Nominal case dimensions exclude extended handle.
for x in [-w*.25,w*.25]:box('TrolleyTube',(x,depth/2-.022,top+.085),(.009,.012,.23),metal,handle,.004)
box('TrolleyGrip',(0,depth/2-.022,top+.205),(w*.6,.027,.026),trim,handle,.012)
box('TopCarryHandle',(0,0,top+.007),(w*.34,.027,.018),trim,body,.008)
box('SideCarryHandle',(w/2+.005,.02,zc),(.02,.028,bh*.23),trim,body,.009)
# Internal organization systems are independent named groups for browser configuration.
compression=group('CompressionPanel',root);cubes=group('PackingCubes',root);divider=group('Divider',front);divider.location=-front.location;wet=group('WetPocket',front);wet.location=-front.location
box('FloatingCompression',(0,.02,zc),(w-.052,.008,bh-.08),mesh,compression,.018)
for x in [-w*.26,w*.26]:box('CompressionWebbing',(x,.012,zc),(.018,.006,bh-.065),trim,compression,.003)
box('CompressionBuckle',(0,.006,zc),(.043,.012,.027),trim,compression,.005)
for ix in [-1,1]:
 for iz in [-1,1]:
  cx=ix*w*.22;cz=zc+iz*bh*.22;box('RemovablePackingCube',(cx,.035,cz),(w*.39,depth*.45,bh*.39),mesh,cubes,.018);box('CubePull',(cx,.035-depth*.23-.005,cz+bh*.16),(.026,.006,.005),trim,cubes,.002)
box('ZipDividerPanel',(0,-depth/2+.027,zc),(w-.05,.009,bh-.07),mesh,divider,.018)
frame('DividerZip',-depth/2+.02,w/2-.027,(bh-.075)/2,zc,.02,trim,divider)
# Pocket remains a design feature, not a claim of waterproof construction.
box('WetPocketBody',(0,-depth/2+.04,zc+.09),(w*.64,.013,bh*.22),lining,wet,.01)
box('WetPocketZip',(0,-depth/2+.03,zc+.09+bh*.085),(w*.57,.006,.004),trim,wet,.001)
# A narrow laptop sleeve inside the front shell.
box('LaptopSleeve',(0,-depth/2+.03,zc-.06),(w*.69,.012,bh*.42),lining,front,.01)
box('SleeveBinding',(0,-depth/2+.022,zc-.06+bh*.19),(w*.7,.006,.009),trim,front,.002)
# Subtle original concept mark, mesh converted for GLB.
bpy.ops.object.text_add(location=(0,-depth/2-.029,top-.052),rotation=(math.pi/2,0,0));mark=bpy.context.object;mark.name='ConceptMark';mark.data.body='OPEN STORY';mark.data.align_x='CENTER';mark.data.size=.011;mark.data.extrude=.0001;mark.data.materials.append(trim);bpy.ops.object.convert(target='MESH');mark.parent=front;mark.location-=front.location
access.hide_render=not config.get('frontAccess',True);access.hide_viewport=access.hide_render
interior=config.get('interior','compression')
for g,on in [(compression,interior=='compression'),(cubes,interior=='cubes'),(divider,interior=='divider'),(wet,config.get('wetPocket',True)),(repair,config.get('repairable',True))]:
 for ob in [g,*g.children_recursive]:ob.hide_render=not on;ob.hide_viewport=not on
# Environment and photographic cameras are retained in the editable .blend only.
floor=mat('StudioFloor','#f8f7f2',.9);box('StudioFloor',(0,0,-.007),(200,200,.01),floor,None,.001)
world=bpy.context.scene.world;world.color=(.8,.8,.8);world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.8,.8,1);world.node_tree.nodes['Background'].inputs[1].default_value=.25
for name,loc,power,size in [('Key',(-1,-2,3),180,2),('Fill',(2,-1,1.8),90,1.8),('Rim',(0,2,2),130,1.5)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,zc))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.1,-1.6,1.0));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,height*.7))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=height*2.0;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1280;scene.render.resolution_y=1120;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.render.film_transparent=False
# Include every optional component in GLB; UI controls their visibility after loading.
for ob in [root,*root.children_recursive]:ob.hide_viewport=False;ob.hide_render=False
bpy.ops.object.select_all(action='DESELECT')
for ob in [root,*root.children_recursive]:ob.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(out/'open-story-concept.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False)
for g,on in [(access,config.get('frontAccess',True)),(compression,interior=='compression'),(cubes,interior=='cubes'),(divider,interior=='divider'),(wet,config.get('wetPocket',True)),(repair,config.get('repairable',True))]:
 for ob in [g,*g.children_recursive]:ob.hide_render=not on;ob.hide_viewport=not on
bpy.ops.wm.save_as_mainfile(filepath=str(out/'open-story-concept.blend'))
scene.render.filepath=str(out/'open-story-exterior.png');bpy.ops.render.render(write_still=True)
front.rotation_euler.z=math.radians(-112)
cam.location=(.85,-1.9,1.1);cam.rotation_euler=(Vector((-.06,0,height*.65))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=height*2.3
scene.render.filepath=str(out/'open-story-interior.png');bpy.ops.render.render(write_still=True)
(out/'model-manifest.json').write_text(json.dumps({'blender':bpy.app.version_string,'scope':'Original Open Story development concept; not existing-product photography, production CAD, performance certification or a measured product','caseDimensionsCm':[height*100,w*100,depth*100],'configuration':config,'groups':['FrontShell','FrontAccess','CompressionPanel','PackingCubes','Divider','WetPocket','RepairMarkers','Wheels','Handle'],'renderViews':['exterior','interior']},indent=2)+'\n')
print('MODEL_COMPLETE',out)
