import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function files(dir){return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).filter(e=>!['node_modules','.git','gallery/dist'].includes(e.name)).map(async e=>e.isDirectory()?files(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const all=await files(root);
for(const file of all.filter(f=>/\.(?:js|mjs)$/.test(f)&&!f.includes('/gallery/dist/')))await transform(await fs.readFile(file,'utf8'),{loader:file.includes('/gallery/src/')?'jsx':'js',target:'es2022',sourcefile:file});
await build({entryPoints:[path.join(root,'index.js')],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',logLevel:'silent',plugins:[{name:'native-sillytavern',setup(b){b.onResolve({filter:/^\.\./},args=>{const target=path.resolve(args.resolveDir,args.path);if(!target.startsWith(root+path.sep))return {path:args.path,external:true};});}}]});
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
for(const file of [manifest.js,manifest.css])await fs.access(path.join(root,file));
const html=await fs.readFile(path.join(root,'html/settings.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate settings element IDs');
console.log(`Checked ${all.filter(f=>/\.(?:js|mjs)$/.test(f)).length} JavaScript files, combined imports, manifest assets and ${ids.length} unique settings IDs.`);
