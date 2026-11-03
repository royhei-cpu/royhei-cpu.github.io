# Retail workshop revision · 4 November 2026

User requirements: choose products from a selected retailer, place them in the
aisle, and make the workshop substantially more realistic and professional.
Keep it simple, organized and on the original GitHub Pages site.
Scope correction: blind boxes and squishies only throughout the directory and
workshop. Exclude LEGO, building blocks, construction sets and model kits.
The five atlas categories are the allowed assortment; articulated blind-box
dolls and squishy blind-box lights normalize into those categories.

The full primary-screen concept is `exec-a47abde6-bf07-41ac-ab06-fed04643a3fb.png`.
It defines the source chooser, large 3D stage, selection inspector and retailer
product library. The environment pass supplies a separate generic store panorama.

## Locked system

- Paper #faf9f6, white panels, forest #173e35, border #d9ddd6, coral #df694c.
- Georgia heading, 40–44px; section headings 23–26px. System sans for all chrome,
  controls 12–14px, product names 12–14px, source captions at least 11px.
- Existing 228px atlas navigation remains consistent with the rest of the app.
  Main composition: wide stage, 280–300px inspector, library immediately below.
- Primary copy: “Retail workshop”; “Choose a retailer. Add your picks. Make the
  aisle yours.”; “Shop products from”; “Export & Blender”; “3D aisle”; “Shelf
  plan”; “Store appearance”; “Your selection”; “Add to aisle”.
- Native retailer dropdown, source-aware prices and original currencies. Counts
  come from the data, replacing the concept’s illustrative assortment number.
- Store appearance is separate from product source. Exact shop/source identity
  follows each product into the plan and exports.

## Scene

Close three-quarter view, framed to the fixture rather than a distant floating
model. Rounded powder-coated metal, realistic shelf thickness, perforated back,
brackets, soft under-shelf lighting, price rails, legible reference/planned tags,
tile floor, room reflections and contact shadows. Printed boxes and hanging
cards are selectable presentation models using genuine source photos. They do
not claim to reproduce verified retail packaging or toy meshes. No invented
product art, retail inventory, logos, prices or geometry facts.

The generic background is generated architectural artwork, not a photograph of
an identified retailer. The foreground fixture and all interactions are live 3D.

## Behavior

Choose retailer → browse its captured items → add to aisle → edit arrangement →
export. Official shop captures and dated China-chain references stay distinct.
Changing retailer does not replace an existing aisle. A separate retailer edit
action fills available space and can be undone. Existing version-1 plans migrate
without losing products, dimensions, prices or favorites.

Source URL, currency, pack basis and evidence type must survive JSON, CSV and GLB
export. Blender round-trip is a required check. Responsive stage/inspector stack
on tablets, with all main navigation still visible on mobile.


## Fidelity and verification ledger

Compared the scoped full-screen concept and the latest 1600 × 1100 live-browser
capture side by side using view_image on 4 November 2026.

| Reference point | Rendered result / decision |
| --- | --- |
| Forest serif heading and warm paper | Matched to the existing atlas tokens and 44px desktop heading. |
| Retailer chooser above the stage | Implemented with real source counts; 52TOYS has 97 captured records. |
| Wide scene with compact right inspector | Implemented; stage, selection controls and source offer remain visible together. |
| Physical retail fixture | Rounded steel, pegboard, bracket slots, LED diffusers, price channels, hanging hooks and a tile floor replace the original plain block display. |
| Realistic store context | Generic generated panorama supplies architecture; all selectable foreground geometry remains live WebGL. |
| Larger product artwork and price tags | Source artwork trims only blank photography margins; price tags simplified and enlarged after QA. |
| Reference assortment / packaging | Intentional deviation: actual captured blind-box/squishy photos and editable presentation packs replace the concept's illustrative toy art and prices. No toy meshes or retail packaging facts are invented. |
| Shelf count and density | Editable 3–5 shelves and 1–4 bays retain real planned facings; the existing starter uses four rows. |
| Narrow screens | At 390px the source bar stacks, all six main navigation links remain visible, and the stage/inspector/library stack without horizontal overflow. |

Verification completed:
- Full existing workspace acceptance suite passed: browsing, comparison, rankings,
  weekly brief, 18 retail chains, saved collection, inspiration and tutorial.
- Expanded retailer journey passed at 1440px, 847px and 390px; exact source URL,
  price, currency and pack survive persistence, retailer switching, JSON, CSV
  and GLB. PNG output has nonblank image variance. No app JavaScript errors.
- The shared scope rejects building-block/model-kit records and excluded custom
  concepts on import. The public build filters both catalog and chain JSON/CSV.
  Catalog: 4,338 records; chain references: 65; workshop with two benchmarks: 4,405.
- Brand directory reconciliation and responsive/filter/export tests passed with
  4,338 scoped catalog records across 782 original labels.
- Blender 5.2.2 LTS imported the exported textured GLB and saved an editable
  .blend successfully. Product IDs and retailer/source metadata are in groups.

Browser plugin is not installed in this session. Interactive visual verification
used the Codex in-app browser through CUA; existing Playwright CLI acceptance
scripts supplied automated regression and download checks. Tested Chromium only.
The environment is generic artwork; packs remain dimension estimates, and dated
shop/chain observations do not claim present-day store inventory.
