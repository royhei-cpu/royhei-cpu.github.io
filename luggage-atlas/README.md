# Luggage Atlas

A sourced global luggage brand and trend research website. Research edition: **3 November 2026**.

Live path: https://royhei-cpu.github.io/luggage-atlas/

## This edition

- 98 brand profiles across established, design-led, value, outdoor and children's travel segments.
- 47 retail channels, each with explicit coverage status; brand stores are linked separately.
- 67 product/collection price observations in original currencies, with model, market, price basis and date.
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
- `photos.json` / `photos.js`: 250 photo references across all 98 brand profiles, including interior references for 88 brands. Of these, 35 are linked to nine reviewed priced offers, with match status and unresolved views recorded separately. This is not matched photo coverage of every priced SKU. Each photo retains its own model/collection caption and source; cross-model references are disclosed.
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

98 brand/collection assessments, 47 retail channels and 67 price observations. Quince was added with two official US price references and two clearly differentiated image references. Amazon remains sampled rather than exhaustive. `fashion.json` provides an assessment and sourcing status for every brand. Shopper groups are editorial need-based hypotheses, not measured demographics. Trend evidence distinguishes launch/collection activity, a marketplace snapshot and unverified growth. There are 20 profiles with sourced manufacturing context of differing strength; none establishes an exact SKU/lot factory match. Unknown factories stay unknown. Recheck dated trade leads before treating a supplier as current.

Maintain `fashion.json` and `fashion.js` together. New profiles must have a style assessment, signal provenance and explicit supplier status. Do not infer OEM relationships from visual resemblance, brand home, retailer identity or component suppliers. All filters, shortlist comparison and CSV exports include the new fields.


## Third-party supplier research — 3 November 2026

Eight profiles now include named trade suppliers or listing entities: Quince, Amazon Basics, Away, BÉIS, DELSEY PARIS, Antler, Briggs & Riley, and Monos. Open the **Suppliers & factories** tab, search a brand, then expand **Verify with sources**. Company names and factory/site fields also appear in each brand profile and comparison.

Each new record preserves source type, retrieval date, shipment reference where visible, entity role and model-match scope. Quince’s Last Brand legal identity is bridged to trade associations. Amazon’s exact ASIN listing names a manufacturer and a packer, with regional metadata conflicts disclosed. Monos’s exporter is not promoted to a factory. Jinlin’s Jepara trade address and Semarang directory address remain unresolved. Directory certifications/customer logos are supplier claims, not independently validated audits or proof of a Target Open Story relationship. No exact production-lot factory match is claimed.

Weekly updates should check these sources and seek new model/lot evidence. Preserve previous observations rather than treating a rolling public shipment table as a permanent snapshot. Customs databases may reuse the same underlying manifests; two database listings are not two independent audits. Avoid inferring sales, exclusivity or identical product quality from shared suppliers.


## Premium research desk — November 2026

- `#workbench` compares up to four exact priced offers. Selections and user cost assumptions remain in this browser's local storage; there is no server upload. Export Selected CSV contains the selected offers, sources, exterior/interior photo URLs and scenario inputs/results.
- Cost scenarios use USD. Landed unit cost = FOB + freight + FOB × duty allowance + other unit costs. Gross margin = (planned retail − landed cost) / planned retail. This is simplified planning, not a supplier quote or verified tariff calculation. Blank required costs remain unknown. Non-USD retail conversion needs a user-entered FX rate and does not fill cost inputs.
- `#innovation` maps eight sourced mechanisms/design directions with guest benefits, likely shopper hypotheses, evidence scope and Open Story development questions. Brand performance claims are distinguished from independent tests; assortment activity is not measured demand growth.
- `#tutorial` includes a narrated guided walkthrough, English captions, transcript and MP4 download. The captures use illustrative cost inputs. Media lives in `tutorial/`; update the guide when the visible workflow materially changes.
- Premium styling is in `premium.css`. Keep the research scope, dated observations and exact-model limitations visible.

Validation: `python validate.py`, `node --check app.js`, `node --check workbench.js`, and `node test_workbench.cjs`. Test cost arithmetic, missing inputs, FX isolation, persistence, four-offer limit and selected CSV.


## Weekly dashboard interaction repair — 3 November 2026
Counts and chart bars now drill into matching records. Release status, brand and design-direction dropdowns combine; reset restores the six-record briefing. Every title/card opens a launch-detail dialog with a source-linked photograph, observed pricing and Open Story implication. Directory and interior-photo counts open their corresponding collections. Weekly CSV exports the visible filtered rows and resolves both shared photo IDs and weekly inline photos. BRIEFING SD Light Beige uses a bundled photograph from Isetan’s official editorial article, with original URL, caption and scope retained.



## Offer photography verification

See [the original 4 November photo review](PHOTO_REVIEW_2026-11-04.md) for the previously added 33 offer-linked photos and [the follow-up review](PHOTO_REVIEW_FOLLOWUP_2026-11-04.md) for two additional Safari details, verified identifiers, source-check limits and stricter match handling. Ryan approved publishing the follow-up on 4 November 2026. Keep `photos.json` / `photos.js` synchronized and preserve `offerAudits` during weekly updates. `node test_offer_photos.cjs` checks that comparisons and exports never infer an exact match from a brand, unknown status or different offer. Color-unverified photographs have separate CSV columns; ordinary matched-photo columns retain model/size/color matching with revision limitations disclosed.

## Unified directory and Open Story design studio

The default entry point now shows all 67 saved priced offers, with search, region/currency/type/photo-evidence filters, sorting, local follows and one four-offer shortlist shared with Compare & cost and the new `studio.html`. The research library keeps all previous sections available; weekly records and their update system are preserved. Following stores a local list and does not enable notifications. The photo-gap audit exports all visible offers with reviewed versus unreviewed status. A visual comparison HTML export embeds the available source photographs; CSV retains links and evidence fields.

`studio.html` adds an original Blender-generated concept with shell/trim colors, three formats, compression/cube/divider interiors, front access, wet-pocket and wheel-service options, plus exterior/inside/exploded views. Traveler presets recommend a development starting point with source-linked mechanisms, trade-offs and prototype validation tasks. This is not an existing Open Story product or production CAD; dimensions are nominal design targets, and capacity, mass, cost, material grade and airline fit remain unverified.

The studio exports a Markdown brief, JSON configuration, a concept-versus-shortlist CSV and a customized GLB. `models/open-story-concept.blend` is the editable base model. [The rebuild instructions](design-source/README.md) explain how the JSON configuration regenerates an editable Blender scene. Three.js 0.187.0 is vendored locally with its MIT license; rendering does not depend on a third-party CDN or API. Reference photographs remain separate from generated concept renders.

Additional checks: `node test_directory.cjs`, `node test_studio.mjs`, `node test_studio_ui.cjs`. The last test uses a simulated DOM, not a rendered browser. See [the directory and studio review](DIRECTORY_STUDIO_REVIEW_2026-11-04.md) for verification and remaining gaps. Ryan approved this release for the original GitHub site on 4 November 2026. Rendered-browser verification remains incomplete as documented in the review.


The workshop has a three-section navigation: customize, original versus revised, and upgrade details. Six concise comparison cards appear before an expandable 16-row specification table. Eight upgrade cards explain the original feature, current choice, intended benefit, trade-off, 3D representation and prototype test. Sources/recommendations and full technical details are expandable.

`studio-specs.js` records three distinct Target references, checked 4 November 2026: Aqua Blue Hardside Carry-On TCIN 86391405 (the saved A-88289923 route resolves to this variant), black Signature carry-on TCIN 87249354, and black front-pocket carry-on TCIN 92443469. Each retains its exact source, source HTML SHA-256, stated revision limits and retailer conflicts. Signature compression and the front-pocket case's laptop access are already offered features, not claimed assortment gaps. The front-pocket listing's conflicting item/shipping weights are displayed; no weight-saving claim is calculated. Baseline benchmark observations are separate from the original directory's pricing records.

The original-versus-revised CSV is available without a shortlist. The concept brief and configuration JSON retain all 16 rows, eight detailed upgrade records, selected retail baseline and changes from base Blender defaults. Concept mass, volume, cost and performance remain unknown; the table also identifies expansion and closure/lock mechanisms that are not modeled. Check `node test_studio_specs.cjs` and `node test_studio_ui.cjs`. Rendered browser QA for this update was again blocked by unavailable admin-enforced browser security verification; no alternative browser path was used.


## Travel interface and sound

`travel-theme.css` gives Discover, the existing research routes, the Open Story opportunities page and the workshop a shared travel-editorial finish: ivory/forest/sage colors, restrained terracotta actions, itinerary navigation, clearer controls and a framed 3D stage. `travel-ui.js` highlights the current workshop section. The directory and weekly cover use `editorial-assets/departure-lounge.webp`, a generated fictional airport-lounge scene, labeled separately from product photographs. Its generator, scope and hashes are in `editorial-assets/sources.json`. It is never added to the photo dataset or photographic evidence exports.

The workshop uses a locally generated studio reflection environment, soft directional lighting and a physical shell material with restrained clearcoat. This changes visualization, not dimensions, material grade or tested performance. Customized GLB exports retain the selected surface; the editable base Blender source remains the original development model.

Use **Sound** at the lower right. Music, ordinary button feedback and (in the studio) workshop effects have independent switches; music and effects have separate volume controls. All default off. Enabling a channel or choosing Play explicitly starts playback. Saved settings never auto-play on a newly loaded page. The original eight-bar, 80 BPM ambient composition **Departure Lounge** and all cues are synthesized locally with Web Audio; there are no third-party tracks, samples, streaming services, paid APIs or audio downloads.

Workshop cues distinguish finish changes, inside/front access, exploded/repair views, size, wet-item pocket, camera moves and completed exports. They are interface feedback, not recordings of an existing luggage mechanism. Programmatic clicks, disabled controls and pointer hover do not emit ordinary button feedback. Camera cues happen after an interaction or view-button click, not continuously during dragging.

Playback pauses when the tab is hidden, the user pauses sound, the page is left, the audio context is interrupted or a narrated video/audio starts. The user chooses Play to resume. Preferences are kept only in local browser storage. An unavailable audio API is reported in the sound panel and does not stop research or design controls.

`node test_audio.cjs` checks opt-in, independent channels, volume/muting, two cycles of composition scheduling, voice cleanup, pause/resume races, missing/rejected audio, hidden-tab/media behavior and sound-panel interactions. Existing directory/specification/photo/cost/weekly tests and the actual GLB material/export tests remain required. Browser access was denied by unavailable admin-enforced security-policy verification during this update; rendered desktop/mobile layout, actual browser sound playback and speaker/headphone listening remain unverified. No alternate browser path was used to bypass that control.


The subsequent realism rebuild replaces the earlier 83-mesh block-based model with **151 meshes**: a formed hollow shell, millimetre-scale lip visualization, nearly flush access panel, zipper tracks/teeth/pulls, multi-stage trolley, separate rubber tires and metal axle caps, carry-handle stand-offs, textile normal maps, bindings and stitching. Front wheels and their service markers follow the opening shell. **Extend handle / Retract handle** controls change the model view; the default view and base Blender scene use a retracted handle. The browser GLB retains extended geometry so both positions remain available. Configuration JSON records the trolley visualization for the Blender rebuild. The generated exterior/interior previews have transparent backgrounds and contact shadows.

The rebuilt model remains a development visualization. Its shell thickness, visual fasteners, hinges, texture and other part interfaces are not approved engineering details. Original retail specifications, unknown mass/capacity/cost and photo qualifications are preserved. The older review documents describe the earlier release; the current model revision is recorded in `models/model-manifest.json`.

The actual textured GLB tests use `@napi-rs/canvas` from the bundled Codex workspace runtime to decode and re-encode its embedded images. Outside that runtime, install this as a development-only dependency before running `test_studio.mjs`. Canvas is not shipped as a website dependency. The tests check the actual model meshes, material colors and normal maps, 45 format/color/interior configurations, retracted/extended dimensions, wheel attachment during opening, and customized GLB texture/export/re-import.


## Inside and exploded inspection revision

The earlier interior used flat covers and the exploded pose left its structure difficult to read. Revision `2026-11-04-interior-v6` replaces these with **275 meshes**, including recessed woven liner tubs and side gussets, a shaped document sleeve, a zippered pouch, actual geometric mesh apertures, adjustable webbing and three hollow textile packing cubes. A generated-texture packing fault was also corrected: color space is established before pixel data is filled, and sRGB color maps are kept separate from non-color normal maps. Tests now inspect actual decoded pixel values as well as texture presence.

**Inside** opens flat, with both packing wells upward. **Lift organizers** exposes the lining and cavity without changing the chosen interior configuration; a separate Blender packing-well render also supports this inspection without WebGL. **Exploded** separates and identifies six assemblies with numbered markers, faint assembly guides, a spacing control, individual descriptions and **Isolate selected assembly**. Each view fits its visible geometry to the camera, including on narrow aspect ratios. The static fallback now uses a dedicated exploded render rather than reusing the interior picture. The model is still a development visualization, and exploded spacing is not a validated disassembly sequence.

The customized GLB contains the current view and visible assemblies. Configuration JSON records the organizer inspection, exploded spacing and isolated assembly separately from the design choices. The Blender rebuild saves a complete exterior base scene and generates four views; it does not reproduce browser isolation. Original retail specifications, research photographs, dated prices, shortlist exports, filters, audio and the weekly update system remain intact.

Validation covers decoded color/normal textures, real mesh apertures, all 45 design combinations, visible bounds for three views and three formats at portrait/wide aspect ratios, all six isolated assemblies, spacing/reset behavior, source-linked specification exports, no-WebGL inspection fallbacks and textured GLB export/re-import. Rendered browser interaction remains unverified under the previously recorded browser security-policy block; Blender's actual interior and exploded renders are reviewed directly.

The rear liner is placed in front of the retracted trolley channels so their metal rails cannot clip into the visible packing well. The model test checks their actual bounds in the retracted configuration.

### Model families and priced offers

Find luggage and the comparison picker show a card for each reviewed family, plus one card for each listing whose parent identity is still unverified. Filters run on the original offers before grouping. A size or color selection can only reach an observed combination. Following, comparisons, photo audits and cost calculations continue to use exact offer IDs.

The November 8 review matched all 139 observations in PR #9 to 22 families. BAGSMART Getaway 20-inch has 12 colors. MAIMO STAND U plus has six offers. The STAND U XL and COLOR YOU Kei XL product pages link directly to their smaller sizes and share their SKU series. SPEED U (M15) and its 8 cm expandable version (M15P) are separate. The two BIZTECT series, M12 and M12MP, are also separate.

For subsequent catalog updates, append evidence-backed memberships to `model-evidence.js` under stable family IDs. Mark each reviewed identity as an individual product or a set. Each entry records the grouping basis and maps original offer IDs to their documented options. Use a storefront's model identity and variant metadata, explicit cross-links to other sizes, or a corroborating style code and construction description. Keep revisions, sets with different contents and materially different designs separate. A matching brand or title alone is insufficient. Unknown offers automatically remain individually accessible. Preserve the original price record, including its source photograph. Assign a variant-specific photo only when the source explicitly maps it to that variant.

The model index export includes its record type. Verified families count once and unlinked listings remain labeled. The offer export keeps one row per observed price. The launch export uses dated release evidence in the seven calendar days ending on the catalog's as-of date. Add new release evidence classifications to `recentLaunches` only after confirming their date meaning. Coverage counts do not measure sales.

[MAIMO standard and expandable variants](https://maimo-travel.com/products/m15-s-bk-01) · [STAND U XL size cross-reference](https://maimo-travel.com/products/m3-xl-bk-01) · [COLOR YOU Kei XL size cross-reference](https://maimo-travel.com/products/m2pr-xl-bk-01) · [BAGSMART Getaway color options](https://www.bagsmart.com/products/getaway-carry-on-luggage)
