# Exact-offer photography follow-up — 4 November 2026

**Status: publication approved by Ryan on 4 November 2026 for the original GitHub site.**

Baseline: `royhei-cpu/royhei-cpu.github.io` main commit `2c7b45eb08a39624e0c8164ab50d6fc180c321c6`. That commit already contains 33 offer-linked photos and nine offer audits. Those are existing work, not additions made by this follow-up. The earlier `PHOTO_REVIEW_2026-11-04.md` describes the preparation of that previous change; its unpublished-status wording is historical.

This follow-up adds **two authentic source photographs**, bringing the dataset from 248 to **250 references**, with **35 photos linked to the nine reviewed offers**. All 98 brand profiles, 67 price observations, original 215 collection references, weekly data and publishing/scheduling configuration are preserved.

## New verified additions

Both photographs appear in the official [Safari Select Aerolite black cabin product gallery](https://safaribags.com/products/safari-select-aerolite-black-cabin-trolley-bag-with-laptop-compartment-tsa-lock-dual-wheels-and-anti-theft-zipper). Direct HTML was retrieved on 4 November. Its Product JSON-LD identifies **SKU AEROLITE554WBLK**, **GTIN 8901229199808**, and the Cabin variant. Both images were visually inspected. They are source-produced photographic detail graphics; their marketing text is not independent performance testing.

| Added photo | Original image | Verification / limitation |
|---|---|---|
| TSA lock and adjustable trolley handle | [Official photograph](https://safaribags.com/cdn/shop/files/AeroliteAmazonPDP5-100_1500x.jpg?v=1743595769) | Model, cabin size and black color matched. Revision unstated. |
| Dual-wheel and zipper close-ups | [Official photograph](https://safaribags.com/cdn/shop/files/AeroliteAmazonPDP6-100_1500x.jpg?v=1743595769) | Model, cabin size and black color matched. Revision unstated. |

The local JPEGs are proportionally resized/compressed from the source images; no product features or photographic content are generated or reconstructed. Per-image records retain the original source URL, product page, local path, original-file hash and bundled-file hash.

Assembly's [official product-page](https://assemblytravel.com/products/roverpro-moon-white-cabin-hard-luggage) Product JSON-LD additionally establishes **SKU rover-pro-moon-white20**, **GTIN 8906183091625**, variant **42940090646581**. This strengthens the four already matched Assembly images. It does not establish the size of the shared-set main-interior photograph; that record remains a collection alternative.

## Coverage of the nine offers after this proposal

Counts include the existing 33 photos plus the two new Safari details. “Matched” below means model, size and color; revision remains unstated unless explicitly identified. It does not establish an unannounced production revision or physical lot.

| Saved priced offer / source | Photos | Exterior / main interior | Compartment / organization / remaining gap |
|---|---:|---|---|
| [Samsonite Paralux Medium Spinner, Olive](https://shop.samsonite.com/luggage-checked-luggage/paralux-medium-spinner/156525XXXX.html?dwvar_156525XXXX_color=1565251633) | 5 | Matched / matched | Front access, mesh-pocket detail, packing cubes. SKU 156525-1633. Revision unstated. |
| [Assembly RoverPro Moon-White Cabin](https://assemblytravel.com/products/roverpro-moon-white-cabin-hard-luggage) | 5 | Matched / **not verified** | Front laptop access matched. Main-interior photograph is a shared-set alternative with unknown size. Revision unstated. |
| [Kathmandu Hybrid Trolley v5 70L, Pure Navy](https://www.kathmandu.com.au/products/hybrid-trolley-v5-70l-pure-navy) | 3 | Matched / matched | Backpack harness shown; v5 revision named. No separate small-pocket close-up. |
| [Nasher Miles Dubai 20-inch dual-color cabin](https://nashermiles.com/collections/advanced-hardside-luggage/products/nasher-miles-dubai-hard-sided-polypropylene-cabin-luggage-pastel-green-navy-blue-20-inch-55cm-trolley-bag) | 3 | Matched / matched | Pastel Green / Navy Blue from saved source and gallery; interior organizer graphic and lock/wheel detail. Revision unstated. |
| [Safari Select Aerolite Cabin black](https://safaribags.com/products/safari-select-aerolite-black-cabin-trolley-bag-with-laptop-compartment-tsa-lock-dual-wheels-and-anti-theft-zipper) | 4 | Matched / matched | **Two new detail photos. Open laptop-compartment photograph still unavailable.** Revision unstated. |
| [Skybags Twentyfour7 Pro Cabin](https://vipbags.com/products/skybags-twentyfour7-pro-cabin) | 4 | Model/size only / model/size only | Gallery shows Cobalt Blue STTWP8W55CBL; saved price record has no color. Laptop compartment and dimensions included, with color warnings. Revision unstated. |
| [Skyline 20-inch Hardside Carry-On Tan](https://www.target.com/p/-/A-92118303) | 4 | Matched / matched | Divider, straps, main cavity and dimensions. TCIN 92118303. Revision unstated. |
| [Samsonite FLATFORM 55 cm Dark Moss](https://www.yodobashi.com/product/100000001010283165/) | 4 | Matched / matched | Front access, laptop/tablet organization. UM0*18001. Revision unstated. |
| [Samsonite Upscape 75 cm Blue Nights](https://www.yodobashi.com/product/100000001008919813/) | 3 | Matched / matched | Divider, straps, lock. KJ1*01003. No separate removable-liner close-up. Revision unstated. |

Across these 35 photos, 30 match model/size/color (three also name the v5 revision), four have unknown linkage to the saved offer's color, and one is a collection alternative. Eight offers have model/size/color-matched exteriors; seven have matching main interiors. The other 58 priced offers have not received an exact-offer audit in this task.

## Source-check limits

Direct product HTML was retrieved for Assembly, Kathmandu, Nasher Miles, Safari, Skybags and Target. All 21 pre-existing image filenames for these six offers were found in their respective pages, and both new Safari images were found in its gallery. Raw source snapshots and their hashes are retained in the local review evidence folder, outside the proposed repository patch.

The Samsonite US page returned HTTP 406 to direct retrieval; both Yodobashi pages timed out. Their model, size, color, identifiers and product galleries were re-read through web-indexed page content. Those sources may be cached; live HTML revalidation is not claimed. All 35 bundled photographs decode locally and their asset hashes match their records. These checks do not guarantee future availability of external original-image URLs.

Retailer searches included Myntra's black Aerolite listing 33427806. Search results identify the model, but the page returned a maintenance response. No photograph was accepted from that inaccessible page. Similar blue Aerolite, other Rover models, shared sets, and a source-page photograph with a closed laptop compartment were not promoted to exact missing-view evidence.

## Exact proposed GitHub changes

Only `luggage-atlas/` files change:

- `photos.json` and `photos.js`: append two Safari detail records; add the two verified SKU/GTIN identities; record direct-versus-indexed source recheck methods and limits. Existing prices and product names are untouched.
- `offer-photo-assets/offer-safari-lock-detail.jpg` and `offer-photo-assets/offer-safari-wheel-zip-detail.jpg`: the two new source-derived images.
- `offer-photos.js`: explicitly allow only recognized matched states into matched-photo exports; reject a photo attached to another offer; retain unknown-color views as qualified display images. Export their URLs in dedicated color-unverified columns. Include bundled paths and per-image evidence in CSV. Enlarged-image failures show the unavailable message.
- `atlas-upgrade.js`: use warning styling and visible scope text for qualified/collection images; show verification status in the enlarged viewer.
- `workbench.js`: clarify the separate qualified CSV columns. Selection, filtering and cost calculations are unchanged.
- `index.html`: update cache keys for the four changed runtime scripts.
- `validate_photos.py`: verify unique audit linkage, existing price identity, allowed statuses, matching identity fields, valid local paths and SHA-256 integrity.
- `test_offer_photos.cjs`: exercise all nine galleries' generated markup, all 35 paths, selected export data and the real CSV serializer; reject unsupported status and wrong-offer mutations.
- `README.md` and this follow-up: current counts, maintenance and review status.

The full binary patch was prepared separately in the local review evidence folder before approval and includes the two image files. The post-approval main-branch check found `d3edc5d1e7072722e483b10f67a1a189f6fd3f30`, with no intervening Luggage Atlas or shared publishing-workflow changes; those other repository updates are preserved.

## Verification and remaining limitations

Passed: research/photo/fashion validators; nine-offer photo tests; existing workbench cost/selection/filter tests; weekly briefing/filter/export tests; JavaScript syntax checks; local decoding and SHA-256 checks for all 35 offer assets; CSV parsing and column alignment; original research/pricing/weekly-data preservation.

The four-product example CSV selects Assembly, Safari, Samsonite Paralux and Skybags. Assembly's exact main-interior cell is blank; its shared-set image is in the alternatives column. Skybags' matched exterior/interior cells are blank; its Cobalt Blue views are in the color-unverified columns. Safari's two new detail URLs and both newly verified identifiers are present.

**Rendered browser QA is not complete.** The in-app browser refused access because its admin-enforced security-policy check was unavailable. No alternate browser path was used to bypass that check. Gallery/comparison markup and download serialization passed automated checks, but desktop/mobile appearance, real browser image loading, console health and physical download interaction remain unverified in this run.

Ryan explicitly authorized publication of this release on 4 November 2026. This follow-up does not change the existing weekly schedule or authorize unrelated future publications.
