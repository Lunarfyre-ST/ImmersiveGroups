// SPDX-License-Identifier: AGPL-3.0-only
import { GENERAL_KEY, availableInChat } from './gallery-model.js';
const text=value=>String(value||'').normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase();
export function imageLibraryEntries(entries,ctx){
    return entries.map(entry=>{
        const characters=entry.availability==='bound'?[...(entry.characterBindings||[]),...(entry.groupBindings||[]).flatMap(id=>ctx.groups?.find(g=>String(g.id)===String(id))?.members||[])]:entry.availability==='all'||entry.gallery===GENERAL_KEY?[]:[...(ctx.characters||[]).filter(c=>c.name===entry.gallery).map(c=>c.avatar),...(ctx.groups||[]).filter(g=>g.name===entry.gallery).flatMap(g=>g.members||[])];
        return {...entry,kind:'image',libraryId:JSON.stringify(['image',entry.id]),filterCharacters:[...new Set(characters)],inChat:availableInChat(entry,ctx)};
    });
}
<<<<<<< HEAD
function characterMetrics(ctx){
    const characters=ctx.characters||[],byAvatar=new Map(characters.map(c=>[c.avatar,c])),byName=new Map(),metrics=new Map();
    for(const c of characters){const named=byName.get(c.name)||[];named.push(c.avatar);byName.set(c.name,named);metrics.set(c.avatar,{activity:0,recent:0});}
    let index=0;
    for(const message of ctx.chat||[]){index++;if(!message||message.is_user||message.is_system)continue;const named=byName.get(message.name);const avatar=byAvatar.has(message.original_avatar)?message.original_avatar:named?.length===1?named[0]:null;const metric=metrics.get(avatar);if(metric){metric.activity++;metric.recent=index;}}
    for(const c of characters){const metric=metrics.get(c.avatar),activity=Number(c.chat_size),recent=Number(c.date_last_chat)||Date.parse(c.date_last_chat);if(Number.isFinite(activity)&&activity>0)metric.activity=activity;if(Number.isFinite(recent)&&recent>0)metric.recent=recent;}
    return metrics;
}
=======
>>>>>>> 80eb6b24fe0276df89f7dec59ead36cc3c949b60
export function filterLibrary(entries,filters,ctx){
    const words=text(filters.search).split(/\s+/).filter(Boolean);
    const names=new Map((ctx.characters||[]).map(c=>[c.avatar,c.name]));
    const list=entries.filter(entry=>{
        if(filters.type&&filters.type!=='all'&&entry.kind!==filters.type)return false;
        if(filters.currentOnly&&!entry.inChat)return false;
        const characters=entry.filterCharacters||entry.characterBindings||[];
        if(filters.character&&!characters.includes(filters.character))return false;
        if(filters.description==='missing'&&entry.description?.trim())return false;
        if(filters.description==='filled'&&!entry.description?.trim())return false;
        if(entry.kind==='outfit'&&filters.hideBasic&&entry.basic)return false;
        if(entry.kind==='outfit'&&((filters.outfitImages==='with'&&entry.hasImages!==true)||(filters.outfitImages==='without'&&entry.hasImages!==false)))return false;
        if(entry.kind==='outfit'&&((filters.visibility==='visible'&&entry.hidden)||(filters.visibility==='hidden'&&!entry.hidden)))return false;
        if(entry.kind==='background'&&((filters.backgrounds==='linked'&&!entry.linked)||(filters.backgrounds==='starred'&&!entry.favorite)))return false;
        if(entry.kind==='image'&&filters.gallery&&entry.gallery!==filters.gallery)return false;
        const groups=(entry.groupBindings||[]).map(id=>ctx.groups?.find(g=>String(g.id)===String(id))?.name||id);
        const haystack=text([entry.name,entry.description,entry.entity,entry.folder,entry.file,entry.gallery,entry.avatar,...characters,...characters.map(a=>names.get(a)),...groups].join(' '));
        return words.every(word=>haystack.includes(word));
    });
<<<<<<< HEAD
    // Ordinary name/search/filter changes never scan chat history. Activity and
    // recent sorting share one bounded-stack pass, even for very long chats.
    const metrics=['activity','recent'].includes(filters.sort)?characterMetrics(ctx):null;
    const metric=(entry,key)=>{let value=0;for(const avatar of entry.filterCharacters||entry.characterBindings||[])value=Math.max(value,metrics?.get(avatar)?.[key]||0);return value;};
=======
    const metrics=new Map((ctx.characters||[]).map(c=>[c.avatar,{activity:Number(c.chat_size)||((ctx.chat||[]).filter(m=>!m.is_user&&(m.original_avatar===c.avatar||m.name===c.name)).length),recent:Number(c.date_last_chat)||Date.parse(c.date_last_chat)||Math.max(0,...(ctx.chat||[]).map((m,i)=>!m.is_user&&(m.original_avatar===c.avatar||m.name===c.name)?i+1:0))}]));
    const metric=(entry,key)=>Math.max(0,...(entry.characterBindings||entry.filterCharacters||[]).map(a=>metrics.get(a)?.[key]||0));
>>>>>>> 80eb6b24fe0276df89f7dec59ead36cc3c949b60
    const name=(a,b)=>a.name.localeCompare(b.name)||String(a.entity).localeCompare(String(b.entity));
    if(filters.sort==='description-long'||filters.sort==='description-short')list.sort((a,b)=>(String(a.description||'').length-String(b.description||'').length)*(filters.sort==='description-long'?-1:1)||name(a,b));
    else if(filters.sort==='activity'||filters.sort==='recent')list.sort((a,b)=>metric(b,filters.sort)-metric(a,filters.sort)||name(a,b));
    else if(filters.sort==='name-desc')list.sort((a,b)=>name(b,a));
    else if(filters.sort==='type')list.sort((a,b)=>a.kind.localeCompare(b.kind)||name(a,b));
    else if(filters.sort==='character'||filters.sort==='gallery')list.sort((a,b)=>String(a.entity).localeCompare(String(b.entity))||name(a,b));
    else if(filters.sort==='missing')list.sort((a,b)=>Number(Boolean(a.description?.trim()))-Number(Boolean(b.description?.trim()))||name(a,b));
    else if(filters.sort!=='library')list.sort(name);
    return list;
}
