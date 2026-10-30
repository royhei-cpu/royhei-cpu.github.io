# China Toy Atlas — review and maintenance standards

Updated 30 October 2026. Public address: https://royhei-cpu.github.io/china-toys/

## What this catalog is

A source-linked product-discovery catalog, not a census of every popular brand, every current series, every China retailer or every SKU. Product/series records may represent a whole blind-box assortment, one size or a confirmed-character offer. Brand/source labels are not a validated count of manufacturers.

The priority checklist is in `review-sources.json`. Every checklist name must be marked partial or missing until its complete defined assortment is actually reconciled. The checklist is not a national popularity ranking. Small squishy makers are research targets from specialist stockists, not automatically nationally popular brands.

## Product details and prices

Retain source-stated material, size, source age label, regular/secret designs, stated probabilities, exact series/wave, SKU when available and variant/pack options. `details.field_sources` records the source for each recovered field. Never invent absent dimensions, dates, sales or probabilities.

An overseas retailer price is not a mainland-China price. Historical announced launch RRP is not a current selling price or a completed transaction. Keep currency, market, shop, pack/variant and last successful observation date with prices. Blind boxes, full sets and confirmed characters are different offers.

Launch dates, announced launch dates, retailer publication timestamps and catalog-addition dates are separate. Estimates need dated product-specific evidence. Online and offline launch dates may differ. Do not assign an IP-family date to all its products or a plush launch price to an accessory or figure.

## Images

Every visible product must have a usable real source photograph. Technical decoding, same-source association and visual review are different checks. Do not describe all images as visually audited because files load or image URLs match.

Eight highlighted series were visually reviewed on 30 October 2026. Their exact photo choices and scope are preserved in `photo-overrides.json`. Use a product/series photo rather than box-only packaging for random blind-box listings, clearly stating that designs vary. Gallery images may include alternative designs, rare designs and packaging; they are not guaranteed contents.

The Molynk A Piece of Cake entry was moved out of the product grid because its old photo showed a general store display, not a verified exact product. Keep it as a research lead until an actual matching product photo is visually checked. Do not re-enable it simply by reimporting the earlier news image.

Shopping services, mixed-product compilations, bags and other non-item pages belong in `source_leads`, not toy counts or product-trend counts. Preserve useful source URLs rather than deleting evidence.

## Why something is trending

Every current flag needs a dated product/series-specific reason, market, period and linked evidence. Distinguish reported demand, independently measured growth/ranking and a retailer's curated hot pick. A retailer recommendation is not a nationwide ranking. Expire old signals unless new qualifying evidence is found; reading an old article again does not renew its event date.

Put possible design, gifting, tactile or character appeal in a separate interpretation field. It is not demonstrated sales causation. Brand/IP GMV, campaign-wide totals and social impressions do not establish a particular item's unit sales. Units sold require product-specific source, channel, period and observation date. Initial supply, views, reviews, GMV and revenue must never be converted into units.

## Weekly refresh and preservation

The existing Monday 08:30 Asia/Shanghai GitHub schedule remains in `china-toys-refresh.yml`. Run:

1. `enhance.py` for base source collection.
2. `quality.py` for product-form evidence guards.
3. `review_publish.py`, which runs `review_finalize.py` and `review.py`, restores source-backed details, exact-item facts, variant options, photo choices and exclusions, and appends the evidence UI.
4. `review_acceptance.py`, which runs regression and final-photo checks on desktop and a 390px phone viewport.
5. Save and publish only when the checks succeed.

Use `china-toys-evidence-review.yml` for a manual or source-file-triggered focused review. Both collection workflows share a concurrency group. A browser pass is not a full factual audit.

Preserve “This week's updates” at the top with Added to catalog / New releases / Price changes / Back in stock. Counts respect the selected retailer. Keep catalog update, detail-review and full-collection dates distinct, preserve each offer's successful check date, and show incomplete sources honestly. The initial import is a baseline, not thousands of new launches.

The separate Monday research automation expands Chinese primary-source coverage, fills checklist gaps and rechecks trend explanations. It must not overwrite these safeguards with older code. It does not send recurring emails to third parties.

## Validation evidence

`review-report.json` and `report.json` contain counts and limitations. GitHub workflow artifacts contain desktop/mobile screenshots, browser errors/checks, source-photo contact sheets and sample identities. Inspect actual screenshots before claiming layout quality. Report only the visual samples actually inspected. Test the live URL after publication as well as the pre-publication local build.
