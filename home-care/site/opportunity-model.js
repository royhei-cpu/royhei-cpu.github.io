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
    trash: 'Trash Bags', pest: 'Pest Control', tabletop: 'Disposable Tabletop', tissue: 'Toilet Paper & Tissues'
  };
  const TARGET_GAP = 'Candidate white space: a complete Target Home Care assortment and validated guest needs have not been supplied, so a Target gap is not established.';
  const ANALYSIS_BASIS = 'Analysis of saved catalogue evidence; no new retailer verification. Themes overlap and their counts must not be added together.';

  const platforms = Object.freeze([
    { id:'tools-systems', title:'Tools & cleaning systems', customerNeed:'Complete a cleaning task with less handling and a clear path from starter to replacement parts.', description:'Manual and powered tools, floor systems, dust pickup and reusable cleaning textiles.' },
    { id:'surface-floor', title:'Surface & floor care', customerNeed:'Clean and maintain the materials in the home without guessing which treatment is appropriate.', description:'Glass, wood, stone, hard floors and carpet or upholstery care.' },
    { id:'kitchen-storage', title:'Kitchen & food storage', customerNeed:'Prepare, store and serve food, then restore the kitchen with understandable products and packs.', description:'Dish care, kitchen appliance surfaces, food storage and preparation materials.' },
    { id:'bathroom-care', title:'Bathroom care', customerNeed:'Choose a dependable routine for bathroom buildup, fixtures and toilet or drain maintenance.', description:'Distinct routines for showers, mineral deposits, toilets, drains and disposals.' },
    { id:'laundry-fabric', title:'Laundry & fabric care', customerNeed:'Manage clothes through dosing, stain treatment, drying and refresh between washes.', description:'Complementary laundry tasks with fabric guidance and a coherent replenishment offer.' },
    { id:'paper-essentials', title:'Paper & disposable essentials', customerNeed:'Choose the right size, strength and pack for daily use, small spaces and hosting.', description:'Paper towels, tissue, bin liners, serving ware and drinkware.' },
    { id:'air-pet-pest', title:'Air, pet & pest care', customerNeed:'Address a specific household odor or pest problem with a clear product choice and refill path.', description:'Fragrance, nonpowered odor treatment, pet messes and pest-control formats.' },
    { id:'refill-formula', title:'Refill & formula systems', customerNeed:'Make recurring cleaning choices easier through clear fragrance, refill and dosing information.', description:'Cross-category formula choice and refill architecture; environmental benefits require substantiation.' }
  ].map(Object.freeze));
  const platformById = new Map(platforms.map(platform=>[platform.id,platform]));

  // Add a customer brief to the retained definitions without changing their matching or priority.
  const retainedBriefs = {
    'electric-cleaning': {platformId:'tools-systems',customerNeed:'Reach awkward areas and tackle repeated scrubbing tasks with manageable effort.',differentiation:'A coherent tool platform with useful heads, dependable replenishment and clear task instructions; validate any effort-saving benefit.'},
    'sustainable-formats': {platformId:'refill-formula',customerNeed:'Replenish everyday cleaning products without unnecessary complexity or storage bulk.',differentiation:'A starter-to-refill system with reliable dosing, compatible containers and measured packaging or cost outcomes rather than vague green claims.'},
    'food-storage': {platformId:'kitchen-storage',customerNeed:'Keep ingredients and leftovers organized across preparation, storage and packed meals.',differentiation:'A useful size architecture with easy closures, visible contents and clear care or disposal instructions; distinguish reusable and disposable roles.'},
    'air-care': {platformId:'air-pet-pest',customerNeed:'Choose a fragrance experience and replenish it without confusing devices or refills.',differentiation:'Coordinated devices, controlled fragrance delivery and transparent refill compatibility rather than scent variants alone.'},
    'pet-odor': {platformId:'air-pet-pest',customerNeed:'Treat pet-related stains and odors on the actual surfaces affected.',differentiation:'A task-specific care range with application control, surface instructions and separately verified efficacy and pet-related claims.'},
    'pest-formats': {platformId:'air-pet-pest',customerNeed:'Select, place and maintain a pest-control product for a defined indoor problem.',differentiation:'A clear starter/refill proposition and understandable placement guidance; validate the mechanism, efficacy and applicable requirements.'},
    'home-organization': {platformId:'tools-systems',customerNeed:'Carry, dry and store laundry or cleaning tools in limited space.',differentiation:'Compact carrying and storage systems that fit a real cleaning routine; adjacent merchant ownership remains open.'},
    'fragrance-free': {platformId:'refill-formula',customerNeed:'Find a clearly described no-added-fragrance choice across routine cleaning jobs.',differentiation:'Consistent ingredient and fragrance communication with useful pack sizes; avoid unsupported sensitivity or health promises.'},
    'laundry-stains': {platformId:'laundry-fabric',customerNeed:'Treat a stain before washing or deal with a small clothing mishap away from home.',differentiation:'A complementary home-and-portable range with stain and fabric guidance, controlled application and comparable cost per treatment.'},
    'machine-maintenance': {platformId:'kitchen-storage',customerNeed:'Maintain a washer or dishwasher with a treatment that is clearly separate from ordinary detergent.',differentiation:'Machine-specific packs, dosing and compatibility information; build a repeatable maintenance routine only after validating the interval.'},
    'hard-water': {platformId:'bathroom-care',customerNeed:'Remove mineral buildup while understanding which finishes the product can contact.',differentiation:'Controlled placement and clear dwell-time and surface restrictions, supported by deposit-removal and compatibility tests.'},
    'drain-disposal': {platformId:'bathroom-care',customerNeed:'Distinguish routine odor or residue maintenance from a blocked drain.',differentiation:'Clear task selection, measured doses and compatibility instructions instead of treating maintenance and clog removal as interchangeable.'},
    'reach-detail': {platformId:'tools-systems',customerNeed:'Reach narrow gaps, grout lines and high or low surfaces with a purposeful tool.',differentiation:'A modular grip and head set defined by access tasks, with tested reach, retention, drying and storage.'},
    'dish-refills': {platformId:'kitchen-storage',customerNeed:'Refill frequently used dish-cleaning products without messy transfer or pack confusion.',differentiation:'A convenient starter and refill architecture with clear dilution, pouring and cost-per-use information.'},
    'paper-portions': {platformId:'paper-essentials',customerNeed:'Choose enough towel for the spill and understand what a pack contains.',differentiation:'Useful sheet choice and transparent dimensions or total area, supported by wet-strength and absorbency comparisons.'},
    'trash-fit': {platformId:'paper-essentials',customerNeed:'Choose a liner that fits the bin and closes reliably for the household task.',differentiation:'Understandable bin fit, closure and strength levels with transparent counts; verify each construction rather than relying on strength language.'},
    'fiber-tabletop': {platformId:'paper-essentials',customerNeed:'Serve everyday meals or gatherings with predictable plate and bowl strength.',differentiation:'Coherent meal sizes, stackable packs and material/use guidance; validate performance and any disposal claims separately.'},
    'toilet-wand': {platformId:'bathroom-care',customerNeed:'Clean the toilet with controlled head handling and easy replacement selection.',differentiation:'A compact starter and clearly compatible refill system with tested retention, release and storage.'}
  };

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
    },
    {
      id:'mop-bucket-system', title:'Mop & Bucket Starter-to-Refill System', priority:'Explore', platformId:'tools-systems',
      categories:[C.tools], scope:'Home Care / Cleaning Tools', seedIds:[],
      customerNeed:'Clean a larger floor area, wring the mop and replace worn heads without changing systems.',
      differentiation:'Offer a clear starter and replacement-head architecture; compare basic wringing with separately validated clean/dirty-water separation.',
      rationale:'Saved mop-and-bucket, spin-mop and replacement-head listings support comparison of complete systems and their replenishment parts.',
      concept:'Evaluate a manual floor-care system with a stable bucket, controlled wringing, manageable carrying and visibly compatible mop-head refills.',
      next:'Compare water handling, wringing effort, floor moisture, head attachment, washing/drying, storage footprint and replacement-head economics against Target’s existing systems.',
      matchRule:'Cleaning Tools with explicit mop/mopping plus bucket, wringer, spin-mop, clean/dirty-water or self-wringing language; starter and compatible-format refill references included.',
      caveat:'Not every matched mop separates clean and dirty water. Starter, handle and refill-only listings are distinct references, not equivalent offers.'
    },
    {
      id:'quick-floor-system', title:'Quick-Clean Floor Starter & Pad Refills', priority:'Explore', platformId:'tools-systems',
      categories:[C.tools,C.floor], scope:'Home Care / Floor & Cleaning Tools', seedIds:[],
      customerNeed:'Handle small everyday floor messes quickly and find the correct replacement pad.',
      differentiation:'Make wet/dry tasks, floor compatibility and reusable versus disposable pad choices easy to understand within one planned range.',
      rationale:'Spray-mop kits and pad/refill listings reveal several starter and replenishment architectures worth comparing.',
      concept:'Evaluate a compact quick-clean starter with a clear pad-compatibility system and separately defined washable and disposable refill options.',
      next:'Test liquid distribution, pickup, residue, floor compatibility, pad attachment, laundering where applicable, storage and comparable cost per task; verify Target assortment overlap.',
      matchRule:'Relevant floor/tool categories with spray/flat-mop or mop-pad/mopping-cloth wording, plus spray, replacement, refill, microfiber or washable/reusable format language; generic string/sponge mop refills excluded.',
      caveat:'A matched pad is not confirmed compatible with any other listed mop. Disposable and washable formats have different use and cost assumptions.'
    },
    {
      id:'dust-hair-tools', title:'Dust & Hair Pickup System', priority:'Explore', platformId:'tools-systems',
      categories:[C.tools], scope:'Home Care / Cleaning Tools', seedIds:[],
      customerNeed:'Collect dust on surfaces and loose hair on soft furnishings without spreading debris.',
      differentiation:'Create a task-led range of surface dusters and fabric pickup tools with clear refill or cleaning instructions.',
      rationale:'Duster kits, dusting refills, lint rollers and explicitly named hair-removal tools provide different pickup mechanisms to benchmark.',
      concept:'Evaluate coordinated surface and fabric tools with compact storage, purposeful grips and an understandable refill path.',
      next:'Test pickup and release on relevant surfaces, dust redistribution, tool wear, refill fit, cleaning effort and task cost; compare with current Target tools.',
      matchRule:'Cleaning Tools with dusters/dusting, lint-roller or explicit pet-hair/fur-remover wording; compressed-air, pest-application and automotive-specific tools excluded.',
      caveat:'These are different mechanisms. Listing counts do not prove allergy reduction, hygiene benefit or superior pickup.'
    },
    {
      id:'sink-side-tools', title:'Sink-Side Scrubber & Refill System', priority:'Explore', platformId:'kitchen-storage',
      categories:[C.tools,C.dish], scope:'Home Care / Dishwashing & Cleaning Tools', seedIds:[],
      customerNeed:'Remove food residue with the right scrubbing surface and keep frequently used tools easy to refill or replace.',
      differentiation:'A clear delicate-versus-heavy-duty choice, reliable dispensing where used and visibly compatible replacement heads.',
      rationale:'Non-scratch sponges/scourers and soap-dispensing dish tools support a useful sink-side assortment and replenishment comparison.',
      concept:'Evaluate a coordinated scrubber, optional soap-dispensing handle and replacement range with surface-use icons and drying guidance.',
      next:'Test scratch risk on named surfaces, food-residue removal, soap leakage, grip, head retention, drainage and life per tool; compare equivalent Target packs.',
      matchRule:'Explicit non-scratch/scratch-free/non-abrasive sponge, scrubber, pad or dishcloth; or dishwand/soap-dispensing brush, sponge or scrubber wording.',
      caveat:'“Non-scratch” remains a listing claim until tested on specified finishes. Different head shapes and materials are not assumed interchangeable.'
    },
    {
      id:'reusable-cloth-system', title:'Reusable Cleaning Textile System', priority:'Explore', platformId:'tools-systems',
      categories:[C.tools,C.paper,C.naturals], scope:'Home Care / Cleaning Tools & Paper alternatives', seedIds:[],
      customerNeed:'Use the right cloth for wiping, drying and polishing, then clean and store it for the next task.',
      differentiation:'A task-specific cloth set with clear color or texture cues, laundering instructions and a credible replacement cadence.',
      rationale:'Microfiber cloths, Swedish dishcloths and explicitly washable towel formats offer material, construction and pack references.',
      concept:'Evaluate a kitchen-and-surface cloth range with distinct wiping/drying roles and a simple care system.',
      next:'Compare absorbency, lint, scratch risk, drying, wash-cycle durability and total use assumptions; verify Target coverage and substantiate any environmental comparison.',
      matchRule:'Relevant tool/paper categories with microfiber, Swedish, reusable or washable wording paired with cloth, dishcloth, towel or wipe; automotive-specific cloths and mop pads excluded.',
      caveat:'A material or reusable label does not prove disinfection, low environmental impact or a particular lifetime.'
    },
    {
      id:'glass-mirror-care', title:'Glass & Mirror Finish Routine', priority:'Explore', platformId:'surface-floor',
      categories:[C.specialty,C.surface,C.tools,C.naturals], scope:'Home Care / Specialty Surfaces', seedIds:[],
      customerNeed:'Clean visible glass and mirrors without streaks or leftover lint.',
      differentiation:'Pair an appropriate formula or wipe with a purposeful finishing cloth or squeegee, while keeping indoor and outdoor uses clear.',
      rationale:'Dedicated glass/window cleaners and explicitly named glass-cleaning tools provide complementary format comparisons.',
      concept:'Evaluate a glass-care routine with a controlled spray or wipe and an optional reusable finishing tool.',
      next:'Test residue and streaking under varied light, lint, finish compatibility, application control and outdoor access where relevant; compare current Target formulas and tools.',
      matchRule:'Relevant categories with glass, mirror or window linked to cleaner, cleaning cloth, wipe or squeegee wording; automotive/windshield products excluded.',
      caveat:'Glass-care references do not establish safety for every coating, electronic screen or tinted surface.'
    },
    {
      id:'kitchen-grease', title:'Kitchen Grease & Oven Reset', priority:'Explore', platformId:'kitchen-storage',
      categories:[C.specialty,C.surface,C.naturals], scope:'Home Care / Kitchen & Specialty Cleaners', seedIds:[],
      customerNeed:'Choose an appropriate treatment for cooking grease and baked-on oven or grill residue.',
      differentiation:'Separate routine kitchen degreasing from intensive oven/grill treatment through application control and specific surface instructions.',
      rationale:'Kitchen degreasers and dedicated oven/grill cleaners provide evidence for distinct light and intensive cleaning tasks.',
      concept:'Evaluate a routine degreaser and a separately labelled intensive treatment with controlled application and clear restrictions.',
      next:'Validate grease/baked-on residue removal, dwell time, ventilation and handling instructions, surface compatibility and pack economics; compare existing Target ranges.',
      matchRule:'Explicit oven/grill cleaner wording or kitchen/stove/cooktop context with degreaser or grease-removal wording; ordinary kitchen cleaner claims and standalone scrub tools excluded.',
      caveat:'Routine degreasers and intensive oven formulas are not interchangeable. Listings do not establish universal surface or food-contact suitability.'
    },
    {
      id:'appliance-surface-care', title:'Kitchen Appliance Surface Care', priority:'Explore', platformId:'kitchen-storage',
      categories:[C.specialty,C.surface], scope:'Home Care / Specialty Cleaners; coordinate with Kitchen', seedIds:[],
      customerNeed:'Maintain cooktops and visible appliance finishes without choosing a generic cleaner by guesswork.',
      differentiation:'A coordinated but clearly separated cooktop and stainless-finish range with exact surface and application guidance.',
      rationale:'Explicit stainless-steel and cooktop cleaner/polish/wipe listings support specialist surface-care comparisons.',
      concept:'Evaluate a small appliance-surface care range with distinct formulas and optional purpose-designed applicators.',
      next:'Test residue, fingerprint appearance, soil removal and scratch/finish compatibility on named materials; establish usage instructions, refill needs and Target overlap.',
      matchRule:'Stainless-steel, cooktop or stove-top wording directly associated with cleaner, polish, cream or wipes; general cloth descriptions and machine-maintenance cleaners excluded.',
      caveat:'A stainless product is not automatically suitable for coated stainless, and cooktop materials require separate compatibility evidence.'
    },
    {
      id:'wood-furniture-care', title:'Wood & Furniture Care Routine', priority:'Explore', platformId:'surface-floor',
      categories:[C.specialty,C.surface], scope:'Home Care / Specialty Surfaces; coordinate with Home', seedIds:[],
      customerNeed:'Clean finished furniture and cabinets while preserving their appearance.',
      differentiation:'Distinguish routine cleaning, polishing and restorative treatments with clear finish restrictions and application amounts.',
      rationale:'Wood/furniture cleaners and polishes offer different maintenance roles and package forms to compare.',
      concept:'Evaluate a routine furniture cleaner plus a separately defined finish-care option with simple cloth and application guidance.',
      next:'Test soil removal, residue, gloss change and compatibility on representative finishes; distinguish maintenance from restoration and compare Target’s current range.',
      matchRule:'Wood, furniture or cabinet wording directly associated with cleaner, polish, oil, soap, conditioner or restorer; floor/deck/fence treatments excluded.',
      caveat:'Wood species, coatings and finishes differ. Listing claims do not prove suitability for unfinished, antique or specialty furniture.'
    },
    {
      id:'stone-surface-care', title:'Stone Countertop Care', priority:'Explore', platformId:'surface-floor',
      categories:[C.specialty,C.surface], scope:'Home Care / Specialty Surfaces; coordinate with Kitchen', seedIds:[],
      customerNeed:'Choose a cleaner suited to a named stone or engineered-stone countertop.',
      differentiation:'Make material suitability and routine-cleaning versus polishing roles explicit rather than using one generic stone claim.',
      rationale:'A smaller saved set of explicitly named granite, quartz, marble and stone cleaners provides focused material-care references.',
      concept:'Evaluate a clearly labelled countertop-care formula with precise material restrictions and controlled application.',
      next:'Confirm the guest and assortment need, then test etching, residue, gloss and compatibility with intended surfaces and sealers; research missing material coverage before defining the range.',
      matchRule:'Granite, quartz, marble, travertine or stone directly linked to cleaner/clean-and-shine/polish wording; brand-name “Granite Gold” alone does not qualify.',
      caveat:'This is a comparatively small evidence set. Natural and engineered stone are not interchangeable, and a listing cannot establish compatibility.'
    },
    {
      id:'floor-surface-care', title:'Floor Care by Surface Material', priority:'Explore', platformId:'surface-floor',
      categories:[C.floor,C.naturals], scope:'Home Care / Floor & Carpet Care', seedIds:[],
      customerNeed:'Match a routine cleaner or maintenance treatment to the floor installed at home.',
      differentiation:'A material-led choice architecture for hardwood, laminate, vinyl and tile, with routine cleaning separated from polish or restoration.',
      rationale:'Named floor-material cleaners and maintenance products support comparisons of formula roles and replenishment packs.',
      concept:'Evaluate a clearly differentiated floor-care range with matching refill packs and controlled-dose instructions.',
      next:'Test finish compatibility, residue, slip-related performance and cleaning effectiveness on specified floors; normalize dose and pack economics and audit Target overlap.',
      matchRule:'Floor-care categories with hardwood, laminate, vinyl, tile, stone or hard-surface floor wording and explicit cleaner/polish/refresher/restorer context; appliances excluded.',
      caveat:'A floor-material label does not cover every sealant or finish. Cleaning, polishing and restoration are distinct treatments.'
    },
    {
      id:'carpet-upholstery-care', title:'Carpet & Upholstery Spot-Care Range', priority:'Explore', platformId:'surface-floor',
      categories:[C.floor,C.specialty], scope:'Home Care / Floor & Carpet Care; coordinate with appliance merchants', seedIds:[],
      customerNeed:'Treat a spill or stain on soft furnishings and understand when a machine formula is required.',
      differentiation:'Separate ready-to-use spot treatment from machine formulas, with visible fabric and dilution guidance.',
      rationale:'Carpet and upholstery formulas provide task and application references beyond the retained pet-odor direction.',
      concept:'Evaluate a targeted spot-treatment range with a clearly distinct machine-cleaning companion where merchant review supports it.',
      next:'Test common stains, residue/resoiling, colorfastness and intended fiber compatibility; validate any machine use, dose, pack value and current Target coverage.',
      matchRule:'Carpet/rug/upholstery/sofa/couch cleaning context with explicit formula, liquid, spray, foam, powder, shampoo, solution, remover or fluid-quantity evidence; standalone appliances excluded.',
      caveat:'The comparison set contains different formulations and applications. It does not establish performance on all fabrics or upholstery codes.'
    },
    {
      id:'shower-routine', title:'Shower & Tub Maintenance Routine', priority:'Explore', platformId:'bathroom-care',
      categories:[C.bath,C.surface,C.specialty,C.naturals], scope:'Home Care / Bathroom Cleaning', seedIds:[],
      customerNeed:'Manage ordinary shower and tub residue with a usable routine between intensive cleans.',
      differentiation:'Make routine after-use treatment and periodic soap-scum removal clear, with controlled spraying and surface guidance.',
      rationale:'Explicit shower/tub and soap-scum cleaner listings support a distinct bathroom routine alongside mineral-deposit and toilet care.',
      concept:'Evaluate a routine shower cleaner plus a clearly differentiated periodic treatment if testing and Target review justify both.',
      next:'Compare soap-scum removal, residue, application and rinse needs, surface compatibility and cost per use; validate any frequency claim and existing Target coverage.',
      matchRule:'Shower, tub or soap-scum wording with cleaner/remover or explicit daily/after-shower format; generic bathroom cleaner, drain and mold-removal wording alone excluded.',
      caveat:'Routine shower care does not establish disinfection, mold prevention or descaling. Those claims require separate evidence.'
    },
    {
      id:'laundry-dose', title:'Compact Laundry Dosing System', priority:'Explore', platformId:'laundry-fabric',
      categories:[C.laundry,C.naturals], scope:'Home Care / Laundry & Naturals', seedIds:[],
      customerNeed:'Dose laundry detergent consistently and store replenishment packs conveniently.',
      differentiation:'A clear load-size and dose architecture with easy-to-understand pack contents; compare pods, sheets and tablets as different constructions.',
      rationale:'Explicit detergent pod/pac, sheet, tablet and strip listings provide compact-dose formats and pack references.',
      concept:'Evaluate a compact-dose detergent range or replenishment pack with validated performance, storage protection and dosing instructions.',
      next:'Test dissolution, soil removal, dose for load/water conditions, storage stability, packaging access requirements and cost per equivalent wash; compare existing Target offers.',
      matchRule:'Explicit detergent context with pods/pacs/paks, sheets, tablets, strips or capsules; ordinary multipacks, dryer sheets and machine-cleaner tablets excluded.',
      caveat:'A small or plastic-free-looking format does not prove equivalent cleaning, environmental benefit or lower cost per wash.'
    },
    {
      id:'fabric-finishing', title:'Drying & Fabric Finishing Choices', priority:'Explore', platformId:'laundry-fabric',
      categories:[C.laundry,C.specialty], scope:'Home Care / Laundry Care', seedIds:[],
      customerNeed:'Choose an appropriate drying or finishing aid for the fabric and desired feel.',
      differentiation:'Separate softening/static-control, wrinkle-release and reusable dryer-tool roles with clear fragrance and fabric-care guidance.',
      rationale:'Dryer sheets/balls, fabric softeners and explicitly named wrinkle-release or starch formats support a fuller garment-care comparison.',
      concept:'Evaluate a focused finishing range with an unscented choice, clear use restrictions and complementary rather than duplicative roles.',
      next:'Test the claimed finish effect, residues, fabric compatibility and repeated-use behavior; validate any static, wrinkle or drying-time claim and compare cost per use with Target.',
      matchRule:'Explicit dryer-sheet/ball, fabric-softener, wrinkle-release, ironing-spray or starch wording; scent beads and ordinary laundry detergent excluded.',
      caveat:'These formats do not share one mechanism. A dryer ball listing does not establish faster drying, softening or static reduction.'
    },
    {
      id:'fabric-refresh', title:'Fabric Refresh Between Washes', priority:'Explore', platformId:'laundry-fabric',
      categories:[C.laundry,C.air,C.specialty], scope:'Home Care / Laundry & Air Care', seedIds:[],
      customerNeed:'Refresh an appropriate garment or household textile between full washes.',
      differentiation:'A controlled application and clear fabric/use guidance, with scent preference kept separate from measured odor-removal performance.',
      rationale:'Explicit fabric/linen spray, mist and refresher formats provide evidence for textile-focused use rather than room-fragrance names.',
      concept:'Evaluate a textile refresher with controlled spray, fabric instructions and an optional portable pack if research supports that occasion.',
      next:'Test odor treatment, residue, drying and colorfastness on intended fabrics; validate scent preferences, pack leakage and current Target coverage.',
      matchRule:'Fabric, garment, clothing or linen directly associated with spray/mist/refresher/deodorizer; “linen” as an air-freshener scent and detergent/softener listings excluded.',
      caveat:'Refresh is not a substitute for laundering or a disinfection claim. Textile suitability and odor performance remain unverified.'
    },
    {
      id:'passive-odor-care', title:'Passive Odor & Moisture Care', priority:'Explore', platformId:'air-pet-pest',
      categories:[C.air], scope:'Home Care / Air Care', seedIds:[],
      customerNeed:'Choose a nonpowered treatment for a closet, small room or other defined odor-prone space.',
      differentiation:'Distinguish odor treatment from moisture capture, with clear placement, capacity and replacement guidance.',
      rationale:'Odor-absorber, charcoal, gel and moisture-absorber listings provide alternatives to powered fragrance devices.',
      concept:'Evaluate a compact passive treatment and refill path with a clearly stated task, placement and replacement indicator.',
      next:'Test the stated mechanism, capacity, spill containment, placement conditions and replacement interval; compare current Target options and equivalent cost per period.',
      matchRule:'Air Care with odor/air context plus absorber, activated charcoal/carbon, baking-soda or odor-treatment gel wording; powered, spray and aerosol formats excluded.',
      caveat:'Fragrance, odor adsorption and moisture capture are different mechanisms. No mold prevention or air-quality health benefit is established.'
    },
    {
      id:'bath-tissue', title:'Bath Tissue Pack & Performance Architecture', priority:'Explore', platformId:'paper-essentials',
      categories:[C.tissue], scope:'Home Care / Toilet Paper & Tissues', seedIds:[],
      customerNeed:'Balance comfort, strength, dispenser fit and storage space when buying bath tissue.',
      differentiation:'Make sheets, dimensions, ply and roll fit understandable across an accessible entry pack and a family replenishment pack.',
      rationale:'Bath/toilet tissue listings contain varied ply, roll and sheet-count architectures that can support a structured performance/value review.',
      concept:'Evaluate a clearly tiered bath-tissue offer with transparent pack information and practical roll sizes.',
      next:'Test softness, strength, disintegration and roll fit; normalize price per comparable sheet area and audit Target’s present pack architecture before proposing a gap.',
      matchRule:'Toilet Paper & Tissues with explicit toilet-paper or bath/bathroom-tissue wording; wet/flushable wipe formats excluded.',
      caveat:'Mega-roll equivalence and softness claims are not standardized comparisons. Plumbing or septic suitability is not established by the saved titles.'
    },
    {
      id:'facial-tissue', title:'Facial Tissue for Home & On the Go', priority:'Explore', platformId:'paper-essentials',
      categories:[C.tissue], scope:'Home Care / Toilet Paper & Tissues', seedIds:[],
      customerNeed:'Keep a suitable facial tissue accessible at home, in shared spaces and while traveling.',
      differentiation:'A consistent choice across box and pocket packs with transparent sheet size, ply and any lotion or fragrance treatment.',
      rationale:'Explicit facial, pocket and lotion-tissue listings provide pack and treatment comparisons across several retailers.',
      concept:'Evaluate coordinated everyday and treated-tissue options with practical box/pocket pack sizes.',
      next:'Test softness, wet strength, lint and dispensing; verify treatment disclosures, normalize sheet dimensions and pack value, and compare existing Target options.',
      matchRule:'Explicit facial-tissue, pocket-tissue, lotion-tissue or travel-tissue wording in the tissue category; wipes and makeup-removal products excluded.',
      caveat:'Lotion or softness wording does not establish a skin-health or medical benefit. Different sheet sizes and counts require normalization.'
    },
    {
      id:'prep-liners', title:'Food-Prep Wrap & Liner System', priority:'Explore', platformId:'kitchen-storage',
      categories:[C.storage], scope:'Food Wrap & Storage; coordinate with Kitchen', seedIds:[],
      customerNeed:'Select the right wrap or liner for preparation, storage and cleanup without confusing material uses.',
      differentiation:'Organize foil, parchment and storage papers by task, size and explicitly verified temperature or food-contact suitability.',
      rationale:'Foil, parchment, wax/freezer paper and named cooking-liner formats provide complementary kitchen-preparation references.',
      concept:'Evaluate a practical wrap-and-liner range with useful precut or roll sizes and unmistakable use instructions.',
      next:'Validate intended food contact, heat limits where relevant, release/leak performance, dispenser usability and cost per area; compare current Target coverage.',
      matchRule:'Food Wrap & Storage with aluminum/aluminium foil, parchment, wax/freezer/baking paper, air-fryer/baking liner or silicone baking-mat wording; foil storage bags and pouches excluded.',
      caveat:'Wax paper, foil and parchment have different restrictions. A cooking use or temperature limit is not inferred from another material’s listing.'
    },
    {
      id:'drinkware-serving', title:'Hot & Cold Drinkware Serving System', priority:'Explore', platformId:'paper-essentials',
      categories:[C.tabletop], scope:'Disposable Tabletop; coordinate with Kitchen', seedIds:[],
      customerNeed:'Serve or carry drinks in the right cup size and construction for the occasion.',
      differentiation:'A clear hot/cold and at-home/to-go architecture with validated lid fit where offered and transparent capacities and counts.',
      rationale:'Paper, plastic, foam and insulated cup listings provide material, size and serving-format comparisons beyond plates and bowls.',
      concept:'Evaluate coordinated drinkware packs and optional compatible lids with clearly labelled use and disposal guidance.',
      next:'Test intended-temperature performance, grip, leakage and lid retention where relevant; confirm material requirements, normalize capacity/pack cost and review Target coverage.',
      matchRule:'Disposable Tabletop with cup/drinkware wording paired with paper, plastic, foam, insulated, hot/cold or disposable language; measuring cups excluded.',
      caveat:'Not all cup references include lids or suit hot liquids. Recyclability and compostability require material and local-system evidence.'
    }
  ].map((definition, index) => {
    const brief = {...retainedBriefs[definition.id],...definition};
    const platform = platformById.get(brief.platformId);
    return Object.freeze({
    ...brief,
    platform:platform.title,
    portfolioRole:index < 7 ? 'Umbrella direction' : 'Specific concept',
    portfolioRoleKey:index < 7 ? 'umbrella' : 'concept',
    order: index + 1,
    original: index < 7,
    priorityBasis: index < 7 ? 'Retained research judgment; not a measured market ranking.' : 'Research queue; no numerical priority assigned.',
    gapLabel: TARGET_GAP,
    route: definition.scope,
    why: definition.rationale,
    categories: Object.freeze(definition.categories), seedIds: Object.freeze(definition.seedIds)
  }); });
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
    'toilet-wand': t => /\btoilet\s*wand\b/.test(t) || /\btoilet\b/.test(t) && /\b(?:disposable|replacement|refill)\b/.test(t) && /\b(?:heads?|brush|cleaning system)\b/.test(t),
    'mop-bucket-system': t => /\b(?:mops?|mopping)\b/.test(t) && /\b(?:buckets?|wringers?|spin[ -]mop|clean[ -]water|dirty[ -]water|dual[ -]tank|self[ -]wringing)\b/.test(t.replace(/\b(?:no[ -]?bucket(?:\s+needed)?|without\s+(?:a\s+)?bucket|bucket[ -]free)\b/g,'')),
    'quick-floor-system': t => /\b(?:spray[ -]mop|flat[ -]mop|mop[ -]pads?|mopping[ -](?:pads?|cloths?))\b/.test(t) && /\b(?:microfib(?:er|re)|washable|reusable|spray|refills?|replacement)\b/.test(t),
    'dust-hair-tools': t => /\b(?:dusters?|dusting|lint[ -]rollers?|pet[ -]hair[ -]remov\w*|fur[ -]remov\w*)\b/.test(t) && !/\b(?:air[ -]duster|compressed[ -]air|insecticide|pesticide|diatomaceous|automotive|car|detergent)\b/.test(t),
    'sink-side-tools': t => /\b(?:non[ -]?scratch|scratch[ -]free|non[ -]abrasive)\b/.test(t) && /\b(?:sponges?|scrubbers?|scour\w*|dishcloths?|pads?)\b/.test(t) || /\bdish[ -]?wand\b/.test(t) || /\bsoap[ -]dispensing\b[^|.;]{0,30}\b(?:brush(?:es)?|scrubbers?|sponges?)\b/.test(t),
    'reusable-cloth-system': t => /\b(?:microfib(?:er|re)|swedish|reusable|washable)\b/.test(t) && /\b(?:cloths?|dishcloths?|towels?|wipes?)\b/.test(t) && !/\b(?:car|automotive|auto|vehicle|truck|boat|motorcycle|rv|disposable|mops?|mopping)\b/.test(t),
    'glass-mirror-care': t => /\b(?:glass|mirrors?|windows?)\b/.test(t) && /\b(?:cleaners?|cleaning|squeegees?|cloths?|wipes?)\b/.test(t) && !/\b(?:windshield|automotive|car|empty spray bottle)\b/.test(t) && (!/\b(?:cooktop|stove|cooking|cookware|pots|pans)\b/.test(t) || /\b(?:mirrors?|windows?)\b/.test(t)),
    'kitchen-grease': t => !/\b(?:sponges?|scouring[ -]pads?|melamine|scrubbers?|brush(?:es)?|cloths?)\b/.test(t) && (/\b(?:oven|grill)\b[^|.;]{0,40}\b(?:cleaners?|cleaning|degreas\w*)\b/.test(t) || /\b(?:kitchen|stove|stove[ -]top|cook[ -]?top|range)\b/.test(t) && /\b(?:degreas\w*|grease[ -]remov\w*)\b/.test(t)),
    'appliance-surface-care': t => !matchers['machine-maintenance'](t) && (!/\b(?:cookware|pots|pans)\b/.test(t) || /\b(?:appliance|cook[ -]?top|stove[ -]top)\b/.test(t)) && (/\b(?:stainless[ -]steel|cook[ -]?tops?|stove[ -]tops?)\b[^|.;]{0,45}\b(?:cleaners?|polish|wipes?|cream)\b/.test(t) || /\b(?:cleaners?|polish|wipes?)\s+(?:for\s+)(?:the\s+)?(?:stainless[ -]steel|cook[ -]?tops?|stove[ -]tops?)\b/.test(t)),
    'wood-furniture-care': t => !/\b(?:floor|floors|deck|fence)\b/.test(t) && (!/\boutdoor\b/.test(t) || /\bwood\b/.test(t)) && (/\b(?:wood|furniture|cabinets?)\b[^|.;]{0,40}\b(?:cleaners?|polish|oils?|soap|conditioners?|restorers?)\b/.test(t) || /\b(?:cleaners?|polish|conditioners?)\s+(?:for\s+)(?:the\s+)?(?:wood|furniture|cabinets?)\b/.test(t)),
    'stone-surface-care': t => /\b(?:granite|marble|quartz|travertine|stone)\b[^|.;]{0,45}\b(?:cleaners?|clean\s*(?:&|and)\s*shine|polish)\b/.test(t.replace(/\bgranite gold\b/g,'')),
    'floor-surface-care': t => /\b(?:hardwood|laminate|vinyl|tile|stone|hard[ -]surface)\b/.test(t) && /\bfloors?\b/.test(t) && /\b(?:cleaners?|polish|refresher|restorers?)\b/.test(t) && !/\b(?:vacuum|robot|cordless|spray[ -]mop|mop[ -](?:kit|system|pads?))\b/.test(t),
    'carpet-upholstery-care': t => {
      const task = /\b(?:carpet|rug|upholstery|sofa|couch)\b/.test(t) && /\b(?:cleaners?|cleaning|shampoo|spot|stain)\b/.test(t);
      const formula = /\b(?:formula|liquid|spray|foam|powder|shampoo|solution|remover)\b/.test(t) || /\b\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|oz|ml|litres?|liters?|gallons?|gal)\b/.test(t);
      const appliance = /\b(?:vacuum|robot|battery|cordless|corded|upright|extractor|machine|portable cleaner)\b/.test(t);
      const explicitFormula = /\b(?:formula|solution|liquid|shampoo|cleaner concentrate)\b/.test(t);
      return task && formula && (!appliance || explicitFormula);
    },
    'shower-routine': t => /\b(?:shower|tub|soap[ -]scum)\b/.test(t) && /\b(?:cleaners?|remov\w*|daily|after[ -]shower)\b/.test(t) && !/\b(?:toilet bowl|drain|mold|mould|mildew|brush|squeegee)\b/.test(t),
    'laundry-dose': t => /\bdetergent\b/.test(t) && !/\b(?:dryer|washing machine cleaner|washer cleaner|dishwasher)\b/.test(t) && (/\b(?:detergent|laundry)[ -]*(?:pods?|pacs?|paks?|sheets?|tablets?|strips?|capsules?)\b/.test(t) || /\b(?:pods?|pacs?|paks?|tablets?|capsules?)\b[^|.;]{0,80}\bdetergent\b/.test(t)),
    'fabric-finishing': t => !/\b(?:detergent|laundry[ -](?:pods?|capsules?|pacs?|paks?))\b/.test(t) && /\b(?:dryer[ -]sheets?|dryer[ -]balls?|fabric[ -]softeners?|wrinkle[ -]releas\w*|ironing[ -]spray|spray[ -]starch|liquid[ -]starch)\b/.test(t),
    'fabric-refresh': t => !/\b(?:detergent|softener|stain remover)\b/.test(t) && (/\b(?:fabric|garment|clothing|clothes)[ -]*(?:(?:freshening|odou?r[ -]fighting)[ -]+)?(?:spray|mist|refresh\w*|deodoriz\w*)\b/.test(t) || /\blinen[ -]*(?:spray|mist|refresher)\b/.test(t) || /\b(?:room|air)\s*(?:&|and)\s*(?:fabric|linen)\s*(?:spray|mist|refresher)\b/.test(t) || /\b(?:fabric|linen)\s*(?:&|and)\s*(?:room|air)\s*(?:spray|mist|refresher)\b/.test(t) || /\b(?:refresher|deodorizer|odou?r[ -]eliminator)\s+for\s+(?:fabrics?|clothing|linens?)\b/.test(t)),
    'passive-odor-care': t => /\b(?:odou?rs?|air)\b/.test(t) && /\b(?:absor(?:bers?|bing)|activated[ -]charcoals?|activated[ -]carbon|baking[ -]soda|odou?r[ -]eliminat\w*[ -]gel|gel[ -]beads?)\b/.test(t) && !/\b(?:spray|aerosol|plug[ -]?in|diffuser)\b/.test(t),
    'bath-tissue': t => /\b(?:toilet[ -]paper|bath(?:room)?[ -]tissue)\b/.test(t) && !/\b(?:wet|flushable|moist)[ -]wipes?\b/.test(t),
    'facial-tissue': t => /\b(?:facial[ -]tissues?|pocket[ -]tissues?|tissues?[ -]pocket|lotion[ -]tissues?|tissue[ -]travel|travel[ -]tissues?)\b/.test(t) && !/\b(?:wipes?|makeup|washcloths?)\b/.test(t),
    'prep-liners': t => !/\b(?:bags?|pouches)\b/.test(t) && /\b(?:parchment|alumin(?:um|ium)[ -]foil|wax[ -]paper|freezer[ -]paper|baking[ -]paper|air[ -]fryer[ -]liners?|baking[ -]liners?|silicone[ -]baking[ -]mats?)\b/.test(t),
    'drinkware-serving': t => /\b(?:cups?|drinkware)\b/.test(t) && /\b(?:paper|plastic|foam|insulat\w*|hot|cold|disposable)\b/.test(t) && !/\bmeasuring[ -]cups?\b/.test(t)
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

  function analyzePlatform(items, opportunities, platform, salesModel) {
    const members = opportunities.filter(opportunity=>opportunity.platformId===platform.id);
    const ids = new Set(members.flatMap(opportunity=>opportunity.recordIds));
    const matchedItems = items.filter(item=>ids.has(item.id));
    const grouped = new Map();
    for (const reference of members.flatMap(opportunity=>opportunity.references)) {
      const key = listingIdentity(reference.item).key;
      if (!grouped.has(key)) grouped.set(key,[]);
      grouped.get(key).push(reference);
    }
    const groups = [...grouped.values()];
    const salesCohorts = salesModel ? salesModel.groupRows(matchedItems) : [];
    const retailers = [...new Set(matchedItems.map(item=>String(item.retailer || 'Retailer not stated')))].sort();
    const counts = {
      records:ids.size,
      distinctListings:groups.length,
      retailers:retailers.length,
      titleMatched:groups.filter(group=>group.some(reference=>reference.matchesCriteria)).length,
      retainedSeedOnly:groups.filter(group=>group.every(reference=>!reference.matchesCriteria)).length,
      individualItemLinks:groups.filter(group=>group.some(reference=>reference.exactItemLink)).length,
      broadReferences:groups.filter(group=>group.every(reference=>!reference.exactItemLink) && group.some(reference=>reference.url)).length,
      limitedReferences:groups.filter(group=>group.every(reference=>reference.limited)).length,
      missingSources:groups.filter(group=>group.every(reference=>!reference.url)).length,
      withSales:groups.filter(group=>group.some(reference=>reference.hasPublishedCount)).length,
      sourceBackedSales:groups.filter(group=>group.some(reference=>reference.hasSourceBackedCount)).length,
      rankableSales:salesCohorts.reduce((sum,group)=>sum+group.entries.length,0),
      withPrice:groups.filter(group=>group.some(reference=>reference.hasPriceSnapshot)).length,
      duplicatesRemoved:ids.size-groups.length
    };
    return {
      ...platform,
      platform:platform.title,
      opportunityIds:members.map(opportunity=>opportunity.id),
      definitionCount:members.length,
      umbrellaCount:members.filter(opportunity=>opportunity.original).length,
      conceptCount:members.filter(opportunity=>!opportunity.original).length,
      supportedCount:members.filter(opportunity=>opportunity.counts.distinctListings>0).length,
      counts,retailers,
      categories:[...new Set(matchedItems.map(item=>item.category).filter(Boolean))].sort(),
      recordIds:[...ids],
      matchedIds:groups.map(group=>group[0].id),
      latestCheckedDate:latest(matchedItems.map(checkedDate)),
      lastSalesDate:latest(matchedItems.filter(item=>item.hasSales).map(item=>date(item.metricDate))),
      checkedDateCounts:countDates(matchedItems.map(checkedDate)),
      salesDateCounts:countDates(matchedItems.filter(item=>item.hasSales).map(item=>date(item.metricDate))),
      evidenceLabel:groups.length ? groups.length + ' saved comparison references, deduplicated across this programme’s overlapping directions.' : 'No matching saved references in this programme for the selected scope.',
      analysisBasis:ANALYSIS_BASIS,
      gapLabel:TARGET_GAP,
      countBasis:'Union of matching records, deduplicated by exact retailer listing when identifiable. Programmes can also overlap; do not sum their counts as unique assortment or demand.'
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
    const analyzedPlatforms = platforms.map(platform=>analyzePlatform(valid,opportunities,platform,usableSalesModel));
    return {
      opportunities,
      platforms:analyzedPlatforms,
      summary:{
        analyzedAt:date(options.analyzedAt), definitionCount:definitions.length, supportedCount:supported.length,
        platformCount:platforms.length,supportedPlatformCount:analyzedPlatforms.filter(platform=>platform.counts.distinctListings>0).length,
        umbrellaCount:definitions.filter(definition=>definition.original).length,conceptCount:definitions.filter(definition=>!definition.original).length,
        supportedUmbrellaCount:supported.filter(opportunity=>opportunity.original).length,supportedConceptCount:supported.filter(opportunity=>!opportunity.original).length,
        inputRecords:valid.length, uniqueMatchedRecords:ids.size,
        uniqueMatchedListings:new Set(matchedItems.map(item=>listingIdentity(item).key)).size,
        distinctRetailers:new Set(matchedItems.map(item=>item.retailer)).size,
        matchedCategories:[...new Set(matchedItems.map(item=>item.category).filter(Boolean))].sort(),
        latestCheckedDate:latest(matchedItems.map(checkedDate)), lastSalesDate:latest(matchedItems.filter(item=>item.hasSales).map(item=>date(item.metricDate))),
        salesModelAvailable:Boolean(usableSalesModel), analysisBasis:ANALYSIS_BASIS,gapLabel:TARGET_GAP
      }
    };
  }

  return Object.freeze({definitions,platforms,analyze,match,listingIdentity});
});
