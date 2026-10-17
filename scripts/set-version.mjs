import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const version=process.argv[2];if(!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version||''))throw Error('Usage: node scripts/set-version.mjs 0.3.4');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const filename of ['manifest.json','package.json','package-lock.json']){const file=path.join(root,filename),data=JSON.parse(await fs.readFile(file,'utf8'));data.version=version;if(data.packages?.[''])data.packages[''].version=version;await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');}
const source=path.join(root,'version.js');await fs.writeFile(source,(await fs.readFile(source,'utf8')).replace(/EXTENSION_VERSION = '[^']+'/g,`EXTENSION_VERSION = '${version}'`));
const template=path.join(root,'html/settings.html');await fs.writeFile(template,(await fs.readFile(template,'utf8')).replace(/(<span data-ig-version>)[^<]+(<\/span>)/g,`$1${version}$2`));
console.log(`Updated runtime, About/footer, transfer producer and package metadata to ${version}.`);
