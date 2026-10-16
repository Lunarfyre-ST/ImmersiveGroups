// SPDX-License-Identifier: AGPL-3.0-only
// One adapter over the existing scene catalogs; no duplicate asset storage.
import { extension_settings, getContext } from '../../../../extensions.js';
import { isGenerating, eventSource, event_types } from '../../../../../script.js';
import { scanOutfitFolders, uploadOutfitImages } from './outfit-files.js';
import { spriteFolder } from './outfit-files-model.js';
import { taskQueue } from './task-queue.js';
import { extensionName } from '../constants.js';
import { catalogFor, setCharacterColors, outfitOptions, hiddenOutfit, editOutfit, removeOutfit, moveOutfit, rememberOutfit, discoverOutfits, importFolderNames, onCatalogChange, validFolder, quarantinedOutfits } from './outfit-catalog.js';
import { selectProfileCharacter } from './height-profiles.js';
import { backgroundSceneContext, getBackgroundPath, ensureBackgrounds, readBackgrounds, updateBackground, pickBackground, discardBackground, relinkBackgroundEntry } from './scene-backgrounds.js';
import { bindingGroups, saveBindingGroup, removeBindingGroup, expandedBindings, backgroundIsEligible, backgroundIsLinked } from './binding-groups-model.js';
import { saveSettingsDebounced } from '../../../../../script.js';

export function setupSceneLibrary(services){
    const characters=()=>getContext().characters?.filter(c=>c?.avatar)||[];
    const assets=new Map(),inspect=taskQueue(3);
    const changed=()=>window.dispatchEvent(new Event('ig-scene-library-change'));
    async function inspectOutfit(folder){
        const previous=assets.get(folder);if(previous)return previous.pending||previous;
        const record={imageState:'checking',hasImages:null,src:''};assets.set(folder,record);
        record.pending=inspect(async()=>{try{
            if(!validFolder(folder))throw Error('Invalid folder');
            const response=await fetch(`/api/sprites/get?name=${encodeURIComponent(folder)}`);if(!response.ok)throw Error('Sprite folder unavailable');
            const data=await response.json();if(!Array.isArray(data))throw Error('Invalid sprite list');
            const candidates=data.filter(s=>{try{const url=new URL(s?.path,location.href);return url.origin===location.origin&&url.pathname.startsWith('/characters/')&&/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(url.pathname);}catch{return false;}});
            const sprite=candidates.find(s=>s.label==='neutral')||candidates[0];Object.assign(record,{imageState:'checked',hasImages:Boolean(sprite),src:sprite?new URL(sprite.path,location.href).href:''});
        }catch{Object.assign(record,{imageState:'error',hasImages:null,src:''});}
        delete record.pending;if(assets.get(folder)===record)changed();return record;});return record.pending;
    }
    const active=()=>new Set(services.characters().map(c=>c.avatar));
    const getEntries=()=>{
        const present=active(),known=characters(),s=extension_settings[extensionName];
        const records=Object.keys(s.outfitCatalog||{}).map(avatar=>known.find(c=>c.avatar===avatar)||{avatar,name:avatar.replace(/\.[^/.]+$/,'')+' (unavailable)'});
        const outfits=records.flatMap(c=>outfitOptions(c,true).map(entry=>({kind:'outfit',id:JSON.stringify(['outfit',c.avatar,entry.folder]),name:entry.label,description:entry.description||'',folder:entry.folder,avatar:c.avatar,entity:c.name,characterBindings:[c.avatar],fontColor:entry.fontColor||'',basic:entry.folder===c.name||entry.folder===c.avatar.replace(/\.[^/.]+$/,''),imageState:assets.get(entry.folder)?.imageState||'unchecked',hasImages:assets.get(entry.folder)?.hasImages??null,hidden:hiddenOutfit(c,entry),inChat:present.has(c.avatar),current:present.has(c.avatar)&&services.currentFolder(c)===entry.folder})));
        const background=backgroundSceneContext(),avatars=[...present];
        return [...outfits,...background.library.map(entry=>({kind:'background',id:JSON.stringify(['background',entry.file]),name:entry.file,entity:'Backgrounds',src:entry.available?getBackgroundPath(entry.file):'',...entry,filterCharacters:expandedBindings(entry.characterBindings,entry.presetBindings,s.bindingGroups),inChat:backgroundIsEligible(entry,avatars,s.bindingGroups,false),linked:backgroundIsLinked(entry,avatars,s.bindingGroups),current:background.current===entry.file}))];
    };
    const api=Object.freeze({getEntries,getCharacters:characters,getActiveAvatars:()=>[...active()],outfitRoot:avatar=>{const c=characters().find(c=>c.avatar===avatar);return c?(active().has(avatar)?services.currentFolder(c).split('/')[0]:c.name):'';},selectCharacter:selectProfileCharacter,
        getGroups:()=>bindingGroups(extension_settings[extensionName].bindingGroups),
        saveGroup:patch=>{const result=saveBindingGroup(extension_settings[extensionName],patch);saveSettingsDebounced();window.dispatchEvent(new Event('ig-binding-groups-change'));changed();return result;},
        removeGroup:id=>{removeBindingGroup(extension_settings[extensionName],id);saveSettingsDebounced();window.dispatchEvent(new Event('ig-binding-groups-change'));changed();},
        discardBackground,relinkBackground:relinkBackgroundEntry,
        refresh:force=>{if(force)assets.clear();return force?readBackgrounds():ensureBackgrounds();},
        checkOutfitImages:async(force=false)=>{if(force)assets.clear();const folders=[...new Set(getEntries().filter(e=>e.kind==='outfit').map(e=>e.folder))];let index=0;async function worker(){while(index<folders.length)await inspectOutfit(folders[index++]);}await Promise.all([worker(),worker(),worker()]);},
        getColors:avatar=>({...catalogFor(avatar).colors}),setColors:setCharacterColors,
        getMismatchedOutfits:quarantinedOutfits,
        restoreSharedOutfit:(avatar,folder)=>{const c=characters().find(c=>c.avatar===avatar);if(!c)throw new Error('Character is no longer available.');return rememberOutfit(c,folder,{explicit:true});},
        updateOutfit:(entry,patch)=>editOutfit(entry.avatar,entry.folder,patch),
        removeOutfit:entry=>removeOutfit(entry.avatar,entry.folder),moveOutfit:(entry,delta)=>moveOutfit(entry.avatar,entry.folder,delta),
        wear:entry=>{if(isGenerating())throw new Error('Wait for roleplay generation to finish before changing outfits manually.');return services.changeOutfit(entry.avatar,entry.folder);},
        addOutfit:(avatar,folder,label)=>{const c=characters().find(c=>c.avatar===avatar);if(!c||!validFolder(folder))throw new Error('Choose a character and enter a valid sprite folder.');const added=rememberOutfit(c,folder,{label,explicit:true});if(!added&&label)editOutfit(avatar,folder,{label});},
        discover:avatar=>{const c=characters().find(c=>c.avatar===avatar);if(!c)throw new Error('Choose a character.');return discoverOutfits(c,active().has(avatar)?services.currentFolder(c):c.name,true);},
        importFolders:(avatar,files)=>{const c=characters().find(c=>c.avatar===avatar);if(!c)throw new Error('Choose a character.');return importFolderNames(c,files,active().has(avatar)?services.currentFolder(c):c.name);},
        updateBackground,chooseBackground:pickBackground,scanFolders:files=>scanOutfitFolders(characters(),files),uploadSprites:async(folder,...args)=>{folder=spriteFolder(folder);try{return await uploadOutfitImages(folder,...args);}finally{assets.delete(folder);await inspectOutfit(folder);changed();}},
        previewOutfit:async folder=>(await inspectOutfit(folder)).src
    });
    window.ImmersiveGroupsSceneLibrary=api;
    for(const name of ['CHAT_CHANGED','GROUP_UPDATED'])if(event_types[name])eventSource.on(event_types[name],()=>window.dispatchEvent(new Event('ig-scene-library-change')));
    onCatalogChange(()=>window.dispatchEvent(new Event('ig-scene-library-change')));
    return api;
}
