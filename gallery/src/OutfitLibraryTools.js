// SPDX-License-Identifier: AGPL-3.0-only
import { useState } from 'react';
export function OutfitOrderList({entries,scene,run,busy}){
    const characters=[...new Set(entries.map(e=>e.avatar))];
    return <div className="ig-outfit-order-list"><small>Library order is active. Use the arrows to reorder each character’s outfits. Filters and hidden outfits keep their saved positions.</small>{characters.map(avatar=>{
        const outfits=entries.filter(e=>e.avatar===avatar);
        return <section key={avatar}><h4>{outfits[0].entity}</h4>{outfits.map((e,index)=><div className="ig-outfit-order-row" key={e.id} data-order-folder={e.folder}><span><strong>{e.name}</strong><small>{e.folder}{e.hidden?' · Hidden':''}</small></span><button type="button" className="menu_button" disabled={busy||index===0} aria-label={`Move up ${e.entity}: ${e.name}`} onClick={()=>run(()=>scene.reorderOutfit(e,outfits[index-1]))}>↑</button><button type="button" className="menu_button" disabled={busy||index===outfits.length-1} aria-label={`Move down ${e.entity}: ${e.name}`} onClick={()=>run(()=>scene.reorderOutfit(e,outfits[index+1]))}>↓</button></div>)}</section>;
    })}{!entries.length&&<p>No matching outfits. Clear the filters to see the full library.</p>}</div>;
}
export function BackgroundOutfitLink({entry,scene,onPatch}){
    const names=scene?.getCommonOutfitNames?.()||[],value=entry.outfitPreset||'',status=value?scene?.getBackgroundLinkStatus?.(entry):null;
    const explanations={locked:'Outfit locked',missing:'No visible matching outfit',ambiguous:'Multiple matches; choose a preferred outfit',unchanged:'Already wearing the matching outfit',ready:'Ready to change'};
    return <div className="ig-background-outfit-link"><label>Linked outfit group<select aria-label={`Linked outfit for ${entry.file}`} value={value} onChange={e=>onPatch(entry,{outfitPreset:e.target.value})}><option value="">None</option>{[...new Set([...names,...(value?[value]:[])])].map(name=><option key={name} value={name}>{name}</option>)}</select></label><small>Use Outfit groups on the toolbar to assign each character’s outfit once. Background-linked changes must be enabled under Backgrounds. Locks and hidden outfits are respected.</small>{status&&<details><summary>Linked outfit readiness</summary>{!status.enabled&&<p>Linked changes are currently disabled by Backgrounds or descriptions-only automation settings.</p>}{!status.characters.length&&<p>Open a chat to check its characters.</p>}{status.characters.map(c=><small key={c.avatar}>{c.name}: {explanations[c.status]}</small>)}</details>}</div>;
}
