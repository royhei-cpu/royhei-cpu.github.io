# Dimensioned aisle planning

Open **Planogram** on the original Atlas site. This is a
Target-inspired planning workspace for blind boxes and squishies. Its fixture
presets are editable starting assumptions, not verified Target specifications
or an approved store planogram.

1. **Fixture** is the first screen on a new device. Choose inches or centimeters and enter the
   bay module width, usable shelf width, fixture height and clear aisle width.
   Set the default usable shelf depth and base elevation. Add your planogram ID
   and store/aisle location. Select the fixture measurement basis.
2. **Brands & products** puts the searchable library beside the 3D aisle. Choose
   a brand/character and retailer, then use **Add to** to select a bay/shelf.
   Familiar brands and reviewed names are grouped; other source labels remain
   searchable without filling the brand menu. Changing a filter preserves the
   assortment. Add checks width, height and depth and proposes a compatible
   location. A pack that fits nowhere stays in the library.
   Use **Add my own SKU** for a missing national brand: enter the retail pack
   photo, dimensions, SKU/DPCI and measurement basis before placement.
   The catalog does not claim every brand is sold at Target.
    Shelf numbers run from the top. Click a
   shelf to enter its exact top-surface elevation above finished floor (AFF) and
   usable depth. Each bay/shelf can have its own settings.
3. **Arrange** keeps the canvas and selected product together. Enter each **retail pack's** width, height and depth, not just the unpacked
   toy size. Mark estimated, measured or supplier dimensions and enter the SKU
   or DPCI. Set facings, stock units per facing and maximum stack levels. Drag
   a line between shelves or bays, enter its exact left-edge coordinate, or use
   the Move to shelf control. Arrow keys move a focused line by a quarter inch
   (or one centimeter) horizontally and one shelf vertically. Auto pack removes
   manual left offsets on the selected shelf. Undo and redo include dimensions.
4. **Review** groups fit issues and estimated measurements. Each issue links
   back to its product; the placement schedule and buying notes expand here.
   Review red width, clearance, depth and overlap warnings. Front elevation,
   top view, the numbered placement schedule and 3D share the same geometry.
   “Fits entered space” means the entered dimensions fit; estimated packs stay
   labeled. The top view shows the selected shelf row across bays and a clear
   aisle measured from the fixture's front allowance. It models one fixture
   face; an opposing fixture is not assumed.

The 48-inch example uses 46 inches of usable shelf width, 84-inch height,
19-inch usable shelf depth, an 8-inch base, a 6-inch header, 2 inches of total
end allowance, a 2.5-inch rear frame allowance and a 1-inch front allowance.
Its entered clear aisle starts at 60 inches. All are editable. Generic module
sizes are informed by the [Lozier catalog](https://www.lozier.com/wp-content/uploads/Catalog/Lozier-Catalog.pdf),
whose nominal dimensions do not identify a Target installation. Default shelf
heights follow the editable adjustment step; manually entered shelf elevations
are preserved. Header, shelf thickness, line gap, product lift clearance and
front setback are also editable.

**Overall width** is bay count × module width + total end allowance. **Usable
shelf width** excludes frame space. **Overall fixture depth** is the deepest
shelf + rear frame allowance + front fixture allowance. Pack stock uses exact
planned unit counts; a partially filled last depth row does not invent units.
Vertical stacking applies only to box displays. Width checks use left-edge
coordinates and facings; depth checks use actual rows deep; height checks
include stack levels, shelf thickness above and the entered lift clearance.

**Fit to this shelf** searches free contiguous intervals around existing lines,
keeps their positions, and reduces facings or stock only as required by the
entered shelf dimensions. It does not change pack dimensions or mark an estimate
as measured. New additions default to retail boxes without automatic stacking;
existing saved display formats and quantities remain intact.

The front drawing reuses the four reviewed package-face UV maps from 3D. Other
source photographs remain illustrative, and the editable physical footprint
continues to govern fit. The front 3D camera, neutral shelf lighting, active shelf
outline and red invalid-placement outlines make the planned arrangement easier
to read.

## Saving and sharing

- **Save aisle file (.json)** retains exact centimeter geometry, per-shelf
  overrides, source offers, measurement bases, SKU/DPCI, IDs and locations.
  Inches/cm only changes display/input units. Browser storage is device-local.
- **Save planogram drawing (.svg)** embeds source photos and includes front
  elevation, top view/aisle and a numbered placement schedule. Open it in a
  browser to print or save as PDF. Printed drawings fit the page; the labeled
  dimensions govern, not a ruler measurement of the printout.
- **Save assortment sheet (.csv)** includes placements, shelf clearances,
  fixture dimensions, SKU/DPCI, pack basis and fit results alongside the existing
  original-currency evidence, USD prices and source links.
- **Download 3D aisle for Blender (.glb)** exports the same fixture/shelf/pack
  geometry in meters with centimeter measurement and provenance metadata.
  Product artwork and loose squishy shapes are presentation illustrations,
  not scanned SKU geometry. The room does not transfer to Blender.

Old version-1 plans retain products, quantities, prices, centimeter dimensions
and the earlier shelf elevations. Added measurement fields default to estimates;
changing the display to inches does not rescale the saved geometry. No plan is
replaced just by switching retailer.

## Verification

`node planogram_test.cjs` checks physical fit invariants, partial stock rows,
unit invariance, overlapping coordinates, migration, save/restore and safe SVG
labels. `ATLAS_QA_SCOPE=planogram` runs the measured-fixture browser journey,
including pointer/keyboard positioning and JSON, SVG, CSV and GLB exports.
The normal workspace suite includes this journey and the existing retail/news
checks at desktop, tablet and phone widths. `build_planogram.py` updates cache
versions after a scene build; the existing Pages workflow publishes the assets.
