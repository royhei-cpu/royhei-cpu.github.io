# Luggage Atlas

A sourced global luggage brand and trend research website. Research edition: **3 November 2026**.

Live path: https://royhei-cpu.github.io/luggage-atlas/

## This edition

- 97 brand profiles across established, design-led, value, outdoor and children's travel segments.
- 46 retail channels, each with explicit coverage status; brand stores are linked separately.
- 65 product/collection price observations in original currencies, with model, market, price basis and date.
- Eight design directions and 22 dated, seasonal or year-qualified market signals.
- 18 model-level feature records; unknown features are distinct from absent features.
- Seven captured Yodobashi bestseller positions, plus separate Amazon and TikTok marketplace signals.
- Published sales with reporting entity, period and scope retained.
- 16 qualitative guest-feedback entries: six specific models with 18 selected/inspected individual reviews, plus four additional mixed-model source sets.

## Reading the evidence

This is a geographically broad research sample, not a census of all brands, retailers or SKUs worldwide. A category link establishes a retailer's luggage offer, not a fully captured assortment or verified stock. Country denotes brand origin/home identity, not manufacturing location. Ambiguous and mixed histories are disclosed.

Brand positioning and design directions are editorial classifications. Retail ranks are not worldwide brand ranks. Ratings, review counts, rounded purchase badges and reported financial revenues are different measures and are never converted into one synthetic popularity score. No undisclosed unit sales are estimated.

Prices are snapshots. Sale, launch-RRP, starting-price and unavailable-variant conditions remain visible. Currency conversion is deliberately omitted. Identically named models can differ by region or revision. Research date is not launch date, and retrieved pages can contain cached observations.

Guest themes are purposively selected, non-random qualitative accounts. Historical, pre-trip, mixed-size and promotional feedback is qualified. A complaint is not an independently verified defect rate. Features come from brand specifications, not laboratory testing. Recommendations are hypotheses for guest validation and costing.

## Files and maintenance

- `data.json`: readable research dataset and source URLs.
- `data.js`: identical data assigned to `window.ATLAS` for buildless hosting.
- `weekly.json` / `weekly.js`: weekly launch briefing, status counts, dated evidence and Open Story hypotheses. Baseline window: 28 October–3 November 2026.
- `photos.json` / `photos.js`: 213 visually reviewed photo references across all 97 existing brand profiles, including interior references for 80 brands. This is not matched photo coverage of every priced SKU. Each photo retains its own model/collection caption and source; cross-model references are disclosed.
- `photo-assets-*.js`: compressed source-photo previews. Original image URLs remain in the photo dataset and CSV.
- `atlas-upgrade.js` / `upgrade.css`: weekly dashboard, photo gallery, enlarged viewer and photo exports.
- `assets.js`: small bundled source-photo previews keyed by brand ID. Original source image URLs remain in the dataset and CSV export.
- `hero.css`: embedded illustrative still life. It depicts no named brand.
- `index.html`, `styles.css`, `app.js`: responsive application, filters, shortlist comparison, profile drawer and Excel-compatible CSV exports.
- `validate.py`: structural data integrity check.

A weekly research task is scheduled for Monday mornings around 10:00 Asia/Shanghai, beginning 9 November 2026. The site is not a live price/stock feed; a successful research run must update the checked date and preserve earlier editions. To update it, revisit the sources; preserve each measure's market, period and scope; revise both data formats; validate; and commit. Do not merely change the edition date. The shared GitHub Pages workflow copies this directory into the site's output.

Product and campaign photos belong to their respective brands/retailers. Their source links are retained. The opening image is an AI-generated editorial illustration and is labeled as such on the website.

## Validation

Run `python3 luggage-atlas/validate.py` from the repository root and `node --check luggage-atlas/app.js`. Verify desktop and mobile navigation, filtering, profile/compare controls, currency separation and CSV downloads in a browser after deployment.


## Style, shopper and manufacturing extension — 3 November 2026

98 brand/collection assessments, 47 retail channels and 67 price observations. Quince was added with two official US price references and two clearly differentiated image references. Amazon remains sampled rather than exhaustive. `fashion.json` provides an assessment and sourcing status for every brand. Shopper groups are editorial need-based hypotheses, not measured demographics. Trend evidence distinguishes launch/collection activity, a marketplace snapshot and unverified growth. There are 15 profiles with sourced manufacturing context of differing strength; none establishes an exact SKU/lot factory match. Unknown factories stay unknown. Recheck dated trade leads before treating a supplier as current.

Maintain `fashion.json` and `fashion.js` together. New profiles must have a style assessment, signal provenance and explicit supplier status. Do not infer OEM relationships from visual resemblance, brand home, retailer identity or component suppliers. All filters, shortlist comparison and CSV exports include the new fields.
