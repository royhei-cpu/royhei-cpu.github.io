# Rebuild the Open Story concept in Blender

This is an original development model, not a scan of an existing Open Story product or manufacturing CAD. Nominal dimensions, materials and features are design targets. Capacity, mass, cost, airline fit and performance require prototype validation.

The website uses a Blender-generated GLB with separate shell, front access, interior systems, pocket, wheel-service markers and handle groups. The base `.blend` keeps editable geometry, materials, camera and studio lighting.

1. In the studio, choose your format, color, trim and interior features.
2. Download **configuration JSON** and **parametric rebuild script**. The **Blender source** link downloads the default sage cabin model; it does not automatically embed subsequent browser choices.
3. Rebuild with Blender 5.2 or later. Replace the example paths with your downloaded files:

```sh
blender --background --factory-startup --python build_open_story.py -- --output ./my-open-story --config ./open-story-configuration.json
```

The output includes an editable `.blend`, a `.glb`, exterior, flat-open interior, empty packing-well and exploded PNG renders, plus a manifest. To rebuild defaults, omit `--config`. The model has no installation dependencies beyond Blender.

The website's **Download customized 3D model** exports your current colors, visible features, format scale and selected view as GLB. For an editable Blender scene with the same intended format and choices, rebuild with your configuration JSON. Browser format switching scales the concept; the rebuild generates geometry from the chosen envelope. Neither is engineering dimension certification.

The removable-wheel option illustrates fastener access. A wet-item pocket does not establish waterproof performance. Front access, lining and packing modules need functional prototypes, material selection and durability tests. Competitive references in the concept brief document mechanisms to evaluate, not equivalence or copying instructions.


The realism revision includes finer shell/closure geometry, separate rubber/metal wheel components, a two-stage trolley, carry-handle gaps and textile normal maps. These visual details do not establish engineering dimensions or material performance. The default editable `.blend` and renders show the trolley retracted. The GLB retains extended geometry so the website can show both positions. Exported configuration JSON has a `visualization.trolley` field that the rebuild honors. Both exterior and interior PNG renders are generated with transparency and contact shadows.


The inside/exploded revision adds sewn recessed liner tubs, real open mesh, shaped pockets, textile webbing with adjusters, and three hollow packing cubes. **Inside** opens the case 180 degrees and lays both packing wells upward; **Lift organizers** temporarily removes their covers for inspection. **Exploded** separates the shell, liner, organization, spinner and trolley assemblies. Browser spacing and isolation are inspection aids, not a repair sequence or a tested disassembly mechanism. Customized GLB exports retain the current inspection state, and JSON records it under `visualization`; the rebuild regenerates all assemblies and saves an exterior base scene rather than reproducing browser isolation. The trolley visualization is honored.

Base-color textures are encoded as sRGB, while normal maps remain non-color data. Generated texture color space is set before pixels are filled, updated and packed; GLB tests decode the embedded PNGs and reject blank or incorrectly encoded images. `--samples 96 --resolution 1600` are the default render settings and can be reduced for previews.
