// SPDX-License-Identifier: AGPL-3.0-only
import { validateCardJson } from './character-card-data.js';
import JSZip from '../vendor/jszip.js';
import { sha256Bytes } from './transfer-hash.js';
import { TRANSFER_LIMITS as limits, archivePath, validateCharacterBundle } from './character-transfer-model.js';
import { readZipImage } from './outfit-files-model.js';

export async function digestBlob(blob) {const bytes=await blob.arrayBuffer();if(!globalThis.crypto?.subtle)return sha256Bytes(bytes);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function checkTransferImage(blob,filename) {
    if(!blob.size||blob.size>limits.image)throw Error('Each image/card must be between 1 byte and 20 MiB.');
    const b=new Uint8Array(await blob.slice(0,32).arrayBuffer()),ascii=(a,z)=>String.fromCharCode(...b.slice(a,z));
    const ext=filename.split('.').pop().toLowerCase();
    const valid=ext==='png'?b[0]===137&&ascii(1,4)==='PNG'&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10:['jpg','jpeg'].includes(ext)?b[0]===255&&b[1]===216&&b[2]===255:ext==='gif'?['GIF87a','GIF89a'].includes(ascii(0,6)):ext==='webp'?ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP':ext==='bmp'?ascii(0,2)==='BM':ext==='avif'?ascii(4,8)==='ftyp'&&/avif|avis/.test(ascii(8,32)):false;
    if(!valid)throw Error(`Unsupported or mismatched image data: ${filename}`);
}
export async function checkTransferAsset(blob,asset){if(asset.kind==='card'&&asset.filename.toLowerCase().endsWith('.json')){if(!blob.size||blob.size>limits.manifest)throw Error('JSON cards must be smaller than 5 MiB.');validateCardJson(JSON.parse(await blob.text()));return;}return checkTransferImage(blob,asset.filename);}
export async function createTransferZip(manifest,assets,onProgress=()=>{}) {
    if(assets.length+2>limits.entries)throw Error('Too many files for one bundle. Export fewer characters.');const archive=new JSZip();let total=0;
    for(const [index,item] of assets.entries()){onProgress(`Packing ${index+1}/${assets.length}: ${item.metadata.filename}`);await checkTransferAsset(item.blob,item.metadata);total+=item.blob.size;if(total>limits.expanded)throw Error('Bundle exceeds 500 MiB. Export fewer characters or omit image files.');const metadata={...item.metadata,size:item.blob.size,sha256:await digestBlob(item.blob)};manifest.assets.push(metadata);archive.file(metadata.path,await item.blob.arrayBuffer(),{binary:true,createFolders:false});}
    const clean=validateCharacterBundle(manifest);const json=JSON.stringify(clean,null,2);if(new TextEncoder().encode(json).length>limits.manifest)throw Error('Settings manifest exceeds 5 MiB. Export fewer characters.');
    archive.file('manifest.json',json);archive.file('ABOUT.txt',`ImmersiveGroups — ${clean.name}\nVersion ${clean.extensionVersion}\nImport through ImmersiveGroups → Import / export.\nThis bundle contains only the categories selected by its creator.\nCharacter cards may contain embedded lore and creator notes. Chats, API credentials, connection URLs and device-specific chat state are excluded.\nImage files already on the destination are never overwritten.\n`);
    const blob=await archive.generateAsync({type:'blob',compression:'STORE'},p=>onProgress(`Creating ZIP: ${Math.round(p.percent)}%`));if(blob.size>limits.archive)throw Error('ZIP exceeds 250 MiB. Export fewer characters or omit image files.');return {blob,manifest:clean};
}
export async function readTransferZip(file,onProgress=()=>{}) {
    if(!file||file.size>limits.archive)throw Error('Choose a ZIP smaller than 250 MiB.');
    const archive=await JSZip.loadAsync(await file.arrayBuffer());const entries=Object.values(archive.files);if(entries.length>limits.entries)throw Error('ZIP contains too many entries.');
    let expanded=0;for(const entry of entries){archivePath((entry.unsafeOriginalName||entry.name).replace(/\/$/,''));if(entry.dir)continue;const size=entry._data?.uncompressedSize;if(!Number.isSafeInteger(size)||size<0||size>(entry.name==='manifest.json'?limits.manifest:limits.image))throw Error('ZIP entry exceeds its size limit.');expanded+=size;if(expanded>limits.expanded)throw Error('ZIP expands beyond 500 MiB.');}
    const manifestFile=archive.file('manifest.json');if(!manifestFile)throw Error('This is not an ImmersiveGroups character/settings bundle. Existing sprite ZIPs belong in Upload sprite ZIP.');
    const manifest=validateCharacterBundle(JSON.parse(await (await readZipImage(manifestFile,limits.manifest)).text()));
    const allowed=new Set(['manifest.json','ABOUT.txt',...manifest.assets.map(a=>a.path)]);for(const entry of entries)if(!entry.dir&&!allowed.has(entry.name))throw Error('Unlisted file in ZIP.');
    const seen=new Set();for(const [i,asset] of manifest.assets.entries()){onProgress(`Verifying ${i+1}/${manifest.assets.length}: ${asset.filename}`);const entry=archive.file(asset.path);if(!entry||seen.has(asset.path))throw Error('Missing or duplicate asset.');seen.add(asset.path);const blob=await readZipImage(entry,limits.image);if(blob.size!==asset.size||await digestBlob(blob)!==asset.sha256)throw Error(`Image checksum failed: ${asset.filename}`);await checkTransferAsset(blob,asset);}
    return {manifest,readAsset:async asset=>{const blob=await readZipImage(archive.file(asset.path),limits.image);if(blob.size!==asset.size||await digestBlob(blob)!==asset.sha256)throw Error('Image changed after validation.');return blob;}};
}
