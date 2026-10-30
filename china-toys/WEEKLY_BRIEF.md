# China Toy Atlas — executive weekly brief

The first main section is **What changed this week**, headed **China Blind Box & Squishy Weekly Brief**. It follows the user's Home Care reference: four summary tiles, concise highlights, expandable why-it-matters/next-check notes and source links. The IP ranking and narrated tutorial remain immediately accessible.

## Rendering and preservation

`weekly-brief.js` builds the brief from `window.TOY_ATLAS`. `install_weekly_brief.py` appends it idempotently to the existing `catalog-guide.js` after the `ATLAS_EXECUTIVE_BRIEF_START` marker and updates the guide's cache version in `index.html`. The existing publication workflow already copies that bundle. Do not replace the earlier facts-first guide or tutorial when editing the brief.

The brief retains the existing `#weeklyOverview`, `data-weekly`, `data-view` and `data-open` handlers so counters open the real filtered catalog and highlighted products open the existing full-detail dialog. It updates after the original weekly summary rerenders. The shop selector controls its scope; it is deliberately an overview of all brands at that shop, not the current text-search result count.

## Numbers are computed, not edited examples

- **Catalog additions:** non-baseline entries first seen during the seven days ending at the catalog's saved update date. This is not a launch count.
- **New releases:** captured entries with a source-stated exact release day in that period. Estimated dates are not assigned an exact week. Announced or preorder release dates do not prove stock has shipped; display source market.
- **Current trend signals:** dated, source-backed flags still inside their stored review window. Includes earlier evidence and is not necessarily new this week, measured growth, units sold or a nationwide rank.
- **Shops with listings:** distinct captured shops in the selected scope, not every retailer in China.
- Price and restock links use recorded histories, matched to the selected shop's URLs.

A product may qualify for more than one change group. The unique changed-entry count is calculated separately. Initial imported records remain baseline. Never use the old illustrative 0/4/8/19 counts or invent additions to fill a tile.

## Highlights and trend watch

Show up to three data-change highlights and two evidence-source-grouped trend-watch highlights. Every highlight links products/sources and explains next verification steps. Historical trend reports retain their real evidence date and are marked outside this week when applicable. Keep current trend watch separate from weekly events. A retailer's hot collection is an early selection signal, not independently measured China-wide demand. Possible appeal is interpretation, not demonstrated sales causation.

Keep full source collection and detail-review dates visible and separate from the catalog save date. Preserve missing-source and overdue notices. This interface update is not itself a fresh check of every product.

The IP table retains its existing **POP MART H1 2026 global revenue** basis. Do not relabel it an all-China or all-company bestseller table, mix GMV with revenue, or change the reporting period to the weekly update date.

## Tests

Run `python china-toys/install_weekly_brief.py`, `node --check china-toys/catalog-guide.js`, and `python china-toys/weekly_brief_test.py` with Playwright Chromium installed. The existing Monday refresh includes these steps. Tests cover metric-to-result consistency, retailer scope, product detail links, ranking scope, tutorial playback/audio-track presence, no JavaScript errors and 1440px/768px/390px layouts. Screenshots are saved outside source under `/tmp/china-toys-weekly-brief-qa/`. Inspect them before making visual-quality claims. This is not an exhaustive product/source audit or a physical-device listening test.
