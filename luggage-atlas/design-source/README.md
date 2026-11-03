# Rebuild the Open Story concept in Blender

This is an original development model, not a scan of an existing Open Story product or manufacturing CAD. Nominal dimensions, materials and features are design targets. Capacity, mass, cost, airline fit and performance require prototype validation.

The website uses a Blender-generated GLB with separate shell, front access, interior systems, pocket, wheel-service markers and handle groups. The base `.blend` keeps editable geometry, materials, camera and studio lighting.

1. In the studio, choose your format, color, trim and interior features.
2. Download **configuration JSON** and **parametric rebuild script**. The **Blender source** link downloads the default sage cabin model; it does not automatically embed subsequent browser choices.
3. Rebuild with Blender 5.2 or later. Replace the example paths with your downloaded files:

```sh
blender --background --factory-startup --python build_open_story.py -- --output ./my-open-story --config ./open-story-configuration.json
```

The output includes an editable `.blend`, a `.glb`, an exterior render, an interior render and a manifest. To rebuild defaults, omit `--config`. The model has no installation dependencies beyond Blender.

The website's **Download customized 3D model** exports your current colors, visible features, format scale and selected view as GLB. For an editable Blender scene with the same intended format and choices, rebuild with your configuration JSON. Browser format switching scales the concept; the rebuild generates geometry from the chosen envelope. Neither is engineering dimension certification.

The removable-wheel option illustrates fastener access. A wet-item pocket does not establish waterproof performance. Front access, lining and packing modules need functional prototypes, material selection and durability tests. Competitive references in the concept brief document mechanisms to evaluate, not equivalence or copying instructions.
