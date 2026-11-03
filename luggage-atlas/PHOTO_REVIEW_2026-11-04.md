# Offer photography review — 4 November 2026

Status: **proposal only; not published**. Prepared against `royhei-cpu/royhei-cpu.github.io` main commit `d3c1f35a710b5298d4b6ce2d64cee627ec6a7016`. Publishing requires Ryan's explicit approval. This file records the review state at preparation, not future deployment state.

33 authentic source photographs are added for nine existing priced offers. The 215 original photo records remain intact (248 total). All 67 price observations and 98 brand profiles are unchanged.

## Verified additions and limitations

| Existing priced offer | Photos | Matched views | Remaining qualification |
|---|---:|---|---|
| Assembly RoverPro Moon-White Cabin | 5 | Cabin Pro exterior, open front laptop compartment, dimension diagram | Main packing/organizer image is a shared Rover Pro set image; photographed size is unverified. Revision unstated. Live page resolves Cabin Pro at INR 5,499; original price retained. |
| Kathmandu Hybrid Trolley v5 70L Pure Navy | 3 | Exterior, main interior, backpack harness | Model, size, color and v5 revision matched. No separate small-pocket close-up. The page's Black Stingray interior image was excluded. |
| Nasher Miles Dubai 20-inch dual-color cabin | 3 | Pastel Green/Navy Blue exterior, annotated interior, lock/wheel detail | Color identified from the original product URL and its gallery. Revision unstated. |
| Safari Select Aerolite Cabin black | 2 | Black cabin exterior and packed main interior | No separately verified open laptop-compartment photo. Revision unstated. |
| Samsonite Paralux Medium Spinner Olive | 5 | Exterior, clamshell interior, front access, mesh-pocket detail, packing cubes | SKU 156525-1633 matched; revision unstated. |
| Skybags Twentyfour7 Pro Cabin | 4 | Cobalt Blue cabin exterior, interior, laptop compartment, dimensions | Gallery SKU STTWP8W55CBL matches model/size. Saved offer has no color, so color linkage remains unverified. Revision unstated. |
| Skyline 20-inch Hardside Carry-On Tan | 4 | Tan exterior, divider/straps, main cavity/organization, dimensions | Target TCIN 92118303, DPCI 069-04-6240 and UPC 618842548149 identify the item. Revision unstated. |
| Samsonite FLATFORM 55 cm Dark Moss | 4 | Exterior, main interior, front access, laptop/tablet organization | Yodobashi 100000001010283165 / UM0*18001 matched; revision unstated. |
| Samsonite Upscape 75 cm Blue Nights | 3 | Exterior, interior divider/straps, TSA lock | Yodobashi 100000001008919813 / KJ1*01003 matched. No separate removable-liner close-up. Revision unstated. |

28 photos match model, size and color; of these, three also have a named revision (Kathmandu v5). Four Skybags images carry an explicit unknown-offer-color qualification. One Assembly image is a collection alternative. Eight offers have model/size/color-matched exteriors; seven have model/size/color-matched main interiors. This is not a claim of nine fully exact-model/revision photo sets.

The other 58 priced offers have not received exact-offer image audits in this change. Their existing collection references remain accessible and labeled. No physical production-lot or unannounced revision verification is claimed.

## Proposed implementation

- `photos.json` and `photos.js`: append 33 images and nine `offerAudits`; retain existing records, collection checked date and all pricing. Per-image fields include offer identity, model, size, color, revision, SKU, source page, original image URL, visual-inspection status, retrieval date, local path and SHA-256.
- `offer-photo-assets/`: 33 compressed authentic photos, resized only, to avoid dependence on retailer hotlink behavior. Original URLs remain available.
- `offer-photos.js` and `offer-photos.css`: match exact priced-offer identities, render galleries, qualify alternatives, record missing views and provide consistent CSV columns. New modal images load when opened. Broken images show an unavailable message without substitution.
- `atlas-upgrade.js`: group reviewed priced models separately in the photo directory, show status/source in captions, support local assets, and add identity/status to photo-reference CSV.
- `workbench.js`: use offer-linked photographs in cards and comparisons; export all selected-offer views, sources, match status, identifiers, gaps and per-image JSON. Collection alternatives have a separate URL column. An unverified main interior remains blank in the main-interior column.
- `app.js`: representative brand comparison uses the photo linked to its priced model when audited; brand export gains per-image qualification.
- `index.html`: load the new photo module/styles and update cache keys only for changed scripts.
- `validate_photos.py`, `test_offer_photos.cjs`, `test_workbench.cjs`, `test_weekly.cjs`: validate local image assets, offer linkage and exports; preserve costing/weekly tests.
- This review document records evidence, limitations and maintenance rules.

No changes to `data.json`, `data.js`, weekly datasets, scheduling, GitHub workflows, prices, filter choices, cost formulas, or unrelated websites are proposed.

## Verification completed

- All nine expanded galleries opened in the browser; all 33 new images loaded; no gallery horizontal overflow.
- Three Samsonite models compared together with six correct, distinct exterior/interior images.
- Four-product comparison exercised Assembly's missing exact main interior and Skybags' unknown-offer-color labels.
- Two real browser CSV downloads parsed: seven selected offers across the two files; model-specific photo URLs and provenance matched. Assembly's main-interior field was empty and its collection-alternative field populated.
- Photo-directory search and interior filter retained three distinct Samsonite offer galleries.
- Automated tests checked all nine offers and 33 image paths, changed-date/price stability, refusal to reuse images for a changed product, selected-only CSV, comparison identity, qualified alternatives and aligned export columns.
- Existing costing, selection persistence, four-offer limit, weekly dropdowns/reset/detail/export, data, photo and fashion validation passed.
- Original 215 photo records and pricing/weekly files were compared with the baseline and preserved.

## Maintenance during weekly updates

Preserve `offerAudits` and image verification metadata when updating the photo dataset. Keep `photos.js` synchronized with `photos.json`. Preserve original price observations when only photos are reviewed. A changed model, size, color, retailer or source requires a new check; do not map by brand alone. Unspecified revisions and colors remain unknown, and shared set/collection images remain alternatives. Existing date/price changes alone must not detach the same offer's photos. Run `node test_offer_photos.cjs`, `node test_workbench.cjs`, `node test_weekly.cjs` and `python validate.py` before proposing a release.

Approval must be followed by a fresh main-branch check; rebase the scoped changes if needed. Do not overwrite newer repository work. This proposal has not created a branch, PR, commit or deployment on GitHub.
