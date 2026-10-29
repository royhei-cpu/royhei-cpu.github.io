# China Toy Atlas

Public directory: https://royhei-cpu.github.io/china-toys/

An image-led research directory for blind-box and squishy products associated with the China toy market. **This is not a verified census of every product sold in mainland China.** The catalog includes international listings of Chinese brands and source-labeled makers/IPs; each listing's market remains visible. Some imported or unidentified brands require further China-availability verification.

## Use the catalog

- Select a brand tab, or **Show all brands** to find a smaller maker or source label.
- Use **Product type** to distinguish figures, plush, dolls, squishies and squishy blind boxes.
- **Trending** shows dated evidence, not a popularity guess. A retailer's hot-list inclusion is labeled a weak retailer signal.
- **Launches & waves** shows only sourced releases or explicitly supported approximate periods. The actual named series stays intact; no invented chronological wave numbers.
- **New this week** separates new discoveries, recent documented launches, price changes and restocks. Initial imports are baseline records, not new launches.
- **Details & evidence** opens the product photograph, date provenance, variant/pack basis, market, source links and any sales/trend evidence.
- Bookmark products into a device-local **Shortlist**. **Export CSV** exports the current selection; the footer's full CSV exports the entire directory.

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
