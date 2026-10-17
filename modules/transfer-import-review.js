// SPDX-License-Identifier: AGPL-3.0-only
import { bundleSelection } from './transfer-selection.js';
import { remapOutfitFolder } from './character-transfer-model.js';
import { spriteFolder } from './outfit-files-model.js';
import { taskQueue } from './task-queue.js';
import { bundleOutfits, excludedOutfitKeys, spriteCollisions, spriteStem, inventorySignature } from './transfer-outfit-model.js';

const ordered=object=>Object.entries(object||{}).sort(([a],[b])=>a.localeCompare(b));
export function createImportReviewer({characters,settings,readFolder}) {
    const proofs=new WeakMap(),queue=taskQueue(3);
    function scope(bundle,options){return JSON.stringify([bundle,ordered(options.mappingValues),ordered(options.roots),ordered(options.folders),bundleSelection(bundle,options.categories||bundle.options,options.selection,options.media!==false)]);}
    async function review(bundle,options={}) {
        const known=characters(),catalog=settings().outfitCatalog||{},inventory=new Map();
        const rows=bundleOutfits(bundle).map(entry=>{
            const value=options.mappingValues?.[entry.avatar],target=known.find(c=>c.avatar===value),create=value==='__create__',ref=bundle.references.find(r=>r.avatar===entry.avatar),root=options.roots?.[entry.avatar];
            const newCardRoot=create&&(!root||root===ref.name)&&!options.folders?.[entry.key];
            const destination=!target&&!create||newCardRoot?null:spriteFolder(options.folders?.[entry.key]||remapOutfitFolder(entry.folder,root||target?.name||ref.name));
            const metadata=target&&destination?catalog[target.avatar]?.outfits?.find(o=>o.folder===destination):null;
            return {...entry,destination,newCardRoot,unmapped:!target&&!create,existing:Boolean(metadata),metadata:metadata||null,files:[],conflicts:[],error:''};
        });
        await Promise.all(rows.map(row=>queue(async()=>{
            if(!row.destination)return;
            if(!inventory.has(row.destination))inventory.set(row.destination,Promise.resolve().then(()=>readFolder(row.destination)));
            try{row.files=await inventory.get(row.destination);row.existing ||= row.files.length>0;row.conflicts=spriteCollisions((bundle.assets||[]).filter(a=>a.kind==='sprite'&&a.avatar===row.avatar&&a.folder===row.folder),row.files).flatMap(c=>c.files.map(f=>({...f,incoming:c.asset.filename})));}
            catch(error){row.error=error.message||'Could not inspect this folder.';}
        })));
        for(const row of rows)row.signature=JSON.stringify([row.destination,row.unmapped,row.newCardRoot,row.metadata,inventorySignature(row.files),row.error]);
        const result={rows,updateMode:rows.some(row=>row.existing)};
        proofs.set(result,{scope:scope(bundle,options),rows:structuredClone(rows)});return result;
    }
    async function verify(proof,bundle,options={}) {
        const saved=proofs.get(proof);if(!saved||saved.scope!==scope(bundle,options))throw Error('Import choices changed. Recheck outfit conflicts before applying.');
        const fresh=await review(bundle,options),excluded=excludedOutfitKeys(bundle,options.excludedOutfits);
        const chosen=bundleSelection(bundle,options.categories||bundle.options,options.selection,options.media!==false);
        if(!['outfits','spriteFiles','outfitDescriptions','outfitHeights','outfitOrder','colors'].some(k=>chosen[k]))return fresh;
        for(const row of fresh.rows){if(excluded.has(row.key)||row.unmapped)continue;const before=saved.rows.find(r=>r.key===row.key);
            if(!before||before.signature!==row.signature)throw Error(`Destination changed since review: ${row.destination||row.folder}. Recheck outfit conflicts.`);
            if(row.error)throw Error(`Cannot inspect ${row.destination}: ${row.error}`);
            if(row.existing&&options.overwriteAcknowledged!==true)throw Error('Acknowledge the update-mode warning before importing a conflicting outfit.');
            if(chosen.spriteFiles&&options.overwriteAcknowledged&&row.conflicts.some(f=>spriteStem(f.filename)!==spriteStem(f.incoming)))throw Error('Case-only sprite conflicts cannot be overwritten safely. Choose another destination folder.');
        }
        return fresh;
    }
    return {review,verify};
}
