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
