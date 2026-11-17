// SPDX-License-Identifier: AGPL-3.0-only
// Gallery subsystem derived from LocalImage by mechamarmot; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { useState } from 'react';
import { CharacterBindingList, PresetBindingList } from './BindingControls.js';

export function ImageEditor({entry,ctx,onSave,onCancel}){
    const [draft,setDraft]=useState(()=>({...entry,availability:entry.availability||'inherit',characterBindings:entry.characterBindings||[],groupBindings:entry.groupBindings||[],presetBindings:entry.presetBindings||[],requireAllCharacters:entry.requireAllCharacters===true}));
    const [error,setError]=useState('');
    const change=(key,value)=>setDraft(d=>({...d,[key]:value}));
    const toggle=(key,value)=>setDraft(d=>({...d,availability:'bound',[key]:d[key].includes(value)?d[key].filter(v=>v!==value):[...d[key],value]}));
    return <form className="ig-gallery-editor" onSubmit={event=>{event.preventDefault();try{onSave(entry,draft);onCancel();}catch(e){setError(e.message);}}}>
        <div className="ig-gallery-editor-heading"><h3>Image details</h3><button type="button" className="menu_button" onClick={onCancel}>Cancel</button></div>
        <img className="ig-gallery-editor-image" src={entry.src} alt={entry.name}/>
        <label>Command name<input aria-label="Command name" className="text_pole" value={draft.name} maxLength={120} onChange={e=>change('name',e.target.value)} required/></label>
        <small>Names use no spaces or colons. Previous names remain aliases so existing chat commands keep working.</small>
        <label>Scene description<textarea aria-label="Scene description" className="text_pole" rows={4} maxLength={2000} value={draft.description||''} placeholder="What is shown, who is present, and when this image fits the scene…" onChange={e=>change('description',e.target.value)}/></label>
        <label>Available in<select aria-label="Available in" value={draft.availability} onChange={e=>change('availability',e.target.value)}><option value="inherit">Original gallery’s chats</option><option value="all">All chats</option><option value="bound">Bound characters / groups</option></select></label>
        <small>Original General images are available everywhere. Character images follow that character into groups. Bindings can make an image available to other characters without copying its file.</small>
        <fieldset className="ig-image-bindings"><legend>Character &amp; group bindings</legend><small>Select characters here to make this image follow them into their group chats. Selecting a binding switches availability to Bound characters / groups.</small>{draft.availability!=='bound'&&(draft.characterBindings.length>0||draft.groupBindings.length>0||draft.presetBindings.length>0)&&<small className="ig-binding-hint">Saved bindings apply only when Available in is set to Bound characters / groups.</small>}<CharacterBindingList ctx={ctx} selected={draft.characterBindings} onChange={characterBindings=>setDraft(d=>({...d,availability:'bound',characterBindings}))}/><PresetBindingList ctx={ctx} selected={draft.presetBindings} onChange={presetBindings=>setDraft(d=>({...d,availability:'bound',presetBindings}))}/><label><input type="checkbox" checked={draft.requireAllCharacters} onChange={e=>setDraft(d=>({...d,requireAllCharacters:e.target.checked,availability:'bound'}))}/> Require all selected characters to be present</label><details><summary>Specific groups (optional)</summary><div className="ig-gallery-binding-list">{[...(ctx.groups||[]),...draft.groupBindings.filter(id=>!ctx.groups?.some(g=>String(g.id)===id)).map(id=>({id,name:'Unavailable group '+id}))].map(g=><label key={g.id}><input type="checkbox" checked={draft.groupBindings.includes(String(g.id))} onChange={()=>toggle('groupBindings',String(g.id))}/>{g.name||g.id}</label>)}</div></details><small>Matching a specific group also makes the image available. No bindings means it is omitted from model context until you add one.</small></fieldset>
        {error&&<p className="local-image-error" role="alert">{error}</p>}
        <code>{`::img ${entry.entity} ${draft.name}::`}</code><button type="submit" className="menu_button">Save image details</button>
    </form>;
}
