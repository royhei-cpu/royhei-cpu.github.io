# China Toy Atlas

Public directory: https://royhei-cpu.github.io/china-toys/

An image-led research directory for blind-box and squishy products associated with the China toy market. **This is not a verified census of every product sold in mainland China.** The catalog includes international listings of Chinese brands and source-labeled makers/IPs; each listing's market remains visible. Some imported or unidentified brands require further China-availability verification.

## Use the catalog

- **Explore** searches every captured product / series, with brand, shop, character, type, currency, release and evidence filters. Selected filters remain visible. Switch between grid and table presentations. Additional mobile filters expand on demand.
- **Rankings** separates eight disclosed global POP MART IP revenues, unranked dated product signals, and catalog-coverage positions. Each view explains its metric, period, source and limits. A position in this catalog is not a sales position.
- **Compare** selects two to six shop offers, preserves them on this browser, and shows source-specific prices, market, pack, dates, specifications and variants. Export selected offers as CSV or a photo sheet. Products can also be selected directly from an inspiration board.
- **Inspiration** groups real catalog records into six discovery collections, using explicit product categories or title keywords. These are editorial browsing prompts, not demand claims. All photos remain the existing linked source photos.
- **Saved collection** keeps bookmarked products on this device. It is independent of comparison selection and is not synchronized across devices.
- **Retail chains**, **Weekly brief**, and **Sources & methods** preserve the detailed chain evidence, dated additions / changes, research notebook, launch timeline, coverage gaps, and narrated tutorial. Brands & makers opens the full directory.
- **Download results CSV** exports the currently filtered catalog, including original photo URLs and evidence. CSV files contain photo links, not embedded images.

`simple-navigation.js` provides the unified workspace around the existing catalog and comparison engines; scoped styles in `styles.css` preserve the standalone brand and research pages. Existing scheduled publication copies both files. `workspace_acceptance.py` covers the new navigation, scoped rankings, persistent selections, exports and responsive layouts; legacy UI test entry points delegate to the equivalent workspace checks.

## Dates and prices

1. Exact product release: show the date and source market.
2. Supported approximate release: show ≈ month/year, quarter or range with source and confidence. Do not invent a specific day.
3. No release evidence: show the earliest available retailer listing separately. A listing or discovery timestamp is not a verified product launch; preorders and relistings can distort it.

China launch RRP, current listed price, foreign retail price and completed transaction prices are different. Keep currency, market, variant/pack and observation date. Never convert an overseas price and label it China RRP. Missing units sold are **not disclosed**, not zero. Product-level unit counts need channel, scope and period; reviews, views, opening stock and brand revenues are not sales units.

## Data coverage

Counts refer to **product/series listings**, not necessarily individual figure SKUs. Variant-specific records and cross-store naming differences can remain. Long-tail source labels may be characters or studios rather than independently verified manufacturers. The coverage table shows these gaps instead of implying national completeness.

All visual records require a real, matching source photograph. Photos are cached as JPEGs under `images/`; failed image records go to `research-queue.json`, not an illustrated placeholder.

## Maintenance

- `sources.json`: base public product feeds, alias map, priority brand order and standards.
- `refresh.py`: feed ingestion, photo caching, price/restock history and baseline preservation.
- `enhance.py`: expanded squishy sources, specialist product parsing, brand-label cleanup, research-field preservation, URL deduplication and export.
- `enrichment.json`: reviewed product-specific dates, price evidence, approximate periods and trend annotations. `match_terms` must identify the exact product form; avoid matching every accessory with the same IP name. New products require an image and source URL.
- `catalog.json`, `catalog.js`, `catalog.csv`: generated outputs. Do not hand-edit these instead of updating the source or enrichment layer.
- `report.json`: exact coverage counts and source-read status.
- `index.html`, `styles.css`, `app.js`: static interface. No login is required to browse.

GitHub Actions workflow `.github/workflows/china-toys-refresh.yml` runs Mondays at **00:30 UTC / 08:30 China time**, and on relevant collector/configuration changes. It checks syntax, collects records, caches photographs, commits changed data and dispatches the existing `publish.yml` workflow. The existing Home Care and Pawlish pages are preserved. A separate weekly research task reviews Chinese announcements and missing launch, price, sales and trend evidence; it updates `enrichment.json` on the same repository.

Trend annotations carry `observed`, `expires_on`, `source`, `period`, `market`, `level`, `label` and `summary`. Do not refresh an old press claim's event date just because the article was checked again. Date estimates carry `precision`, `confidence`, `source`, `market` and `evidence`.

Local collector command: `python china-toys/enhance.py` (Python 3.12+, requests, beautifulsoup4, Pillow). Local UI: serve the repository with a static HTTP server and open `/china-toys/`.

Brand names, photographs and other product rights belong to their respective owners. This directory links to original sources for research and verification.


## Retail-chain assortment evidence

`chain-assortments.json` now covers 18 tracked mainland retailers with 81 product/series records: 69 first-party sale records, 10 secondary flagship reports and two independent store reports. The expanded registry includes POP MART, TOP TOY, 52TOYS, TOYCITY, Lenle, Bandai Namco Shop, March Monster, Tomato Pocket, Snack Busy and Zhao Yiming alongside the original eight chains. MINISO has three official mainland sale records, separate from its eight secondary Tmall reports. It is separate from the seven MINISO showcase records and from general brand listings. The existing chain tabs render these records with search, product-type filters and expandable product details.

Run `python china-toys/build_chain_assortments.py` to validate the source and generate the browser data, CSV and `CHAIN_ASSORTMENT_REVIEW.md`. Publication rebuilds these outputs. The existing weekly workflow also runs `--check-sources`, recording link reachability without changing historical price, release, evidence or stock dates. New products require manual source review by the existing weekly research task; link reachability alone does not update an assortment.

Weekly research must revisit every retailer in `chain-assortments.json`, retain the original eight source reviews in `chain-coverage.json`, and search for additional China toy retailers, prioritize direct retailer or flagship offers, and retain the distinction between first-party sale announcements, secondary seller reports and promotional showcases. No stock, sales units or completeness claim can be inferred from a company profile. Add new verified records to the source JSON, rebuild outputs and keep the public URL and schedules unchanged.

The 31 October expanded pass adds 34 product/series records and six Lenle relationships on existing products. Shared products with different retailer release dates use `chain_releases`; neither the UI nor the CSV collapses them into a misleading universal date. Six video-sourced records and one store report have explicit unavailable-photo labels and source links; no fabricated photo is shown. This is an exception for text-only chain evidence, not a relaxation of the main catalog photo requirement. The original 4,230 catalog records, seven MINISO showcases, separate brand navigation, publication URL and Monday schedule remain preserved. No complete current chain inventory has been established.

Five recent 52TOYS manufacturer launches are retained in `brand_release_references`, excluded from chain counts because no specific retail channel was established. Two dated reporter-observed 52TOYS store assortments are clearly labeled independent reports.

## Retail studio · November 2026

The original site now has **Retail studio** (`#retail`): selectable 3D display packs, an accessible shelf plan, editable facings/tickets/fixture, custom products and locally saved assortment plans. A twelve-product discovery edit and dated Target.com benchmarks provide a starting point. Export CSV/JSON/PNG or a textured GLB for Blender. Pack sizes and proposed tickets are explicit planning assumptions; Target stocking is not inferred. See [retail/README.md](retail/README.md) for sources, score methodology, the Blender helper and rebuilding instructions.
