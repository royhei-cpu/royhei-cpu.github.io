(function (global) {
  'use strict';
  const checked = '2026-11-04';
  const common = {
    retailer: 'Target', checked, revision: 'Not specified by retailer',
    priceNote: 'Dated research observation; not a current checkout quote.',
    service: 'Owner repair procedure and stocked spare parts not established.',
    wetPocket: 'Dedicated wet-item pocket not specified.'
  };
  const baselines = {
    hardside: {
      ...common, id: 'hardside', name: 'Hardside Carry-On · Aqua Blue', tcin: '86391405',
      source: 'https://www.target.com/p/-/A-86391405',
      savedOfferSource: 'https://www.target.com/p/-/A-88289923',
      sourceSha256: 'fe0e41c504037e89316ecdd106b0cff6a50cd9febfe591296cd41cdd1a1a9144',
      color: 'Aqua Blue', dimensionsIn: [21.75, 14.25, 9.75],
      interior: '21 × 13.5 × 8 in, retailer-listed.', weightLb: 7.3,
      weightNote: 'Retailer specification; not independently weighed.', capacity: '45 L, retailer-listed.',
      material: 'Polycarbonate and ABS; construction ratio unstated.',
      organization: 'Lined compartments, mesh zip pocket and cross straps.',
      frontAccess: false, front: 'Separate front laptop pocket not specified.',
      wheels: '8 wheels, retailer count.', handle: 'Aluminum retractable locking trolley; top and side grips.',
      expansion: '2 in expansion stated in description.', lock: 'Integrated travel lock not specified in product specifications.',
      warranty: '1-year limited warranty, retailer-listed.',
      price: { amount: 76.5, currency: 'USD', date: '2026-11-03', kind: 'Saved selected-color clearance; regular USD 90' },
      cautions: ['A-88289923 is the saved listing route; the Aqua Blue variant resolves to TCIN 86391405.', 'Retailer-listed dimensions and capacity are not independent measurements. The revision is unstated.']
    },
    signature: {
      ...common, id: 'signature', name: 'Signature Hardside Carry-On · Black', tcin: '87249354',
      source: 'https://www.target.com/p/-/A-87249354',
      sourceSha256: '6b3b04b19b4848fd5235b4621ca9f79ad531cb31ea3e11237cb7d85777cd6b74',
      color: 'Black', dimensionsIn: [21.5, 14.5, 9.75],
      interior: '19.7 in height, 10.8 in width listed; depth unspecified. Other page text conflicts.', weightLb: 7.71,
      weightNote: 'Specifications list 7.71 lb; description rounds to 8 lb.',
      capacity: 'Not established from the specifications; conflicting Q&A is not normalized into a capacity.',
      material: 'Polycarbonate; grade and thickness unstated.',
      organization: 'Removable compression pad, mesh pockets, cross straps and laundry bag.',
      frontAccess: false, front: 'Separate front laptop pocket not specified.',
      wheels: '4 spinner wheels, retailer count.', handle: 'Aluminum telescoping trolley; top and side grips.',
      expansion: 'Expansion listed; added depth unspecified.', lock: 'Retailer lists an integrated TSA lock.',
      warranty: '10-year limited warranty, retailer-listed.',
      price: { amount: 160, currency: 'USD', date: checked, kind: 'Separate official-page benchmark; not added to directory pricing' },
      cautions: ['The removable compression pad already exists in this product; compression alone is not a new Open Story feature.', 'Description rounds weight to 8 lb; specifications list 7.71 lb. Interior and capacity statements conflict across the page.']
    },
    'front-pocket': {
      ...common, id: 'front-pocket', name: 'Hardside Carry-On with Front Pocket · Black', tcin: '92443469',
      source: 'https://www.target.com/p/-/A-92443469',
      sourceSha256: 'd0e3d9605c668b35022b73421caa1244c2bf9cf1c9ca9caf50011fd5544bf03e',
      color: 'Black', dimensionsIn: [21.75, 14.25, 9.75],
      interior: 'Complete interior dimensions not specified.', weightLb: 14.25,
      weightNote: 'Conflicting listing: item specification says 14.25 lb; shipping section says 9 lb. Do not use for a weight-saving claim.',
      capacity: 'Not established from specifications; Q&A claims are not adopted as verified capacity.',
      material: 'Polycarbonate and ABS; construction ratio unstated.',
      organization: 'Lined mesh compartments and cross straps; laptop sleeve in front pocket.',
      frontAccess: true, front: 'Front zip pocket and laptop sleeve already included; device-size answers conflict.',
      wheels: '8 wheels, retailer count.', handle: 'Metal telescoping trolley and top carrying grips.',
      expansion: 'No expansion listed; retailer support says non-expandable.', lock: 'Integrated travel lock not specified in product specifications.',
      warranty: '1-year limited warranty, retailer-listed.',
      price: { amount: 80, currency: 'USD', date: checked, kind: 'Official-page selected-Black clearance; regular USD 100; separate benchmark' },
      cautions: ['Front access and a laptop sleeve already exist in this product. They are not new to the Open Story range.', 'Item and shipping weights conflict. Laptop-fit answers also conflict; measure the exact sample before specifying a device size.']
    }
  };
  function baseline(id) { return baselines[Object.hasOwn(baselines, id) ? id : 'hardside']; }
  const round = n => Math.sign(n) * Math.round((Math.abs(n) + 1e-8) * 100) / 100;
  function review(value, baselineId) {
    const D = global.OpenStoryDesign, c = D.sanitize(value), b = baseline(baselineId);
    const dims = D.formats[c.format].dimensions, originalCm = b.dimensionsIn.map(n => round(n * 2.54));
    const deltaCm = c.format === 'cabin' ? dims.map((n, i) => round(n - b.dimensionsIn[i] * 2.54)) : null;
    const row = (id, label, original, revised, change, validation, status = 'Design target') => ({ id, label, original, revised, change, validation, status });
    const rows = [
      row('identity', 'Product / revision', b.name + '; TCIN ' + b.tcin + '; revision unstated.', 'Original development concept · ' + D.formats[c.format].label + '.', 'Reference product and concept remain distinct records.', 'Approve the actual sample, model code and revision before a product specification.', 'Identity'),
      row('envelope', 'Overall H × W × D', b.dimensionsIn.join(' × ') + ' in ≈ ' + originalCm.join(' × ') + ' cm; retailer-listed.', dims.join(' × ') + ' cm; nominal exterior design target.', deltaCm ? 'Revised minus listed original: ' + deltaCm.map(n => (n > 0 ? '+' : '') + n.toFixed(2)).join(' / ') + ' cm (H / W / D). This is a nominal difference, not a measured improvement.' : 'Changed from carry-on to a checked-luggage format; not a like-for-like size improvement.', 'Measure the finished case including wheels and handles, retracted; check each intended airline.'),
      row('interior-size', 'Interior dimensions', b.interior, 'Not yet measured or specified.', 'Selected organization takes space inside the target shell.', 'Measure usable packing dimensions after hardware, lining and modules are installed.', 'Unverified'),
      row('weight', 'Empty weight', b.weightLb + ' lb ≈ ' + round(b.weightLb * 0.45359237) + ' kg. ' + b.weightNote, 'Unknown; no mass target approved.', 'No lighter-weight or percentage-saving claim is supported.', 'Weigh a complete prototype including wheels, handle, lining and selected modules.', 'Unverified'),
      row('capacity', 'Usable capacity', b.capacity, 'Unknown; not calculated from the exterior bounding box.', 'No extra-capacity claim is supported by the current 3D model.', 'Use the same packing-volume protocol on both physical cases.', 'Unverified'),
      row('material', 'Shell construction', b.material, 'Polycarbonate shell concept; resin, thickness and process unselected.', 'Material direction for development; stronger, lighter or greener performance is not established.', 'Select a resin grade and section design; validate impact, flex and temperature behavior.'),
      row('color', 'Color / trim', b.color + '; exact revision finish unstated.', D.colors[c.color].label + ' shell / ' + (c.trim === 'forest' ? 'Forest' : 'Graphite') + ' trim.', 'Aesthetic customization; screen colors are not production color standards.', 'Approve physical color chips, texture, gloss, scuff resistance and colorfastness.', 'Selection'),
      row('organization', 'Packing / organization', b.organization, ({ compression: 'Selectable compression panel.', cubes: 'Selectable removable packing cubes.', divider: 'Selectable zippered divider.' })[c.interior], b.id === 'signature' && c.interior === 'compression' ? 'Retains an existing product idea; no novel compression claim.' : 'Configure a packing layout around the traveler brief; these systems are alternatives, not all included together.', 'Compare packing ease, usable volume, added mass and closure force with a loaded sample.'),
      row('front-access', 'Front / device access', b.front, c.frontAccess ? 'Front-access panel selected; sleeve fit and working hinge/zip details unresolved.' : 'Front-access panel off; main case access only in this concept.', b.frontAccess ? (c.frontAccess ? 'Existing baseline feature retained as a concept; evaluate the complete workflow.' : 'Baseline front access is omitted from your current concept.') : (c.frontAccess ? 'Added against this baseline, but already sold elsewhere in Open Story.' : 'No added front access in this configuration.'), 'Check actual devices, protection, hinge loads, access while upright and loss of main packing space.', c.frontAccess ? 'Design target' : 'Feature off'),
      row('wheels', 'Wheels / repair access', b.wheels + ' ' + b.service, 'Four twin-spinner assemblies. ' + (c.repairable ? 'Service fastener markers shown.' : 'Service markers off; no repairability improvement proposed.'), c.repairable ? 'Service access is illustrated; tool access, replaceable parts and a parts program remain unproven.' : 'Turning markers off does not establish a repair system.', 'Test loaded rolling, drop and fatigue life, replacement task, tools, spare-part availability and cost.', c.repairable ? 'Design target' : 'Feature off'),
      row('wet-pocket', 'Wet / dirty separation', b.wetPocket, c.wetPocket ? 'Separate wet-item pocket geometry selected.' : 'Separate wet-item pocket off.', c.wetPocket ? 'Proposed segregation of damp items; not a waterproof, leakproof or antimicrobial claim.' : 'No additional wet-item segregation selected.', 'Choose lining and seam construction; test cleaning, drying, leakage and loaded pocket retention.', c.wetPocket ? 'Design target' : 'Feature off'),
      row('expansion', 'Expansion', b.expansion, 'Expansion mechanism not modeled or specified.', 'Expansion from the baseline is not automatically retained in the concept.', 'Decide whether to retain expansion; prototype gusset, zipper path and expanded stability.', 'Not modeled'),
      row('handle', 'Handle / carry points', b.handle, 'Telescoping-handle geometry and carry points are illustrative; reach and stops are unvalidated.', 'Visual retention is not proof of equivalent strength or ergonomics.', 'Test handle extension, grip clearance, loaded lifting and handle-cycle durability.'),
      row('security', 'Closure / travel lock', b.lock, 'Shell seam is illustrative; zipper, lock, seals and access hardware are not engineered.', 'No security certification or equivalent lock function is claimed.', 'Select compatible closure and lock hardware; confirm licensing, operation and durability.', 'Not modeled'),
      row('price', 'Price / production cost', b.price.currency + ' ' + b.price.amount + ' · ' + b.price.date + '. ' + b.price.kind + '.', 'Retail price and unit cost unknown.', 'Observed retail price is not a manufacturing budget or a quote for the revised product.', 'Create a BOM and supplier quote including tooling, assembly, freight, tests and spare parts.', 'Uncosted'),
      row('warranty', 'Warranty / service promise', b.warranty, 'No warranty or service commitment assigned.', 'The original retail warranty does not transfer to this development concept.', 'Agree service coverage, repair instructions and supported spare parts before launch.', 'Unverified')
    ];
    const get = id => rows.find(r => r.id === id);
    const upgrades = [
      { ...get('envelope'), title: '01 · Set the size around the trip', view: 'exterior', benefit: 'Make the packing and handling brief explicit before detailing hardware.', tradeoff: 'A shallower case may sacrifice usable volume; changing to checked luggage changes the use case.', modelScope: 'The browser scales the scene; the Blender rebuild generates the chosen nominal envelope. Neither certifies dimensions.' },
      { ...get('front-access'), title: '02 · Reach essentials without unpacking', view: 'exterior', benefit: c.frontAccess ? 'Study quicker access to work items while the main packing area remains organized.' : 'A simpler front shell is selected; assess whether the traveler needs separate device access.', tradeoff: 'An access panel consumes shell and packing space and adds closure and protection requirements.', modelScope: 'Panel geometry and visibility only; a working zipper, hinge and device sleeve are not engineered.' },
      { ...get('organization'), title: '03 · Choose one packing system', view: 'inside', benefit: ({ compression: 'Study load control and clothing retention.', cubes: 'Study removable groupings for shared or multi-stop packing.', divider: 'Study a simple separation between the two packing zones.' })[c.interior], tradeoff: 'Organization adds material and may reduce usable space; cubes, a divider and a compression panel are alternative configurations.', modelScope: 'Selected panel, cubes or divider appears in the 3D scene. Compression force and module attachment are untested.' },
      { ...get('wheels'), title: '04 · Develop a serviceable wheel system', view: 'exploded', benefit: c.repairable ? 'Explore access that could allow a worn wheel to be replaced instead of replacing the case.' : 'Repair access is off in the current configuration.', tradeoff: 'Service fasteners, chassis reinforcement and stocked parts add design, cost and supply obligations.', modelScope: 'Exploded wheel groups and optional fastener markers illustrate intent; attachment geometry is not production engineering.' },
      { ...get('wet-pocket'), title: '05 · Separate damp items', view: 'inside', benefit: c.wetPocket ? 'Study a dedicated place for damp or dirty small items.' : 'This optional pocket is excluded from your current concept.', tradeoff: 'Pocket material and seams need cleaning and drying tests; sealed construction can trap moisture.', modelScope: 'Optional pocket shape only; no barrier material or sealed seam is specified.' },
      { ...get('material'), title: '06 · Validate the shell construction', view: 'exterior', benefit: 'Set a coherent material and surface brief for supplier development.', tradeoff: 'Resin, wall thickness, texture and tooling affect mass, durability and cost; the model cannot resolve them.', modelScope: 'Visible ribbed shell and surface color only; no structural simulation or material certificate.' },
      { ...get('color'), title: '07 · Coordinate the finish', view: 'exterior', benefit: 'Evaluate the selected shell and trim palette as a complete case.', tradeoff: 'Digital rendering depends on lighting and screen; it is not a physical color match.', modelScope: 'Selected shell and trim colors are rendered and exported in the customized GLB.' },
      { ...get('expansion'), title: '08 · Resolve what the revision leaves out', view: 'exterior', benefit: 'Make retained, omitted and unresolved requirements visible before prototyping.', tradeoff: 'Expansion, a working closure, lock, mass, volume, price and warranty remain open requirements.', modelScope: 'No functioning expansion or travel-lock mechanism is included. These are development gaps, not completed upgrades.' }
    ];
    const originalConcept = D.sanitize(D.defaults);
    const labels = { traveler: 'Traveler profile', format: 'Format', color: 'Shell color', trim: 'Trim', interior: 'Interior system', frontAccess: 'Front access', repairable: 'Wheel-service markers', wetPocket: 'Wet-item pocket' };
    const display = (key, v) => typeof v === 'boolean' ? (v ? 'On' : 'Off') : key === 'format' ? D.formats[v].label : key === 'color' ? D.colors[v].label : String(v);
    const conceptChanges = Object.keys(labels).filter(k => c[k] !== originalConcept[k]).map(k => ({ field: labels[k], original: display(k, originalConcept[k]), revised: display(k, c[k]) }));
    return { schema: 'open-story-specification-review-v1', checked, baseline: b, baselineDimensionsCm: originalCm, dimensionDeltaCm: deltaCm, comparableFormat: c.format === 'cabin', rows, upgrades, originalConcept, conceptChanges, scope: 'Original means the selected retail reference. Revised means your current, untested development concept. Base Blender defaults are recorded separately. No retailer specification is an independent performance test.' };
  }
  function csv(report) {
    const header = ['Specification', 'Original retail product', 'Original TCIN', 'Original specification', 'Revised concept', 'Change / rationale', 'Status', 'Validation required', 'Original source URL', 'Source checked', '3D representation', 'Proposed benefit', 'Trade-off'];
    const quote = value => { let s = String(value ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const rows = report.rows.map(r => { const u = report.upgrades.find(x => x.id === r.id); return [r.label, report.baseline.name, report.baseline.tcin, r.original, r.revised, r.change, r.status, r.validation, report.baseline.source, report.checked, u?.modelScope || 'See development brief; no functional performance established.', u?.benefit || '', u?.tradeoff || '']; });
    return '\ufeff' + [header, ...rows].map(r => r.map(quote).join(',')).join('\r\n');
  }
  function markdown(report) {
    const safe = s => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    return `## Original versus revised specifications\n\n${report.scope}\n\nOriginal: ${report.baseline.name}; TCIN ${report.baseline.tcin}. Source: ${report.baseline.source} (checked ${report.checked}; revision unstated).\n\n${report.baseline.cautions.map(x => '- ' + x).join('\n')}\n\n| Specification | Original retail | Revised concept | Change / rationale | Validation |\n|---|---|---|---|---|\n${report.rows.map(r => '| ' + [r.label, r.original, r.revised, r.change, r.validation].map(safe).join(' | ') + ' |').join('\n')}\n\n## Upgrade details\n\n${report.upgrades.map(u => `### ${u.title}\n\nStatus: ${u.status}.\n\n- Original: ${u.original}\n- Revised: ${u.revised}\n- Change: ${u.change}\n- Intended benefit: ${u.benefit}\n- Trade-off: ${u.tradeoff}\n- 3D representation: ${u.modelScope}\n- Validation: ${u.validation}`).join('\n\n')}\n\n## Changes from the base Blender concept\n\nThis is a separate development baseline, not the original retail product.\n\n${report.conceptChanges.map(x => '- ' + x.field + ': ' + x.original + ' → ' + x.revised).join('\n') || 'Your choices match the base sage cabin concept.'}\n`;
  }
  global.OpenStorySpecs = Object.freeze({ baselines, baseline, review, csv, markdown });
})(typeof window !== 'undefined' ? window : globalThis);
