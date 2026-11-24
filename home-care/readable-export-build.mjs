import assert from 'node:assert/strict';
export function addReadableExport(html){
 const start=html.indexOf("const csv='\\ufeff'+");const end=html.indexOf('setTimeout(()=>URL.revokeObjectURL(url),1000)};',start);
 assert.ok(start>=0&&end>start,'Selected CSV handler changed');
 const replacement="window.HCReadableExport.open({selected,fields,headers,value:(d,f)=>(f==='salesPeriod'||f==='metricDate')&&!d.hasSales?'':f.startsWith('dateEvidence')&&!d.dateEvidenceDate?'':window.HomeCareSalesRanking.exportValue(d,f),photo:d=>cached.get(d.id)?.querySelector('img')?.getAttribute('src')||d.image||d.originalImage||''})};";
 return html.slice(0,start)+replacement+html.slice(end+'setTimeout(()=>URL.revokeObjectURL(url),1000)};'.length);
}
