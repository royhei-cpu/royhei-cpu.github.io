# Home Care coverage correction — 4 November 2026

**Owner approved publication in the conversation and additionally requested factory names for all brands.** Publication status is recorded in PR #3; this document records evidence and validation, not deployment success.

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
- Existing regression suite: 38 passed, 1 optional full-catalog test skipped, 0 failed. Build's lossless packing assertion passed.
- **Rendered browser QA remains unverified:** managed preview started at http://terminal.local:4173/ but browser navigation returned `net::ERR_CONNECTION_RESET`; preview status remained running. No claim of verified rendered clicking, responsive layout or browser download behavior. Code-level tests are not a substitute for that final visual check.

## Approved scope

The approved Home Care correction includes: new part-038, three category cross-listings, seven newly cached photos (Folex reuses an existing photo), coverage matrix, and filter/export/dashboard integration. Preserve the current URL, original records, other projects and weekly automation. Before merging, rebase on latest main, rebuild and recheck counts; complete rendered browser QA if preview routing is available. The owner subsequently approved publication and requested the factory directory described below.


## Brand / manufacturer / factory extension

Every one of the 10,141 collected records receives separate supplemental owner, manufacturer/supplier, disclosed brand factory, source, research status and exact-SKU factory fields at build time. Source brand labels and every pre-existing field are preserved. The new Brands & factories link opens a searchable directory with a status filter and full CSV download; the selected-product CSV also includes these fields.

| Measure | Result |
|---|---:|
| Distinct nonempty brand labels (case/spelling variants retained) | 840 |
| Brand labels with owner or manufacturer/supplier evidence | 108 |
| Brand labels with disclosed manufacturing facilities | 31 |
| Product records associated with those brand-level facilities | 1,050 |
| Brand labels awaiting brand-specific factory research | 731 |
| Additional reviewed label with no company evidence (Rejoice cleaner) | 1 |
| Product records with no recorded brand | 3,414 |
| Exact SKU/batch factories verified | 0 |

This is **not a completed factory identification for every brand**. The fields cover all records; the public evidence is partial. Pending research is distinct from a researched but unresolved factory. Unresearched entries receive no fabricated verification date. A brand owner, distributor, headquarters, mailing address, supplier address or country of origin is not automatically a factory. Disclosed facilities may manufacture only part of a brand's assortment, and no exact SKU plant is asserted.

Factory evidence and review dates are maintained in `site/brand-factories.json`. Major official sources include [SC Johnson manufacturing](https://jobs.scjohnson.com/en/manufacturing-careers), [P&G Tabler Station](https://www.pgplantjobs.com/us/en/tabler-station), [Libman](https://www.libman.com/), [Method's regional factory page](https://www.methodhome.com.sg/pages/soap-factory), [ECOS history](https://www.ecos.com/our-story/), [Dart Chicago](https://corporate.dartcontainer.com/location/chicago-il/), [Persil FAQ](https://www.persillaundry.com/us/en/laundry-help/faq.html), [PurposeBuilt facilities](https://purposebuiltbrands.com/company), [Star Brands FAQ](https://www.starbrandsltd.co.uk/pages/faqs), [Bar Keepers Friend](https://bkfclean.com/about-us/our-story/), and [OdoBan](https://www.odoban.com/our-story/). Each directory entry links its own company and factory sources.

Important exceptions:

- Folex's professional-product SDS names FOLEXPORT, INC. as manufacturer/supplier. Its PO box is not a factory, and the SDS is not exact retail SKU traceability. The unrelated film-coating company at folex.com is excluded.
- TERRO ownership is supported by Woodstream; an exact manufacturing plant remains unresolved.
- Rejoice cleaner is not assigned to the unrelated Rejoice hair-care brand.
- Weiman's company relationship is documented separately from the PurposeBuilt production network; the network page does not map Weiman SKUs to a plant.
- Method and Raid brand facilities do not prove where the cross-listed floor cleaner or roach baits were produced.
- Essential Home brands use the completed 31 December 2025 divestment disclosure, not stale Air Wick website wording that still names Reckitt alone. The announcement body date is used; its page header is inconsistent.
- Bona factory network evidence is explicitly dated to its 2024 report. Current SKU routing is unverified.
- Supplier outreach, confidential factory lists, retailer/vendor documents and SKU/batch-specific labels may be needed to close the remaining factory gaps. No outreach was sent.

Factory validation: all 841 directory CSV rows (840 labels plus missing-brand group) sum to 10,141 records. Tested actual generated search/status handler, alias boundaries, missing brand fallback, owner-only records, retained fields, safe HTML/CSV handling and selected-product factory exports. All 11 selected correction records export a research status and explicitly unverified exact SKU factory. Browser rendering remains unverified: preview routing failed, and a later attempt to select the preview tab was rejected by browser URL policy. No browser workaround was attempted.

The existing optimizer generates `brand-factories.html`, `brand-factory-directory.json` and `brand-factory-directory.csv` on each build. Existing publishing and weekly schedules remain unchanged.
