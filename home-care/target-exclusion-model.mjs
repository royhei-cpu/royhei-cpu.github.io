// Shared build/browser policy. Never mutate or delete canonical observations.
export function createTargetFilter(evidence){
 const normalize=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/&/g,' and ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const rules=evidence.brands.flatMap(r=>[r.brand,...(r.aliases||[])].map(alias=>({key:normalize(alias),rule:r}))).sort((a,b)=>b.key.length-a.key.length);
 const exact=new Set((evidence.items||[]).flatMap(r=>[r.id,r.url].filter(Boolean)));
 function reason(item){
  if(exact.has(item.id)||exact.has(item.url||item.link))return 'Exact item carried by Target';
  const brands=[item.brand,item.coverageBrand].map(normalize).filter(Boolean),name=normalize(item.name||item.title);
  for(const {key,rule} of rules){
   // Match explicit brands or a title-leading brand, not compatibility mentions.
   if(brands.includes(key)||((key!=='all'&&key.length>2)&&(name===key||name.startsWith(key+' '))))return rule.brand;
   if(key==='all'&&/^all (?:free clear|free and clear|unscented|laundry|stainlifter)\b/.test(name))return rule.brand;
  }
  return null;
 }
 return {reason,isEligible:item=>!reason(item),checkedAt:evidence.checkedAt};
}
