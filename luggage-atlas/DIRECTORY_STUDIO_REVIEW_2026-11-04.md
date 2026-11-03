# Directory and Open Story studio review — 4 November 2026

**Publication approved by Ryan on 4 November 2026: “make it all updated on the original github site”.**

Baseline: `2c7b45eb08a39624e0c8164ab50d6fc180c321c6` in `royhei-cpu/royhei-cpu.github.io`. This includes the earlier local photography follow-up; no previous local work has been discarded. The pre-publication remote-main recheck found `d3edc5d1e7072722e483b10f67a1a189f6fd3f30` (China Toy Atlas updates); it has no changes to Luggage Atlas or the shared publishing workflow. Those intervening changes are preserved in this release. Publication is authorized; the rendered-browser verification limitations below remain open.

## What is implemented

- A default product directory containing all **67 saved priced offers**, alongside links to the **98 brand profiles** and **47 retail channels**.
- Combined text, region, currency, product type and photo-evidence filters; alphabetical, evidence-first and within-currency price sorting; empty states and progressive loading.
- Local product follows, a persistent four-offer shortlist and a direct Discover → Compare → Customize & export workflow. Follows do not promise live monitoring or notifications.
- A collapsed research library preserves access to every existing research section. The weekly edit remains available from the main navigation. Existing Open Story opportunities link to the new studio.
- A full filtered **photo-gap audit CSV** so reviewed, qualified and unreviewed offers remain visible.
- Existing selected-product CSV exports plus a new **visual comparison HTML export with embedded authentic photographs**, sources, match labels and unresolved gaps. Successfully embedded images work offline; source links need internet access.
- An updated text quick guide for the new workflow. The earlier research-tools video is preserved and identified as using the previous navigation.

## Real Blender model and customization

The model was built and rendered with **Blender 5.2.2 LTS**. It is an original Open Story development concept, not a photograph, scan of an existing product, manufacturing-ready CAD model, supplier quotation or tested specification.

The editable source and reusable rebuild script are included:

- `models/open-story-concept.blend`
- `models/open-story-concept.glb`
- `models/open-story-exterior.webp` and `models/open-story-interior.webp`
- `models/model-manifest.json`
- `design-source/build_open_story.py` and `design-source/README.md`

The website lets the user change five shell colors, two trim colors, cabin/medium/trunk formats, three interior organization systems, front access, a wet-item pocket and wheel-service fastener markers. Exterior, inside and exploded views plus mouse/touch and keyboard-button camera controls are implemented.

Traveler presets recommend a starting direction for frequent short trips, work trips or family travel. Recommendations are transparent design hypotheses with trade-offs and validation tasks. Their mechanism references link to saved Samsonite, LOJEL and Briggs & Riley evidence. Brand/collection photographs are labeled separately from exact-offer matches and from the generated concept.

The concept brief and JSON export retain all choices. The GLB export contains the selected colors, visible features, format scale and current view. The base `.blend` download remains the default sage cabin scene; rebuild it with the exported JSON to create an editable scene with those choices. Browser format switching scales the visualization; rebuilding generates geometry for the intended format. Neither establishes engineering dimensions or capacity.

A one-click action adds the saved Open Story Aqua Blue carry-on benchmark without replacing a full shortlist or its cost scenarios. The studio includes the same selected research offers, saved prices, sources and photo qualifications as the directory shortlist. Its comparison CSV separates the development concept from observed retail products and retains color-unverified image links plus per-image evidence JSON.

Three.js **0.187.0**, loaders, exporter and controls are vendored with the MIT license under `vendor/three/`. The studio has no paid API, CDN, server-side account or new scheduled task dependency. If WebGL fails, the actual base-model Blender render remains visible and the configuration/brief exports continue to work; it does not pretend to show the chosen colors in that fallback image.

## Photography is still evidence-limited

The photo dataset remains at **250 references**, including **35 photos linked to nine audited offers**. This task's earlier follow-up added two source-derived Safari detail photographs and stronger Assembly/Safari identifiers; the current repository already contained the preceding 33 offer-linked images.

Within the 67-offer directory:

| Coverage state | Offers |
|---|---:|
| Model/size/color-matched exterior and main interior, revision qualifications retained | 7 |
| Reviewed, exact main interior missing: Assembly | 1 |
| Model/size matched, saved offer color unresolved: Skybags | 1 |
| Exact-offer photographic audit not completed | 58 |

Assembly's shared-set main interior remains an alternative. Safari's open laptop compartment, Kathmandu's small-pocket close-up and Upscape's separate removable-liner close-up remain unavailable. Most revisions are not specified. These gaps have not been filled with generated photographs or another product's images.

Additional source checks revisited Myntra Assembly item 27422070, Myntra Safari item 33427806 and AJIO item 700049928. Maintenance, incomplete page bodies and unavailable galleries prevented acceptance of new exact missing-view evidence. Product names or feature descriptions alone do not verify a photograph. The directory exposes these remaining gaps instead of describing the research as an exhaustive global census.

## Verification completed

- Existing research/photo/fashion validators pass; all 98 brands, 67 price observations and linked evidence remain intact.
- Original price/research files, weekly datasets and scheduling/publishing configuration are preserved. Previous 215 collection-photo records remain unchanged.
- Existing offer-photo, costing, selection persistence, weekly dropdown/reset/detail and export tests pass.
- Directory tests cover all 67 offers, all four photo-coverage categories, combined/empty filters, all three distinct Samsonite offers, shortlist persistence, the four-offer cap, local follows and a complete gap-audit CSV.
- A visual-export test exercises the actual document serializer with local photo bytes and confirms embedded JPEGs, model identities, qualified/collection labels and source links.
- The actual Blender GLB imports through the shipped Three.js loader. Its **83 meshes** have finite geometry. **45 format/color/interior combinations** pass material and visibility checks. Open/exploded/reset transforms work on the real scene graph. A customized GLB exports and re-imports successfully with hidden options omitted.
- Studio DOM-unit tests cover no-WebGL fallback, recommendations, format changes, saved choices, the four-offer bridge and actual Markdown/JSON/CSV download serialization. Testing found and fixed a failure-state camera-reset bug.
- The concept comparison CSV parses as one concept plus four saved offers with aligned columns, including qualified-photo evidence.
- Local HTTP checks confirm the directory, studio and existing Open Story entry points plus 40 referenced assets return success. Blender/GLB/WebP downloads have valid binary signatures.
- Blender exterior/interior renders were visually inspected. The UI concept is retained in the local review evidence folder, outside the repository patch.

## What remains unverified

**Rendered browser QA is blocked.** Two in-app-browser attempts, including the local studio preview, were denied because the admin-enforced security-policy check was unavailable. No alternative browser path was used to bypass that control.

Consequently, this release does not claim verified desktop/mobile layout, real WebGL rendering in the target browser, console health, pointer/touch behavior or physical browser downloads. The automated model/DOM/serialization checks above do not substitute for that verification.

The five visual checks still needed are: header and navigation spacing; control typography and selected states; 3D stage framing; mobile stacking and table overflow; and the complete select → compare → configure → download interaction. The generated UI concept and implementation cannot be signed off as a verified visual match until the browser becomes available.

## Repository changes

All changes are confined to `luggage-atlas/`:

- Extend the previously prepared photo metadata/assets and stricter evidence-aware exports.
- Add `directory.js` and `directory.css`; update `app.js`, `index.html`, `workbench.js`, `open-story.html` and `tutorial.js` for navigation, shared selection and visual exports.
- Add the studio page, styles, configuration model, shared scene configuration helper, renderer/export module, generated Blender artifacts, parametric source and authentic bundled reference previews with source metadata.
- Vendor Three.js and its license; add directory/studio tests; update existing test load order and documentation.

The exact full binary patch and file manifest were prepared in the local review evidence folder before approval. Main was checked again after approval; the release preserves intervening repository work. GitHub Actions records the deployment result.
