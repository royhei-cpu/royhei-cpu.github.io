# Home Care maintenance — GitHub Pages
Updated 27 October 2026 at the user's request.

## Canonical public site
https://royhei-cpu.github.io/home-care/
Repository: royhei-cpu/royhei-cpu.github.io, main branch.
Files: home-care/site/. Preserve the root tariff dashboard and pawlish/.
The production workflow copies this committed directory to _site/home-care and deploys GitHub Pages. It does not fetch Home Care from Vercel or ChatGPT.
The migration importer is historical and is no longer called by publication.

## Preserve the catalog
Baseline: 6,265 product records, 19 retailers, 6,230 local photos. Preserve stable IDs, all records (including original 530 templates), photos, selections, source evidence, and the optional Opportunities tab.
Keep Browse competitors as the first/default view, with a clearly visible Choose competitor dropdown. Do not make Opportunities the landing screen.
Category labels have no numerical department prefixes. Every item is assigned; Home / adjacent references remain separately filterable.
Keep product/category/retailer filters, advanced filters, pagination, Reset, Select, Clear selection, saved selections, details, and selected-only Excel-compatible CSV export.
Retailer filtering must use the actual retailer field: Amazon US must show only Amazon US records, Walmart only Walmart.
Use /home-care/ for every local asset/link. Images are /home-care/photos/; scripts/styles and tutorial links use this same prefix.

## Data and dates
Read existing home-care/site/index.html before edits. It contains the ITEMS dataset and original cached card templates. Code and data are already functional; patch in place instead of replacing the catalog.
The main card date, default newest-first sort and Retailer listed on / after filter use verified retailerListedDate only. Unknown dates appear last and say Not verified.
Never use import date, baseline date, first review, scrape date or general family launch as an actual retailer listing date. datePosted is the catalog addition date, kept separately in Details and CSV. Preserve original datePosted values. The original 530 use an explicitly labeled baseline.
Current baseline includes 6 verified Amazon first-available dates; this does not claim exhaustive research. Preserve exact evidence terminology, links and statuses. Research missing dates from item-specific primary sources.
Sales figures are sourced counts, not estimates invented to fill blanks. Preserve period, metric date, source and qualifiers. Prices are snapshots and must be pack-specific.
Verify product photos against sources; do not swap unrelated pack, brand or retailer images.

## Weekly updates
Compare with the last successful catalog version. Research public U.S. retailer item pages and official announcements for meaningful new Home Care items, including Amazon, Walmart, Costco and TikTok Shop.
Deduplicate and preserve existing records. Add actual catalog addition date to new discoveries. Distinguish new-to-catalog from verified new release.
Update the existing New this week callout and highlights with up to five meaningful sourced notes. If no new items are verified, state that; do not invent a quota.
Keep weekly review schedule Mondays, Shenzhen time. The existing automation manages research, not GitHub's other projects' scheduled mirror build.
Push verified changes under home-care/ to main. Confirm the publish workflow succeeds and the live catalog changes. If publication fails, retain the last working site and report the specific incomplete step.

## Opportunity view
Keep the seven requested priorities as research hypotheses, not measured market rankings: Electric Cleaning Tools; Sustainable Cleaning; Food Storage; Air Care Premiumization; Pet Odor Control; Pest Control; Home Organization.
Preserve sourced competitor examples and proposed white-label directions. Never invent a 95/100 score, growth, Target assortment gap, margin or approval. National brands are market references.
Home Organization/laundry storage is adjacent and requires merchant ownership confirmation.

## Standalone copy
The existing standalone HTML Library identity is libfile_4a2e4abd3c1c81918f45909eef70aee7. Preserve this identity and embed its photos/scripts/styles when updating it. Its last baseline is version 39; read current version before replacing.
The shareable website link is the GitHub Pages URL above. Never send a ChatGPT Library share URL as the website.
Vercel and Sites are legacy backups; do not restore their catch-all proxy or make them the public refresh destination.

## Validation
Check records/IDs preserved and valid categories. Test all 19 competitor options, category combinations, search, dates, sort, pagination, selection/deselection across pages, Clear selection, Reset and CSV contents. Verify images and video paths resolve within GitHub Pages without login.
Only claim tests actually performed. Do not call collected listings complete retailer inventories.


## 1 November evidence audit
Read AUDIT_2026-11-01.md and site/catalog-review/audit-2026-11-01.json before the next refresh. Current retained total is 9,270 records, including 50 new indexed Amazon references whose live offers remain unverified. Preserve the Evidence filter, on-card evidence labels, absolute image-URL CSV column, new part-030.json and audit-photos packs. Upgrade indexed references only after checking exact item/pack, seller and offer evidence; do not silently label them verified. Continue all 76 currently uncollected retailer/category cells and audit repeated source URLs without deleting stable IDs or legitimate variants. Separate per-batch additions from full Monday–Sunday weekly additions. Never equate record totals or distinct source URLs with complete retailer inventory.


## Amazon product-page follow-up — 1 November 2026

107 new exact-ASIN listings and 2 upgraded indexed references, all with cached product-page photos. Current baseline: 9,377 total; 9,251 Home Care, 126 adjacent; Amazon 484 across all 15 Home Care categories. See `AMAZON_COVERAGE_2026-11-01.md`. Preserve part-031.json, upgrades in part-030.json, evidence controls and prior audit. Category representation does not establish exhaustive inventory. Prioritize remaining retailer/category gaps, seller/stock/price verification and 48 limited-evidence Amazon references.


## Public sources preference and follow-up — 1 November 2026
The user requested other public sources. Use public retailer product pages, official manufacturer evidence and standard web search/retrieval by default; do not require Firecrawl credits or use paid Firecrawl calls unless requested. Continue the Monday schedule. Current baseline: 9,397 records (9,271 Home Care, 126 adjacent). Preserve part-032.json and public-sources photo packs, plus all earlier Amazon upgrades and shards. This batch adds 20 item-page records and fills 13 gaps, leaving 62 empty retailer/category cells. See site/catalog-review/public-sources-audit-2026-11-01.json. Retrieval may be cached; keep price snapshots distinct from live checkout offers.


## All-retailer depth and weekly checks — 2 November 2026
The user reconfirmed Amazon and ALL competitors must be included weekly. Follow each relevant Home Care category link, all accessible pagination/Load More, and individual product links; check existing references and find missing products. Record exact checked scope, counts, pagination status, blockers, and unfinished work. Do not equate represented categories or item-link counts with exhaustive inventory. Public sources are the default; no paid Firecrawl calls unless requested. Existing task 6aceec1967208191bfcb0c91c109cf31 was updated and remains enabled Mondays 08:00 Asia/Shanghai.

2 November depth check: 175 missing product-page records added from Ace and Publix; 46 Amazon references upgraded. 231 individual product links attempted. All 19 retailers, including Amazon, remain in the Monday 8 a.m. Shenzhen refresh scope. This pass does not complete all retailer inventories; 58 retailer/category cells still have no collected records. Preserve all earlier data, part-033.json and new photo packs; retain stable IDs for Amazon upgrades. See PUBLIC_SOURCES_2026-11-02.md and the dated JSON audit.


## Competitor follow-up — 2 November 2026
Preserves all 9,572 current records, including 175 recent Ace/Publix additions and 46 Amazon reference upgrades. Adds 51 exact item-page records with matched photos: Home Depot 26, Albertsons 9, Walgreens 8, Safeway 4, Costco 2, TikTok Shop 2. Total 9,623. All additions are new to this catalog; no new launches or retailer first-listing dates are inferred. Unknown checkout prices and sales remain unknown.
51 empty retailer/category cells remain. Read COMPETITOR_FOLLOWUP_2026-11-02.md before the next pass; continue all 19 retailers and do not equate category representation with inventory completeness.


## Targeted coverage-gap follow-up — 2 November 2026
Preserved all 9,623 prior records and added 510 verified product-page references, for 10,133 total. Albertsons: 8, Amazon US: 252, BJ’s Wholesale: 5, CVS: 19, Costco: 4, Dollar General: 2, Dollar Tree: 7, Home Depot: 53, Kroger: 33, Lowe’s: 30, Publix: 13, Safeway: 11, Sam’s Club: 6, TikTok Shop: 9, Walgreens: 12, Walmart: 46. Amazon now has 736 records; 160 new records have item-specific Date First Available evidence. Empty retailer/category cells fell from 51 to 11. These are catalog additions, not launch claims. All seven opportunity areas reviewed; no rank movement. Full inventories and the comprehensive 285-cell source review remain incomplete.
Read GAP_REVIEW_2026-11-02.md. Do not call this a complete inventory review.

## Charts, expanding white-space analysis and comparison — user request 3 November 2026

Add and maintain a dynamic Sales & analysis view with cohort-specific sales charts, research coverage, data availability and eligible USD offer-price bands. Expand candidate white-space analysis as the catalogue grows; retain the original seven directions in order and add supported research hypotheses beyond them. The current analysis contains 18 directions, with concrete own-brand concepts, supporting records/retailers, dated comparable sales evidence, source links and next Target validation questions. Do not treat missing collected products as confirmed Target or competitor assortment gaps.

This is an analysis/feature release using 10,133 retained records; it adds no new product/source observations. Latest saved general checks are through 2 November and eligible sales snapshots through 1 November. The previous seven-area source review remains dated 2 November. Keep all dates honest and refresh analytical commentary and candidate concepts during subsequent completed research reviews.

The user also requests product selection, side-by-side comparison, and selected-only CSV with photos and links. Preserve shared selections across browsing, sales/price analysis, opportunity examples and reloads. Compare selected renders photos and dated evidence; CSV includes absolute image URLs plus item and sales-source links because CSV cannot embed photos. Pagination in comparison must not truncate the exported selection.

Existing task 6aceec1967208191bfcb0c91c109cf31 was updated to cover graphs, sales analysis, expanding opportunities and comparison/export validation. It remains enabled at Monday 08:00 Asia/Shanghai. All-retailer catalogue expansion and incomplete source coverage requirements continue to apply.

### Added Target brand-fit comparisons in the same release

A later user instruction requested Target inspiration against its Open Story private brand. Four official Open Story travel benchmarks were retrieved separately on 3 November, with product photos, exact links and dated public listing price snapshots. They remain outside the 10,133 competitor catalogue records and can be selected with competitor products for comparison/export. Clear-pouch source freshness is uncertain and its price must be rechecked.

Maintain the three initial feature-enhancement hypotheses: travel fabric-care organization, clean/used laundry separation, and a tested secondary carrier for the existing refill system. Show the already-offered Target baseline and what would need to improve. Open Story travel fit does not establish fit for Home Care chemistry; route those concepts to the proper merchant brief. The weekly automation now includes reviewing these comparisons and checking mixed Target/competitor selection, Saved, photos and CSV links.


### Broader opportunity pipeline — user follow-up 3 November 2026

The user challenged the narrow, small-opportunity focus. Review larger customer-need programmes as well as concrete product concepts. The original seven umbrella briefs retain their order, while specific Home Care directions are grouped into Tools & cleaning systems, Surface & floor care, Kitchen & food storage, Bathroom care, Laundry & fabric care, Paper & disposable essentials, Air/pet/pest care, and Refill & formula systems. Keep platform, role, category, retailer and search filtering usable as the model grows. Programme briefs and concepts can overlap; their counts are not independent market opportunities. New records expand evidence automatically, while new concepts need research review rather than a quota.

Open Story inspiration must cover major carry-on/checked luggage, backpacks, weekend/garment bags and coordinated travel systems, alongside smaller accessories. Use the existing Luggage Atlas research in the same repository as an evidence lead and preserve its files. Recheck exact official model/size/region sources. Show Target's already-offered baseline and the differentiated customer task or performance improvement, a qualitative review priority with rationale, dated observed price architecture, and concrete next validation. Do not imply that existing front-pocket, compression, adaptive, garment or drop-bottom formats are missing. Never invent prospective retail prices, sales, market size or margin.

Global travel references use stable TRAVEL-* IDs and register in shared byId only, alongside TARGET-OPENSTORY-* IDs. Restore valid stored references after registration; preserve selection, comparison, Saved view and complete CSV export. Neither type enters canonical Home Care ITEMS or sales/coverage charts. Preserve exact selected Target TCIN, photo and price associations. Missing photo URLs export blank. Keep larger platform briefs distinct from accessory enhancements, and load the expanded Target interface only when opened.

The existing Monday 08:00 Asia/Shanghai automation was extended with these requirements without changing its schedule or creating another task.

## 9 November 2026 — Monday coverage review and three exact additions

- Preserved 10,239 retained records and added three new-to-catalog exact listings: Walmart 2 and Costco 1, for 10,242 total.
- Verified each addition’s retailer/item identity, pack, exact source page and matched photo. Retailer first-available dates remain Not verified; none is called a new product launch.
- Recorded Costco’s 9–22 November $2-off promotion separately from product, listing and catalog dates.
- Recorded the Bar Keepers Friend Clean & Shine Duo as a verified official brand launch/Target-exclusive signal, not a tracked competitor listing.
- Sampled all 285 retailer/category cells using one retained link where available: 282 populated cells and 280 distinct URLs. Public access was frequently challenged; no category pagination was proven exhausted and no inventory-completeness claim is made.
- Amazon exact-page checks returned HTTP 503/challenges and TikTok exposed keyword metadata without an exact verified live item/seller/stock combination; both remain explicit gaps with zero additions this run.
- Opportunities were reviewed with no material rank/priority movement. Product evidence expands dynamically; dates and price/promotion limitations remain distinct.
- See `DAILY_REVIEW_2026-11-09.md` and `site/catalog-review/coverage-matrix-2026-11-09.json`.

## 10 November 2026 — Daily priority-channel follow-up

- Preserved all 10,242 prior records and added seven new-to-catalog exact listings: Walmart 2, Costco 3 and TikTok Shop 2, for 10,249 total.
- Verified exact item links, retailer/seller identity, meaningful pack/variant and item-specific photos. Retailer first-available dates remain Not verified; none of the seven additions is called a new product launch.
- Upgraded the retained Phueut handheld steam-cleaner record from category-card evidence to an exact TikTok Shop page with official-shop and price evidence. Its 31 October sold-count snapshot remains separately dated and was not overwritten by a lower later display.
- Recorded the official Fresh Step Fleur de Purr No. 9 / No. 27 announcement as an adjacent Pet Odor Control launch signal. It was not added to Home Care ITEMS because cat litter is outside the catalog category set.
- All three new Costco pages reported out of stock in the retrieved web context; warehouse availability was not inferred.
- Amazon remained an explicit gap: all 736 retained records were preserved, but no new exact ASIN page was verified and complete pagination remained inaccessible.
- This daily follow-up checked four priority retailers and did not rerun the full 19-retailer × 15-category matrix. The 9 November matrix remains the latest comprehensive sampling artifact, and no full-inventory claim is made.
- Opportunities were reviewed with no material rank or priority movement. New evidence broadened the standing Tools, Sustainable Cleaning, Dishwashing, Floor Care, Surface Care and adjacent Pet Odor references.
- See `DAILY_REVIEW_2026-11-10.md` and `site/catalog-review/daily-source-check-2026-11-10.json`.



## 11 November 2026 — Daily priority-channel follow-up

- Preserved all 10,249 prior records and added one new-to-catalog exact Walmart marketplace listing, for 10,250 total.
- Verified exact item ID 19056616406, selected 120 mL single-unit variant, marketplace seller WenidZhen, displayed $10.18 offer and matched item photo. Price and availability remain dated, location-dependent observations.
- The seller title includes “2026 New,” but no retailer first-available date or independent launch evidence was established; the item is not described as a new product launch.
- Amazon US, Costco and TikTok Shop each produced zero additional verified listings in this daily check. Amazon exact ASIN/category access and TikTok exact item/seller access remained incomplete; Costco availability remained location-dependent.
- No new in-scope official brand launch was verified.
- This did not rerun the full 19-retailer × 15-category matrix. The 9 November matrix remains the latest comprehensive sampled-link artifact; no retailer inventory or pagination is claimed complete.
- Opportunities were reviewed with no material rank or priority movement. The addition broadens Surface Cleaners evidence only; it does not prove demand or a Target assortment gap.
- See DAILY_REVIEW_2026-11-11.md and site/catalog-review/daily-source-check-2026-11-11.json.


## 12 November 2026 — alternate-source recovery

Preserved 10,250 records; added two Costco Business Center listings and one TikTok Shop listing with exact identity, pack and visually matched photos, for 10,253 records. New to this catalog only; no verified launches. Unknown price, sales, availability and first-listing dates remain unknown. All 19 retailers received one retained-link access probe; this is not category pagination or a comprehensive item audit. Browser access recovered through the shared browser; selections across pages/retailers, reload persistence, compare, CSV download, Clear selection and Reset exercised. Full audit and standalone synchronization status must be confirmed separately. See site/catalog-review/daily-source-check-2026-11-12.json.

The three-row selected-only CSV was inspected for exact row count, retailer mapping, absolute image/product links and separate dated evidence columns. Quince adjacent storage sources were reviewed; conflicting restock snapshots were not treated as new verified news. Coverage collected counts were reconciled to merged records without resetting historical source-review dates.
