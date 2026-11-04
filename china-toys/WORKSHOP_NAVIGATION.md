# Aisle planner navigation and fit revision

The original GitHub Pages site now has five main destinations: Explore,
Planogram, Compare, Inspiration and Saved. Research & news expands to the
retained rankings, brand directory, chains, stories, weekly brief and methods.
The directory begins with two direct actions and its catalog; inspiration
collections follow the catalog rather than delaying it.

The planner has four views of the same saved plan:

1. Fixture — dimensions, provenance, location, example/empty aisle choices.
2. Brands & products — intersecting brand/source filters, a compact library,
   an active-shelf selector, live 3D aisle and selected pack controls.
3. Arrange — the larger canvas and contextual pack controls. Shelf settings,
   SKU/position/stacking and source/price/display options expand as needed.
4. Review — physical problems linked to their products, estimate counts,
   placement schedule, assortment summary and optional buying notes.

The brand menu groups familiar names, reviewed names and the user's own brands.
Other captured labels remain searchable and have a grouped filter. Captured
brands, characters, source labels and retailers do not establish Target stocking
or national distribution. Missing national-brand SKUs can be entered with a
photo, actual packed W/H/D, measurement basis and SKU/DPCI.

All fits share the centimeter physical model used by 2D, 3D and exports. The fit
assistant uses contiguous free shelf intervals, lift clearance, depth/setback,
stacking and exact stock counts. It never resizes a product or marks an estimate
as measured. Additions default to unstacked boxes and avoid invalid placements.
Existing plans retain their geometry, quantities, display format and USD prices.

## Design and verification

The built-in Image Gen reference is `aisle-planner-design.png`, saved beside the
repository in the task workspace. It was generated from a fresh screenshot of
the original site. The implementation screenshot is `aisle-planner-desktop.png`;
the phone capture is `aisle-planner-phone.png`. Both the concept and browser
render were opened with view_image at the desktop comparison size (1488 × 1056,
within one pixel of the reference). Interactive checks used the Codex in-app
browser. Existing Playwright acceptance scripts verify geometry, persistence,
exported files and regression journeys at 1440, 847 and 390px.

| Comparison | Implementation and refinement |
| --- | --- |
| Main navigation | Five destinations and collapsed research match the reference; all five fit on a phone. |
| Heading and stepper | Aisle planner, the short subtitle, Help/Save actions and four numbered steps match the reference hierarchy. |
| Palette and type | Existing white surfaces, neutral paper, forest green, coral selection and Georgia headings remain consistent. |
| Library/canvas/inspector | Adjacent columns on desktop; compact filters put actual product rows in view. Arrange removes the library to enlarge the canvas. |
| Inspector | Facings, stock, move-to-shelf, W/H/D, dimension basis and fit remain visible. Optional SKU/price/source details collapse and keep their open state while editing. |
| Source assets | Intentional difference: the concept's invented packages, prices and Target badges are replaced by captured source photography and source-aware USD offers. Four reviewed carton UV maps also supply the 2D artwork. |
| Physical fixture | Intentional difference: geometry and stock follow the user's saved dimensions and quantities, including frame allowance, rather than the concept's idealized stock density or nominal 144-inch run. |
| Camera and fit | A straight front view, neutral lighting, active shelf outline and red invalid footprints improve readability. Existing illustrative squishy shapes remain labeled presentation models. |
| Responsive behavior | Brand/library, canvas and selected controls stack on phones; large dimensioned drawings scroll within the stage, preserving legible labels. |

Above-the-fold copy retains the reference's task names and primary actions.
Additional real-data counts, measurement basis, active shelf and fit warnings
are intentional functional requirements. No invented metrics, product art,
national availability or Target approval claims are used.

The reference structure and implementation were compared directly. The material
hierarchy, hidden-product and mobile-navigation mismatches were repaired; the
source-artwork and physical-geometry differences above are intentional.
