// SPDX-License-Identifier: AGPL-3.0-only
import { useState } from 'react';
import { activeCharacters } from './gallery-model.js';
import { contextBindingGroups } from '../../modules/binding-groups-model.js';

export function CharacterBindingList({ctx,selected=[],onChange,label='Character list'}){
    const active=activeCharacters(ctx),[scope,setScope]=useState(active.length?'chat':'all'),[search,setSearch]=useState('');
    const all=[...(ctx.characters||[]).filter(c=>c.avatar),...selected.filter(a=>!ctx.characters?.some(c=>c.avatar===a)).map(a=>({avatar:a,name:'Unavailable character'}))];
    const pool=scope==='chat'?active:all,query=search.toLocaleLowerCase();
    const hidden=selected.filter(a=>!pool.some(c=>c.avatar===a)).length;
    return <div className="ig-binding-controls"><label>{label}<select aria-label={label} value={scope} onChange={e=>setScope(e.target.value)}><option value="chat" disabled={!active.length}>Current chat</option><option value="all">All characters</option></select></label><input type="search" className="text_pole" aria-label={`Search ${label.toLowerCase()}`} placeholder="Find a character…" value={search} onChange={e=>setSearch(e.target.value)}/><div className="ig-gallery-binding-list">{pool.filter(c=>`${c.name} ${c.avatar}`.toLocaleLowerCase().includes(query)).map(c=><label key={c.avatar}><input type="checkbox" checked={selected.includes(c.avatar)} onChange={e=>onChange(e.target.checked?[...selected,c.avatar]:selected.filter(a=>a!==c.avatar))}/>{c.name}<small>{c.avatar}</small></label>)}</div>{hidden>0&&<small>{hidden} selected outside this list. Choose All characters to review them.</small>}</div>;
}
export function PresetBindingList({ctx,selected=[],onChange}){
    const groups=contextBindingGroups(ctx),unknown=selected.filter(id=>!groups.some(g=>g.id===id));
    return <div className="ig-preset-bindings"><strong>Named groups</strong><small>A group matches when every saved member is in the chat. Extra chat members are allowed.</small>{!groups.length&&<small>Create a preset in the library’s Groups tab.</small>}<div className="ig-gallery-binding-list">{[...groups,...unknown.map(id=>({id,name:'Unavailable group',members:[]}))].map(g=><label key={g.id}><input type="checkbox" checked={selected.includes(g.id)} onChange={e=>onChange(e.target.checked?[...selected,g.id]:selected.filter(id=>id!==g.id))}/><span>{g.name}<small>{g.members.map(a=>ctx.characters?.find(c=>c.avatar===a)?.name||a).join(', ')}</small></span></label>)}</div></div>;
}
