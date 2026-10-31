# Brand and maker directory

The user wants comprehensive China blind-box and squishy discovery, including small studios. `brands.html` is the public directory; the six navigation shortcuts are not the coverage boundary.

## Identity and coverage

- `brand-registry.json`: reviewed company/brand and IP profiles with sources, explicit aliases, scope and review dates. Industry-list mentions remain weaker than a company profile. Do not infer China origin from an overseas seller or a Chinese exhibitor registration.
- `brand-discovery.json`: separate organizer-listed company leads. The 31 October 2026 snapshot screens all 77 China Toy Expo pages / 1,537 exhibitor records. Relevant leads have an explicit Blind Boxes category or a squishy term in an exhibitor-supplied profile/product title. Mainland/Hong Kong exhibitor registration is not manufacturer certification, brand origin, present stock or full assortment.
- `build_brand_directory.py`: reconciles every current catalog brand/source label exactly once. Generates JSON/JS from the catalog and reviewed records. Automatic labels remain unverified; retailer-only squishy labels are not promoted to verified Chinese brands. Brand-not-disclosed records stay visible without becoming an invented brand.
- Brand-group counts sum exact label counts. Each alias has its own native catalog link with its matching count; no speculative reassignment of products. Character/operator relationships stay separate from brand identity.
- Missing listings show source links instead of empty catalog buttons. Product photos use existing catalog images with a seller-label attribution; they are not brand logos or a new visual authenticity certification. CSV exports filtered identities, coverage, source links and photo URLs.

## Weekly workflow

Run `refresh_brand_discovery.py` for a fresh organizer-directory sweep when reachable; it retains the prior successful snapshot on incomplete fetches. Review newly found companies, specialist-store categories, official brand portfolios and Chinese maker aliases. Add verified identities to the registry with their actual review dates. Preserve uncertain names and provenance. A new review date must not be applied automatically to old identity claims.

Run `build_brand_directory.py` after catalog updates (also executed by publish.yml), then `brand_directory_test.py` alongside `china_intelligence_test.py`. Verify all captured labels remain accessible, missing-listing entries do not navigate to empty results, aliases open the right counts, exports include source/photo columns, and phone/tablet layouts fit. Keep the prominent All brands & makers link on catalog, research and directory pages.

The directory is not a completed national census. Publish exact source coverage and counts by identity type; never label all directory entries, catalog labels, IPs or exhibitors as verified Chinese brands. The persistent goal is expanding verified coverage, not inflating one total.
