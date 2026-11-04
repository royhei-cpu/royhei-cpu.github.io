"""Rebuild the Open Story development concept with Blender 5.2.
Nominal targets only: this is a development visualization, not production CAD.
Usage: blender --background --python build_open_story.py -- --output DIR [--config FILE]
"""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector
import argparse
p=argparse.ArgumentParser();p.add_argument('--output',default=str(Path(__file__).resolve().parents[1]/'models'));p.add_argument('--config');p.add_argument('--samples',type=int,default=96);p.add_argument('--resolution',type=int,default=1600);p.add_argument('--views',default='exterior,interior,packing-wells,exploded');build_args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
out=Path(build_args.output);out.mkdir(parents=True,exist_ok=True)
config=json.loads(Path(build_args.config).read_text()) if build_args.config else {};visualization=config.get('visualization',{});config=config.get('configuration',config)
formats={'cabin':(.36,.23,.55),'medium':(.45,.29,.68),'trunk':(.45,.34,.75)}
w,depth,height=formats.get(config.get('format','cabin'),formats['cabin'])
bottom=.063;top=height-.028;bh=top-bottom;zc=(top+bottom)/2
colors={'sage':'#94a28a','sand':'#d3c4ac','ink':'#243a51','clay':'#b88577','silver':'#acb2af'}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def linear(hexcolor):
 c=hexcolor.lstrip('#');s=[int(c[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in s)
def mat(name,color,rough=.5,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*linear(color),1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=m.diffuse_color;bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 return m
def micro_normal(material,name,strength,cloth=False):
 image=bpy.data.images.new(name,width=128,height=128);image.colorspace_settings.name='Non-Color';pixels=[]
 for y in range(128):
  for x in range(128):
   if cloth:
    u=.11*math.sin(x*math.pi/2)*(.5+.5*math.cos(y*math.pi/4));v=.11*math.sin(y*math.pi/2)*(.5+.5*math.cos(x*math.pi/4))
   else:u=.035*math.sin(x*2.13+y*1.41);v=.035*math.cos(y*1.97-x*.79)
   pixels.extend((.5+u,.5+v,.99,1))
 image.pixels.foreach_set(pixels);image.update();image.pack()
 nodes=material.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=image;normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=strength
 material.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);material.node_tree.links.new(normal.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
shell=mat('Shell',colors.get(config.get('color','sage'),colors['sage']),.4,.02)
shell.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.12
shell.node_tree.nodes.get('Principled BSDF').inputs['Coat Roughness'].default_value=.45
micro_normal(shell,'Shell fine molded grain',.2)
trim=mat('Trim','#183e34' if config.get('trim','forest')=='forest' else '#343837',.65)
rubber=mat('Rubber','#222724',.78);hardware=mat('Hardware','#9aa1a0',.3,.92)
dark_metal=mat('DarkHardware','#343b38',.38,.7);grip=mat('HandleGrip','#303632',.68)
lining=mat('Lining','#8c918b',.92);meshmat=mat('InteriorMesh','#5e675e',.92);webbing=mat('Webbing','#404840',.92)
micro_normal(lining,'Lining textile weave',.32,True);micro_normal(meshmat,'Organization textile weave',.38,True)
micro_normal(webbing,'Woven webbing',.3,True)
def cloth_color(material,name):
 image=bpy.data.images.new(name,width=256,height=256);image.colorspace_settings.name='sRGB'
 # Generated image pixels are encoded values. Exported base-color PNGs must be sRGB;
 # normal maps above remain non-color data. Set color space before filling pixels.
 base=tuple(12.92*c if c<=.0031308 else 1.055*c**(1/2.4)-.055 for c in material.diffuse_color[:3]);pixels=[]
 for y in range(256):
  for x in range(256):
   yarn=.025*math.sin(x*math.pi/2)*math.cos(y*math.pi/2)+.013*math.sin(x*1.23+y*2.07)+.012*math.sin(x*.09+y*.07)
   pixels.extend((*[max(0,c*(1+yarn)) for c in base],1))
 image.pixels.foreach_set(pixels);image.update();image.pack();tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
 material.node_tree.links.new(tex.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
for material in [lining,meshmat,webbing]:cloth_color(material,material.name+' woven color')
thread=mat('Stitching','#c8c9bf',.92);zipmat=mat('ZipperTape','#404b40',.85)
def group(name,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc;return o
root=group('OpenStoryConcept');root['scope']='Original development visualization; no tested engineering or performance claim';root['nominal_dimensions_cm']=json.dumps([height*100,w*100,depth*100]);root['config']=json.dumps(config)
body=group('BackBody',root);front=group('FrontShell',root,(-w/2,0,zc));wheels=group('Wheels',root);repair=group('RepairMarkers',root);handle=group('Handle',root)
backlining=group('BackLining',root);frontlining=group('FrontLining',front);frontlining.location=-front.location
frontorganizer=group('FrontOrganizer',front);frontorganizer.location=-front.location
frontwheels=group('FrontWheels',front);frontwheels.location=-front.location
frontrepair=group('FrontRepairMarkers',front);frontrepair.location=-front.location
def parent_world(o,parent):
 o.parent=parent
 if parent==front:o.location-=front.location
 return o
def box(name,loc,size,material,parent=body,bevel=.002):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Manufactured edge radius','BEVEL');mod.width=min(bevel,min(size)*.45);mod.segments=4;mod.harden_normals=True;bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=50;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.data.materials.append(material);return parent_world(o,parent)
def tube(name,points,r,material,parent=body,cyclic=False):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=2;c.bevel_depth=r;c.bevel_resolution=3
 s=c.splines.new('POLY');s.points.add(len(points)-1);s.use_cyclic_u=cyclic
 for p,co in zip(s.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material);return parent_world(o,parent)
def contour(width,h,z,r,segments=12):
 pts=[]
 for cx,cz,start in [(width/2-r,z+h/2-r,0),(-width/2+r,z+h/2-r,90),(-width/2+r,z-h/2+r,180),(width/2-r,z-h/2+r,270)]:
  for j in range(segments+1):
   ang=math.radians(start+j*90/segments);pts.append((cx+r*math.cos(ang),cz+r*math.sin(ang)))
 return pts
def mesh_object(name,vertices,faces,material,parent,smooth=False):
 data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update();data.materials.append(material)
 uv=data.uv_layers.new(name='SurfaceUV')
 for poly in data.polygons:
  poly.use_smooth=smooth
  for index in poly.loop_indices:
   v=data.vertices[data.loops[index].vertex_index].co;uv.data[index].uv=((v.x+v.y*.3)*28,v.z*28+v.y*28)
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);return parent_world(o,parent)
def panel(name,y,width,h,z,r,material,parent,bulge=0):
 outline=contour(width,h,z,r);vertices=[(0,y-bulge,z)]+[(x,y,zv) for x,zv in outline];faces=[(0,1+i,1+(i+1)%len(outline)) for i in range(len(outline))]
 return mesh_object(name,vertices,faces,material,parent,True)
def outline(name,y,width,h,z,r,material,parent,radius=.0008):
 return tube(name,[(x,y,zv) for x,zv in contour(width,h,z,r)],radius,material,parent,True)
def half_shell(name,sgn,parent):
 # Millimetre-scale hollow walls with a formed shoulder, rather than thick box rails.
 levels=[(sgn*.001,w-.004,bh-.003,.025),(sgn*depth*.37,w-.009,bh-.009,.027),(sgn*(depth/2-.007),w-.031,bh-.031,.03)]
 loops=[]
 for y,ww,hh,r in levels:loops.append([(x,y,z) for x,z in contour(ww,hh,zc,r)])
 for y,ww,hh,r in reversed(levels):loops.append([(x,y-sgn*.0028,z) for x,z in contour(ww-.0056,hh-.0056,zc,max(.01,r-.0028))])
 count=len(loops[0]);vertices=[v for loop in loops for v in loop];faces=[]
 for k in range(len(loops)-1):
  if k==2:continue
  for i in range(count):faces.append((k*count+i,k*count+(i+1)%count,(k+1)*count+(i+1)%count,(k+1)*count+i))
 # Close both the outer face and its separate inner skin, retaining hollow volume.
 for k,direction in [(2,sgn),(3,-sgn)]:
  center=len(vertices);vertices.append((0,levels[-1][0]+sgn*.001-(.0028 if k==3 else 0)*sgn,zc))
  for i in range(count):faces.append((center,k*count+i,k*count+(i+1)%count) if direction<0 else (center,k*count+(i+1)%count,k*count+i))
 for i in range(count):faces.append((i,(i+1)%count,5*count+(i+1)%count,5*count+i))
 mesh_object(name+'ShellFace',vertices,faces,shell,parent,True)
 outline(name+'ZipTape',sgn*.002,w-.003,bh-.002,zc,.025,zipmat,parent,.0018)
 outline(name+'ZipTrack',sgn*.001,w-.004,bh-.003,zc,.025,dark_metal,parent,.00065)
half_shell('Back',1,body);half_shell('Front',-1,front)
def fabric_depth(x,z,width,h,amplitude=.0014):
 # Low, tensioned cloth folds, with no radial triangle fan across the face.
 edge=math.sin(math.pi*(x/width+.5))*math.sin(math.pi*(z/h+.5))
 return amplitude*edge*(.65*math.sin(x*80+z*23)+.25*math.sin(z*140-x*37)+.2*math.sin(x*220+z*170))
def cloth_panel(name,y,width,h,z,r,material,parent,amplitude=.0014):
 nx=36;nz=52;vertices=[];faces=[]
 for j in range(nz+1):
  zz=(j/nz-.5)*h;inset=r-math.sqrt(max(0,r*r-max(0,abs(zz)-(h/2-r))**2))
  for i in range(nx+1):
   xx=(i/nx-.5)*(width-2*inset);vertices.append((xx,y+fabric_depth(xx,zz,width,h,amplitude),z+zz))
 for j in range(nz):
  for i in range(nx):
   v=j*(nx+1)+i;faces.append((v,v+1,v+nx+2,v+nx+1))
 return mesh_object(name,vertices,faces,material,parent,True)
def sewn_liner(name,sgn,parent):
 # The rear liner lies in front of the retracted rail channels, so hardware
 # cannot clip through into the packing well when the organizer is lifted.
 y=sgn*(depth/2-(.034 if sgn>0 else .013));ww=w-.04;hh=bh-.04
 cloth_panel(name+'QuiltedFloor',y,ww,hh,zc,.024,lining,parent,.0012)
 loops=[]
 for t in [0,.2,.45,.7,1]:
  ww2=(w-.014)*(1-t)+ww*t;hh2=(bh-.014)*(1-t)+hh*t
  loops.append([(x,sgn*.005*(1-t)+y*t+sgn*.0028*(math.sin(j*.47)+.25*math.sin(j*1.7))*math.sin(math.pi*t),zz) for j,(x,zz) in enumerate(contour(ww2,hh2,zc,.026))])
 count=len(loops[0]);vertices=[v for loop in loops for v in loop];faces=[]
 for k in range(len(loops)-1):
  for i in range(count):faces.append((k*count+i,k*count+(i+1)%count,(k+1)*count+(i+1)%count,(k+1)*count+i))
 mesh_object(name+'SewnGusset',vertices,faces,lining,parent,True)
 outline(name+'FloorPiping',y-sgn*.001,ww,hh,zc,.024,webbing,parent,.0008)
 outline(name+'RimBinding',sgn*.004,w-.016,bh-.016,zc,.026,webbing,parent,.0013)
 outline(name+'TwinNeedleSeam',sgn*.0035,w-.022,bh-.022,zc,.024,thread,parent,.00019)
 for x in [-ww*.47,ww*.47]:
  for z in [bottom+.035,top-.035]:tube(name+'CornerSeam',[(x,sgn*.006,z),(x*.98,y*.5,z+(.009 if z<zc else -.009)),(x*.95,y-sgn*.001,z)],.00022,thread,parent)
 if sgn>0:
  for x in [-w*.24,w*.24]:
   tube('LinedTrolleyChannel',[(x,y-.001,bottom+.04+j*(bh-.08)/40) for j in range(41)],.006,lining,parent)
sewn_liner('Back',1,backlining);sewn_liner('Front',-1,frontlining)
def mesh_insert(name,y,width,h,z,parent):
 # Actual open knitted apertures, rather than an opaque plane with a mesh label.
 vertices=[];faces=[];pitch=.0024;strand=.00018
 for direction,length,span in [('vertical',h,width),('horizontal',width,h)]:
  n=int(span/pitch);steps=max(8,int(length/.008))
  for k in range(n+1):
   offset=(k/n-.5)*span;start=len(vertices)
   for j in range(steps+1):
    t=(j/steps-.5)*length
    for side in [-1,1]:
     xx=offset+side*strand if direction=='vertical' else t
     zz=t if direction=='vertical' else offset+side*strand
     vertices.append((xx,y+fabric_depth(xx,zz,width,h,.001),z+zz))
   for j in range(steps):
    v=start+j*2;faces.append((v,v+1,v+3,v+2))
 return mesh_object(name,vertices,faces,meshmat,parent,True)
def zipper_teeth(name,y,width,h,z,r,parent):
 points=contour(width,h,z,r);vertices=[];faces=[]
 for i in range(len(points)):
  x0,z0=points[i];x1,z1=points[(i+1)%len(points)];length=math.hypot(x1-x0,z1-z0);count=max(1,int(length/.0035))
  for j in range(count):
   t=(j+.5)/count;x=x0+(x1-x0)*t;zz=z0+(z1-z0)*t;v=len(vertices)
   vertices.extend([(x+sx*.0006,y+sy*.0011,zz+sz*.0006) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]])
   faces.extend([tuple(v+k for k in f) for f in [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]])
 return mesh_object(name,vertices,faces,dark_metal,parent)
zipper_teeth('MainClosureTeeth',0,w-.003,bh-.002,zc,.025,body)
# Fine formed relief on the shell, with a nearly flush front access panel.
for i in range(7):
 z=bottom+.075+i*(bh-.15)/6
 pts=[(-w*.36+j*w*.72/40,-depth/2+.006-.0012*math.sin(math.pi*j/40),z) for j in range(41)]
 tube('FrontEmboss_%02d'%i,pts,.0012,shell,front)
for x in [-w*.22,w*.22]:
 tube('RearFormedChannel',[(x,depth/2-.006,bottom+.045+j*(bh-.09)/24) for j in range(25)],.002,shell,body)
access=group('FrontAccess',front);access.location=-front.location
panel('FlushFrontAccess',-depth/2+.004,w-.046,bh-.07,zc,.025,shell,access,.0008)
outline('AccessZipTape',-depth/2+.0025,w-.046,bh-.07,zc,.025,zipmat,access,.0012)
outline('AccessZipTrack',-depth/2+.0018,w-.046,bh-.07,zc,.025,dark_metal,access,.0005)
zipper_teeth('FrontAccessTeeth',-depth/2+.0018,w-.046,bh-.07,zc,.025,access)
for i in range(7):
 z=bottom+.078+i*(bh-.156)/6
 tube('AccessEmboss_%02d'%i,[(-w*.34+j*w*.68/40,-depth/2+.002-.0012*math.sin(math.pi*j/40),z) for j in range(41)],.001,shell,access)
def pull(name,x,y,z,parent):
 box(name+'Slider',(x,y,z),(.005,.0028,.009),hardware,parent,.0007)
 outline(name+'Loop',y-.0015,.008,.021,z-.013,.0025,hardware,parent,.00075)
 box(name+'Tip',(x,y-.0018,z-.026),(.007,.0016,.004),dark_metal,parent,.0005)
 # Move the centered outline to the slider's x coordinate.
 o=bpy.data.objects.get(name+'Loop');o.location.x+=x
pull('FrontAccessPull',w/2-.031,-depth/2+.0007,top-.067,access)
pull('MainZipPullA',w/2-.004,-.003,top-.05,body);pull('MainZipPullB',w/2-.004,.003,top-.074,body)
def cylinder(name,loc,radius,length,material,parent,axis='X',vertices=48):
 rotation=(0,math.pi/2,0) if axis=='X' else (math.pi/2,0,0) if axis=='Y' else (0,0,0)
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=length,location=loc,rotation=rotation);o=bpy.context.object;o.name=name
 mod=o.modifiers.new('Turned edge','BEVEL');mod.width=min(.001,radius*.1,length*.2);mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in o.data.polygons:f.use_smooth=True
 o.data.materials.append(material);return parent_world(o,parent)
# Four realistic twin-spinners: black polymer yokes, separate rubber tires and small metal axle caps.
for ix,x in enumerate([-w/2+.027,w/2-.027]):
 for iy,y in enumerate([-depth/2+.029,depth/2-.029]):
  caster=frontwheels if y<0 else wheels;markers=frontrepair if y<0 else repair
  tag=f'{ix}{iy}';cylinder('CasterSwivel'+tag,(x,y,.057),.015,.008,dark_metal,caster,'Z')
  box('CasterBridge'+tag,(x,y,.047),(.027,.017,.012),rubber,caster,.002)
  for offset in [-.0105,.0105]:
   cylinder('RubberTire'+tag,(x+offset,y,.025),.024,.009,rubber,caster)
   cylinder('RecessedHub'+tag,(x+offset+(.0047 if offset>0 else -.0047),y,.025),.009,.0014,dark_metal,caster)
   cylinder('AxleCap'+tag,(x+offset+(.0055 if offset>0 else -.0055),y,.025),.0032,.0015,hardware,caster)
  for offset in [-.006,.006]:box('ThinCasterFork'+tag,(x+offset,y,.038),(.0025,.012,.026),dark_metal,caster,.0007)
  for off in [-.003,.003]:
   ring=[]
   for j in range(65):
    a=j*math.tau/64;ring.append((x+.0105+off,y+.0241*math.cos(a),.025+.0241*math.sin(a)))
   tube('TireTread'+tag,ring,.00025,dark_metal,caster)
  cylinder('ServiceScrew'+tag,(x,y,.062),.0027,.001,hardware,markers,'Z',24)
  box('ScrewSlot'+tag,(x,y,.0626),(.0035,.0006,.0003),rubber,markers,.0001)
# Correctly scaled multi-stage trolley. It is shown extended, separately from the case envelope.
handle_top=max(1.0,height+.13)
for x in [-w*.24,w*.24]:
 box('TrolleySocket',(x,depth/2-.021,top-.015),(.023,.025,.026),rubber,body,.003)
 lower_bottom=top-.08;lower_top=top+(handle_top-top)*.53
 box('LowerTrolleyTube',(x,depth/2-.021,(lower_bottom+lower_top)/2),(.013,.016,lower_top-lower_bottom),hardware,handle,.0016)
 box('TubeCollar',(x,depth/2-.021,lower_top),(.015,.018,.007),dark_metal,handle,.001)
 box('UpperTrolleyTube',(x,depth/2-.021,(lower_top+handle_top-.014)/2),(.009,.012,handle_top-.014-lower_top),hardware,handle,.0013)
box('TrolleyGrip',(0,depth/2-.021,handle_top-.006),(w*.56,.027,.018),grip,handle,.006)
box('HandleReleaseButton',(0,depth/2-.021,handle_top+.0035),(.025,.013,.002),dark_metal,handle,.002)
for x in [-.018,.018]:box('GripTexture',(x,depth/2-.035,handle_top-.007),(.001,.0005,.009),rubber,handle,.0002)
# Suspended carry straps with mounting hardware and a genuine gap under the grip.
for x in [-w*.17,w*.17]:box('TopHandleMount',(x,0,top+.003),(.025,.027,.006),dark_metal,body,.002)
tube('TopCarryGrip',[(w*.34*(j/32-.5),0,top+.004+.012*math.sin(math.pi*j/32)) for j in range(33)],.0055,grip,body)
for z in [zc-bh*.13,zc+bh*.13]:box('SideHandleMount',(w/2-.001,0,z),(.006,.025,.023),dark_metal,body,.002)
tube('SideCarryGrip',[(w/2+.002+.008*math.sin(math.pi*j/32),0,zc+bh*.26*(j/32-.5)) for j in range(33)],.005,grip,body)
# Sewn organization uses real open mesh, bound edges, shaped cloth and separate hardware.
compression=group('CompressionPanel',root);cubes=group('PackingCubes',root);divider=group('Divider',root);wet=group('WetPocket',frontorganizer)
def mesh_frame(name,y,ww,hh,z,parent):
 outer=contour(ww,hh,z,.016);inner=contour(ww-.027,hh-.027,z,.005);n=len(outer)
 vertices=[(x,y,zz) for x,zz in outer+inner];faces=[(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
 mesh_object(name+'TextileFrame',vertices,faces,lining,parent,True)
 mesh_insert(name+'OpenMesh',y,ww-.03,hh-.03,z,parent)
 outline(name+'BoundEdge',y,ww,hh,z,.016,webbing,parent,.0013)
 outline(name+'Seam',y-.0003,ww-.006,hh-.006,z,.014,thread,parent,.00017)
mesh_frame('Compression',.018,w-.052,bh-.092,zc,compression)
# Two continuous woven straps with a shallow bow, ladder locks and side-release buckle.
for x in [-w*.245,w*.245]:
 vertices=[];faces=[]
 for j in range(49):
  t=j/48;z=bottom+.032+t*(bh-.064);y=.005-.008*math.sin(math.pi*t)
  vertices.extend([(x-.009,y,z),(x+.009,y,z)])
 for j in range(48):v=j*2;faces.append((v,v+1,v+3,v+2))
 mesh_object('WovenCompressionStrap',vertices,faces,webbing,compression,True)
 for edge in [-.007,.007]:tube('StrapEdgeStitch',[(x+edge,.004-.008*math.sin(math.pi*j/48),bottom+.032+j*(bh-.064)/48) for j in range(49)],.00017,thread,compression)
 for zz in [zc-.01,zc+.01]:box('LadderLock',(x,-.004,zz),(.024,.003,.003),rubber,compression,.0007)
 for xx in [x-.0105,x+.0105]:box('LadderLockSide',(xx,-.004,zc),(.003,.003,.023),rubber,compression,.0007)
 # Loose, doubled-back tail makes the adjusting webbing readable.
 cloth_panel('StrapTail',-.006,.018,.065,zc-.035,.003,webbing,compression,.0006).location.x+=x
for x in [-.014,.014]:box('BuckleSide',(x,-.006,zc),(.0035,.004,.024),rubber,compression,.0007)
for z in [zc-.0105,zc+.0105]:box('BuckleCrossbar',(0,-.006,z),(.03,.004,.003),rubber,compression,.0007)
box('BuckleTongue',(0,-.007,zc),(.005,.003,.019),dark_metal,compression,.0006)
# The center buckle is carried on continuous webbing rather than floating on the mesh.
cloth_panel('CrossBuckleWebbing',-.004,w*.54,.018,zc,.003,webbing,compression,.0005)
for zz in [zc-.007,zc+.007]:tube('CrossWebbingStitch',[(-w*.27,-.0045,zz),(w*.27,-.0045,zz)],.00017,thread,compression)
# Three soft packing cubes; cloth lids and open mesh windows replace solid toy blocks.
for ix,iz,ww,hh in [(-1,0,w*.42,bh*.82),(1,-1,w*.39,bh*.39),(1,1,w*.39,bh*.39)]:
 cx=ix*w*.22;cz=zc+iz*bh*.215
 loops=[[(x+cx,yy+.001*math.sin(zz*120),zz) for x,zz in contour(ww,hh,cz,.012)] for yy in [.014,.047,.08]];n=len(loops[0])
 vertices=[v for loop in loops for v in loop];faces=[]
 for k in range(2):
  for i in range(n):faces.append((k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i))
 mesh_object('SoftCubeGusset',vertices,faces,lining,cubes,True)
 cloth_panel('CubeFloor',.08,ww,hh,cz,.012,lining,cubes,.0015).location.x+=cx
 before=set(cubes.children);mesh_frame('CubeMeshLid',.012,ww,hh,cz,cubes)
 for o in set(cubes.children)-before:o.location.x+=cx
 outline('CubeZipper',.009,ww-.005,hh-.005,cz,.008,zipmat,cubes,.001).location.x+=cx
 box('CubeCarryLoop',(cx,.005,cz+hh*.34),(.035,.002,.007),webbing,cubes,.001)
mesh_frame('ZipDivider',.009,w-.045,bh-.058,zc,divider)
zipper_teeth('DividerClosure',.007,w-.045,bh-.058,zc,.016,divider);pull('DividerPull',w/2-.03,.005,top-.052,divider)
# The front half has its own zipped organization panel, with a genuine see-through compartment.
mesh_frame('FrontOrganization',-.014,w-.047,bh-.058,zc,frontorganizer)
zipper_teeth('FrontOrganizationClosure',-.011,w-.047,bh-.058,zc,.016,frontorganizer)
pull('FrontOrganizerPull',w/2-.033,-.008,top-.05,frontorganizer)
# Padded sleeve sits behind the mesh and has a curved, stitched mouth.
cloth_panel('PaddedDocumentSleeve',-depth/2+.023,w*.74,bh*.42,zc-.085,.015,lining,frontlining,.0025)
outline('DocumentSleeveSeam',-depth/2+.026,w*.74,bh*.42,zc-.085,.015,thread,frontlining,.0002)
tube('SleeveMouthBinding',[(-w*.37+j*w*.74/48,-depth/2+.028,zc-.085+bh*.21-.008*math.sin(math.pi*j/48)) for j in range(49)],.0018,webbing,frontlining)
# Curved wet-item pouch, with gusset, zip tape, teeth and pull. No barrier claim is implied.
cloth_panel('WetPocketBody',-.005,w*.70,bh*.23,zc+bh*.26,.012,lining,wet,.003)
outline('WetPocketBoundSeam',-.002,w*.70,bh*.23,zc+bh*.26,.012,webbing,wet,.001)
outline('WetPocketStitch',-.001,w*.68,bh*.21,zc+bh*.26,.01,thread,wet,.00018)
box('WetPocketZip',(0,.001,zc+bh*.31),(w*.64,.002,.004),zipmat,wet,.0006)
for i in range(int(w*.64/.0035)):
 x=-w*.32+i*.0035;box('PocketZipperTooth',(x,.002,zc+bh*.31),(.0008,.0009,.002),dark_metal,wet,.00015)
pull('WetPocketPull',w*.26,.003,zc+bh*.31,wet)
# Sewn fabric hinge, visible when the case is laid flat.
hinge=group('HingeBridge',root)
cloth_panel('TextileHinge',0,.022,bh-.07,zc,.005,webbing,hinge,.0004).location.x=-w/2
# Small deboss-like development mark, without a large cartoon label.
bpy.ops.object.text_add(location=(0,-depth/2-.0004,top-.052),rotation=(math.pi/2,0,0));mark=bpy.context.object;mark.name='ConceptMark';mark.data.body='OPEN STORY';mark.data.align_x='CENTER';mark.data.size=.006;mark.data.extrude=.00003;mark.data.materials.append(trim);bpy.ops.object.convert(target='MESH');parent_world(mark,front)
# Convert curve details so the browser GLB retains piping, carry grips and zipper loops.
bpy.ops.object.select_all(action='DESELECT')
for o in list(root.children_recursive):
 if o.type=='CURVE':
  o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
interior=config.get('interior','compression')
options=[(access,config.get('frontAccess',True)),(compression,interior=='compression'),(cubes,interior=='cubes'),(divider,interior=='divider'),(wet,config.get('wetPocket',True)),(repair,config.get('repairable',True)),(frontrepair,config.get('repairable',True))]
# Full-size product photography setup, with realistic perspective and large softboxes.
floor=mat('StudioFloor','#f7f5ef',.82);box('StudioFloor',(0,0,-.004),(200,200,.006),floor,None,.001)
scene=bpy.context.scene;scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.76,.72,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.22
for name,loc,power,size in [('Key',(-1.3,-2,2.8),110,1.7),('Fill',(2,-1,1.6),65,1.5),('Rim',(.1,1.2,2),100,1.1)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,height*.6))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.25,-2.65,1.18));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,handle_top*.49))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='PERSP';cam.data.lens=70;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=build_args.samples;scene.cycles.use_denoising=True;scene.render.resolution_x=build_args.resolution;scene.render.resolution_y=build_args.resolution;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.render.film_transparent=True;bpy.data.objects['StudioFloor'].is_shadow_catcher=True
# Every optional group is available to the browser; rendering uses the saved configuration.
bpy.ops.object.select_all(action='DESELECT')
for ob in [root,*root.children_recursive]:ob.hide_render=False;ob.hide_viewport=False;ob.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(out/'open-story-concept.glb'),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_image_format='AUTO')
for g,on in options:
 for ob in [g,*g.children_recursive]:ob.hide_render=not on;ob.hide_viewport=not on
# The base Blender scene and photographs use a retracted handle. The GLB keeps
# the extended geometry so the browser can show both positions explicitly.
if visualization.get('trolley','retracted')!='extended':
 shift=handle_top-.006-(top+.018)
 for ob in handle.children_recursive:
  ob.location.z-=shift*.5 if ob.name.startswith(('LowerTrolleyTube','TubeCollar')) else shift
 cam.location=(.78,-1.35,.87);cam.rotation_euler=(Vector((0,0,height*.5))-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'open-story-concept.blend'))
def render_view(name):
 if name not in build_args.views.split(','):return
 scene.render.filepath=str(out/('open-story-'+name+'.png'));bpy.ops.render.render(write_still=True)
render_view('exterior')
front.rotation_euler.z=-math.pi
root.rotation_euler.x=-math.pi/2;root.location=(w/2,-height/2,depth/2)
cam.location=(.48,-.76,1.14);cam.rotation_euler=(Vector((0,-.02,.09))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=55
render_view('interior')
packing_groups=[compression,cubes,divider,frontorganizer]
saved_visibility={ob:ob.hide_render for g in packing_groups for ob in [g,*g.children_recursive]}
for ob in saved_visibility:ob.hide_render=True
render_view('packing-wells')
for ob,hidden in saved_visibility.items():ob.hide_render=hidden
root.rotation_euler.x=0;root.location=(w/2,0,.08)
front.location.x-=.08;body.location.x+=.08;backlining.location.x+=.08;repair.location.x+=.08
backlining.location.y-=.10;frontlining.location.y+=.10;frontorganizer.location.y+=.30
for ob in [compression,cubes,divider]:ob.location.x+=.08;ob.location.y-=.34
wheels.location.x+=.08;wheels.location.z-=.075;frontwheels.location.z-=.075
handle.location.x+=.08;handle.location.z+=.13
for ob in [hinge,*hinge.children_recursive]:ob.hide_render=True
cam.location=(1.2,-2.1,1.16);cam.rotation_euler=(Vector((0,-.06,height*.53))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=58
render_view('exploded')
manifest={'blender':bpy.app.version_string,'modelRevision':'2026-11-04-interior-v6','scope':'Original development visualization; not existing-product photography, manufacturing CAD or tested performance','caseDimensionsCm':[round(height*100,2),round(w*100,2),round(depth*100,2)],'configuration':config,'groups':['FrontShell','BackBody','FrontLining','BackLining','FrontOrganizer','HingeBridge','FrontAccess','CompressionPanel','PackingCubes','Divider','WetPocket','RepairMarkers','Wheels','FrontWheels','FrontRepairMarkers','Handle'],'renderViews':['exterior','interior','exploded'],'visualDetails':['formed hollow shell with millimetre-scale lip','sewn recessed liner floors and fabric gussets','geometric open mesh with actual apertures','shaped document sleeve and zippered wet-item pouch','woven compression straps, ladder locks and stitching','three hollow textile packing cubes','flat-open packing inspection','separated shell, lining, organization, wheel and trolley assemblies'],'handleVisualization':'Base Blender scene and renders use a retracted trolley; browser GLB includes extended geometry and supports both view positions. Extended handle is outside the nominal case envelope','engineeringStatus':'Exploded spacing is illustrative and is not an assembly sequence. Wall thickness, part interfaces, fasteners and material appearance are visualization choices pending engineering validation'}
manifest['renderViews']=['exterior','interior','packing-wells','exploded']
(out/'model-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('MODEL_COMPLETE',out)
