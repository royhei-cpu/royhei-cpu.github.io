"""Build the A1 visualization of HA-13. Blender 5.2; no photographed product claim.
Existing A0 dimensions/BOM are retained as unvalidated design intent.
Run: Blender -b --python build_laundry_sorter.py -- --output DIR --samples 48
"""
import bpy, math, json, sys, argparse, zipfile, hashlib
from pathlib import Path
from mathutils import Vector
ap=argparse.ArgumentParser();ap.add_argument('--output',required=True);ap.add_argument('--samples',type=int,default=48);ap.add_argument('--views',default='studio,front,inside,detail,exploded');args=ap.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;bpy.context.preferences.filepaths.save_version=0;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1

def linear(h):
 s=[int(h.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in s)
def material(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*linear(color),1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=m.diffuse_color;bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal;return m
def texture(m,name,cloth=False):
 # Packed normal and base-color images survive GLB export; no procedural-only material.
 n=256;normal=bpy.data.images.new(name+' micro normal',width=n,height=n);normal.colorspace_settings.name='Non-Color';pix=[];color=[]
 rgb=[12.92*c if c<=.0031308 else 1.055*c**(1/2.4)-.055 for c in m.diffuse_color[:3]]
 for y in range(n):
  for x in range(n):
   a=math.sin(x*math.pi/4);b=math.sin(y*math.pi/4);cross=math.cos((x+y)*math.pi/8)
   nx=(.085*a*(.75+.25*cross) if cloth else .018*math.sin(x*2.13+y*1.41));ny=(.085*b*(.75-.25*cross) if cloth else .018*math.cos(y*1.97-x*.79));pix.extend((.5+nx,.5+ny,.99,1))
   v=.04*a*b+.018*math.sin(x*.41+y*.37)+.014*math.sin(x*.09-y*.05);color.extend((*[max(0,min(1,c*(1+v))) for c in rgb],1))
 normal.pixels.foreach_set(pix);normal.update();normal.pack();nt=m.node_tree.nodes.new('ShaderNodeTexImage');nt.image=normal;nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.4 if cloth else .18;m.node_tree.links.new(nt.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],m.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
 if cloth:
  image=bpy.data.images.new(name+' woven color',width=n,height=n);image.colorspace_settings.name='sRGB';image.pixels.foreach_set(color);image.update();image.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);m.node_tree.nodes.get('Principled BSDF').inputs['Sheen Weight'].default_value=.16
frameMat=material('HA_body_PP_frame','#93a183',.43);texture(frameMat,'Fine molded PP')
canvasMat=material('Canvas natural warm flax','#c5c0b0',.91);texture(canvasMat,'350gsm canvas visual reference',True)
webMat=material('Woven natural webbing','#aaa58f',.9);texture(webMat,'Webbing',True)
thread=material('Polyester thread','#e2ddcd',.93);labelMat=material('Woven label patch','#e8e3d4',.9);ink=material('Label dark ink','#333e36',.9);rubber=material('TPE feet','#363d36',.82);steel=material('Stainless fasteners','#9b9e99',.26,.9);texture(labelMat,'Woven task patch',True)

def group(name,offset=(0,0,0),kind='assembly'):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o['assemblyLabel']=name;o['assemblyId']=name.lower().replace(' ','-');o['explodeOffset']=list(offset);o['viewRole']=kind;o['assemblyOrder']={'Molded frame and feet':0,'Left removable bag':1,'Right removable bag':2,'Lift-off split lid':3}[name];return o
frame=group('Molded frame and feet');left=group('Left removable bag',(-.33,.20,0));right=group('Right removable bag',(.33,.20,0));lid=group('Lift-off split lid',(0,.40,-.04),'lid');assemblies=[frame,left,right,lid]

def tag(o,parent,code):
 o.parent=parent;o['partCode']=code;o['designStatus']='A1 visualization; A0 engineering targets unvalidated';return o
def uv_world(o,factor=35):
 if o.type!='MESH':return
 layer=o.data.uv_layers.new(name='MaterialUV')
 for poly in o.data.polygons:
  for idx in poly.loop_indices:
   v=o.data.vertices[o.data.loops[idx].vertex_index].co;layer.data[idx].uv=((v.x+v.y*.45)*factor,(v.z+v.y*.45)*factor)
def box(name,loc,size,mat,parent,code,bevel=.003):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Molded edge radius','BEVEL');mod.width=min(bevel,min(size)*.42);mod.segments=5;mod.harden_normals=True;bpy.ops.object.modifier_apply(modifier=mod.name);mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.data.materials.append(mat);uv_world(o);return tag(o,parent,code)
def curve(name,points,r,mat,parent,code,closed=False):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;c.resolution_u=1;s=c.splines.new('POLY');s.points.add(len(points)-1);s.use_cyclic_u=closed
 for a,b in zip(s.points,points):a.co=(*b,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat);tag(o,parent,code);return o

def mesh(name,vertices,faces,mat,parent,code,uv=None):
 m=bpy.data.meshes.new(name);m.from_pydata(vertices,[],faces);m.update();m.materials.append(mat);o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);tag(o,parent,code)
 for p in m.polygons:p.use_smooth=True
 if uv:
  layer=m.uv_layers.new(name='CanvasUV')
  for p in m.polygons:
   for i in p.loop_indices:layer.data[i].uv=uv[m.loops[i].vertex_index]
 else:uv_world(o)
 return o
# Molded PP frame: radiused uprights, a shallow ventilated base and cross rails.
for x in [-.2475,.2475]:
 for y in [-.1625,.1625]:
  box('Rounded frame upright',(x,y,.333),(.025,.025,.616),frameMat,frame,'HA-13-01',.004)
  box('Non-slip TPE foot',(x,y,.012),(.026,.026,.024),rubber,frame,'HA-13-05',.006)
for y in [-.1625,.1625]:
 box('Base perimeter rail',(0,y,.036),(.47,.025,.024),frameMat,frame,'HA-13-01',.004)
 box('Upper bag support rail',(0,y,.62),(.47,.025,.018),frameMat,frame,'HA-13-01',.004)
for x in [-.2475,.2475]:
 box('Base side rail',(x,0,.036),(.025,.30,.024),frameMat,frame,'HA-13-01',.004)
 box('Upper side rail',(x,0,.62),(.025,.30,.018),frameMat,frame,'HA-13-01',.004)
for x in [-.18,-.06,.06,.18]:box('Ventilated base support',(x,0,.033),(.018,.29,.012),frameMat,frame,'HA-13-01',.003)
box('Centre bag support',(0,0,.62),(.012,.30,.018),frameMat,frame,'HA-13-01',.003)
for x in [-.2475,.2475]:
 for z in [.07,.58]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1,location=(x,-.177,z));o=bpy.context.object;o.name='Recessed stainless frame fastener';o.scale=(.003,.0009,.003);o.data.materials.append(steel);tag(o,frame,'HA-13-05')

def bag(cx,parent,word,symbol):
 n=128;rings=35;vertices=[];uv=[];faces=[]
 for j in range(rings):
  t=j/(rings-1);z=.055+.56*t
  for i in range(n):
   a=2*math.pi*i/n;p=6.5;xx=math.copysign(abs(math.cos(a))**(2/p),math.cos(a));yy=math.copysign(abs(math.sin(a))**(2/p),math.sin(a));belly=1+.016*math.sin(math.pi*t)-.035*(1-t)**3
   fold=(.0018*math.sin(a*9+t*5)+.0013*math.sin(a*17-t*8))*(.25+.75*math.sin(math.pi*t)**2)
   x=cx+xx*(.113*belly+fold);y=yy*(.150*belly+fold);zz=z+.0018*math.sin(a*4+1)*t**8+.0015*math.sin(a*5)*(1-t)**8
   vertices.append((x,y,zz));uv.append((i/n*1.02*35,t*.56*35))
 for j in range(rings-1):
  for i in range(n):k=j*n+i;kn=j*n+(i+1)%n;faces.append((k,kn,kn+n,k+n))
 faces.append(tuple(reversed(range(n))))
 body=mesh('Shaped canvas bag '+word,vertices,faces,canvasMat,parent,'HA-13-02',uv);mod=body.modifiers.new('Sewn fabric thickness 0.8 mm','SOLIDIFY');mod.thickness=.0008
 # A rolled textile hem, not a thick rigid plastic rim.
 top=vertices[(rings-1)*n:];curve('Rolled top hem '+word,top,.0022,canvasMat,parent,'HA-13-02',True)
 curve('Top seam '+word,[(x,y,z-.009) for x,y,z in top],.00038,thread,parent,'HA-13-02',True)
 for side,index in [(-1,80),(1,112)]:
  pts=[(vertices[j*n+index][0]+side*.00045,vertices[j*n+index][1]-.00045,vertices[j*n+index][2]) for j in range(1,rings-1)]
  curve('Vertical sewn seam '+word,pts,.00065,canvasMat,parent,'HA-13-02');curve('Visible seam stitching '+word,[(x+side*.0012,y-.0004,z) for x,y,z in pts],.00025,thread,parent,'HA-13-02')
 # Four 30 mm carry handles remain attached to the two bags in exploded view.
 for side in [-1,1]:
  pts=[]
  for i in range(49):
   a=math.pi*i/48;pts.append((cx-.055*math.cos(a),side*(.15-.048*math.sin(a)),.565+.054*math.sin(a)))
  verts=[]
  for i,point in enumerate(pts):
   tangent=Vector(pts[min(i+1,48)])-Vector(pts[max(0,i-1)]);normal=Vector((0,1,0));width=tangent.cross(normal).normalized()*.015
   verts.extend([tuple(Vector(point)-width),tuple(Vector(point)+width)])
  faces2=[(i*2,i*2+1,i*2+3,i*2+2) for i in range(48)];o=mesh('Folded woven carry handle '+word,verts,faces2,webMat,parent,'HA-13-03');mod=o.modifiers.new('Webbing thickness','SOLIDIFY');mod.thickness=.001
  for edge in [0,1]:curve('Webbing edge stitching '+word,[verts[i*2+edge] for i in range(49)],.00027,thread,parent,'HA-13-03')
 # Legible text and shape labels remain independent of textile color.
 box('Woven task patch '+word,(cx,-.157,.39),(.068,.0011,.031),labelMat,parent,'HA-13-06',.001)
 corners=[(cx-.031,-.1578,.377),(cx+.031,-.1578,.377),(cx+.031,-.1578,.403),(cx-.031,-.1578,.403)]
 curve('Label edge stitching '+word,corners,.00026,thread,parent,'HA-13-06',True)
 c=bpy.data.curves.new('Task label text','FONT');c.body=word;c.align_x='CENTER';c.align_y='CENTER';c.size=.0085;c.extrude=.00007;o=bpy.data.objects.new('Readable '+word+' label',c);bpy.context.collection.objects.link(o);o.location=(cx+.007,-.1582,.39);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(ink);tag(o,parent,'HA-13-06')
 if symbol=='circle':pts=[(cx-.024+.004*math.cos(a),-.1583,.39+.004*math.sin(a)) for a in [i*2*math.pi/32 for i in range(32)]]
 else:pts=[(cx-.028,-.1583,.386),(cx-.020,-.1583,.386),(cx-.020,-.1583,.394),(cx-.028,-.1583,.394)]
 curve('Task shape '+word,pts,.0005,ink,parent,'HA-13-06',True)
bag(-.1225,left,'LIGHTS','circle');bag(.1225,right,'DARKS','square')
# Lift-off lid assembly: two radiused surfaces and an actual shallow finger grip.
for x in [-.131,.131]:
 panel=box('Radiused split lid',(x,0,.641),(.258,.35,.018),frameMat,lid,'HA-13-04',.005)
 # Grip is recessed into the surface using a shallow Boolean pocket.
 cut=box('Grip tooling pocket',(x,-.115,.652),(.067,.025,.014),frameMat,lid,'HA-13-04',.006)
 bpy.context.view_layer.objects.active=panel;mod=panel.modifiers.new('Recessed lift grip','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
# Convert curves for self-contained, textured GLB delivery.
for o in list(bpy.data.objects):
 if o.type in ['CURVE','FONT']:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);uv_world(o)
for o in list(bpy.data.objects):
 if o.type=='MESH':
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
# Studio stage is excluded from the exported product.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.001));floor=bpy.context.object;floor.name='Studio floor — excluded from GLB';floor.data.materials.append(material('Studio warm neutral','#deded7',.92))
world=bpy.data.worlds.new('Soft studio environment');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(*linear('#e8e9e6'),1);world.node_tree.nodes.get('Background').inputs[1].default_value=.45;scene.world=world

def area(name,loc,power,size,target,color):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=linear(color);o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Large softbox key',(-1.4,-1.6,2.4),240,1.8,(0,0,.3),'#fff4e6');area('Cool fill',(1.4,-.3,1.4),85,1.4,(0,0,.3),'#edf3ff');area('Top edge strip',(.4,1.4,1.9),190,1.2,(0,0,.4),'#ffffff')
camdata=bpy.data.cameras.new('Product camera');camera=bpy.data.objects.new('Product camera',camdata);bpy.context.collection.objects.link(camera);scene.camera=camera;camdata.lens=70
scene.render.engine='CYCLES';scene.cycles.samples=args.samples;scene.cycles.use_denoising=True;scene.cycles.device='CPU';scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=93;scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.65;scene.render.film_transparent=False
product=[o for o in bpy.data.objects if o.type=='MESH' and o!=floor]

def pose(view):
 for o in assemblies:o.location=(0,0,0);o.hide_render=False
 for o in product:o.hide_render=False
 if view=='inside':
  lid.hide_render=True
  for child in lid.children_recursive:child.hide_render=True
 if view=='exploded':
  for o in assemblies:dx,dy,dz=o['explodeOffset'];o.location=(dx,-dz,dy)
 bpy.context.view_layer.update()
 visible=[o for o in product if not o.hide_render]
 coords=[o.matrix_world@Vector(c) for o in visible for c in o.bound_box];center=sum(coords,Vector())/len(coords)
 if view=='detail':
  camdata.type='PERSP';camdata.lens=85;camera.location=(.50,-.85,.66);camera.rotation_euler=(Vector((.035,-.15,.40))-camera.location).to_track_quat('-Z','Y').to_euler();return
 if view=='front':
  camdata.type='ORTHO';camera.location=(0,-3,.33);camera.rotation_euler=(Vector((0,0,.33))-camera.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=.84
 else:
  camdata.type='PERSP';camdata.lens=70;camera.location=(1.25,-1.9,1.15) if view!='inside' else (1.0,-1.7,1.7);camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();loc,_=camera.camera_fit_coords(bpy.context.evaluated_depsgraph_get(),[v for c in coords for v in c]);camera.location=center+(loc-center)*1.14
pose('studio')
# Save assembled, editable scene and only product geometry in GLB.
bpy.ops.wm.save_as_mainfile(filepath=str(out/'laundry-sorter-a1.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in product+assemblies:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'laundry-sorter-a1.glb'),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
posterPins={}
for view in args.views.split(','):
 pose(view);scene.render.filepath=str(out/f'laundry-sorter-a1-{view}.jpg');bpy.ops.render.render(write_still=True)
 if view=='exploded':
  from bpy_extras.object_utils import world_to_camera_view
  pins=[]
  for index,a in enumerate(assemblies):
   points=[o.matrix_world@Vector(c) for o in a.children_recursive if o.type=='MESH' for c in o.bound_box];lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));point=(lo+hi)/2;point.z=hi.z+.035;ndc=world_to_camera_view(scene,camera,point);pins.append({'number':index+1,'label':a.name,'x':round(ndc.x*100,3),'y':round((1-ndc.y)*100,3)})
  posterPins[view]=pins
pose('studio');bpy.ops.wm.save_as_mainfile(filepath=str(out/'laundry-sorter-a1.blend'))
info={'id':'laundry-sorter','visualRevision':'A1','engineeringRevision':'A0','dimensionsMm':[520,350,650],'measuredVisualizationEnvelopeMm':[521,353.4,650],'envelopeNote':'Nominal A0 envelope is 520 × 350 × 650 mm. Visual seams, feet and fastener heads project slightly; this visualization is not production CAD or a validated package-fit model.','visualChanges':['Shaped, hollow sewn canvas bags with rolled hems','Four attached woven carry handles and reinforced edge stitching','Two readable text-and-shape task labels','Radiused molded PP frame and split lid with recessed grips','Packed textile color and normal textures for GLB','Named, intact bag assemblies for a non-radial exploded view'],'scope':'Development visualization. No sampled product, supplier quotation, load test or production engineering approval. Natural canvas with a selectable PP frame finish.','assemblies':[{'name':o.name,'explodeOffset':list(o['explodeOffset']),'role':o['viewRole']} for o in assemblies],'posterPins':posterPins,'meshCount':len(product),'vertices':sum(len(o.data.vertices) for o in product)}
(out/'laundry-sorter-a1-visualization.json').write_text(json.dumps(info,indent=2)+'\n')
print('A1_BUILD_COMPLETE',json.dumps(info))
