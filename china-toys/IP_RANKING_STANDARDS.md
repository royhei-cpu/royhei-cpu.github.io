# China Toy Atlas — character coverage and ranking rules

Reviewed 30 October 2026. Keep the existing public address and tutorial.

## Required examples

The six brands in the user's screenshots are POP MART, TOP TOY, 52TOYS, Finding Unicorn, Heyone and TNT SPACE. The seven character families are THE MONSTERS/LABUBU, MOLLY, SKULLPANDA, DIMOO, HIRONO, Nommi and CRYBABY. All must remain separately clickable with counts recalculated from the current catalog. Matching examples is not proof of complete China-market or brand-assortment coverage.

`ip-market.json` stores exact-name aliases, evidence and ranking values. `ip-directory.js` provides character navigation and clearly scoped sales references. `build_ip_directory.py` integrates these controls, rebuilds `ip-market-data.js` and `ip-coverage.json`, and preserves the existing catalog and narrated tutorial. Run it after `review_publish.py` in a weekly refresh. `test_ip_directory.py` checks the requested examples, ranking values/export, character filters, reset, retailer filters, details, tutorial metadata and desktop/mobile views.

## Ranking basis

The current comparable table ranks the eight artist IPs individually disclosed in POP MART's H1 2026 results, published August 20, 2026, printed page 30. Values are CNY thousand in the source and CNY million on screen. This is unaudited company-reported global revenue across product formats, not China-only sales, blind-box-only sales, retail GMV, unit sales or brand valuation. THE MONSTERS includes LABUBU; do not call the total LABUBU-only revenue. Other artist IPs are grouped and cannot be individually ranked from this table. Listing counts never determine sales rank.

Nommi's reported full-year 2025 sales threshold and YOYO's first-nine-months 2026 global GMV stay in separate panels because their metrics and periods differ. Tmall brand ranks remain separately labeled by platform and month. Do not turn selected disclosed positions into a complete league table.

Recheck primary filings before changing values or claiming a newer period. A weekly catalog check must not relabel an old sales period as current weekly sales. Keep source links, publication dates, period and geography with every ranking and export. Broader companies with no comparable disclosure remain unranked rather than receiving guessed positions.

## Coverage and trend evidence

The character list includes original Chinese IPs and imported/licensed characters. An overseas listing does not establish mainland availability. Some products match multiple collaboration characters; do not sum character counts as unique products. Preserve brand, studio, retailer and IP distinctions. Exact word matching prevents accidental name fragments such as DORA inside 'adorable'.

IP-wide revenue does not prove that each product is trending. Retain the separate dated product-level trend reasons and possible-appeal interpretation. Preserve all existing photo-review limitations, richer available facts, unknown-information disclosure and #tutorial video player.
