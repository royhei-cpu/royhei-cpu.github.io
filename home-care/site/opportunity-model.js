(function (root, factory) {
  'use strict';
  let salesModel = root && root.HCSalesModel;
  if (typeof module === 'object' && module.exports) {
    try { salesModel = require('./sales-ranking-model.js'); } catch (_) { /* Evidence remains unavailable without the model. */ }
    module.exports = factory(salesModel);
  } else if (root) root.HCOpportunityModel = factory(salesModel);
})(typeof window !== 'undefined' ? window : null, function (defaultSalesModel) {
  'use strict';

  const C = {
    tools: 'Cleaning Tools', appliances: 'Cleaning Appliances', naturals: 'Naturals',
    storage: 'Food Wrap & Storage', air: 'Air Care', laundry: 'Laundry Care',
    surface: 'Surface Cleaners', floor: 'Floor & Carpet Care', bath: 'Bathroom & Toilet Cleaning',
    specialty: 'Specialty Cleaners', dish: 'Dishwashing', paper: 'Paper Towels',
    trash: 'Trash Bags', pest: 'Pest Control', tabletop: 'Disposable Tabletop'
  };
  const TARGET_GAP = 'Candidate white space: Target assortment and guest needs have not been supplied, so a Target gap is not established.';
  const ANALYSIS_BASIS = 'Analysis of saved catalogue evidence; no new retailer verification. Themes overlap and their counts must not be added together.';

  // The first seven titles, order, seed IDs and priority judgments are retained from the existing site.
  // These priorities are editorial research judgments, not a measured market ranking.
  const definitions = [
    {
      id: 'electric-cleaning', title: 'Electric Cleaning Tools', priority: 'High',
      categories: [C.tools, C.appliances], scope: 'Home Care + appliance merchant review',
      seedIds: ['HC-918a1f6d71fc','HC-939353b702ed','HC-02651056d586','HC-e6f1b5e21eec'],
      rationale: 'Powered scrubber formats offer comparisons of reach, replaceable heads and starter-kit contents.',
      concept: 'Evaluate a compact rechargeable scrubber with replaceable heads and a simple starter kit.',
      next: 'Compare task performance, wet-use safety, battery life, head availability and landed cost; confirm the merchant and current Target offer.',
      matchRule: 'Cleaning Tools or Cleaning Appliances; an explicit powered/electric/cordless descriptor and scrubber or cleaning-brush wording.',
      caveat: 'A listing is a format reference, not proof of consumer demand, electrical safety or a performance advantage.'
    },
    {
      id: 'sustainable-formats', title: 'Sustainable Cleaning', priority: 'High',
      categories: [C.naturals,C.tools,C.laundry,C.surface,C.dish,C.floor,C.bath], scope: 'Home Care / Naturals',
      seedIds: ['HC-a0a32eb5cde8','CMP-077','NEW-431','HC-5d99955edcf6'],
      rationale: 'Refill, concentrated and reusable formats provide packaging and repeat-purchase questions to investigate.',
      concept: 'Evaluate a durable starter bottle with refill doses or a reusable cleaning-cloth multipack.',
      next: 'Test efficacy, dose accuracy, cost per use, packaging reduction and repeat use; substantiate environmental claims before making them.',
      matchRule: 'Relevant cleaning categories with explicit refill/tablet/concentrate or reusable-cloth wording; “natural”, “eco” and brand names alone do not qualify.',
      caveat: 'Format wording does not prove a lower environmental impact. Some retained seeds are broader comparisons and need format confirmation.'
    },
    {
      id: 'food-storage', title: 'Food Storage', priority: 'High',
      categories: [C.storage], scope: 'Food Wrap & Storage; coordinate with Kitchen',
      seedIds: ['HC-485c55cce059','HC-f00aea6f6539','HC-6b5967accd13','US-052','NEW-434','HC-b36e232a7ffb'],
      rationale: 'Storage bags, closures and meal-prep containers provide different usage and pack architectures to compare.',
      concept: 'Evaluate leak-resistant storage bags in useful sizes with clear closure and care instructions.',
      next: 'Compare Target’s existing assortment, closure durability, food-contact requirements, cleaning effort and normalized price per piece.',
      matchRule: 'Food Wrap & Storage with food/freezer/sandwich/storage bag or container, reusable wrap, or meal-prep wording.',
      caveat: 'Reusable and disposable formats are separate benchmarks; package prices are not normalized cost per use.'
    },
    {
      id: 'air-care', title: 'Air Care Premiumization', priority: 'High',
      categories: [C.air], scope: 'Air Care',
      seedIds: ['HC-ccf6f864327a','HC-2c50b6011546','HC-bdd7c303a813','HC-f692bae07a17'],
      rationale: 'Device-and-refill formats allow comparison of fragrance experience, design and recurring refill value.',
      concept: 'Evaluate a simple fragrance starter kit with a clearly priced and compatible refill range.',
      next: 'Validate scent performance, device safety, refill compatibility and economics; establish whether the proposal adds a useful Target option.',
      matchRule: 'Air Care with plug-in, warmer, diffuser, starter-kit or fragrance-refill wording.',
      caveat: '“Premiumization” is a retained research direction, not a measured price trend or willingness-to-pay finding.'
    },
    {
      id: 'pet-odor', title: 'Pet Odor Control', priority: 'High',
      categories: [C.surface,C.floor,C.specialty,C.laundry,C.air,C.naturals], scope: 'Home Care + Pets merchant review',
      seedIds: ['HC-f3b2380e5aad','HC-070a17e77eb0','HC-cd3057fb6b41','HC-fcf95316ddc1'],
      rationale: 'Pet stains and odors define cleaning tasks that can guide surface instructions and package formats.',
      concept: 'Evaluate a targeted stain-and-odor remover with clear surface and use instructions.',
      next: 'Benchmark odor and stain removal, surface compatibility and usage conditions; substantiate pet-related safety claims and confirm merchant ownership.',
      matchRule: 'Relevant formula categories with pet/dog/cat/urine wording linked to stain, odor, cleaner or enzyme treatment; generic “pet-safe” alone is excluded.',
      caveat: 'Listing claims do not establish efficacy or safety around pets.'
    },
    {
      id: 'pest-formats', title: 'Pest Control', priority: 'Medium',
      categories: [C.pest], scope: 'Home Care / Pest Control',
      seedIds: ['HC-7845b5d5755d','HC-033c566498a1','HC-b1a1b5ba4964','HC-6295067aa557','HC-7495f1584ff7','HC-665dbc1f4873'],
      rationale: 'Trap, bait and replenishment formats provide starter and refill propositions to compare.',
      concept: 'Evaluate a discreet indoor trap with replaceable capture cards, subject to technical and regulatory review.',
      next: 'Validate efficacy, applicable requirements, electrical safety where relevant, refill cost, seasonal need and Target assortment overlap.',
      matchRule: 'Pest Control with whole-word trap, bait, capture-card or insect-refill wording; substring matches such as “strap” are excluded.',
      caveat: 'Trap, bait and chemical treatments are comparison formats, not interchangeable products or confirmed white-label opportunities.'
    },
    {
      id: 'home-organization', title: 'Home Organization', priority: 'Medium',
      categories: [C.laundry,C.tools], scope: 'Home / adjacent opportunity; confirm merchant ownership',
      seedIds: ['HC-44318cd6f1a6','HC-f9c1834343df'],
      rationale: 'Laundry carriers and cleaning caddies offer small-space handling and storage ideas.',
      concept: 'Evaluate a collapsible laundry carrier or compact cleaning-tool caddy.',
      next: 'Route adjacent storage concepts to the Home merchant; test load strength, drainage, drying, storage footprint and landed cost.',
      matchRule: 'Laundry baskets/hampers/carriers or cleaning/sponge/tool caddies and organizers in Laundry Care or Cleaning Tools.',
      caveat: 'This is an adjacent research area; merchant ownership and the Target assortment need confirmation.'
    },
    {
      id: 'fragrance-free', title: 'Fragrance-Free Cleaning & Laundry', priority: 'Explore',
      categories: [C.laundry,C.surface,C.dish,C.naturals,C.floor], scope: 'Home Care / Laundry / Naturals', seedIds: [],
      rationale: 'Explicit unscented and fragrance-free listings create a comparison set for a consistent scent-free choice across cleaning tasks.',
      concept: 'Evaluate clearly labelled fragrance-free dish, surface and laundry options with coherent pack sizes.',
      next: 'Confirm guest need and Target coverage, verify the formula and fragrance disclosure, then test efficacy and any skin-related claims.',
      matchRule: 'Cleaning formula categories with explicit fragrance-free, unscented, no-added-fragrance, scent-free or Free & Clear wording.',
      caveat: 'Fragrance wording is a listing claim; it does not prove hypoallergenicity or medical suitability.'
    },
    {
      id: 'laundry-stains', title: 'Targeted Laundry Stain Treatment', priority: 'Explore',
      categories: [C.laundry,C.specialty,C.naturals], scope: 'Laundry Care', seedIds: [],
      rationale: 'Pretreatment, stain pens and laundry boosters offer task-specific formats beyond general detergent.',
      concept: 'Evaluate a home pretreatment spray plus a portable stain-treatment format with simple fabric instructions.',
      next: 'Test common stain types and fabric/color compatibility, cost per treatment and packaging leakage; compare existing Target options.',
      matchRule: 'Explicit stain-remover/treater/pretreatment wording with laundry/fabric/clothing context; appliance mold and rust treatments excluded.',
      caveat: 'Generic detergent stain-removal claims alone do not establish a specialist stain-treatment format.'
    },
    {
      id: 'machine-maintenance', title: 'Washer & Dishwasher Maintenance', priority: 'Explore',
      categories: [C.laundry,C.dish,C.specialty,C.naturals], scope: 'Home Care; coordinate with appliance merchants', seedIds: [],
      rationale: 'Dedicated machine cleaners and descalers support a separate maintenance task from washing clothes or dishes.',
      concept: 'Evaluate clearly differentiated washer and dishwasher maintenance packs with machine-specific instructions.',
      next: 'Validate machine and seal compatibility, dose, maintenance frequency, efficacy and cost per treatment; check current Target coverage.',
      matchRule: 'Washer/washing-machine/dishwasher immediately associated with cleaner, cleaning tablet, cleaning powder or descaler.',
      caveat: 'Ordinary dishwasher detergent and general tablet bundles are not machine-maintenance evidence.'
    },
    {
      id: 'hard-water', title: 'Hard-Water & Limescale Removal', priority: 'Explore',
      categories: [C.bath,C.surface,C.specialty,C.dish,C.naturals], scope: 'Bathroom & Specialty Cleaners', seedIds: [],
      rationale: 'Mineral-deposit treatments offer a defined cleaning problem for comparing application control and surface guidance.',
      concept: 'Evaluate a controlled-application hard-water treatment with clear dwell-time and surface restrictions.',
      next: 'Test removal on representative deposits and surfaces, corrosion and finish compatibility, handling instructions and Target assortment overlap.',
      matchRule: 'Relevant cleaner categories with hard-water, limescale or calcium/lime removal wording plus a cleaning/removal context.',
      caveat: 'Titles identify a stated use, not verified descaling performance or universal surface safety.'
    },
    {
      id: 'drain-disposal', title: 'Drain & Disposal Care', priority: 'Explore',
      categories: [C.bath,C.specialty,C.surface,C.dish], scope: 'Home Care / Specialty Cleaners', seedIds: [],
      rationale: 'Clog removal and routine drain/disposal maintenance are different jobs that benefit from clear product selection.',
      concept: 'Evaluate a clearly labelled maintenance treatment, with clog-removal products benchmarked separately.',
      next: 'Validate pipe/disposal compatibility, efficacy, use and handling instructions, replenishment economics and existing Target coverage.',
      matchRule: 'Drain cleaner/clog/opener/treatment or garbage/waste-disposal cleaner/freshener; dish drainers and disposable goods excluded.',
      caveat: 'Maintenance, odor treatment and clog removal must remain distinct performance claims.'
    },
    {
      id: 'reach-detail', title: 'Reach & Detail Cleaning Tools', priority: 'Explore',
      categories: [C.tools], scope: 'Home Care / Cleaning Tools', seedIds: [],
      rationale: 'Extendable and crevice/grout tools offer specific reach and access features to benchmark.',
      concept: 'Evaluate a compact handle with purposeful detail-cleaning heads and clear surface guidance.',
      next: 'Test reach, grip, force, head retention, wear, drying and storage; check whether modular parts solve a guest need beyond existing Target tools.',
      matchRule: 'Cleaning Tools with extendable/telescoping/long-handle or crevice/grout/gap/detail wording alongside brush, scrubber, duster or cleaning-tool context.',
      caveat: 'A long handle or detail claim does not itself prove ergonomic benefit or cleaning superiority.'
    },
    {
      id: 'dish-refills', title: 'Dishwashing Refill Formats', priority: 'Explore',
      categories: [C.dish,C.naturals], scope: 'Home Care / Dishwashing', seedIds: [],
      rationale: 'Refill sizes and concentrated dish-cleaning formats allow starter-versus-replenishment comparisons.',
      concept: 'Evaluate a convenient dish-soap or dish-spray starter with a compatible, easy-to-pour refill.',
      next: 'Compare dose, refill transfer, closure leakage, performance, cost per wash and current Target pack architecture.',
      matchRule: 'Dish or dishwashing wording paired with refill or concentrate; excludes dishwasher-maintenance cleaners.',
      caveat: 'A large pack or concentrate label does not establish better value or reduced environmental impact.'
    },
    {
      id: 'paper-portions', title: 'Paper Towel Sheet & Pack Choices', priority: 'Explore',
      categories: [C.paper], scope: 'Paper Towels', seedIds: [],
      rationale: 'Half-sheet and selectable-sheet formats allow comparison of portion choice, absorption and pack clarity.',
      concept: 'Evaluate easy-to-understand sheet and pack labelling alongside a selectable-sheet paper towel.',
      next: 'Benchmark absorbency, wet strength, sheet dimensions, total sheet area and price per comparable area; test guest comprehension and current Target options.',
      matchRule: 'Paper Towels with explicit Select-A-Size, Choose-A-Sheet, Tear-A-Square, Pick-A-Size, Select & Tear or half-sheet wording.',
      caveat: 'Roll equivalence claims are not standardized price comparisons; catalogue pack prices have not been normalized.'
    },
    {
      id: 'trash-fit', title: 'Trash Bag Fit & Strength', priority: 'Explore',
      categories: [C.trash], scope: 'Trash Bags', seedIds: [],
      rationale: 'Capacity, closure and fit descriptions provide concrete design and pack-clarity dimensions to compare.',
      concept: 'Evaluate clearly sized kitchen and small-bin bags with a reliable closure and transparent pack counts.',
      next: 'Confirm common bin fit, puncture and seam strength, leakage, closure performance and price per bag against equivalent Target packs.',
      matchRule: 'Trash Bags with drawstring, gallon/litre capacity, custom-fit or tall-kitchen wording.',
      caveat: 'Title claims do not prove strength, leak resistance or fit; scented and unscented versions should be compared separately.'
    },
    {
      id: 'fiber-tabletop', title: 'Sturdy Paper & Fiber Tabletop', priority: 'Explore',
      categories: [C.tabletop], scope: 'Disposable Tabletop', seedIds: [],
      rationale: 'Paper and fiber plate/bowl formats create comparisons of everyday serving strength, stackability and pack value.',
      concept: 'Evaluate an accessible plate-and-bowl set with clear size, material and usage guidance.',
      next: 'Test wet/grease resistance, load strength, food-contact suitability and price per piece; substantiate any disposal claim and compare Target coverage.',
      matchRule: 'Disposable Tabletop with paper/fiber/bagasse/sugarcane material wording and explicit plates, bowls or trays.',
      caveat: 'Material words are supplier claims. Compostability, recyclability and environmental benefit are not established by these listings.'
    },
    {
      id: 'toilet-wand', title: 'Toilet-Wand Starter & Refill Value', priority: 'Explore',
      categories: [C.bath,C.tools], scope: 'Bathroom & Toilet Cleaning', seedIds: [],
      rationale: 'Wand systems and replacement heads offer a distinct starter and replenishment proposition.',
      concept: 'Evaluate a compact toilet-wand starter with secure replaceable heads and clearly compatible refill packs.',
      next: 'Test head retention and release, cleaning performance, splash/contact handling, storage, refill economics and Target assortment overlap.',
      matchRule: 'ToiletWand/toilet-wand wording or toilet cleaning system with disposable/replacement heads; liquid toilet-cleaner refills excluded.',
      caveat: 'A contact-minimizing format does not establish a hygiene, disinfection or flushability claim.'
    }
  ].map((definition, index) => Object.freeze({
    ...definition,
    order: index + 1,
    original: index < 7,
    priorityBasis: index < 7 ? 'Retained research judgment; not a measured market ranking.' : 'Research queue; no numerical priority assigned.',
    gapLabel: TARGET_GAP,
    route: definition.scope,
    why: definition.rationale,
    categories: Object.freeze(definition.categories), seedIds: Object.freeze(definition.seedIds)
  }));
  Object.freeze(definitions);
  const byDefinition = new Map(definitions.map(d => [d.id, d]));

  function normalized(value) { return String(value || '').normalize('NFKC').replace(/[‐‑‒–—]/g, '-').replace(/[’‘]/g, "'").toLowerCase(); }
  function title(item) { return normalized(item && item.name); }
  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try { const url = new URL(value.trim()); return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch (_) { return ''; }
  }
  function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const d = new Date(value + 'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === value ? value : '';
  }
  const matchers = {
    'electric-cleaning': t => /\b(?:electric|powered|power|cordless|rechargeable|battery)\b/.test(t) && /\bscrubb?(?:er|ing)\b|\bcleaning brush\b/.test(t),
    'sustainable-formats': t => /\b(?:refill|refills|concentrate|concentrated|tablets?)\b/.test(t) || /\b(?:reusable|washable|swedish)\b/.test(t) && /\b(?:cloths?|dishcloths?|paper towel alternative|cleaning pads?)\b/.test(t),
    'food-storage': t => /\b(?:food|freezer|sandwich|storage|meal[ -]prep)\b/.test(t) && /\b(?:bags?|containers?|pouches|wraps?|sets?)\b/.test(t) || /\bbeeswax\b.*\bwraps?\b/.test(t),
    'air-care': t => /\b(?:plug[ -]?ins?|plugins|warmers?|diffusers?|refills?|starter kit)\b/.test(t),
    'pet-odor': t => {
      const clean = t.replace(/\b(?:pet|dog|cat)[ -]safe\b/g,'').replace(/\bsafe\s+(?:for|around)[^.,;|]{0,45}\b(?:pets?|dogs?|cats?)\b/g,'').replace(/\b(?:pet|dog|cat)[\s&-]*(?:kid[s]?)?[- ]*(?:friendly|safe)\b/g,'');
      return /\b(?:pets?|dogs?|cats?|urine)\b/.test(clean) && /\b(?:stains?|odou?rs?|remov\w*|cleaners?|enzym\w*)\b/.test(clean);
    },
    'pest-formats': t => /\b(?:traps?|baits?|capture cards?)\b/.test(t) || /\b(?:insect|flying|mosquito|fly|bug)\b/.test(t) && /\brefills?\b/.test(t),
    'home-organization': t => /\blaundry\b.*\b(?:basket|hamper|carrier|organizer|organiser)\b/.test(t) || /\b(?:cleaning|sponge|tool)\b.*\b(?:caddy|caddies|organizer|organiser)\b/.test(t),
    'fragrance-free': t => /\b(?:fragrance[ -]free|unscented|no added fragrance|scent[ -]free)\b|\bfree\s*(?:&|and|\+)\s*clear\b/.test(t),
    'laundry-stains': (t,item) => !/\b(?:rust|mold|mould|washer|washing machine|carpet|concrete|exterior)\b/.test(t) && (!/\bdetergent\b/.test(t) || /\b(?:detergent|laundry)\s+(?:booster|additive)\b/.test(t)) && /\b(?:stain[ -]?(?:remover|removal|treater|treatment)|pretreat\w*|pre[ -]treat\w*)\b/.test(t) && (item.category === C.laundry || /\b(?:laundry|fabric|clothes|clothing|garment|linen|textile)\b/.test(t)),
    'machine-maintenance': t => (!/\bdetergent\b/.test(t) || /\b(?:washing machine|washer|dishwasher)[ -]*(?:cleaner|descaler)\b/.test(t)) && (/\b(?:washing machine|washer|dishwasher)[ -]*(?:cleaner|cleaning(?:\s+(?:tablet|powder|solution))?|descaler)\b/.test(t) || /\b(?:cleaner|cleaning tablets?|descaler)\s+(?:for\s+)(?:the\s+)?(?:washing machine|washer|dishwasher)\b/.test(t)),
    'hard-water': t => /\b(?:hard[ -]water|limescale|lime[ -]scale|calcium)\b/.test(t) && /\b(?:clean\w*|remov\w*|descal\w*|treatment)\b/.test(t),
    'drain-disposal': t => /\bdrain\s*(?:cleaner|cleaning|clog|opener|gel|maintenance|treatment|freshener)\b/.test(t) || /\b(?:garbage|waste)\s+disposal\s*(?:cleaner|cleaning|freshener|treatment)\b/.test(t),
    'reach-detail': t => /\b(?:extendable|telescop\w*|long[ -]handle[ds]?|grout|crevice|gap|detail)\b/.test(t) && /\b(?:brush\w*|scrub\w*|duster\w*|cleaning tool)\b/.test(t),
    'dish-refills': t => !matchers['machine-maintenance'](t) && /\b(?:dish|dishwashing|dishwasher)\b/.test(t) && /\b(?:refills?|concentrat\w*)\b/.test(t),
    'paper-portions': t => /\b(?:select[ -]a[ -]size|choose[ -]a[ -]sheet|tear[ -]a[ -]square|pick[ -]a[ -]size|select\s*(?:&|and)\s*tear|half[ -]sheets?)\b/.test(t),
    'trash-fit': t => /\b(?:drawstring|gallons?|gal|litres?|liters?|custom[ -]fit|tall[ -]kitchen)\b|\b\d+(?:\.\d+)?\s*l\b/.test(t),
    'fiber-tabletop': t => /\b(?:paper|fibers?|fibres?|bagasse|sugarcane)\b/.test(t) && /\b(?:plates?|bowls?|trays?)\b/.test(t),
    'toilet-wand': t => /\btoilet\s*wand\b/.test(t) || /\btoilet\b/.test(t) && /\b(?:disposable|replacement|refill)\b/.test(t) && /\b(?:heads?|brush|cleaning system)\b/.test(t)
  };

  function match(item, definitionId) {
    const definition = typeof definitionId === 'string' ? byDefinition.get(definitionId) : definitionId;
    return Boolean(item && definition && definition.categories.includes(item.category) && matchers[definition.id](title(item),item));
  }

  const retailerHosts = {
    'amazon us':['amazon.com'], 'walmart':['walmart.com'], "sam's club":['samsclub.com'],
    'tiktok shop':['tiktok.com'], 'costco':['costco.com','costcobusinessdelivery.com'],
    'cvs':['cvs.com'], 'walgreens':['walgreens.com'], "lowe's":['lowes.com'],
    'home depot':['homedepot.com'], 'ace hardware':['acehardware.com'], 'kroger':['kroger.com'],
    'h-e-b':['heb.com'], 'dollar general':['dollargeneral.com'], 'dollar tree':['dollartree.com'],
    "bj's wholesale":['bjs.com'], 'meijer':['meijer.com'], 'publix':['publix.com'],
    'safeway':['safeway.com'], 'albertsons':['albertsons.com']
  };
  function exactLink(value, retailer) {
    const href = safeUrl(value); if (!href) return null;
    const url = new URL(href), host = url.hostname.toLowerCase().replace(/^www\./,''), p = url.pathname.replace(/\/+$/,'');
    const known = retailerHosts[normalized(retailer)];
    if (known && !known.some(h => host === h || host.endsWith('.' + h))) return null;
    let m = null;
    if (host.endsWith('amazon.com')) m = p.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:\/|$)/i);
    else if (host.endsWith('tiktok.com')) m = p.match(/\/(?:pdp|product)\/(?:[^/]+\/)*(\d{10,})$/);
    else if (host.endsWith('walmart.com') || host.endsWith('samsclub.com')) m = p.match(/\/ip\/(?:[^/]+\/)*(\d+)$/) || p.match(/\/p\/(?:[^/]+\/)*(prod\d+)$/i);
    else if (host.endsWith('costco.com') || host.endsWith('costcobusinessdelivery.com')) m = p.match(/\.product\.(\d+)\.html$/) || p.match(/\/p\/(?:[^/]+\/)*(\d+)$/);
    else if (host.endsWith('cvs.com')) m = p.match(/-prodid-(\d+)$/);
    else if (host.endsWith('walgreens.com')) m = p.match(/\/ID=(prod\d+)-product$/i);
    else if (host.endsWith('acehardware.com') || host.endsWith('dollartree.com')) m = p.match(/\/(\d{5,})(?:-[^/]+)?$/);
    else if (host.endsWith('meijer.com')) m = p.match(/\/shopping\/product\/(?:[^/]+\/)*(\d+)(?:\.html)?$/);
    else if (host.endsWith('publix.com') || host.endsWith('dollartree.com')) m = p.match(/\/products\/(\d+)-[^/]+$/);
    else if (known) m = p.match(/\/(?:p|pd|product|product-detail)\/(?:[^/]+\/)*(\d+)$/);
    else if (/\/(?:products?|p|pd|ip)\/[^/]+(?:\/[^/]+)*$/i.test(p)) m = [p,p];
    if (!m && (host.endsWith('dollartree.com') || host.endsWith('publix.com'))) m = p.match(/\/products\/(\d+)-[^/]+$/);
    return m ? { key: normalized(retailer) + '|' + host.replace(/^(?:delivery|sameday|shop|business)\./,'') + '|' + m[1].toUpperCase(), url: href, exact: true } : null;
  }
  function listingIdentity(item) {
    const retailer = String(item && item.retailer || 'Retailer not stated');
    for (const value of [item && item.salesItemSource,item && item.url,item && item.currentSource,item && item.listingSource,item && item.metricSource]) {
      const identity = exactLink(value,retailer); if (identity) return identity;
    }
    const sourceUrl = [item && item.url,item && item.currentSource,item && item.listingSource].map(safeUrl).find(Boolean) || '';
    // A shared category URL is never a product identifier; preserve different catalogue records.
    return { key: normalized(retailer) + '|record|' + String(item && item.id || title(item)), url: sourceUrl, exact: false };
  }
  function isLimited(item) { return /indexed|limited|access issue|human check|restriction|not reverified|prior sourced|metadata/i.test([item.evidenceLevel,item.verificationStatus,item.verificationNote,item.salesReviewStatus].join(' ')); }
  function checkedDate(item) { return date(item.checkedDate) || date(item.auditDate) || ''; }
  function countDates(values) { const counts = {}; for (const value of values) if (value) counts[value] = (counts[value] || 0) + 1; return counts; }
  function latest(values) { return values.filter(Boolean).sort().at(-1) || ''; }
  function safePrice(item) { return /\$\s*\d/.test(String(item.displayPrice || '')); }

  function balance(references, seedIds) {
    const seedIndex = new Map(seedIds.map((id,index) => [id,index]));
    const seeded = references.filter(r => r.isSeed).sort((a,b) => Math.min(...a.recordIds.filter(id=>seedIndex.has(id)).map(id=>seedIndex.get(id))) - Math.min(...b.recordIds.filter(id=>seedIndex.has(id)).map(id=>seedIndex.get(id))));
    const rest = references.filter(r=>!r.isSeed).sort((a,b)=>Number(b.exactItemLink)-Number(a.exactItemLink) || b.checkedDate.localeCompare(a.checkedDate) || a.name.localeCompare(b.name));
    const buckets = new Map();
    for (const ref of rest) { if (!buckets.has(ref.retailer)) buckets.set(ref.retailer,[]); buckets.get(ref.retailer).push(ref); }
    const result = [...seeded];
    while ([...buckets.values()].some(bucket=>bucket.length)) for (const bucket of buckets.values()) if (bucket.length) result.push(bucket.shift());
    return result;
  }

  function analyzeOpportunity(items, definition, salesModel) {
    const seedSet = new Set(definition.seedIds), raw = items.filter(item => seedSet.has(item.id) || match(item,definition));
    const grouped = new Map();
    for (const item of raw) { const identity = listingIdentity(item); if (!grouped.has(identity.key)) grouped.set(identity.key,{identity,items:[]}); grouped.get(identity.key).items.push(item); }
    const references = balance([...grouped.values()].map(group => {
      const ordered = [...group.items].sort((a,b)=>Number(seedSet.has(b.id))-Number(seedSet.has(a.id)) || checkedDate(b).localeCompare(checkedDate(a)) || String(a.id).localeCompare(String(b.id)));
      const item = ordered[0], metrics = salesModel ? group.items.map(d=>salesModel.parseMetric(d)).filter(Boolean) : [];
      return {
        id:item.id, name:String(item.name || ''), retailer:String(item.retailer || 'Retailer not stated'),
        category:String(item.category || ''), image:item.image || '', url:group.identity.url,
        item, recordIds:group.items.map(d=>d.id), exactItemLink:group.identity.exact,
        isSeed:group.items.some(d=>seedSet.has(d.id)), matchesCriteria:group.items.some(d=>match(d,definition)),
        matchBasis:group.items.some(d=>match(d,definition)) ? 'Explicit category and format wording' : 'Retained comparison example; format needs confirmation',
        checkedDate:checkedDate(item), latestCheckedDate:latest(group.items.map(checkedDate)),
        lastSalesDate:latest(metrics.map(metric=>metric.observedAt)),
        salesSourceUrl:metrics.find(metric=>metric.sourceUrl)?.sourceUrl || '',
        evidenceLabel:!group.identity.url ? 'Source URL unavailable' : group.identity.exact ? (group.items.every(isLimited)?'Individual item link · limited verification':'Individual item link · saved source evidence') : 'Broad or third-party reference · exact retailer listing not identified',
        limited:group.items.every(isLimited), hasPublishedCount:metrics.length>0,
        hasSourceBackedCount:metrics.some(metric=>metric.eligible), hasPriceSnapshot:group.items.some(safePrice)
      };
    }),definition.seedIds);
    const salesCohorts = salesModel ? salesModel.groupRows(raw) : [];
    const retailers = [...new Set(references.map(ref=>ref.retailer))].sort();
    const retailerCounts = retailers.map(retailer=>({retailer,count:references.filter(ref=>ref.retailer===retailer).length}));
    const counts = {
      records:raw.length, distinctListings:references.length, retailers:retailers.length,
      titleMatched:references.filter(ref=>ref.matchesCriteria).length,
      retainedSeedOnly:references.filter(ref=>!ref.matchesCriteria).length,
      individualItemLinks:references.filter(ref=>ref.exactItemLink).length,
      broadReferences:references.filter(ref=>!ref.exactItemLink && ref.url).length,
      limitedReferences:references.filter(ref=>ref.limited).length,
      missingSources:references.filter(ref=>!ref.url).length,
      withSales:references.filter(ref=>ref.hasPublishedCount).length,
      sourceBackedSales:references.filter(ref=>ref.hasSourceBackedCount).length,
      rankableSales:salesCohorts.reduce((sum,group)=>sum+group.entries.length,0),
      withPrice:references.filter(ref=>ref.hasPriceSnapshot).length,
      duplicatesRemoved:raw.length-references.length
    };
    const latestCheckedDate = latest(raw.map(checkedDate)), lastSalesDate = latest(raw.filter(item=>item.hasSales).map(item=>date(item.metricDate)));
    const evidenceLabel = references.length
      ? counts.titleMatched + ' format-matched comparison references across ' + retailers.length + ' retailers; ' + counts.sourceBackedSales + ' have a dated, linked sales or purchase count.'
      : 'No matching saved evidence in the selected catalogue scope. This is not proof of a market gap.';
    return {
      ...definition, counts, retailers, retailerCounts, references, salesCohorts,
      matchedIds:references.map(ref=>ref.id), recordIds:raw.map(item=>item.id),
      latestCheckedDate,lastSalesDate,checkedDateCounts:countDates(raw.map(checkedDate)),salesDateCounts:countDates(raw.filter(item=>item.hasSales).map(item=>date(item.metricDate))),
      evidenceLabel, gapLabel:TARGET_GAP, analysisBasis:ANALYSIS_BASIS,
      evidenceNotes:[definition.caveat,'Counts describe saved catalogue evidence, not market size, market share, sales growth or confirmed Target assortment gaps.','Limited-verification counts overlap individual/broad source counts. Prices are dated package snapshots, not normalized value comparisons.']
    };
  }

  function analyze(items, options) {
    options = options || {};
    const seen = new Set(), valid = (Array.isArray(items) ? items : []).filter(item=>{
      if (!item || !item.id || seen.has(item.id)) return false; seen.add(item.id); return true;
    });
    const salesModel = Object.prototype.hasOwnProperty.call(options,'salesModel') ? options.salesModel : defaultSalesModel;
    const usableSalesModel = salesModel && typeof salesModel.parseMetric === 'function' && typeof salesModel.groupRows === 'function' ? salesModel : null;
    const opportunities = definitions.map(definition=>analyzeOpportunity(valid,definition,usableSalesModel));
    const supported = opportunities.filter(opportunity=>opportunity.counts.distinctListings>0);
    const ids = new Set(opportunities.flatMap(opportunity=>opportunity.recordIds));
    const matchedItems = valid.filter(item=>ids.has(item.id));
    return {
      opportunities,
      summary:{
        analyzedAt:date(options.analyzedAt), definitionCount:definitions.length, supportedCount:supported.length,
        inputRecords:valid.length, uniqueMatchedRecords:ids.size,
        uniqueMatchedListings:new Set(matchedItems.map(item=>listingIdentity(item).key)).size,
        distinctRetailers:new Set(matchedItems.map(item=>item.retailer)).size,
        latestCheckedDate:latest(matchedItems.map(checkedDate)), lastSalesDate:latest(matchedItems.filter(item=>item.hasSales).map(item=>date(item.metricDate))),
        salesModelAvailable:Boolean(usableSalesModel), analysisBasis:ANALYSIS_BASIS,gapLabel:TARGET_GAP
      }
    };
  }

  return Object.freeze({definitions,analyze,match,listingIdentity});
});
