# Independent site maintenance — November 13, 2026

The user's latest correction overrides the November 12 shared-template redesign. Homecare, China Toy Atlas and Luggage Atlas MUST stay separate at their existing public URLs, with each site's ORIGINAL aesthetic, artwork, photographs, navigation and assets. Never replace them with one shared interface or a cross-site navigation bar.

Keep search, product details, saved selections, comparison, CSV/photo exports and sourced daily news. Homecare MUST retain its native white-label recommendations, competitor reference products, evidence and proposed improvements. Do not restore planograms, virtual aisles, Blender/3D prototyping, BOM or design workshop controls. Retired workshop links redirect into the relevant site. Research photographs remain available.

## Build

`publish.yml` builds Homecare's original UI via `npm ci --prefix home-care/ui-src`, `npm run build --prefix home-care/ui-src`, then optimizes the STAGED `_site/home-care/index.html`. Never optimize the canonical source index in place. China Toy Atlas retains its app, simple-navigation, original styles, character photos and comparison. Luggage Atlas retains its travel artwork, original app, feature finder, product gallery and comparison.

`.github/scripts/pages/build-directories.py` creates normalized evidence payloads and daily-news-data.js ONLY. It must never overwrite original HTML, controllers or styles. `prepare-distinct-sites.py` excludes retired development modules, redirects old workshop bookmarks and versions assets. `release.py` checks canonical records and the original public app scripts.

## Daily research

Keep every stable ID, exact offer, retained observation, source, original currency and photo scope. Distinguish launch, retailer listing, catalog addition and check dates. Never invent prices, stock, sales, rankings or factories. Missing data remains unverified. A build is not new research. Only advance review dates after completed source checks. Preserve last working data on failure. Update directory-news.json with factual sourced events; also keep the original weekly/retailer-story evidence current. White-label recommendations in Homecare remain evidence-scoped hypotheses; do not declare unverified assortment gaps.

## Tutorial and verification

Each website has its OWN updated tutorial. Homecare: videos/homecare-guide.mp4. Toys: tutorial/China_Toy_Atlas_Tutorial.mp4. Luggage: tutorial/luggage-guide.mp4. Keep each guide aligned with its site's controls and original visual identity. Do not restore the common tutorial or regenerate for routine data updates.

Run the publish staging steps, directory.test.cjs, relevant data tests and release catalog validation. Check desktop/mobile search, filtering, source details, selections, comparison, CSV, daily news and video. Homecare additionally requires working white-label recommendation navigation. Publish to the existing GitHub Pages workflow and follow through successful deployment/public-byte verification.
