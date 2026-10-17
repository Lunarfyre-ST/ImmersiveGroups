// SPDX-License-Identifier: AGPL-3.0-only
import { transferSelection, transferCategories, bundleSelection } from './transfer-selection.js';
import { safeCardJson } from './character-card-data.js';
import { transferId } from './transfer-hash.js';
import { extension_settings, getContext } from '../../../../extensions.js';
import { getRequestHeaders, saveSettingsDebounced, getCharacters, isGenerating } from '../../../../../script.js';
import { extensionName } from '../constants.js';
import { ensureBackgrounds, readBackgrounds, getBackgroundPath } from './scene-backgrounds.js';
import { captureCharacterBundle, applyCharacterBundle, validateCharacterBundle, suggestCharacterMappings, remapOutfitFolder, leafName, owns, put, TRANSFER_LIMITS } from './character-transfer-model.js';
import { createTransferZip, readTransferZip, checkTransferImage } from './character-transfer-archive.js';
import { spriteFolder } from './outfit-files-model.js';
import { createImportReviewer } from './transfer-import-review.js';
import { transferOutfitKey, excludedOutfitKeys, spriteIdentity, spriteStem, inventorySignature } from './transfer-outfit-model.js';
import { createTransferCounter } from './transfer-preview.js';

const config=()=>extension_settings[extensionName];
const characters=()=>getContext().characters?.filter(c=>c?.avatar)||[];
let busy=false;
async function exclusive(action) {if(busy)throw Error('Another transfer is already running.');busy=true;try{return await action();}finally{busy=false;}}
function headers() {const h={...getRequestHeaders()};for(const key of Object.keys(h))if(key.toLowerCase()==='content-type')delete h[key];return h;}
async function jsonRequest(url,data) {const r=await fetch(url,{method:'POST',headers:getRequestHeaders(),body:JSON.stringify(data)});if(!r.ok)throw Error(`Request failed (${r.status}): ${url}`);return r.json();}
async function spriteList(folder) {spriteFolder(folder);const r=await fetch('/api/sprites/get?name='+encodeURIComponent(folder),{cache:'no-store'});if(!r.ok)throw Error('Could not inspect destination sprite folder.');const result=await r.json();if(!Array.isArray(result))throw Error('Invalid sprite list.');return result;}
function localPath(raw,prefix) {const u=new URL(raw,location.href);if(u.origin!==location.origin||!u.pathname.startsWith(prefix)||u.username||u.password)throw Error('Only local SillyTavern assets can be transferred.');const path=decodeURIComponent(u.pathname);if(path.split('/').some(p=>p==='..'||p==='.')||path.includes('\\'))throw Error('Invalid asset path.');return u.pathname;}
async function imageBlob(url,filename) {const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(`Image unavailable (${r.status}): ${filename}`);const size=Number(r.headers.get('Content-Length'));if(size>TRANSFER_LIMITS.image)throw Error(`Image exceeds 20 MiB: ${filename}`);if(!r.body)throw Error('This browser cannot stream image downloads.');const reader=r.body.getReader(),chunks=[];let bytes=0;try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>TRANSFER_LIMITS.image)throw Error(`Image exceeds 20 MiB: ${filename}`);chunks.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}const blob=new Blob(chunks);await checkTransferImage(blob,filename);return blob;}
function entryPath(folder,row) {const raw=localPath(row.path,'/characters/'),decoded=decodeURIComponent(raw),expected='/characters/'+folder+'/';if(!decoded.startsWith(expected)||decoded.slice(expected.length).includes('/'))throw Error('Sprite list contains a path from another outfit.');const filename=leafName(decoded.slice(expected.length));return {raw,filename,revision:new URL(row.path,location.href).search};}
function appendAsset(assets,metadata,blob) {assets.push({metadata:{...metadata,path:`assets/${assets.length}/${metadata.filename}`},blob});}
const importReviewer=createImportReviewer({characters,settings:config,readFolder:async folder=>(await spriteList(folder)).map(row=>entryPath(folder,row))});
export const reviewImportDestinations=(bundle,options={})=>importReviewer.review(validateCharacterBundle(bundle),options);
export function transferCharacters() {const known=characters().map(c=>({avatar:c.avatar,name:c.name}));for(const avatar of new Set(['outfitCatalog','heightProfiles','mobileHeightProfiles'].flatMap(k=>Object.keys(config()[k]||{}))))if(!known.some(c=>c.avatar===avatar))known.push({avatar,name:avatar.replace(/\.[^.]+$/,''),unavailable:true});return known;}
export async function exportCharacterBundle({avatars=[],options={},name='ImmersiveGroups',media=false,selection,excludedBackgrounds=[],onProgress=()=>{}}={}) {
    return exclusive(async()=>{
        const chosen=transferSelection(options,media,selection);options={...transferCategories(chosen),all:options.all===true};const settings=structuredClone(config()),known=transferCharacters(),files=options.backgrounds?await ensureBackgrounds():[];
        if(options.all)avatars=known.map(c=>c.avatar);
        if(!avatars.length&&!options.settings&&!options.backgrounds&&!options.groups&&!options.gallery)throw Error('Select characters or extension settings.');
        const manifest=captureCharacterBundle(settings,known,avatars,options,name,files,{selection:chosen,excludedBackgrounds}),assets=[];let total=0;
        const add=(metadata,blob)=>{total+=blob.size;if(total>TRANSFER_LIMITS.expanded)throw Error('Selected files exceed 500 MiB. Export fewer characters.');appendAsset(assets,metadata,blob);};
        for(const c of manifest.characters){
            if(chosen.cards){onProgress(`Exporting card: ${c.name}`);const response=await fetch('/api/characters/export',{method:'POST',headers:getRequestHeaders(),body:JSON.stringify({avatar_url:c.avatar,format:chosen.cardFormat})});if(!response.ok)throw Error(`Could not export character card: ${c.name}`);let blob=await response.blob();if(chosen.cardFormat==='json'){if(blob.size>TRANSFER_LIMITS.manifest)throw Error('JSON card exceeds 5 MiB.');blob=new Blob([JSON.stringify(safeCardJson(JSON.parse(await blob.text())),null,2)],{type:'application/json'});}else await checkTransferImage(blob,c.avatar);add({kind:'card',avatar:c.avatar,filename:c.avatar.replace(/\.[^.]+$/,'')+'.'+chosen.cardFormat},blob);}
            if(chosen.spriteFiles&&options.outfits)for(const outfit of c.outfits||[]){onProgress(`Reading sprites: ${outfit.folder}`);for(const row of await spriteList(outfit.folder)){const {raw,filename}=entryPath(outfit.folder,row);add({kind:'sprite',avatar:c.avatar,folder:outfit.folder,filename},await imageBlob(raw,filename));}}
        }
        if(chosen.backgroundFiles&&options.backgrounds)for(const b of manifest.backgrounds){if(!files.includes(b.file))continue;onProgress(`Reading background: ${b.file}`);add({kind:'background',filename:b.file},await imageBlob(localPath(getBackgroundPath(b.file),'/backgrounds/'),b.file));}
        if(chosen.galleryFiles&&manifest.gallery){const paths=new Set();for(const map of [manifest.gallery.generalAssignments,...Object.values(manifest.gallery.assignments)])for(const e of Object.values(map)){if(paths.has(e.path))continue;paths.add(e.path);const filename=leafName(e.path.split('/').pop());onProgress(`Reading gallery image: ${filename}`);add({kind:'gallery',source:e.path,filename},await imageBlob(localPath('/'+e.path,'/user/images/'),filename));}}
        return createTransferZip(manifest,assets,onProgress);
    });
}
export const inspectCharacterBundle=(file,onProgress)=>exclusive(()=>readTransferZip(file,onProgress));
export function importPreview(bundle,{mappingValues={},roots={},folders={},categories=bundle.options,selection,excludedBackgrounds=[],excludedOutfits=[],policy='keep'}={}) {
    const chosen=bundleSelection(bundle,categories,selection),excluded=excludedOutfitKeys(bundle,excludedOutfits);
    const mappings={};for(const ref of bundle.references){const value=mappingValues[ref.avatar],target=characters().find(c=>c.avatar===value);if(target)put(mappings,ref.avatar,{avatar:target.avatar,name:target.name});else if(value==='__create__'){if(!chosen.cards||!bundle.assets.some(a=>a.kind==='card'&&a.avatar===ref.avatar))throw Error(`No enabled character card for ${ref.name}.`);put(mappings,ref.avatar,{avatar:`new-${ref.avatar}`,name:ref.name});}}
    const destinations=Object.values(mappings).map(c=>c.avatar);if(new Set(destinations).size!==destinations.length)throw Error('Map each source character to a different destination, or choose Skip.');
    for(const c of bundle.characters)if(mappings[c.avatar])remapOutfitFolder(c.outfits?.[0]?.folder||'Character',roots[c.avatar]||mappings[c.avatar].name);
    const destinationsByFolder=new Set();if(categories.outfits)for(const c of bundle.characters)if(mappings[c.avatar])for(const outfit of c.outfits||[]){if(excluded.has(transferOutfitKey(c.avatar,outfit.folder)))continue;const folder=spriteFolder(folders[JSON.stringify([c.avatar,outfit.folder])]||remapOutfitFolder(outfit.folder,roots[c.avatar]||mappings[c.avatar].name));if(destinationsByFolder.has(folder.toLowerCase()))throw Error('Two outfits resolve to the same destination folder. Use outfit folder overrides to separate them.');destinationsByFolder.add(folder.toLowerCase());}
    return applyCharacterBundle(config(),bundle,{categories,mappings,roots,folders,policy,selection:chosen,excludedBackgrounds,excludedOutfits});
}
async function uploadSprite(folder,filename,blob) {
    const form=new FormData(),stem=filename.replace(/\.[^.]+$/,'');form.append('name',folder);form.append('label',stem.match(/^(.+?)(?:[-.].*)?$/)?.[1]||stem);form.append('spriteName',stem);form.append('avatar',blob,filename);
    const response=await fetch('/api/sprites/upload',{method:'POST',headers:headers(),body:form});if(!response.ok||!(await response.json())?.ok)throw Error('Sprite upload was not confirmed.');
}
// Native card import can extract embedded Risu sprites outside our transfer plan.
// Remove those fields from text chunks while retaining the portrait and card data.
export async function safeCardPng(blob) {
    const bytes=new Uint8Array(await blob.arrayBuffer()),out=[bytes.slice(0,8)],view=new DataView(bytes.buffer);let offset=8,card=false;
    const crc=b=>{let c=0xffffffff;for(const byte of b){c^=byte;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
    while(offset+12<=bytes.length){const length=view.getUint32(offset);if(length>bytes.length-offset-12)throw Error('Malformed character PNG.');const type=new TextDecoder().decode(bytes.slice(offset+4,offset+8));let chunk=bytes.slice(offset,offset+length+12);
        if(type==='tEXt'){const data=bytes.slice(offset+8,offset+8+length),zero=data.indexOf(0),keyword=new TextDecoder().decode(data.slice(0,zero));if(['chara','ccv3'].includes(keyword.toLowerCase())){if(zero<0)throw Error('Malformed card metadata.');const encoded=new TextDecoder().decode(data.slice(zero+1)),json=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))));const sanitized=safeCardJson(json);const jsonBytes=new TextEncoder().encode(JSON.stringify(sanitized));let binary='';for(let i=0;i<jsonBytes.length;i+=8192)binary+=String.fromCharCode(...jsonBytes.subarray(i,i+8192));const encodedJson=btoa(binary);const payload=new TextEncoder().encode(keyword+'\0'+encodedJson);chunk=new Uint8Array(payload.length+12);new DataView(chunk.buffer).setUint32(0,payload.length);chunk.set(new TextEncoder().encode('tEXt'),4);chunk.set(payload,8);new DataView(chunk.buffer).setUint32(chunk.length-4,crc(chunk.slice(4,-4)));card=true;}}
        out.push(chunk);offset+=length+12;if(type==='IEND')break;
    }
    if(!card)throw Error('Character PNG is missing supported card metadata.');return new Blob(out,{type:'image/png'});
}
async function createCard(source,bundle,readAsset) {const existingAvatars=new Set(characters().map(c=>c.avatar));const asset=bundle.assets.find(a=>a.kind==='card'&&a.avatar===source.avatar);if(!asset)throw Error('Character card is missing.');const json=asset.filename.toLowerCase().endsWith('.json'),raw=await readAsset(asset),blob=json?new Blob([JSON.stringify(safeCardJson(JSON.parse(await raw.text())))],{type:'application/json'}):await safeCardPng(raw),form=new FormData();form.append('avatar',blob,asset.filename);form.append('file_type',json?'json':'png');const response=await fetch('/api/characters/import',{method:'POST',headers:headers(),body:form});if(!response.ok)throw Error(`Card import failed for ${source.name}.`);const data=await response.json();if(data.error||!data.file_name)throw Error(`Card import was not confirmed for ${source.name}.`);const avatar=leafName(data.file_name.toLowerCase().endsWith('.png')?data.file_name:data.file_name+'.png');if(existingAvatars.has(avatar))throw Error('The server returned an existing character; import stopped.');return {avatar,name:characters().find(c=>c.avatar===avatar)?.name||source.name};}
export async function importCharacterBundle(inspected,{mappingValues={},roots={},folders:requestedFolders={},categories=inspected.manifest.options,policy='keep',media=true,selection,excludedBackgrounds=[],excludedOutfits=[],conflictReview,overwriteAcknowledged=false,onProgress=()=>{}}={}) {
    return exclusive(async()=>{
        if(isGenerating())throw Error('Wait for generation to finish before importing settings.');
        const bundle=validateCharacterBundle(inspected.manifest),chosen=bundleSelection(bundle,categories,selection,media);importPreview(bundle,{mappingValues,roots,folders:requestedFolders,categories,selection:chosen,excludedBackgrounds,excludedOutfits,policy});
        const excluded=excludedOutfitKeys(bundle,excludedOutfits);
        if(overwriteAcknowledged&&!conflictReview)throw Error('Review outfit conflicts before authorizing replacements.');
        const reviewed=conflictReview?await importReviewer.verify(conflictReview,bundle,{mappingValues,roots,folders:requestedFolders,categories,selection:chosen,media,excludedOutfits,overwriteAcknowledged}):null;
        const reviewedRows=new Map(reviewed?.rows.map(row=>[row.key,row])||[]);
        const mappings={},created=[],folderMap={},backgroundNames={},galleryPaths={},uploaded=[],kept=[],warnings=[],replaced=[],replacementAttempts=[];
        // No configuration mutation until all requested uploads have succeeded.
        try {
            for(const ref of bundle.references){const value=mappingValues[ref.avatar];if(value==='__create__'){onProgress(`Creating character: ${ref.name}`);const target=await createCard(ref,bundle,inspected.readAsset);created.push(target);put(mappings,ref.avatar,target);if(!roots[ref.avatar]||roots[ref.avatar]===ref.name)put(roots,ref.avatar,target.avatar.replace(/\.png$/i,''));}else {const c=characters().find(c=>c.avatar===value);if(c)put(mappings,ref.avatar,{avatar:c.avatar,name:c.name});}}
            const nativeFolders=new Map();const usedFolders=new Map();
            for(const c of bundle.characters){if(!categories.outfits||!mappings[c.avatar])continue;for(const outfit of c.outfits||[]){const key=transferOutfitKey(c.avatar,outfit.folder);if(excluded.has(key))continue;const folder=spriteFolder(requestedFolders[key]||remapOutfitFolder(outfit.folder,roots[c.avatar]||mappings[c.avatar].name));if(usedFolders.has(folder.toLowerCase())&&usedFolders.get(folder.toLowerCase())!==key)throw Error('Two outfits resolve to the same destination folder. Change the character root folders.');usedFolders.set(folder.toLowerCase(),key);put(folderMap,key,folder);if(chosen.spriteFiles){onProgress(`Checking destination: ${folder}`);const rows=await spriteList(folder),byStem=new Map();if(reviewedRows.get(key)?.newCardRoot&&rows.length)throw Error('The new character root already contains sprites. Map the created card and review its conflicts before retrying.');for(const row of rows){const {raw,filename}=entryPath(folder,row);byStem.set(filename.replace(/\.[^.]+$/,'').toLowerCase(),{raw,filename});}nativeFolders.set(folder,byStem);}}}
            const backgroundFiles=chosen.backgroundFiles&&categories.backgrounds?await readBackgrounds():[];
            const planned=applyCharacterBundle(config(),bundle,{categories,mappings,roots,folders:folderMap,policy,selection:chosen,excludedBackgrounds,excludedOutfits}).mediaPlan;
            const assetCategories={sprite:'spriteFiles',card:'cards',background:'backgroundFiles',gallery:'galleryFiles'};
            for(const [index,asset] of bundle.assets.entries()){
                if(asset.kind==='card'||!chosen[assetCategories[asset.kind]])continue;
                if(asset.avatar&&!mappings[asset.avatar])continue;if(asset.kind==='gallery'&&!planned.gallery.includes(asset.source))continue;if(asset.kind==='background'&&!planned.backgrounds.includes(asset.filename))continue;
                onProgress(`Importing ${index+1}/${bundle.assets.length}: ${asset.filename}`);
                if(asset.kind==='sprite'){
                    const key=transferOutfitKey(asset.avatar,asset.folder);if(excluded.has(key))continue;
                    const folder=folderMap[key],existing=nativeFolders.get(folder),stem=spriteIdentity(asset.filename);if(!folder||!existing)continue;
                    const latest=(await spriteList(folder)).map(row=>entryPath(folder,row)),matches=latest.filter(row=>spriteIdentity(row.filename)===stem),reviewRow=reviewedRows.get(key);
                    if(matches.length){
                        if(!overwriteAcknowledged){if(reviewRow&&!reviewRow.existing)throw Error(`New conflict found in ${folder}. Recheck outfit conflicts.`);kept.push(`${folder}/${asset.filename}`);continue;}
                        const approved=reviewRow?.files.filter(row=>spriteIdentity(row.filename)===stem)||[];
                        if(!approved.length||inventorySignature(matches)!==inventorySignature(approved))throw Error(`Sprite conflicts changed in ${folder}. Recheck before replacing files.`);
                        if(matches.some(row=>spriteStem(row.filename)!==spriteStem(asset.filename)))throw Error('Case-only sprite conflicts cannot be overwritten safely. Choose another destination folder.');
                    }
                    const blob=await inspected.readAsset(asset);
                    if(matches.length)replacementAttempts.push(...matches.map(row=>`${folder}/${row.filename}`));
                    await uploadSprite(folder,asset.filename,blob);existing.set(stem,true);uploaded.push(`${folder}/${asset.filename}`);replaced.push(...matches.map(row=>`${folder}/${row.filename}`));
                }else if(asset.kind==='background'){
                    if(backgroundFiles.some(f=>f.toLowerCase()===asset.filename.toLowerCase())){kept.push(asset.filename);put(backgroundNames,asset.filename,backgroundFiles.find(f=>f.toLowerCase()===asset.filename.toLowerCase()));continue;}
                    const latest=await readBackgrounds();if(latest.some(f=>f.toLowerCase()===asset.filename.toLowerCase())){kept.push(asset.filename);continue;}
                    const form=new FormData();form.append('avatar',await inspected.readAsset(asset),asset.filename);const response=await fetch('/api/backgrounds/upload',{method:'POST',headers:headers(),body:form});if(!response.ok)throw Error('Background upload failed.');const filename=leafName((await response.text()).trim());put(backgroundNames,asset.filename,filename);backgroundFiles.push(filename);uploaded.push(filename);
                }else if(asset.kind==='gallery'){
                    const blob=await inspected.readAsset(asset),data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
                    // Unique filenames ensure gallery uploads never replace existing files.
                    const filename=`ig-${transferId()}.${asset.filename.split('.').pop().toLowerCase()}`;const result=await jsonRequest('/api/images/upload',{image:data,format:filename.split('.').pop(),filename,ch_name:'ImmersiveGroups-Imports'});if(!result?.path)throw Error('Gallery upload was not confirmed.');localPath('/'+result.path.replace(/^\//,''),'/user/images/');put(galleryPaths,asset.source,result.path.replace(/^\//,''));uploaded.push(filename);
                }
            }
            if(isGenerating())throw Error('Generation started during import. Settings were not applied; wait and retry.');
            const result=applyCharacterBundle(config(),bundle,{categories,mappings,roots,folders:folderMap,backgroundNames,galleryPaths,policy,selection:chosen,excludedBackgrounds,excludedOutfits});
            // Preserve the settings object identity captured by existing UI listeners.
            Object.assign(config(),result.settings);saveSettingsDebounced();
            for(const event of ['ig-layout-change','ig-editor-layout-change','ig-binding-groups-change','ig-background-catalog-change','ig-scene-library-change','ig-gallery-change','ig-automation-state-change'])window.dispatchEvent(new Event(event));
            if(created.length){try{await getCharacters();}catch{warnings.push('Reload the page to show newly imported cards.');}}
            await readBackgrounds().catch(()=>warnings.push('Refresh the background library to see newly uploaded files.'));
            return {...result.report,created:created.length,uploaded:uploaded.length,kept:kept.length,replaced:replaced.length,warnings,reload:categories.settings===true};
        }catch(error){const recovery=created.length||uploaded.length||replacementAttempts.length?` ${created.length} new cards and ${uploaded.length} completed uploads remain on the server; no extension settings were applied. ${replacementAttempts.length?`Existing sprite files may already have been replaced: ${replacementAttempts.join(', ')}. Restore from your backup if needed.`:'Existing files were kept.'} Chat files were not changed.`:'';throw Error(error.message+recovery);}
    });
}
export function defaultTransferMappings(bundle) {return suggestCharacterMappings(bundle,characters());}

export async function listTransferBackgrounds({avatars=[],all=false}={}){const files=await ensureBackgrounds();return captureCharacterBundle(config(),transferCharacters(),avatars,{backgrounds:true,groups:true,all},'Preview',files).backgrounds;}

export function createTransferPreview() {
    const count=createTransferCounter({readSprites:async folder=>{
        const rows=await spriteList(folder);for(const row of rows)entryPath(folder,row);return rows.length;
    },countTokens:text=>getContext().getTokenCountAsync?.(text,0)});
    return async function preview({avatars=[],all=false,bundle,excludedBackgrounds=[],isCurrent=()=>true,onUpdate=()=>{}}={}) {
        if(!bundle){const files=await ensureBackgrounds();if(!isCurrent())return;
            const options={outfits:true,heights:true,colors:true,cards:true,backgrounds:true,groups:true,gallery:true,settings:true,all};
            bundle=captureCharacterBundle(config(),transferCharacters(),avatars,options,'Preview',files);
            for(const background of bundle.backgrounds)background.available=files.includes(background.file);
            return count(bundle,{live:true,excludedBackgrounds,isCurrent,onUpdate});
        }
        return count(bundle,{excludedBackgrounds,isCurrent,onUpdate});
    };
}
