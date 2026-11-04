# Retailer stories and news

The original GitHub Pages app includes **Stories & news** at `#stories`, with
separate views for news/releases, retailer backgrounds and shop journals.
The workshop's **Retailer story & news** link follows the currently selected
source. A profile can open that source in the aisle builder without replacing
the saved assortment.

## Coverage and evidence

The initial 4 November 2026 edition covers **34 retailer/operator profiles**.
It reconciles all 26 configured catalog sources, all 18 tracked China chains,
the directly captured POP MART offer and the Target planning reference. Multiple
channels of one operator share a background profile. This is coverage of the
Atlas registry, not every retailer in China or the world.

Origin details use linked retailer background pages where available. Profiles
with only catalog, mall or manufacturer context say that the fuller history is
incomplete. Company authenticity, authorization, current stock, national coverage
and sales are not inferred from inclusion. Product photographs are existing
scoped catalog examples. Shelf ideas are explicitly Atlas editorial suggestions.

News keeps the original publisher, URL, source-check date, publication date,
market and a separate event/release date. Announced future events remain plans.
Retailer-arrival dates do not become worldwide product launch dates. Manufacturer
announcements name the participating chains. Retailer interviews and buying
guides are in Shop journals, separate from news and independent reporting.

News and journal cards include locally cached publisher photos or the exact
series photograph already documented in the release evidence. Captions link to
the image's source, which can differ from the article publisher. Exceptionally
tall release posters show a labeled image detail. When no usable article photo
is available, the card shows a clearly labeled retailer catalog example. The
Target wish-list article uses a scoped squishy example rather than wider toys.
Failed image loads also fall back to a catalog example, preserving the source
link and avoiding a broken-image icon. Images have descriptive alternative text,
reserved space, lazy loading and a responsive layout.

The initial archive contains 129 dated items, including 21 news/release entries
and 32 journal entries in the latest 90 days. Twenty-two profiles have a dated
item somewhere in the archive. The other profiles explicitly show no verified
dated update; this does not assert that those retailers have no activity.

## Updating

`retailer-stories.json` contains the reviewed backgrounds, curated summaries and
an allowlist of public journal feeds. `build_retailer_stories.py` merges those
with existing scoped manufacturer/chain announcements and a dated feed cache.
`retailer_news_images.py` reads article/feed imagery, caches validated image
files, and retains photo attribution. Existing images are reused on later builds;
an unavailable image does not fail the news refresh. New image files are copied
by the existing Pages images step. No image service or generated news art is used.

The existing Pages build runs `--refresh-feeds`. Six discovered public Atom
feeds, belonging to five retailers, are checked concurrently. The existing weekly
catalog refresh causes the normal Pages build; no separate monitor, account,
subscription or new scheduler is required. Curated backgrounds and news retain
their own review dates. Other retailers' new posts still require source research.

On feed failure the previous dated entries and last-success date remain intact,
and the source-health disclosure shows the failed check. The builder excludes
undated/future-dated entries, duplicate article URLs and identified out-of-scope
product topics. It never invents news for missing feeds. It updates the generated
JSON/JS and the index asset hashes before publishing.

## Checks

`test_retailer_stories.py` checks publication versus update dates, future-post
exclusion, article deduplication across retailers, source coverage and retained
cache behavior after failed retrieval. `workspace_acceptance.py` with
`ATLAS_QA_SCOPE=stories` checks all 34 source-linked dialogs, filters, archive and
empty states, workshop navigation without lost products, and 1440/847/390px
layouts. The normal all-scope UI workflow includes this journey.

Manual visual review uses the Codex in-app browser. Browser plugin is not
available in this session; the existing Playwright regression runner provides
automated checks. Chromium and responsive layouts were checked; native iOS
Safari and exhaustive visual verification of every linked article were not.
