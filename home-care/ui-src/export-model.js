export const summaryColumns=[
 ['retailer','Retailer',22],['brand','Brand',22],['name','Product',65],['categoryLabel','Category',25],['pack','Size / pack',24],['displayPrice','Saved price (as listed)',24],['priceObservedDate','Price observation date',23],['displaySales','Published sales signal',30],['salesPeriodNormalized','Sales reporting period',25],['salesSnapshotDate','Sales snapshot date',22],['retailerListedDate','Retailer first available',23],['datePosted','Added to catalog',22],['checkedDate','Source checked',22],['url','Product link',24],['photoUrl','Photo link',24],['salesEvidenceSource','Sales source',24],['id','Item ID',30]
];
export function absoluteUrl(value){if(!value||typeof value!=='string')return '';try{const u=new URL(value,'https://royhei-cpu.github.io/home-care/');return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
export function summaryValue(item,key,value,photo){
 if(key==='pack')return item.packSize||item.pack||item.size||item.coverageSize||item.packageSize||'See product name';
 if(key==='photoUrl')return absoluteUrl(photo(item));
 if(key==='url')return absoluteUrl(item.url||item.listingSource);
 const v=value(item,key);return v===null||v===undefined||v===''?(['displayPrice','displaySales','retailerListedDate'].includes(key)?'Not verified':''):v;
}
export function csvText(columns,items,value){const quote=v=>{v=String(v??'').replace(/\r?\n/g,' ');if(/^[\s]*[=+@-]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};return '\ufeff'+[columns.map(c=>quote(c[1])).join(','),...items.map(item=>columns.map(c=>quote(value(item,c[0]))).join(','))].join('\r\n')}
export function fillSheet(sheet,columns,items,value,{links=false}={}){
 sheet.columns=columns.map(([key,header,width])=>({key,header,width:width||28}));
 items.forEach(item=>{const row=sheet.addRow(columns.map(([key])=>{const v=value(item,key);if(links&&/^(https?:\/\/)/.test(String(v)))return {text:key==='photoUrl'?'Open photo':key==='url'?'Open product':'Open source',hyperlink:String(v)};return v??''}));row.height=64;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>{if(c.value?.hyperlink)c.font={color:{argb:'FF176A4A'},underline:true}})});
 sheet.getRow(1).height=32;sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF284E3C'}};sheet.getRow(1).alignment={wrapText:true,vertical:'middle'};
 sheet.views=[{state:'frozen',ySplit:1,xSplit:3}];sheet.autoFilter={from:{row:1,column:1},to:{row:items.length+1,column:columns.length}};
 for(let n=2;n<=items.length+1;n++)if(n%2===0)sheet.getRow(n).eachCell(c=>c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F5F1'}});
}
