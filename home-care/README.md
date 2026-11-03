# Home Care catalog

Public catalog: https://royhei-cpu.github.io/home-care/

`site/` contains all catalog HTML, scripts, photos and the tutorial video. The one-time import copies the existing public catalog into this repository. After `site/migration.json` is committed, publication reads committed files and does not fetch the old host for Home Care.

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

