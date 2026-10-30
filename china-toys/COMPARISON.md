# Select and Compare — China Toy Atlas

Use **Select for comparison** on a product card or in its product details. Select between two and six product/shop offers, then press **Compare**. The selection bar stays visible while browsing. Remove individual columns or Clear the comparison selection. Bookmark shortlist and comparison selection are independent.

Selections are stored in this browser's local storage. They persist across brands, shops, filters, pagination and reloads, but are not synchronized between devices. If browser storage is unavailable, the page explains that persistence is limited to the open page.

Each column retains the selected product and its shop URL. Different captured shops for the same product may be compared separately. The comparison displays price, currency, pack/variant, market, stock observation, checked date, source-linked specifications, dates, trend evidence, photos and further captured offers. A historical China launch RRP must never become a current shop asking price. Choosing a different shop option uses that option's recorded price, SKU and image where available. These are captured observations, not a live checkout quote. No automatic best-value or bestseller ranking is generated.

Download comparison CSV exports only selected offers, independent of the current catalog filter. It includes price basis, source URLs and relevant evidence fields. Missing values remain empty rather than fabricated. Formula-like strings are escaped for spreadsheet safety.

## Maintenance

- `compare.js`: standalone feature; keep it separate from product-data collection.
- `install_compare.py`: idempotent index integration and content-hashed asset reference.
- `compare_test.py`: selection persistence, max count, remove/clear, option-specific prices, CSV consistency, existing browsing flows, cached image decoding, desktop/mobile Chromium and mobile WebKit.
- `.github/workflows/china-toys-compare-live.yml`: tests the actual deployed page, including long-title wrapping, shop examples, historical price labeling and existing public navigation.
- Weekly refresh runs the installer and comparison audit before committing and publishing. Preserve `compare.js` in the existing public-site copy step. Do not reintroduce unrelated catalog links.

A functional pass is not a certification of complete China-market coverage, accurate national sales rankings or every image's semantic match. Image file decoding, source association and visual identity review are different checks. Browser emulation is not a physical iPhone test. Inspect final screenshots and report exact audit scope.
