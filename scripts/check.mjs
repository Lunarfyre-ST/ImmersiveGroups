import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXTENSION_VERSION } from '../version.js';
import { build, transform } from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function files(dir){return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).filter(e=>!['node_modules','.git','gallery/dist'].includes(e.name)).map(async e=>e.isDirectory()?files(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const all=await files(root);
// Check source, generated assets and metadata before parsing any one language.
// Conflict markers can otherwise survive in CSS/HTML or be skipped by scanners.
for(const file of all.filter(f=>/\.(?:js|mjs|cjs|json|html|css|md|ya?ml)$/.test(f))){
    const source=await fs.readFile(file,'utf8');
    const marker=/^(?:<{7}(?: .*)?|>{7}(?: .*)?)\r?$/m.exec(source)||(!file.endsWith('.md')&&/^={7}\r?$/m.exec(source));
    if(marker){const line=source.slice(0,marker.index).split('\n').length;throw new Error(`Unresolved merge conflict in ${path.relative(root,file)}:${line}`);}
    if(file.endsWith('.json'))JSON.parse(source);
}
for(const file of all.filter(f=>/\.(?:js|mjs|cjs)$/.test(f))){
    // Match project paths consistently on Windows and POSIX systems.
    const relative=path.relative(root,file).split(path.sep).join('/');
    if(relative.startsWith('gallery/dist/'))continue;
    await transform(await fs.readFile(file,'utf8'),{loader:relative.startsWith('gallery/src/')?'jsx':'js',target:'es2022',sourcefile:file});
}
await build({entryPoints:[path.join(root,'index.js')],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',logLevel:'silent',plugins:[{name:'native-sillytavern',setup(b){b.onResolve({filter:/^\.\./},args=>{const target=path.resolve(args.resolveDir,args.path);if(!target.startsWith(root+path.sep))return {path:args.path,external:true};});}}]});
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
for(const file of [manifest.js,manifest.css])await fs.access(path.join(root,file));
const html=await fs.readFile(path.join(root,'html/settings.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
for(const filename of ['manifest.json','package.json','package-lock.json']){const data=JSON.parse(await fs.readFile(path.join(root,filename),'utf8'));if(data.version!==EXTENSION_VERSION||data.packages?.['']&&data.packages[''].version!==EXTENSION_VERSION)throw Error(`Release version mismatch in ${filename}. Run scripts/set-version.mjs.`);}
const versionLabels=[...html.matchAll(/<span data-ig-version>([^<]+)<\/span>/g)];if(versionLabels.length<2||versionLabels.some(m=>m[1]!==EXTENSION_VERSION))throw Error('About/footer version mismatch. Run scripts/set-version.mjs.');
if(new Set(ids).size!==ids.length)throw new Error('Duplicate settings element IDs');
console.log(`Checked merge markers, JSON syntax, ${all.filter(f=>/\.(?:js|mjs|cjs)$/.test(f)).length} JavaScript files, combined imports, manifest assets and ${ids.length} unique settings IDs.`);
