"""Import an exported Atlas GLB into Blender, then save an editable .blend.

In Blender's Scripting workspace, open this file, set GLB_PATH, and Run Script.
Or: blender --background --python blender_import.py -- /path/to/aisle.glb
The model carries product IDs, source URLs and planning assumptions in properties.
"""
import sys
from pathlib import Path
import bpy
from mathutils import Vector

GLB_PATH = ""  # Set an absolute path here when running inside Blender.
if "--" in sys.argv:
    GLB_PATH = sys.argv[sys.argv.index("--") + 1]
if not GLB_PATH:
    raise ValueError("Set GLB_PATH to your downloaded Atlas .glb file, then run again.")
path = Path(GLB_PATH).expanduser().resolve()
if not path.is_file() or path.suffix.lower() != ".glb":
    raise ValueError("Choose an existing Atlas GLB export.")

# Keep the existing scene intact and make the imported aisle the active scene.
scene = bpy.data.scenes.new("Atlas aisle · " + path.stem)
bpy.context.window.scene = scene
collection = bpy.data.collections.new("Atlas aisle · " + path.stem)
bpy.context.scene.collection.children.link(collection)
bpy.ops.import_scene.gltf(filepath=str(path))
imported = list(bpy.context.selected_objects)
for obj in imported:
    for prior in list(obj.users_collection):
        prior.objects.unlink(obj)
    collection.objects.link(obj)
images = {node.image for obj in imported if obj.type == "MESH"
          for slot in obj.material_slots if slot.material and slot.material.use_nodes
          for node in slot.material.node_tree.nodes
          if node.type == "TEX_IMAGE" and node.image}
for image in images:
    if image.has_data and not image.packed_file:
        image.pack()
scene.unit_settings.system = "METRIC"
scene.world = bpy.data.worlds.new("Atlas studio world")
scene.world.color = (0.7, 0.7, 0.7)
scene["Atlas note"] = "Retail concept. Product photos on estimated display packs. Planned tickets are user assumptions. Not a Target planogram."
camera_data = bpy.data.cameras.new("Atlas aisle camera")
camera = bpy.data.objects.new("Atlas aisle camera", camera_data)
collection.objects.link(camera)
camera.location = (2.1, -5.6, 2.9)
camera.rotation_euler = (Vector((0, 0, 1.1)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 4.8
scene.camera = camera
for name, location, energy, size in [("Atlas soft key", (-3, -4, 6), 1100, 5),
                                     ("Atlas fill", (4, -1, 4), 650, 4)]:
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy, light_data.shape, light_data.size = energy, "DISK", size
    light = bpy.data.objects.new(name, light_data)
    collection.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat("-Z", "Y").to_euler()
scene.render.resolution_x, scene.render.resolution_y = 1440, 1000
scene.render.resolution_percentage = 100
if imported:
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == "VIEW_3D":
            area.spaces.active.shading.type = "MATERIAL"
            area.spaces.active.region_3d.view_location = Vector((0, 0, 1))
            area.spaces.active.region_3d.view_distance = 7
output = path.with_suffix(".blend")
bpy.ops.wm.save_as_mainfile(filepath=str(output), compress=True)
print("ATLAS_BLEND_SAVED", output)
