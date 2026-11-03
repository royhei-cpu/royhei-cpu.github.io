# Proposed Home Care coverage correction — 4 November 2026

**Unpublished. Explicit owner approval required before merging or publishing.**

10,133 retained records → **10,141**: eight new retailer listings and three evidence-backed Naturals cross-listings. All original record fields, IDs, primary categories, historical prices and dates are preserved. No weekly automation or publishing workflow changes.

The 11 previously empty retailer/category cells each now contain one reference. The 285-cell matrix has zero unrepresented cells when secondary memberships are included; three primary-category-only cells still have zero because their existing products retain Laundry Care / Floor & Carpet Care as their primary categories. This is category representation, **not complete retailer inventory coverage**. Default Home Care scope: 10,007 → 10,015 records; all-scope totals include retained records outside default scope. Category membership counts must not be summed as unique SKU counts.

## Reviewed products

All evidence retrieved/reviewed 4 November 2026. Observed prices are USD snapshots, not nationwide or checkout guarantees. Retrieval date is not source crawl date, launch date or availability confirmation.

| Retailer | Gap category | Exact product / size | Observed price | Action |
|---|---|---|---|---|
| H-E-B | Floor & Carpet Care | [Folex Carpet Spot Remover](https://www.heb.com/product-detail/folex-carpet-spot-remover/206740) — 32 oz | $6.99 | Add listing |
| Meijer | Pest Control | [TERRO 1 oz Liquid Ant Killer](https://www.meijer.com/shopping/product/terro-1-oz-liquid-ant-killer/7092300100) — 1 oz | $4.19 | Add listing |
| Ace Hardware | Disposable Tabletop | [Solo Paper Mixed Garden Party Stripes and Flowers Design Plate 10 in. D 22 pk](https://www.acehardware.com/departments/home-and-decor/kitchen-utensils-and-gadgets/tableware/6161186) — 10 in.; 22 pack | $6.99 | Add listing |
| Ace Hardware | Pest Control | [TERRO Ant Bait 2.2 oz](https://www.acehardware.com/departments/lawn-and-garden/insect-and-animal-control/insect-bait/7105786) — 2.2 oz; 6 bait stations | $6.59 | Add listing |
| Dollar Tree | Naturals | [Rejoice All Purpose Cleaner Lemongrass & Citrus](https://sameday.dollartree.com/store/dollar-tree/products/71320186-all-purpose-clnr-lemngrass-16z) — 16 fl oz | $1.50 | Add listing |
| H-E-B | Pest Control | [Raid Double Control Large Roach Baits](https://www.heb.com/product-detail/raid-double-control-large-roach-baits/141620) — 8 ct | $7.98 | Add listing |
| H-E-B | Specialty Cleaners | [Weiman Stainless Steel Cleaner & Polish Spray](https://www.heb.com/product-detail/weiman-stainless-steel-cleaner-polish-spray/1389649) — 12 oz | $4.97 | Add listing |
| Safeway | Air Care | [Febreze Air Mist Air Freshener, Original Gain Scent - 8.1 Oz. - 8.1 OZ](https://www.safeway.com/shop/pd/febreze-air-mist-air-freshener-original-gain-scent-8-1-oz-8-1-oz/971365550) — 8.1 oz | Not exposed | Add listing |
| BJ’s Wholesale | Naturals | [ECOS Liquid Laundry Detergent with Stain Fighting Enzymes - Lavender, 230 loads/210 fl. oz.](https://www.bjs.com/product/name/3000000000004310266) — 210 fl oz; 230 loads | $18.29 | Cross-list existing HC-a410455ee2fc |
| Sam’s Club | Naturals | [ECOS Hypoallergenic Liquid Laundry Detergent + Enzymes, Lavender Scent, 230 loads, 210 fl. oz.](https://www.samsclub.com/ip/ECOS-Hypoallergenic-Liquid-Laundry-Detergent-Enzymes-Lavender-Scent-230-loads-210-fl-oz/74917409626) — 210 fl oz; 230 loads | $18.48 | Cross-list existing HC-1b33b5a5452c |
| Walgreens | Naturals | [Method Squirt + Mop Wood Floor Cleaner  - 25 fl oz](https://www.walgreens.com/store/c/method-squirt---mop-wood-floor-cleaner/ID=prod6108318-product) — 25 fl oz | $7.79 | Cross-list existing HC-c6c9e3d46f67 |

## Evidence limitations and rejected alternatives

- **H-E-B:** direct Folex HTML returned HTTP 403; an official-page search snapshot supports 32 oz / $6.99. Retrieval reported variable crawl ages (three weeks to today), so it is not a fresh checkout price. The photo reuses the existing matching Folex 32 oz Ace photograph, explicitly identified as such. Raid $7.98 snapshot is approximately one month old; Weiman spray $4.97 approximately one week old. Prices shown for Victoria H-E-B plus! may vary by channel. Raid's retailer image uses newer Roach Baits packaging while its page retains the Double Control title; eight-count size matches.
- **H-E-B Specialty:** held the $4.72 aerosol candidate (492178) because its photo shows a bonus-size can. Selected the separately verified 12 oz trigger-spray listing (1389649), whose image matches the size.
- **Meijer:** official page shows 1 oz / $4.19 and Alpine location. Photo downloaded successfully. No stock claim is imported.
- **Ace:** both exact product HTML pages and image URLs returned HTTP 200 in this pass; prior photo restriction did not recur. Solo photo shows the two plate designs, not the 22-pack wrapper; quantity follows exact page and product schema. TERRO photograph confirms T300 six-station / 2.2 oz pack.
- **Dollar Tree:** official same-day storefront confirms Rejoice 16 fl oz / $1.50. Photo label explicitly states plant-derived ingredients; this supports the catalog grouping, not an independent environmental certification. Retrieved snapshot age approximately two weeks. Delivery location and checkout not established.
- **Safeway:** official exact product page and matching Gain Original 8.1 oz photograph retrieved. Price was not exposed. Leave price null and show “Price not verified”; no inferred price or inventory. The earlier Morning & Dew URL returned an error/iframe and was not added.
- **BJ’s:** retained ECOS 210 fl oz / 230-load item already exists. Official product ingredients support Naturals; $18.29 observed in the retrieved page. Membership/location/checkout terms require recheck. No duplicate Mrs. Meyer's or historical Seventh Generation listing was added merely to fill a cell.
- **Sam’s Club:** retained ECOS item already exists. Official page supports plant-powered formulation. Newer category result shows $18.48 versus older product-page $17.98; both observations and the discrepancy are disclosed. Historical price fields are unchanged.
- **Walgreens:** retained Method 25 fl oz wood-floor cleaner is explicitly in the retailer's Natural Cleaning Supplies category. $7.79 category-card offer re-observed. Direct product text retrieval returned an incomplete shell, so classification relies on the exact category card and existing photograph; no new SKU or unsupported scent variant is added.
- Launch/first-listing dates, sales figures and checkout availability remain unverified for this correction. Existing historical evidence is preserved.
- Every original gap has a supported reference; full assortments, local inventory and some current prices remain unresolved. No category is declared genuinely empty.

## Validation

- Built merged catalog: 10,141 records; every field on all 10,133 baseline records unchanged. Three cross-listings add supplemental fields only.
- Executed the actual built filtering function against all 285 all-scope retailer/category combinations; counts matched the corrected matrix. Naturals dropdown membership verified through the actual dropdown function with a lightweight DOM adapter.
- Executed the actual selected-product CSV handler with 11 selected review products. Exactly 11 data rows; selection-only behavior, category cross-listings, observed-price caveats and absolute product/photo/evidence URLs checked. CSV links photos; it does not embed image files.
- Downloaded and visually inspected all eight addition photos, plus the three existing cross-listing photos. Matched identities/packs and documented packaging exceptions above.
- Existing regression suite: 37 passed, 1 optional full-catalog test skipped, 0 failed. Build's lossless packing assertion passed.
- **Rendered browser QA remains unverified:** managed preview started at http://terminal.local:4173/ but browser navigation returned `net::ERR_CONNECTION_RESET`; preview status remained running. No claim of verified rendered clicking, responsive layout or browser download behavior. Code-level tests are not a substitute for that final visual check.

## Approval scope

Approve only this Home Care correction: new part-038, three category cross-listings, seven newly cached photos (Folex reuses an existing photo), coverage matrix, and filter/export/dashboard integration. Preserve the current URL, original records, other projects and weekly automation. Before merging, rebase on latest main, rebuild and recheck counts; complete rendered browser QA if preview routing is available. Do not merge automatically.
