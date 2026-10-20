// SPDX-License-Identifier: AGPL-3.0-only
import { useState } from 'react';
import { commonOutfitKey, commonOutfitMatch } from '../../modules/common-outfits-model.js';

export function OutfitGroups({scene,onChange,busy}){
    const [name,setName]=useState(''),[error,setError]=useState(''),entries=scene.getEntries().filter(e=>e.kind==='outfit'),names=scene.getCommonOutfitNames(),group=commonOutfitKey(name);
    return <section className="ig-library-outfit-groups"><p>Use one group across characters: for example, Swimwear can contain one character’s swimsuit and another’s bikini. Backgrounds link to the group, not individual folders.</p>
        <label>Existing outfit group<select aria-label="Existing outfit group" value={names.includes(group)?group:''} onChange={event=>setName(event.target.value)}><option value="">Choose a group…</option>{names.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
        <label>Group name<input aria-label="Outfit group name" value={name} maxLength={80} onChange={event=>setName(event.target.value)}/></label>
        <small>Type a new name or choose an existing group, then assign an outfit. Assignments save immediately. Each outfit belongs to one shared group; assigning it here replaces its previous shared name.</small>
        {group&&scene.getCharacters().map(character=>{
            const outfits=entries.filter(e=>e.avatar===character.avatar&&!e.hidden),matches=outfits.filter(e=>commonOutfitKey(e.commonLabel)===group),preferred=matches.find(e=>e.commonPreferred),match=commonOutfitMatch(outfits,group);
            return <label key={character.avatar}>{character.name}<select aria-label={`Preferred ${group} outfit: ${character.name}`} disabled={busy} value={preferred?.folder||''} onChange={event=>{try{scene.assignOutfitGroup(character.avatar,event.target.value,group);setError('');onChange();}catch(cause){setError(cause.message);}}}><option value="">Automatic (one matching outfit required)</option>{outfits.map(entry=><option key={entry.folder} value={entry.folder}>{entry.name} · {entry.folder}</option>)}</select><small>{matches.length>1&&!match?'Multiple matches: choose a preferred outfit to enable linked changes.':match?`Uses ${match.name}.`:'No visible matching outfit; linked changes skip this character.'}</small></label>;
        })}
        {error&&<p role="alert">{error}</p>}
    </section>;
}
