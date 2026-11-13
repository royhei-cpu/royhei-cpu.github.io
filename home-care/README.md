# Home Care catalog

Public catalog: https://royhei-cpu.github.io/home-care/

`site/` contains all catalog HTML, scripts, photos and the tutorial video. The one-time import copies the existing public catalog into this repository. After `site/migration.json` is committed, publication reads committed files and does not fetch the old host for Home Care.

The 13 November 2026 targeted daily review preserves 10,253 records and adds two exact Costco Dreame cleaning-appliance listings plus one exact TikTok Shop steam-cleaner listing, for 10,256 canonical records. The public directory also retains 613 international references, for 10,869 displayed records. Exact model or variant, retailer/seller identity, source URLs and photos were checked. These are new to this directory, not verified launches; retailer first-available dates remain unknown. Amazon access remained blocked, and full category pagination remains incomplete. See `site/catalog-review/daily-source-check-2026-11-13.json`.

Effective 12 November 2026, the public Home Care experience is the simple shared directory: product search and details, side-by-side comparison, CSV export, dated news and the common tutorial. `DIRECTORY_MAINTENANCE.md` supersedes historical UI instructions below; retired analysis, workshop, 3D and opportunity tools must not be restored.

Weekly updates must edit this catalog in place, preserve all records/photos, the default Browse competitors view, selections and Excel-compatible CSV export. Use verified retailer listing dates only; unknown dates remain Not verified. Push changes under home-care/ to trigger the existing GitHub Pages publication. Preserve the existing root dashboard and Pawlish paths. Keep local links under /home-care/.


## Targeted coverage-gap follow-up — 2 November 2026
Preserved all 9,623 prior records and added 510 verified product-page references, for 10,133 total. Albertsons: 8, Amazon US: 252, BJ’s Wholesale: 5, CVS: 19, Costco: 4, Dollar General: 2, Dollar Tree: 7, Home Depot: 53, Kroger: 33, Lowe’s: 30, Publix: 13, Safeway: 11, Sam’s Club: 6, TikTok Shop: 9, Walgreens: 12, Walmart: 46. Amazon now has 736 records; 160 new records have item-specific Date First Available evidence. Empty retailer/category cells fell from 51 to 11. These are catalog additions, not launch claims. All seven opportunity areas reviewed; no rank movement. Full inventories and the comprehensive 285-cell source review remain incomplete.
Read GAP_REVIEW_2026-11-02.md. Do not call this a complete inventory review.

## Published sales ranking — 3 November 2026

The catalogue now offers **Rank by sales** and a **Units sold / purchases: high–low** sort. The build attaches `sales-ranking-model.js`, `sales-ranking.js` and `sales-ranking.css` through `sales-ranking-build.mjs`. Preserve these files and the integration when updating the catalogue.

Rank only within the same retailer, metric type, reporting period and sales snapshot date. Amazon and Walmart purchase badges are not audited exact unit sales. Unknown-period TikTok sold totals and third-party tracker counts stay in separate groups. Preserve `+`, K/M abbreviations, the original count text, source URL, period and actual `metricDate`; never replace that date with the date this feature was published. Equal displayed values share a rank.

Use `salesItemSource`, a direct product URL or a direct metric source to identify the listing. Keep the latest saved snapshot per listing in ranking results without deleting older catalogue records. Category evidence sources can be shared by distinct products and must not be used alone to deduplicate listings. Missing figures remain unavailable, never zero. Storefront-only counts without an exact item identity remain visible in Browse but unranked.

The 3 November saved-data audit found 10,133 retained catalogue records, 911 with numeric published counts, 908 with sufficient ranking evidence and 906 distinct eligible listings after snapshot deduplication. In the default Home Care scope, the corresponding figures are 10,007 / 892 / 889 / 887. Counts were observed on 27 October, 31 October and 1 November; this feature release does not refresh those observations or complete retailer inventory coverage.

CSV exports include rank in the current view, comparison group, numeric count, qualification, metric type, period, snapshot date and source, alongside all existing fields. Future weekly data updates are processed automatically by the same model.

Run the ranking model checks with `node --test home-care/sales-ranking-model.test.cjs`. Build integration anchors are asserted so source-layout changes cannot silently omit the feature.


## Merchant charts, expanding opportunities and product comparison — 3 November 2026

The optional **Sales & analysis** view derives its charts from the current merged ITEMS dataset. Preserve merchant-analytics-model.js, merchant-analytics.js and merchant-analytics.css, and their build injection in optimize-loading.mjs. It shows dated sales leaders within the existing strict comparison cohorts, category/retailer research coverage, sales evidence availability and conservatively screened USD offer-price bands. Coverage is collected records, not market share. Offer prices are not normalized for pack size; sub-$1, conditional, unit-price, ambiguous or insufficiently sourced values are excluded from the price chart without changing the original records. Revenue and growth remain unestablished without appropriate comparable data.

The **White-space opportunities** view groups candidate merchant research directions into eight product platforms. The seven original umbrella briefs retain their order; additional specific concepts are marked Explore. The live count comes from the model definitions rather than a fixed UI limit. Platform and detail-level filters distinguish a larger programme from the specific concepts underneath it, alongside category, retailer and search controls. opportunity-model.js derives matched references, retailer breadth, sales cohorts and dated evidence from current records. Preserve the model's category-specific matching rules, bounded word matching, exact-listing deduplication and balanced retailer examples. New additions can expand evidence automatically; adding/refining directions and confirming product fit still require research review. The model must not infer demand, environmental benefit, safety or a Target assortment gap from a title match. Target assortment, guest needs, costs, margin and performance remain validation gates. Source check dates are retained separately from the 3 November analysis release date. Every direction includes customerNeed, differentiation, platformId/platform and portfolioRole metadata. Union counts across concepts must deduplicate listing identities, not sum overlapping counts or representative record IDs. A four-reference shortcut preserves all other selections and opens the shared compare/export flow.

product-compare.js and product-compare.css add **Compare selected** using the existing shared picks selection and hc-merchant-picks storage. Selection works across Browse, analysis examples and opportunity examples. Comparison includes photos, prices, category/pack context, dated sales evidence and direct source/photo links, with explicit paging for larger selections. Export remains selected-only and includes absolute photo URLs, product links, exact sales listing URLs and evidence URLs; CSV does not embed images. Do not silently discard selections when switching filters, tabs or comparison pages.

Browse competitors remains the default opening view. Charts and analysis are derived from saved evidence, not a claim that retailer pages were rechecked on the feature-release date. No catalogue records or underlying prices/sales were changed in this release. Continue adding source-backed product coverage in the existing weekly task, alongside refreshing analysis and reviewing candidate directions. Keep the same public URL and preserve other repository projects.

Checks: run node --test with sales-ranking-model.test.cjs, merchant-analytics-model.test.cjs and opportunity-model.test.cjs under home-care/. Also exercise graph filters/cohorts, all opportunity directions, shared selection, comparison pagination/removal and CSV photo/source links against the built page. Preserve original record values.

## Target / Open Story inspiration — 3 November 2026

The user also requested identification of competitor ideas that could fit Target, compared with Open Story. The optional Target inspiration view uses target-inspiration-data.js, target-inspiration.js and target-inspiration.css. Official Open Story benchmarks cover carry-on and checked luggage, backpacks, weekend/garment bags, packing and toiletry systems. Their IDs use TARGET-OPENSTORY-<TCIN>, with cached source photos under site/target-photos/. Additional global travel references use TRAVEL-* IDs. Both register in byId for shared selection, comparison, Saved view and CSV; neither is appended to competitor Home Care ITEMS or its counts/charts. All valid stored reference IDs are restored after registration. Missing photo URLs export blank instead of the catalogue URL.

This is a separate, focused Target source review on 3 November, alongside the unchanged Home Care evidence described above. Record public-source retrieval dates and price caveats. The clear-pouch source returned mixed crawl ages up to five months; the stored $12 offer requires rechecking. No Target unit sales or first-listing dates were established.

Open Story is a travel brand. The initial travel fabric-care pouch, clean/used laundry module and refill-system secondary carrier remain accessory enhancements. The expanded review places larger luggage, backpack, weekend/garment and coordinated travel programmes first, with qualitative review priority and its rationale. Each shows what Target already offers, a competitor feature to learn from, a differentiated concept and validation questions. Do not infer a full Target gap or copy a household formula into a travel brand. Preserve the Home Care/Travel merchant-routing distinction, performance qualifications and Target's existing baseline. Front-pocket luggage, compression components, adaptive backpacks, garment duffels and drop-bottom weekenders already appear in the researched Target assortment; concepts must state what improves instead of implying these formats are absent. Use observed price architecture and explicit model/size/region/offer qualifications, without inventing proposed retail prices, revenue or margin.

Benchmark IDs stored before page load must be restored after registration without losing competitor picks. The selected-only Browse view reads byId entries so selected Target references are visible there too. Ordinary Browse and all sales analytics continue to use canonical ITEMS.


The expanded Target interface renders on first open, after lightweight reference registration at mount. Search, product-platform, scope and qualitative-priority filters preserve the original recommendation indices for comparison-set controls. Product evidence and the full Target/travel reference libraries are collapsed by default. Selection is shared with every other view, including filtered-out products. Source and price dates must not become the feature publication date. Keep the existing Luggage Atlas and all other repository projects intact when publishing Home Care changes.

## Targeted coverage correction — 4 November 2026

See COVERAGE_CORRECTION_2026-11-04.md. Eight new listings and three evidence-backed Naturals cross-listings yield 10,141 retained records. `category-cross-listings.json` adds secondary category memberships without changing original fields or duplicating SKUs. Browse and the coverage matrix include these memberships; primary-category analytics retain their existing grouping. CSV exports include secondary memberships and separately dated observed-price evidence. Zero unrepresented cells does not establish complete retailer assortments. Preserve the correction file and new part-038 in future builds.


### Brand and factory evidence

`site/brand-factories.json` contains reviewed exact brand aliases, separate brand-owner and manufacturer/supplier evidence, and disclosed manufacturing facilities. `brand-factory-build.mjs` supplements the merged catalog without changing existing fields, generates the searchable `/home-care/brand-factories.html` directory plus JSON/CSV, and extends product Details and selected-product CSV exports. Unmatched brands receive a pending status and no verification date; missing brands remain missing. Disclosed brand facilities are never represented as an exact SKU/batch factory. The initial review supports 31 raw brand labels with facilities and 108 with company evidence; remaining research gaps are explicit.

Run `node --test home-care/brand-factory-build.test.mjs` for provenance, alias, safe output and generated-directory filter checks. The existing publish job runs the optimizer and copies its generated outputs; no workflow or weekly schedule change is required.


## Original-address global workspace — 4 November 2026

The user's screenshot confirmed that their working address is `/home-care/` in this repository. Earlier Homecare/White Label Workshop changes had been deployed to a separate `cleantrend-opportunity-hub` project. This integration places the new workspace directly inside the original catalog without replacing its 10,141 records, sales analysis, shared picks or exports. Keep `/home-care/` as the canonical app address for this project. Other root-repository projects are unchanged.

`homecare-upgrade-build.mjs` augments the final optimized HTML, rather than rewriting the 17 MB original index. `ui-src/` contains the new React workspace, the authored 36-concept / 50-reference White Label Workshop, its four-color BOM/cost tools, native model viewer and opt-in ambient/button audio. `site/workshop-assets/` contains all 252 verified deliverables, including 36 self-contained development archives. `ui-src/workshop-assets.json` retains their hashes. International product images retain the existing published `/cleantrend-opportunity-hub/` image paths; the images are recorded references, not newly checked sources. Do not remove that project's image folders without migrating these references. All new application navigation stays under `/home-care/`.

`site/global-reference-products.json` brings in 611 recorded international references. The global view combines them with every original U.S. catalog record: 10,752 record identities across 20 normalized countries, including 11 China records (JD.com 9, Taobao 1, Tmall 1). Snapshot duplicates can remain; these are not counts of unique SKUs or complete live assortments. Original prices, currencies, IDs and source dates stay intact. Foreign references register in byId for the existing comparison / selected-only CSV, without entering U.S. sales rankings. Preserve hc-merchant-picks.

The default opening remains Browse competitors. An immediately visible introduction links to global products, China and the White Label Workshop; the older weekly brief is collapsed below category browsing. Both build-time HTML order and runtime navigation place Opportunities last, after other views and resources. The native product comparison detects selection changes through the original redraw/export controls, and opening a native view hides the added workspace.

Rebuild with `npm ci --prefix home-care/ui-src` and `npm run build --prefix home-care/ui-src`. Publish runs these automatically before the original optimizer. The committed asset manifest binds compiled assets to their source hashes. Run `node --test home-care/ui-src/upgrade.test.mjs home-care/homecare-upgrade.test.mjs home-care/sales-ranking-model.test.cjs home-care/merchant-analytics-model.test.cjs home-care/opportunity-model.test.cjs home-care/brand-factory-build.test.mjs`. The optional all-items-snapshot opportunity test remains skipped when its fixture is absent; core preservation, China browsing, comparison identity, archive integrity and navigation tests run without that fixture. Browser/device appearance remains unverified when the app's admin security-policy check is unavailable.


## Workshop photograph comparison update — 4 November 2026

Each of the 50 national-brand benchmarks now has a locally cached product photograph in `site/benchmark-photos/`. `ui-src/benchmark-photos.json` records each source image, source page, credit, photo review date, dimensions and file hash. Manufacturer images are preferred; exact product images from named retailers are credited to those retailers when manufacturer delivery is unavailable. Regional packaging, color and individual-container detail differences remain explicit. The original benchmark price/fact dates are retained; adding a photo does not refresh prices or establish stock.

The workshop shows the concept and its two photographed references together on desktop, with responsive photo cards, full-size photo links and expandable source details. All 36 concepts retain the existing engineering targets, four finishes, real Blender assets and editable cost scenarios. Suggested changes are grouped into existing-brand facts, proposed improvements and validation evidence. Configured HTML briefs now carry both benchmark photos and credits; the base A0 Blender ZIPs retain their existing content. Opportunities remains last.

The existing publish test command now checks photo completeness and bytes, renders all 36 concept/component states, exercises specification units and pricing edits, and verifies photo attribution in saved briefs. Browser preview remains unverified when the app cannot complete its admin security-policy check.


## Current website tutorial — 4 November 2026

The tutorial at `/home-care/tutorial.html` now covers the global/China listing controls and the White Label Workshop with national-brand photos, proposed changes, specs, pricing and downloads. Opportunities is last in both the video navigation and the written guide. The release is an explicitly labeled narrated illustrated guide with synchronized captions, chapter seeking and direct section links, not a live screen recording. After the voice service quota was exhausted, the user approved macOS Samantha for English narration. The guide includes the dedicated workshop pages and current A1 laundry-sorter views. See `tutorial-media/README.md` for the reproducible project and review limits. `assemble.py` replaces both the current video name and legacy video/download aliases during publication, and `guide.test.mjs` checks source compatibility and media integrity in the publish workflow.


## First-visit navigation — 4 November 2026

The default route opens a lightweight Start here section, with one primary product-browsing action and a three-step research/development path. Shared navigation groups tools under Home, Products, Workshop, Insights and Opportunities (last). U.S. and global browsing share product selections; old country and category links remain supported. Browser Back/Forward restores the requested section. Workshop uses three review panels, with national-brand photos first, next/previous controls and direct links to each stage. No-JavaScript workshop pages retain all three panels. Help & guide contains a new quick guide and the existing narrated tutorial, which now explains the menu grouping in writing. Sound controls occupy one small button. Product records, source qualifications and development assets remain covered by the existing regression suite. Browser layout/screenshot verification remains unavailable under the existing admin security restriction; DOM interaction tests and source/build checks are used without a browser fallback.

