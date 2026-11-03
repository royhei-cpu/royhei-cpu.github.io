/* Official Target benchmarks and merchant research hypotheses.
 * Retrieved 2026-11-03. These records are separate from the Home Care catalogue.
 * Prices are public listing snapshots, not live checkout quotes. No sales inferred.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HCTargetInspirationData = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var checkedAt = '2026-11-03';
  var brandUrl = 'https://corporate.target.com/about/products-services/target-brands';
  var priceNote = 'Public Target listing snapshot retrieved 3 November 2026. Store, variant, promotion and checkout prices may differ; current checkout price and stock were not verified.';

  var sources = [
    {
      id: 'target-brands',
      title: 'Target Brands — Open Story, Everspring and up&up',
      url: brandUrl,
      retrievedAt: checkedAt,
      sourceFreshness: 'Search provider reports page crawled on the retrieval date',
      scope: 'Official brand positioning; not a complete assortment audit'
    },
    {
      id: 'target-92150659',
      title: '7pc Packing Cube Set with Compression — Open Story, Black',
      url: 'https://www.target.com/p/-/A-92150659',
      retrievedAt: checkedAt,
      sourceFreshness: 'Search provider reports page crawled on the retrieval date',
      scope: 'Exact selected Black item, TCIN 92150659'
    },
    {
      id: 'target-86391375',
      title: '8pc Complete Silicone Travel Toiletry Set, Dark Ivy — Open Story',
      url: 'https://www.target.com/p/-/A-86391375',
      retrievedAt: checkedAt,
      sourceFreshness: 'Search provider reports page crawled on the retrieval date',
      scope: 'Exact Dark Ivy item, TCIN 86391375'
    },
    {
      id: 'target-92150657',
      title: 'Silicone Bottle Caps — Open Story',
      url: 'https://www.target.com/p/-/A-92150657',
      retrievedAt: checkedAt,
      sourceFreshness: 'Search provider reports page crawled on the retrieval date',
      scope: 'Exact five-cap item, TCIN 92150657'
    },
    {
      id: 'target-92172601',
      title: '5pc Clear Toiletry Set — Open Story',
      url: 'https://www.target.com/p/5pc-clear-toiletry-set-open-story-8482/-/A-92172601',
      retrievedAt: checkedAt,
      sourceFreshness: 'Cached public listing; retrieval providers returned mixed crawl ages (today to 5 months). Recheck current offer.',
      scope: 'Exact five-pouch item and Target staff Q&A, TCIN 92172601'
    }
  ];

  function benchmark(item) {
    var out = Object.assign({
      retailer: 'Target',
      brand: 'Open Story',
      type: 'Target owned brand',
      merchantScope: 'Target inspiration benchmark',
      merchantDepartment: 'Luggage & Travel',
      merchantScopeBasis: 'Official Target travel brand benchmark; separate from the Home Care research catalogue',
      targetReviewRoute: 'Open Story travel accessories; potential enhancement requires merchant validation',
      isTargetBenchmark: true,
      hasSales: false,
      sales: '',
      displaySales: '',
      salesPeriod: '',
      metricDate: '',
      metricSource: '',
      salesEvidenceKind: '',
      salesReviewStatus: 'No comparable sales evidence collected for this Target benchmark',
      salesVerifiedThisPass: false,
      checkedAt: checkedAt,
      checkedDate: checkedAt,
      sourceCheckedAt: checkedAt,
      priceObservedAt: checkedAt,
      priceNote: priceNote,
      priceBasis: priceNote,
      evidenceLevel: 'Individual item link',
      verificationStatus: 'Official Target product page retrieved',
      verificationNote: 'Exact TCIN and selected variant matched to the official page. Public listing snapshot; no checkout verification.',
      sourceNote: 'Official Target item page and product photo retrieved 3 November 2026. Retailer descriptions are not independent performance tests.',
      photoVerification: 'Official product-page main image downloaded and visually matched to this exact pack and variant on 3 November 2026',
      photoVerificationDate: checkedAt,
      photoAvailable: true,
      alreadyOffered: true,
      status: 'Already offered by Open Story',
      gapStatus: 'No Target assortment gap established',
      retailerListedDate: '',
      retailerListedStatus: 'First available date not established',
      retailerDateSource: '',
      dateEvidenceType: 'Not publicly established',
      dateEvidenceDate: '',
      datePosted: checkedAt,
      catalogDateBasis: 'Target benchmark added to comparison research; not a product launch date'
    }, item);
    out.id = 'TARGET-OPENSTORY-' + out.tcin;
    out.title = out.name;
    out.categoryLabel = out.category;
    out.packSize = out.pack;
    out.price = out.displayPrice;
    out.originalDisplayPrice = out.displayPrice;
    out.currentSource = out.url;
    out.listingSource = out.url;
    out.photoSource = out.url;
    out.imageSourceUrl = out.image;
    out.imageSource = out.image;
    out.originalImage = out.image;
    out.image = '/home-care/target-photos/' + out.tcin + '.jpg';
    out.sourceFreshness = sources.filter(function (source) { return source.id === out.sourceId; })[0].sourceFreshness;
    out.observedPrice = { amount: out.priceAmount, currency: 'USD', display: out.displayPrice, retrievedAt: checkedAt };
    return out;
  }

  var benchmarks = [
    benchmark({
      tcin: '92150659',
      name: '7pc Packing Cube Set with Compression — Open Story, Black',
      url: 'https://www.target.com/p/-/A-92150659',
      sourceId: 'target-92150659',
      category: 'Travel Packing Organizers',
      pack: '7 pieces: 4 clothing cubes, 2 small accessory cubes and 1 drawstring shoe bag',
      displayPrice: '$35.00',
      priceAmount: 35,
      image: 'https://target.scene7.com/is/image/Target/GUEST_9658cafb-90da-4ece-9c70-007fd3eed72c?fmt=pjpeg&hei=300&wid=300',
      features: [
        'Separate spaces for clothes, small accessories and footwear',
        'Mesh panels make contents visible; carry handles and zipper closures',
        'Listed material: recycled polyester; care: spot or wipe clean'
      ],
      alreadyOfferedSummary: 'Coordinated travel packing and footwear separation are already part of Open Story.',
      limitations: 'The title uses “with Compression”; this review did not measure compression, capacity, washability or moisture isolation.'
    }),
    benchmark({
      tcin: '86391375',
      name: '8pc Complete Silicone Travel Toiletry Set, Dark Ivy — Open Story',
      url: 'https://www.target.com/p/-/A-86391375',
      sourceId: 'target-86391375',
      category: 'Travel Toiletry Containers',
      pack: '8 containers with clear zipper pouch; listed capacities 0.33–3.38 fl oz',
      displayPrice: '$15.00',
      priceAmount: 15,
      image: 'https://target.scene7.com/is/image/Target/GUEST_5e949b14-621a-4f9d-b47b-a8c20e165a91?fmt=pjpeg&hei=300&wid=300',
      features: [
        'Lotion and spray formats, two silicone bottles, two rolling bottles and two jars',
        'Clear zippered carry pouch',
        'Listed materials: silicone and PET; care: soap and water'
      ],
      alreadyOfferedSummary: 'A multi-format refillable toiletry container system is already offered.',
      limitations: 'Container compatibility and leak resistance were not independently tested. The retailer’s travel claims are not a blanket assurance for every formula, bag or journey.'
    }),
    benchmark({
      tcin: '92150657',
      name: 'Silicone Bottle Caps — Open Story',
      url: 'https://www.target.com/p/-/A-92150657',
      sourceId: 'target-92150657',
      category: 'Travel Spill-Control Accessories',
      pack: '5 silicone caps in different colors',
      displayPrice: '$5.00',
      priceAmount: 5,
      image: 'https://target.scene7.com/is/image/Target/GUEST_4f3f3e9b-2fff-477c-bf3a-3242b1733a26?fmt=pjpeg&hei=300&wid=300',
      features: [
        'Flexible covers intended to help contain bottle spills',
        'Ribbed surface and distinct colors',
        'Listed care: spot or wipe clean'
      ],
      alreadyOfferedSummary: 'Secondary covers for travel bottles are already offered.',
      limitations: 'No universal bottle-fit or leakproof performance claim is established by this comparison.'
    }),
    benchmark({
      tcin: '92172601',
      name: '5pc Clear Toiletry Set — Open Story',
      url: 'https://www.target.com/p/5pc-clear-toiletry-set-open-story-8482/-/A-92172601',
      sourceId: 'target-92172601',
      category: 'Travel Toiletry Organizers',
      pack: '5 clear zippered pouches',
      displayPrice: '$12.00',
      priceAmount: 12,
      priceNote: 'Retrieved 3 November 2026 from a cached public Target listing. Providers returned mixed crawl ages (today to 5 months); recheck the current offer. Checkout price and stock were not verified.',
      priceBasis: 'Cached public listing retrieved 3 November 2026; crawl-age reports vary from today to 5 months. The $12.00 pack offer needs a current checkout check.',
      image: 'https://target.scene7.com/is/image/Target/GUEST_8f7f45f3-8dcc-489b-ac93-6b884210a582?fmt=pjpeg&hei=300&wid=300',
      features: [
        'Transparent mesh-style design for seeing contents',
        'Zipper closures and multiple pouch sizes',
        'Listed material: PEVA; care: spot or wipe clean'
      ],
      alreadyOfferedSummary: 'Visible, modular toiletry organization is already offered.',
      limitations: 'Target staff Q&A describes this set as water-resistant, not leakproof. Conflicting drainage answers were not treated as verified performance.'
    })
  ];

  var recommendations = [
    {
      id: 'travel-fabric-care-pouch',
      title: 'Travel fabric-care pouch',
      fit: 'Strong accessory fit; chemistry requires separate review',
      status: 'Potential enhancement — Target gap not established',
      competitorIds: ['HC-c6ee13cb2027', 'HC-f67966085d93', 'HC-c2fe9922cf3e'],
      benchmarkTcins: ['92172601'],
      targetBaseline: 'Open Story already offers clear organizer pouches. This proposal gives one a specific fabric-care use.',
      featureToAdapt: 'Pocket-size stain pens and individually carried wipes suggest a compact clothing-emergency kit.',
      whyFit: 'Clothing care during business trips and short breaks is a plausible travel-accessory occasion. This is a merchant hypothesis, not evidence of unmet demand.',
      concept: 'Test a slim pouch with a pen loop, separate wipe sleeve and removable washable liner. Evaluate an accessory-only offer first; any bundled formula needs its own brand and category review.',
      validation: [
        'Check current Target travel and fabric-care assortments for an existing equivalent before claiming a gap.',
        'Test whether travelers need this kit and can use it quickly; compare the added organization with a standard pouch.',
        'Verify pen and wipe fit, closure durability, cleaning method and compatibility with any proposed stain-care product.',
        'Confirm cost, pack contents, labeling and merchant ownership before choosing a price or brand extension.'
      ],
      comparisons: [
        { id: 'HC-c6ee13cb2027', title: 'Tide To Go travel-size stain pens, 5 count', retailer: 'Amazon US', url: 'https://www.amazon.com/dp/B0CGL1CNZK', checkedAt: '2026-10-27', featureToLearn: 'Compact stain-pen format', limitation: 'Saved catalogue listing; not reverified in this pass. No sales evidence collected.' },
        { id: 'HC-f67966085d93', title: 'Tide To Go stain pen, 0.33 oz', retailer: 'Ace Hardware', url: 'https://www.acehardware.com/tide-to-go-no-scent-stain-pen-033-oz-liquid/p/1261452', checkedAt: '2026-10-27', featureToLearn: 'Single-pen pack for an individual travel kit', limitation: 'Saved pack wording; formula performance and fabric compatibility require testing.' },
        { id: 'HC-c2fe9922cf3e', title: 'Shout Wipe & Go instant stain remover, 12 wipes', retailer: 'Meijer', url: 'https://www.meijer.com/shopping/product/shout-wipe-go-instant-stain-remover-12-wipes/4650002246', checkedAt: '2026-10-31', featureToLearn: 'Wipe format as an alternative to a liquid pen', limitation: 'Saved catalogue listing; no evidence here of demand, travel compliance or suitability for every fabric.' }
      ],
      sources: [
        { label: 'Open Story clear pouches already offered', url: 'https://www.target.com/p/5pc-clear-toiletry-set-open-story-8482/-/A-92172601' },
        { label: 'Official Target brand positioning', url: brandUrl }
      ],
      sourceIds: ['target-brands', 'target-92172601']
    },
    {
      id: 'clean-used-laundry-module',
      title: 'Clean / used laundry module',
      fit: 'Strong travel-organization fit',
      status: 'Potential enhancement — Target gap not established',
      competitorIds: ['HC-33cd8399cfb7', 'HC-44318cd6f1a6'],
      benchmarkTcins: ['92150659', '92172601'],
      targetBaseline: 'Open Story already separates clothes, accessories and footwear with its packing set. General pouch organization is also established.',
      featureToAdapt: 'A compact laundry bag and collapsible household basket provide ideas for separating used clothing and packing the organizer flat.',
      whyFit: 'A defined clean-to-used clothing workflow extends the packing-cube use occasion. The household basket is a handling reference, not a travel price or size benchmark.',
      concept: 'Prototype a compact module with clean/used labels, an easy-carry loop and removable liner. Evaluate dry laundry separation first; add damp-item containment only if construction and cleaning tests support it.',
      validation: [
        'Check the full Open Story and Target laundry/travel assortment for existing clean/dirty or wet/dry products.',
        'Test fit inside the existing packing system, packed volume, carrying comfort and repeated opening.',
        'Validate laundering, drying and odor-transfer performance; test seams and closures before making damp-item claims.',
        'Research the traveler’s preferred capacity and whether a removable liner adds value at an achievable cost.'
      ],
      comparisons: [
        { id: 'HC-33cd8399cfb7', title: 'Fabric laundry bag with elastic strip, described for travel and home', retailer: 'TikTok Shop', url: 'https://shop.tiktok.com/us/pdp/durable-fabric-laundry-bag-with-elastic-strip-ideal-for-travel-home-use/1732193880230236743', checkedAt: '2026-10-27', featureToLearn: 'Portable fabric bag and laundry-separation use occasion', limitation: 'Saved seller description; washability, drying and moisture containment not independently verified.' },
        { id: 'HC-44318cd6f1a6', title: 'Laundry Turtle collapsible laundry basket', retailer: 'TikTok Shop', url: 'https://shop.tiktok.com/us/pdp/collapsible-laundry-basket-by-laundry-turtle-21-portable-hamper/1730811990203142375', checkedAt: '2026-10-27', featureToLearn: 'Fold-flat storage and easy handling', limitation: 'Adjacent household reference. Its size, construction and price are not directly comparable with a travel module.' }
      ],
      sources: [
        { label: 'Open Story packing set already offered', url: 'https://www.target.com/p/-/A-92150659' },
        { label: 'Clear pouch construction and limitations', url: 'https://www.target.com/p/5pc-clear-toiletry-set-open-story-8482/-/A-92172601' }
      ],
      sourceIds: ['target-92150659', 'target-92172601']
    },
    {
      id: 'refill-secondary-containment',
      title: 'Refill kit with tested secondary containment',
      fit: 'Strong travel-accessory fit; material suitability unproven',
      status: 'Potential enhancement — Target gap not established',
      competitorIds: ['US-052', 'CMP-068'],
      benchmarkTcins: ['86391375', '92150657', '92172601'],
      targetBaseline: 'Open Story already offers refill containers, bottle covers and clear pouches. An ordinary bottle kit or spill cap would repeat the existing proposition.',
      featureToAdapt: 'Reusable food-storage pouches offer closure, wide-opening and stand-up-format references for a secondary carrier.',
      whyFit: 'A validated containment and cleaning workflow could improve the existing toiletry system. The value would need to come from tested compatibility and ease of use.',
      concept: 'Study a washable secondary carrier with clear closure cues, easy access and compatibility guidance for intended toiletries. Prototype around the existing Open Story bottles before adding another container set.',
      validation: [
        'Audit the current Target travel range and test the existing bottles, caps and pouches before defining any missing benefit.',
        'Test closure cycles, leakage, cleaning and compatibility with specifically intended toiletries.',
        'Do not transfer food-contact claims to cosmetics or household chemicals; establish the intended material and formula requirements.',
        'Check current applicable travel rules before making compliance claims, then validate cost and consumer preference.'
      ],
      comparisons: [
        { id: 'US-052', title: 'Stasher reusable silicone half-gallon storage bag, 64 oz', retailer: 'Walmart', url: 'https://business.walmart.com/ip/Stasher-Premium-Food-Safe-Reusable-Silicone-Half-Gallon-Food-Storage-Bag-Aqua-64-oz/124284323', checkedAt: '2026-10-27', featureToLearn: 'Reusable flexible storage and access/closure design', limitation: 'Food-storage reference. Size, price and food-contact claims do not establish suitability for toiletries.' },
        { id: 'CMP-068', title: 'Reusable stand-up silicone storage pouch', retailer: 'TikTok Shop', url: 'https://shop.tiktok.com/us/pdp/reusable-stand-up-silicone-bag-plastic-free-food-storage-solution/1730953996872225688', checkedAt: '2026-10-27', featureToLearn: 'Stand-up pouch format', limitation: 'Saved listing with limited evidence. Its published count has no stated reporting period and is not used to infer demand.' }
      ],
      sources: [
        { label: 'Open Story refill containers already offered', url: 'https://www.target.com/p/-/A-86391375' },
        { label: 'Open Story bottle covers already offered', url: 'https://www.target.com/p/-/A-92150657' },
        { label: 'Clear pouch performance qualification', url: 'https://www.target.com/p/5pc-clear-toiletry-set-open-story-8482/-/A-92172601' }
      ],
      sourceIds: ['target-86391375', 'target-92150657', 'target-92172601']
    }
  ];

  recommendations.forEach(function (item) {
    item.brandFit = item.fit;
    item.comparisonIds = item.competitorIds.slice();
    item.benchmarkIds = item.benchmarkTcins.map(function (tcin) { return 'TARGET-OPENSTORY-' + tcin; });
    item.alreadyOffered = item.targetBaseline;
    item.potentialEnhancement = item.concept;
    item.evidenceBasis = 'Official Target benchmarks plus saved competitor catalogue references; merchant hypothesis, not new competitor source verification';
  });

  return {
    checkedAt: checkedAt,
    reviewedAt: checkedAt,
    sources: sources,
    brand: {
      name: 'Open Story',
      description: 'Target positions Open Story around premium luggage and functional, stylish travel accessories, including packing cubes. Travel organization is the relevant bridge from this Home Care catalogue.',
      positioning: 'Luggage and travel accessories',
      sourceUrl: brandUrl,
      sourceId: 'target-brands',
      fitGuidance: 'Fit assessments below are research judgments. They favor compact organization and care during travel, while each proposed benefit still needs consumer, construction and commercial testing.',
      homeCareRouting: 'Target describes Everspring as a household-essentials brand and up&up as everyday essentials spanning home, personal care and food storage. Household formulas need the appropriate merchant and brand brief.',
      weakFit: 'Bulk cleaning formulas, drain care, pest control and large powered cleaning tools have weak direct Open Story fit without a credible travel occasion. Keep those in the Home Care research route.'
    },
    benchmarks: benchmarks,
    recommendations: recommendations,
    methodology: [
      'Four exact official Target products were reviewed on 3 November 2026; this is a focused benchmark review, not a complete Target assortment audit.',
      'Already offered describes the observed Target baseline. Potential enhancement is a research hypothesis; none of these ideas is a confirmed white space, sales forecast or priority score.',
      'Competitor comparisons use saved catalogue references dated 27–31 October 2026. They were not reverified during this Target pass, and product titles are not independent performance evidence.',
      'Target prices are selected-pack public listing snapshots. Packs and use occasions differ; this analysis does not calculate normalized unit cost, margin or price advantage.',
      'Official product photos are provided for visual comparison with their source links. Brand fit comes from use, function and consumer need; develop original product and packaging designs.',
      'No Target sales figures were collected. These four benchmarks remain separate from the Home Care catalogue, retailer coverage and sales rankings.'
    ]
  };
});
