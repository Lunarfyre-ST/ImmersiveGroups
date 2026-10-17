// SPDX-License-Identifier: AGPL-3.0-only
const strings=value=>[...new Set((Array.isArray(value)?value:[]).filter(v=>typeof v==='string'&&v.length>0))];
export function bindingGroups(value){
    const seen=new Set();
    return (Array.isArray(value)?value:[]).filter(g=>g&&typeof g.id==='string'&&g.id&&!seen.has(g.id)&&seen.add(g.id)).map(g=>({id:g.id,name:String(g.name||'Unnamed group').slice(0,80),description:String(g.description||'').slice(0,2000),members:strings(g.members)}));
}
export function contextBindingGroups(ctx){return bindingGroups(ctx.bindingGroups??ctx.extensionSettings?.ImmersiveGroups?.bindingGroups);}
export function matchingBindingGroups(groups,avatars,ids){
    const active=new Set(avatars),selected=ids?new Set(ids):null;
    return bindingGroups(groups).filter(g=>(!selected||selected.has(g.id))&&g.members.length>0&&g.members.every(a=>active.has(a)));
}
export function expandedBindings(characters,presetIds,groups){
    const ids=new Set(presetIds||[]);
    return strings([...(characters||[]),...bindingGroups(groups).filter(g=>ids.has(g.id)).flatMap(g=>g.members)]);
}
export function backgroundIsLinked(entry,avatars,groups){
    return avatars.length>0&&((entry.characterBindings?.length>0&&avatars.every(a=>entry.characterBindings.includes(a)))||matchingBindingGroups(groups,avatars,entry.presetBindings||[]).length>0);
}
export function backgroundIsEligible(entry,avatars,groups,linkedOnly=true){
    if(entry.available===false)return false;
    if(!entry.characterBindings?.length&&!entry.presetBindings?.length)return !linkedOnly;
    return backgroundIsLinked(entry,avatars,groups);
}
export function saveBindingGroup(settings,patch){
    if(typeof patch.name!=='string'||!patch.name.trim())throw new Error('Enter a group name.');
    const members=strings(patch.members);if(!members.length)throw new Error('Select at least one character.');
    const groups=bindingGroups(settings.bindingGroups),id=patch.id||globalThis.crypto.randomUUID();
    if(patch.id&&!groups.some(g=>g.id===id))throw new Error('This group no longer exists.');
    const next={id,name:patch.name.trim().slice(0,80),description:String(patch.description||'').slice(0,2000),members};
    settings.bindingGroups=[...groups.filter(g=>g.id!==id),next];return next;
}
export function removeBindingGroup(settings,id){
    settings.bindingGroups=bindingGroups(settings.bindingGroups).filter(g=>g.id!==id);
    for(const [file,ids] of Object.entries(settings.backgroundGroupBindings||{}))if(Array.isArray(ids))settings.backgroundGroupBindings[file]=ids.filter(v=>v!==id);
    for(const map of [settings.gallery?.generalAssignments,...Object.values(settings.gallery?.assignments||{})])
        for(const entry of Object.values(map||{}))if(entry&&typeof entry==='object'&&Array.isArray(entry.presetBindings))entry.presetBindings=entry.presetBindings.filter(v=>v!==id);
}
