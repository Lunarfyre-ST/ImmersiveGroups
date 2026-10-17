// SPDX-License-Identifier: AGPL-3.0-only
export const transferOutfitKey=(avatar,folder)=>JSON.stringify([avatar,folder]);
export const spriteStem=filename=>filename.replace(/\.[^.]+$/,'');
export const spriteIdentity=filename=>spriteStem(filename).toLowerCase();
export function bundleOutfits(bundle){
    return (bundle.characters||[]).flatMap(c=>[...new Map([...(c.outfits||[]),...(c.outfitColors||[])].map(o=>[o.folder,o])).values()].map(o=>({key:transferOutfitKey(c.avatar,o.folder),avatar:c.avatar,character:c.name,folder:o.folder,label:c.outfits?.find(e=>e.folder===o.folder)?.label||o.folder.split('/').pop()})));
}
export function excludedOutfitKeys(bundle,values=[]){
    if(!Array.isArray(values)||values.some(v=>typeof v!=='string'))throw Error('Invalid outfit selection.');
    const known=new Set(bundleOutfits(bundle).map(o=>o.key));if(values.some(k=>!known.has(k)))throw Error('Outfit selection refers to another bundle.');return new Set(values);
}
export function spriteCollisions(incoming,existing){
    return incoming.map(asset=>({asset,files:existing.filter(e=>spriteIdentity(e.filename)===spriteIdentity(asset.filename))}));
}
export function inventorySignature(files){return JSON.stringify(files.map(e=>[e.filename,e.revision||'',e.sha256||'',e.size??null]).sort((a,b)=>a[0].localeCompare(b[0])));}
