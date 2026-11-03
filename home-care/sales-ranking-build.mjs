import assert from 'node:assert/strict';

// Attach sales ranking to the existing catalogue without rewriting its records.
export function addSalesRanking(source) {
  let html = source;
  function replaceOnce(before, after) {
    assert.equal(html.split(before).length - 1, 1, `Sales ranking integration anchor changed: ${before.slice(0, 80)}`);
    html = html.replace(before, () => after);
  }

  replaceOnce('<option value="brand">Brand A–Z</option>', '<option value="sales">Units sold / purchases: high–low</option><option value="brand">Brand A–Z</option>');
  replaceOnce(' return rows.sort((a,b)=>', " if($('sort').value==='sales')return window.HomeCareSalesRanking.rankRows(rows);\n return rows.sort((a,b)=>");
  replaceOnce('COVERAGE[r].note;\n}', 'COVERAGE[r].note;\n window.HomeCareSalesRanking.afterDraw(rows,shown);\n}');
  replaceOnce("$('retailer').addEventListener('change',()=>reset($('retailer').value,$('scope').value));", "$('retailer').addEventListener('change',()=>{const ranking=$('sort').value==='sales';reset($('retailer').value,$('scope').value);if(ranking){$('sort').value='sales';draw()}});");
  replaceOnce("document.querySelectorAll('button,input,select').forEach(el=>el.disabled=false);", "window.HomeCareSalesRanking.mount(ITEMS,()=>{page=1;draw()});\ndocument.querySelectorAll('button,input,select').forEach(el=>el.disabled=false);");

  // Export the same ranking and evidence visible in the current view.
  replaceOnce("const fields=['retailerListedDate'", "const fields=['salesRankInView','salesRankingGroup','salesCountValue','salesCountQualifier','salesCountStatus','salesMetricType','salesPeriodNormalized','salesSnapshotDate','salesEvidenceSource','salesExactListing','retailerListedDate'");
  replaceOnce("const headers={datePosted:", "const headers={salesRankInView:'Sales rank in current view',salesRankingGroup:'Sales comparison group',salesCountValue:'Published count (numeric, may be rounded)',salesCountQualifier:'Count qualifier',salesCountStatus:'Sales count status',salesMetricType:'Sales metric type',salesPeriodNormalized:'Sales period (normalized)',salesSnapshotDate:'Sales snapshot date',salesEvidenceSource:'Sales evidence source',salesExactListing:'Exact listing for sales count',datePosted:");
  replaceOnce(":d[f])).join(','))", ":window.HomeCareSalesRanking.exportValue(d,f))).join(','))");

  replaceOnce('</head>', '<link rel="stylesheet" href="/home-care/sales-ranking.css">\n</head>');
  replaceOnce('<script>const ITEMS=', '<script src="/home-care/sales-ranking-model.js"></script>\n<script src="/home-care/sales-ranking.js"></script>\n<script>const ITEMS=');
  return html;
}
