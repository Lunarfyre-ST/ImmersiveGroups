// SPDX-License-Identifier: AGPL-3.0-only
export function backgroundChoices(files,settings,activeAvatars,filter='') {
    const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
    const bindings=file=>own(settings.backgroundBindings,file)&&Array.isArray(settings.backgroundBindings[file])?settings.backgroundBindings[file]:[];
    const selected=filter?[filter]:activeAvatars;
    const linked=files.filter(file=>selected.length>0&&selected.every(avatar=>bindings(file).includes(avatar)));
    const starred=[...new Set(Array.isArray(settings.backgroundFavorites)?settings.backgroundFavorites:[])].filter(file=>files.includes(file)&&(!filter||!bindings(file).length||bindings(file).includes(filter)));
    return {linked,starred};
}

// Rule order breaks ties inside each priority class; filenames never execute commands.
export function chooseBackgroundDefault(files,settings,activeAvatars) {
    const avatars=[...new Set(activeAvatars)],active=new Set(avatars);
    if(!avatars.length)return null;
    const rules=(Array.isArray(settings.backgroundDefaultRules)?settings.backgroundDefaultRules:[]).filter(r=>r&&r.enabled!==false&&files.includes(r.file)&&Array.isArray(r.characters)&&r.characters.length);
    const matches=r=>r.characters.every(a=>active.has(a));
    const exact=rules.find(r=>r.match==='exact'&&r.characters.length===active.size&&new Set(r.characters).size===active.size&&matches(r));
    const shared=rules.find(r=>r.match==='all'&&r.characters.length>1&&matches(r));
    const individual=rules.find(r=>r.match==='character'&&r.characters.length===1&&matches(r));
    const rule=exact||shared||individual;
    if(rule)return {file:rule.file,reason:rule.match==='exact'?'exact group default':rule.match==='all'?'shared character default':'character default'};
    if(files.includes(settings.backgroundGlobalDefault))return {file:settings.backgroundGlobalDefault,reason:'global fallback'};
    const linked=backgroundChoices(files,settings,avatars).linked;
    return linked.length?{file:linked[0],reason:'first shared linked background'}:null;
}
