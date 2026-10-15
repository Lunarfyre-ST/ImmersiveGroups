import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await build({entryPoints:[path.join(root,'gallery/src/index.js')],outfile:path.join(root,'gallery/dist/gallery.js'),bundle:true,format:'esm',platform:'browser',target:['es2022'],loader:{'.js':'jsx'},jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},minify:true,legalComments:'external',banner:{js:'/* ImmersiveGroups Gallery: modified from LocalImage by mechamarmot. AGPL-3.0; see CREDITS.md and licenses/. */'}});
console.log('Built gallery/dist/gallery.js and dependency notices.');
