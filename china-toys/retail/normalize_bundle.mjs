// Normalize indentation inside bundled shader strings without changing shader code.
import fs from 'node:fs';
const path=new URL('../retail-scene.js',import.meta.url);
const source=fs.readFileSync(path,'utf8').replace(/^[ \t]+/gm,indent=>indent.replace(/ +\t/g,'\t'));
fs.writeFileSync(path,source);
