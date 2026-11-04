# Retail studio

The original GitHub Pages directory now includes `#retail`: a browser 3D aisle,
an accessible shelf plan, assortment recommendations and Blender-compatible GLB
exports. The existing catalog, comparison, rankings and research remain the
source of product facts. Retail planning assumptions never edit that catalog.

## Use

1. Open **Retail studio**. A twelve-line concept gives a starting point.
2. Choose a shelf; browse the recommended edit or the entire directory. Catalog
   cards also have **Place in virtual aisle**. Add your own product/photo if needed.
3. Select a pack to edit facings, stock depth, planned ticket and shelf. Pack
   dimensions and arrangement are expandable. Shelf plan supports drag between
   shelves, keyboard selection and explicit move controls.
4. In **Store appearance**, rename the aisle, choose a finish, and adjust bays
   and shelves.
   Width/depth/height issues remain visible. Undo/redo protects changes.
5. Open **How to use** for the current four-step tutorial with buttons that jump
   to the actual controls. **Save & download** offers **Save aisle file** (.json,
   reopen here), **Save aisle picture** (.png), and **Save assortment sheet**
   (.csv, Excel/Sheets). Opening a saved file returns to the editable workshop.
6. **Open in Blender** is optional and requires a computer. Download the .glb,
   choose Blender **File → Import → glTF 2.0**, use **Material Preview** for
   textures, and **File → Save As** for a .blend. The normal flow needs no script.
   The advanced helper is separate: `blender --background --python
   blender_import.py -- /absolute/path/to/aisle.glb`. Blender edits do not import
   back into the website; keep the .json backup for continued website editing.

Current plans and up to 30 custom product photos are stored on this browser.
The original directory's favorites and compare selections are separate. JSON
is the portable backup; browser storage is not an account or cloud sync.

## Evidence

Two additional Target.com benchmark records were read on **2026-11-04**:

- [RMS Mystery Squishy Dumpling](https://www.target.com/p/rms-usa-mystery-squish-dumpling-fidget-toy-confetti/-/A-95253515): USD 4.99, one piece, listed age 3+, TPR.
- [Mofusand Kiramekko plush clip](https://www.target.com/p/mofusand-6pc-kiramekko-roto-plush-clips/-/A-1011135915): USD 19.99, specification says one piece, listed age 3+, polyester. The assortment photo and URL do not establish a six-piece pack.

These are US retail references outside the China-directory count. Neither a
Target.com listing nor this model establishes a particular store's inventory.
Other catalog items are proposed candidates with unverified Target stocking,
distribution rights, wholesale terms and compliance. Most are older-age
collectibles. The default audience is teen/adult collectors.

Planning fit is a transparent heuristic out of 100, defined in `retail-data.js`
and the on-page expandable methods. Only explicitly labeled single-pack USD
offers qualify for price points; no FX conversion or multipack division is
inferred. Planned tickets are blank until the user enters them. Revenue, sales,
cost, margin and profit are never inferred from the plan.

The fixture, pack dimensions, stock quantities and capacity are user assumptions.
Real catalog photos appear on proxy display packs; these are not scanned toy
meshes or verified packaging. Source image attribution stays on each record.

## Build and test

`retail-data.js` owns evidence/score/validation helpers; `retail-studio.js` owns
the planner UI/state; `scene.js` owns scene geometry, raycasting, camera and GLB
export. `retail-scene.js` is a prebuilt bundle, loaded only when the studio opens.
It makes no CDN requests. Three.js is MIT licensed (see THIRD_PARTY_LICENSE.txt).

Rebuild with Node/npm from this directory:

```sh
npm install
npm run build
```

Pinned versions: Three.js 0.185.0, esbuild 0.28.2. Update content hashes in the
index and the lazy import after rebuilding. GitHub Pages copies the bundle and
the required photo/helper/license assets explicitly in `publish.yml`.

`workspace_acceptance.py` includes the retail journey; use `ATLAS_QA_SCOPE=retail`
for a focused run. It checks editing, persistence, undo, custom items, CSV/JSON,
GLB meshes/textures/metadata, PNG and desktop/mobile layout. `ATLAS_CHROMIUM_PATH`
can select an existing local Chromium for development.

## Design decisions

The full-screen Image Gen concept used the existing warm paper background,
228px sidebar, Georgia headings, forest controls, wide 3D canvas and right
inspector. The implementation preserves that composition and the shelf-plan
tab. Intentional changes: genuine source photos replace illustrative packaging;
only captured toy categories are shown; calculated shelf width replaces an
invented slot count; source age gaps replace an unsupported safety metric; pack
settings and score details collapse to keep the primary flow simple. All six
primary navigation destinations are visible on mobile in two rows.
