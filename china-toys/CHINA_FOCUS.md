# China market focus

Reviewed 31 October 2026, Asia/Shanghai.

The analytical default is mainland China. Keep international offers and popularity references for discovery and comparison, clearly labeled by market. Do not delete the broader catalog or treat Chinese brand origin as evidence of mainland availability.

## Public-site study and resulting changes

| Reference | Useful pattern | Atlas implementation |
| --- | --- | --- |
| KikaGoods blind-box collection | Category, stock and release discovery | Quick category/availability filters and a sourced China release calendar |
| hobbyDB list management | Organize research around specific collectibles | Browser-local research statuses and notes with an export |
| The Toy Chronicle | Dated news and distinct popular content | Market watch separates reported facts, interpretation and next checks |
| Moojing public product pages | Filter analysis by category/market and export | Explicit topic, market and evidence-date filters; source-bearing CSV |

References: https://www.kikagoods.com/collections/blind-box ; https://help.hobbydb.com/support/solutions/articles/36000263960-how-to-create-and-manage-lists ; https://www.thetoychronicle.com/ ; https://www.mktindex.com/ . Public feature descriptions were studied. No paid account, proprietary dataset or competitor performance was tested.

## Evidence rules

- `china-market-data.js` is reviewed research, not scraped live rankings. Each item retains its market, publisher, publication/observation date, actual measurement period, metric, attributed fact, interpretation, next check and source.
- The 7/30/90-day controls filter source publication or observation dates, relative to today in China. They do not turn historical studies into rolling sales windows. Future dates are excluded. Empty results are explicit.
- The H1 2026 China table contains only the three reported leading IPs and their chart-appearance counts. The article was published 1 July 2026. Counts are not units or unique weeks.
- The Q3 product-count threshold group is not ordered by rank, and displayed cumulative counts are not incremental Q3 units.
- Retailer curation and social reach are discovery signals. Do not label them China national sales ranks.
- Global POP MART revenue remains accessible under a clearly titled benchmark, outside the default China ranking.
- China releases derive from exact catalog evidence. Shared source/date records are grouped for the calendar. Announced dates and historical launch RRP do not prove present stock or current value.
- Current international offer ranges remain grouped by currency, market, product and pack in the existing price module. They are observed asking prices, not completed transaction values.
- User research notes stay in browser storage; CSV carries absolute photo URLs, details, sources and price groups. CSV does not embed photos; the existing comparison photo sheet does.

## Weekly maintenance

Preserve the compact weekly headline first. Update source research only after verification, retaining original event and measurement dates. Keep market references labeled. Retain source and assortment limitations in the detailed audit. A fresh catalog build must not silently freshen old evidence.

Run `china_intelligence_test.py` alongside existing navigation, weekly, comparison and IP checks. It checks filter boundaries, ranked scope, release deduplication, actual CSV downloads, conflicting-filter resets, local note persistence/deletion, formula-safe exports, responsive layout and deep audit links. Keep new asset copy hooks in publish.yml. Keep the narrated browsing/comparison/export tutorial available.
