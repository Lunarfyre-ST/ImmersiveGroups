// SPDX-License-Identifier: AGPL-3.0-only
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const maps=['backgroundDescriptions','backgroundBindings','backgroundGroupBindings'];
export function knownBackgrounds(files,settings){
    return [...new Set([...files,...(settings.backgroundFavorites||[]),...maps.flatMap(key=>Object.keys(settings[key]||{})),...(settings.backgroundDefaultRules||[]).map(r=>r.file),settings.backgroundGlobalDefault].filter(f=>typeof f==='string'&&f))];
}
export function forgetBackground(settings,file){
    for(const key of maps)if(settings[key])delete settings[key][file];
    settings.backgroundFavorites=(settings.backgroundFavorites||[]).filter(f=>f!==file);
    settings.backgroundDefaultRules=(settings.backgroundDefaultRules||[]).filter(r=>r.file!==file);
    if(settings.backgroundGlobalDefault===file)settings.backgroundGlobalDefault='';
    for(const [key,value] of Object.entries(settings.backgroundChatChoices||{}))if(value===file)delete settings.backgroundChatChoices[key];
}
export function relinkBackground(settings,oldFile,newFile){
    if(oldFile===newFile)throw new Error('Choose a different background.');
    const assign=(key,value)=>Object.defineProperty(settings[key]||={},newFile,{value,writable:true,enumerable:true,configurable:true});
    const read=key=>own(settings[key],oldFile)?settings[key][oldFile]:undefined;
    const previous=read('backgroundDescriptions'),current=own(settings.backgroundDescriptions,newFile)?settings.backgroundDescriptions[newFile]:'';
    if(previous&&current&&current!==previous&&current.length+previous.length+2>12000)throw new Error('Combined descriptions exceed 12000 characters. Shorten one before relinking.');
    for(const key of ['backgroundBindings','backgroundGroupBindings'])if(Array.isArray(read(key)))assign(key,[...new Set([...(own(settings[key],newFile)?settings[key][newFile]:[]),...read(key)])]);
    if(previous)assign('backgroundDescriptions',current&&current!==previous?current+'\n\n'+previous:previous);
    if((settings.backgroundFavorites||[]).includes(oldFile))settings.backgroundFavorites=[...new Set([...settings.backgroundFavorites,newFile])];
    settings.backgroundDefaultRules=(settings.backgroundDefaultRules||[]).map(r=>r.file===oldFile?{...r,file:newFile}:r);
    if(settings.backgroundGlobalDefault===oldFile)settings.backgroundGlobalDefault=newFile;
    for(const [key,value] of Object.entries(settings.backgroundChatChoices||{}))if(value===oldFile)settings.backgroundChatChoices[key]=newFile;
    forgetBackground(settings,oldFile);
}
