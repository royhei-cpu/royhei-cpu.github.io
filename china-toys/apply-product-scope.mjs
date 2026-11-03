/* Apply the same browser scope to the public JSON, JavaScript and CSV downloads.
   The repository's dated research snapshots remain available for audit. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const root=process.argv[2];if(!root)throw new Error('Pass the public china-toys output directory');
const context=vm.createContext({window:{}});
for(const file of ['catalog.js','chain-assortments-data.js','product-scope.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
function csv(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(!quoted&&c===','){row.push(cell);cell=''}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}return rows}
for(const [base,key,js] of [['catalog','TOY_ATLAS','catalog.js'],['chain-assortments','CHAIN_ASSORTMENTS','chain-assortments-data.js']]){
 const data=context.window[key],byId=new Map(data.products.map(p=>[p.id,p]));
 fs.writeFileSync(path.join(root,base+'.json'),JSON.stringify(data));fs.writeFileSync(path.join(root,js),'window.'+key+'='+JSON.stringify(data)+';');
 const rows=csv(fs.readFileSync(path.join(root,base+'.csv'),'utf8').replace(/^\uFEFF/,'')),head=rows.shift(),category=head.indexOf('category');
 const result=[head,...rows.filter(r=>byId.has(r[0])).map(r=>{if(category>=0)r[category]=byId.get(r[0]).category;return r})];
 fs.writeFileSync(path.join(root,base+'.csv'),'\uFEFF'+result.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n'));
 console.log(base+': '+data.products.length+' in-scope records');
}
const reportPath=path.join(root,'report.json');if(fs.existsSync(reportPath)){const report=JSON.parse(fs.readFileSync(reportPath));report.stats=context.window.TOY_ATLAS.stats;report.brands=context.window.TOY_ATLAS.brands;report.directory_scope=context.window.TOY_ATLAS.directory_scope;fs.writeFileSync(reportPath,JSON.stringify(report))}
