// SPDX-License-Identifier: AGPL-3.0-only
import { taskQueue } from './task-queue.js';

// Describe the available scope, independently of which checkboxes are enabled.
// Import's separate application preview remains responsible for destination mapping.
export function transferContents(bundle, excludedBackgrounds=[]) {
    const excluded=new Set(excludedBackgrounds),characters=bundle.characters||[],outfits=characters.flatMap(c=>c.outfits||[]),backgrounds=(bundle.backgrounds||[]).filter(b=>!excluded.has(b.file)),gallery=bundle.gallery;
    const images=[gallery?.generalAssignments,...Object.values(gallery?.assignments||{})].flatMap(map=>Object.values(map||{}));
    const descriptions={outfitDescriptions:outfits.map(o=>o.description),backgroundDescriptions:backgrounds.map(b=>b.description),galleryDescriptions:[...images.map(e=>e.description),...Object.values(gallery?.galleryDescriptions||{})]};
    for(const key of Object.keys(descriptions))descriptions[key]=descriptions[key].filter(s=>typeof s==='string'&&s.trim()).join('\n\n');
    const counts={outfits:outfits.length,spriteFiles:(bundle.assets||[]).filter(a=>a.kind==='sprite').length,outfitOrder:outfits.length,outfitHeights:outfits.filter(o=>o.heightOverrideCm!=null).length,outfitLocks:characters.filter(c=>c.locked).length,heights:characters.filter(c=>c.height).length,colors:characters.filter(c=>c.colors).length,cards:characters.length,backgrounds:backgrounds.length,backgroundFiles:(bundle.assets||[]).filter(a=>a.kind==='background'&&!excluded.has(a.filename)).length,backgroundRelationships:backgrounds.length,groups:bundle.groups?.length||0,gallery:images.length,galleryFiles:(bundle.assets||[]).filter(a=>a.kind==='gallery').length,settings:bundle.settings?1:0};
    return {counts,descriptions,folders:outfits.map(o=>o.folder),backgrounds,images};
}

// Per-dialog caches and a shared queue bound inventory requests even during rapid
// scope changes. Only inventory and local tokenizer calls run; no images download.
export function createTransferCounter({readSprites,countTokens}) {
    const queue=taskQueue(3),sprites=new Map(),tokens=new Map();
    async function descriptionCount(text) {
        if(!text)return {value:0,unit:'characters'};
        if(!tokens.has(text))tokens.set(text,(async()=>{
            try{const value=await countTokens?.(text);if(Number.isSafeInteger(value)&&value>=0)return {value,unit:'tokens'};}catch{/* Fall back to an honest character count. */}
            return {value:text.length,unit:'characters'};
        })());
        return tokens.get(text);
    }
    return async function count(bundle,{live=false,excludedBackgrounds=[],isCurrent=()=>true,onUpdate=()=>{}}={}) {
        const data=transferContents(bundle,excludedBackgrounds);
        if(live){data.counts.backgroundFiles=data.backgrounds.filter(b=>b.available).length;data.counts.galleryFiles=new Set(data.images.map(e=>e.path)).size;}
        const result={...data,descriptionCounts:{},checkingSprites:live&&data.folders.length>0,unavailableFolders:0};
        if(isCurrent())onUpdate(result);
        const descriptionWork=Promise.all(Object.entries(data.descriptions).map(async([key,text])=>{result.descriptionCounts[key]=await descriptionCount(text);if(isCurrent())onUpdate(result);}));
        if(live){const values=await Promise.all(data.folders.map(folder=>queue(async()=>{
            if(!isCurrent())return null;
            if(!sprites.has(folder))sprites.set(folder,Promise.resolve().then(()=>readSprites(folder)).catch(()=>null));
            return sprites.get(folder);
        })));result.counts.spriteFiles=values.reduce((sum,n)=>sum+(n??0),0);result.unavailableFolders=values.filter(n=>n===null).length;result.checkingSprites=false;}
        await descriptionWork;if(isCurrent())onUpdate(result);return result;
    };
}
