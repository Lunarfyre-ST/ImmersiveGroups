// SPDX-License-Identifier: AGPL-3.0-only
// One adapter over the existing scene catalogs; no duplicate asset storage.
import { extension_settings, getContext } from '../../../../extensions.js';
import { isGenerating, eventSource, event_types } from '../../../../../script.js';
import { scanOutfitFolders, uploadOutfitImages } from './outfit-files.js';
import { spriteFolder } from './outfit-files-model.js';
import { taskQueue } from './task-queue.js';
import { extensionName } from '../constants.js';
import { catalogFor, setCharacterColors, outfitOptions, hiddenOutfit, editOutfit, removeOutfit, moveOutfit, rememberOutfit, discoverOutfits, importFolderNames, onCatalogChange, validFolder, quarantinedOutfits, discardQuarantinedOutfit } from './outfit-catalog.js';
import { selectProfileCharacter, characterHeightSettings, updateCharacterHeight } from './height-profiles.js';
import { backgroundSceneContext, getBackgroundPath, ensureBackgrounds, readBackgrounds, updateBackground, pickBackground, discardBackground, relinkBackgroundEntry } from './scene-backgrounds.js';
import { bindingGroups, saveBindingGroup, removeBindingGroup, expandedBindings, backgroundIsEligible, backgroundIsLinked } from './binding-groups-model.js';
import { expressionInventory, commonOutfitName, commonOutfitKey, commonOutfitMatch } from './common-outfits-model.js';
import { setOutfitLock } from './outfit-catalog.js';
import { reviewExpression, editExpression } from './expression-files.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { getExpressionsList } from '../../../expressions/index.js';

export function setupSceneLibrary(services){
    const characters=()=>getContext().characters?.filter(c=>c?.avatar)||[];
    const assets=new Map(),inspect=taskQueue(3);let assetRevision=0;
    const changed=()=>window.dispatchEvent(new Event('ig-scene-library-change'));
    async function inspectOutfit(folder){
        const previous=assets.get(folder);if(previous)return previous.pending||previous;
        const record={imageState:'checking',hasImages:null,src:'',revision:++assetRevision};assets.set(folder,record);
        record.pending=inspect(async()=>{try{
            if(!validFolder(folder))throw Error('Invalid folder');
            const response=await fetch(`/api/sprites/get?name=${encodeURIComponent(folder)}`,{cache:'no-store'});if(!response.ok)throw Error('Sprite folder unavailable');
            const data=await response.json();if(!Array.isArray(data))throw Error('Invalid sprite list');
            const expressions=expressionInventory(data,location.href),sprite=expressions[0];Object.assign(record,{imageState:'checked',hasImages:Boolean(sprite),src:sprite?.src||'',expressions});
        }catch{Object.assign(record,{imageState:'error',hasImages:null,src:''});}
        delete record.pending;if(assets.get(folder)===record)changed();return record;});return record.pending;
    }
    const active=()=>new Set(services.characters().map(c=>c.avatar));
    const nativeScope=()=>{const c=getContext();return JSON.stringify([c.groupId??null,c.getCurrentChatId?.()??null,c.characterId??null,extension_settings.expressionOverrides||[]]);};
    const getEntries=()=>{
        const present=active(),known=characters(),s=extension_settings[extensionName];
        const records=[...known,...Object.keys(s.outfitCatalog||{}).filter(avatar=>!known.some(c=>c.avatar===avatar)).map(avatar=>({avatar,name:avatar.replace(/\.[^/.]+$/,'')+' (unavailable)',unavailable:true}))];
        const outfits=records.flatMap(c=>outfitOptions(c,true).map(entry=>({kind:'outfit',id:JSON.stringify(['outfit',c.avatar,entry.folder]),name:entry.label,description:entry.description||'',folder:entry.folder,avatar:c.avatar,entity:c.name,characterBindings:[c.avatar],heightOverrideCm:entry.heightOverrideCm??null,fontColor:entry.fontColor||'',commonName:entry.commonName||'',commonPreferred:entry.commonPreferred===true,commonLabel:commonOutfitName(entry),basic:entry.folder===c.name||entry.folder===c.avatar.replace(/\.[^/.]+$/,''),previewRevision:assets.get(entry.folder)?.revision||0,imageState:assets.get(entry.folder)?.imageState||'unchecked',hasImages:assets.get(entry.folder)?.hasImages??null,hidden:hiddenOutfit(c,entry),inChat:present.has(c.avatar),current:present.has(c.avatar)&&services.currentFolder(c)===entry.folder})));
        const background=backgroundSceneContext(),avatars=[...present];
        return [...outfits,...background.library.map(entry=>({kind:'background',id:JSON.stringify(['background',entry.file]),name:entry.file,entity:'Backgrounds',src:entry.available?getBackgroundPath(entry.file):'',...entry,filterCharacters:expandedBindings(entry.characterBindings,entry.presetBindings,s.bindingGroups),inChat:backgroundIsEligible(entry,avatars,s.bindingGroups,false),linked:backgroundIsLinked(entry,avatars,s.bindingGroups),current:background.current===entry.file}))];
    };
    const api=Object.freeze({getEntries,getCharacters:characters,getActiveAvatars:()=>[...active()],outfitRoot:avatar=>{const c=characters().find(c=>c.avatar===avatar);return c?(active().has(avatar)?services.currentFolder(c).split('/')[0]:c.name):'';},selectCharacter:selectProfileCharacter,
        getGroups:()=>bindingGroups(extension_settings[extensionName].bindingGroups),
        saveGroup:patch=>{const result=saveBindingGroup(extension_settings[extensionName],patch);saveSettingsDebounced();window.dispatchEvent(new Event('ig-binding-groups-change'));changed();return result;},
        removeGroup:id=>{removeBindingGroup(extension_settings[extensionName],id);saveSettingsDebounced();window.dispatchEvent(new Event('ig-binding-groups-change'));changed();},
        discardBackground,relinkBackground:relinkBackgroundEntry,
        refresh:force=>{if(force){assets.clear();changed();}return force?readBackgrounds():ensureBackgrounds();},
        refreshOutfit:async folder=>{folder=spriteFolder(folder);assets.delete(folder);const result=await inspectOutfit(folder);if(result.imageState==='error')throw new Error('The sprite folder could not be refreshed.');return result.expressions;},
        nativeRefreshGuard:()=>{const scope=nativeScope(),select=document.getElementById('expression_api'),value=select?.value;return ()=>scope===nativeScope()&&select===document.getElementById('expression_api')&&select?.value===value;},
        refreshNativeExpressions:(isCurrent=()=>true)=>{if(!isCurrent())return 'Folder rescanned. Native refresh skipped because the view or chat changed.';if(isGenerating())return 'Folder rescanned. Finish generation before refreshing native expression choices.';const select=document.getElementById('expression_api');if(!select||!select.value)return 'Folder rescanned. Native expression refresh is unavailable in this SillyTavern version.';select.dispatchEvent(new Event('change',{bubbles:true}));return 'Folder rescanned and native expression choices refreshed.';},
        checkOutfitImages:async(force=false)=>{if(force)assets.clear();const folders=[...new Set(getEntries().filter(e=>e.kind==='outfit').map(e=>e.folder))];let index=0;async function worker(){while(index<folders.length)await inspectOutfit(folders[index++]);}await Promise.all([worker(),worker(),worker()]);},
        getColors:avatar=>({...catalogFor(avatar).colors}),setColors:setCharacterColors,
        getCharacterSettings:avatar=>({...characterHeightSettings(avatar),locked:Boolean(catalogFor(avatar).locked)}),
        updateCharacterSettings:(avatar,patch,layout)=>{if(!characters().some(c=>c.avatar===avatar))throw new Error('Character is no longer available.');if(typeof patch.locked==='boolean')setOutfitLock(avatar,patch.locked);if(['heightCm','fineTuneOffset','offsetY'].some(key=>Object.hasOwn(patch,key)))updateCharacterHeight(avatar,patch,layout);changed();},
        assignOutfitGroup:(avatar,folder,name)=>{const c=characters().find(c=>c.avatar===avatar),group=commonOutfitKey(name);if(!c||!group)throw new Error('Choose a character and outfit group.');const entries=outfitOptions(c,true);if(folder&&!entries.some(e=>e.folder===folder&&!hiddenOutfit(c,e)))throw new Error('Choose a visible outfit from this character.');for(const entry of entries)if(commonOutfitName(entry)===group&&entry.commonPreferred)editOutfit(avatar,entry.folder,{commonPreferred:false});if(folder)editOutfit(avatar,folder,{commonName:group,commonPreferred:true});},
        getBackgroundLinkStatus:entry=>{const s=extension_settings[extensionName],group=commonOutfitKey(entry.outfitPreset);return {enabled:Boolean(s.backgroundOutfitsEnabled)&&!(s.sceneAutomation?.commandless&&s.sceneAutomation.mode!=='api'),characters:services.characters().map(c=>{const entries=outfitOptions(c),match=commonOutfitMatch(entries,group),matches=entries.filter(e=>commonOutfitName(e)===group);return {avatar:c.avatar,name:c.name,status:catalogFor(c.avatar).locked?'locked':!matches.length?'missing':!match?'ambiguous':services.currentFolder(c)===match.folder?'unchanged':'ready'};})};},
        getMismatchedOutfits:quarantinedOutfits,discardMismatchedOutfit:discardQuarantinedOutfit,
        getCommonOutfitNames:()=>[...new Set(getEntries().filter(e=>e.kind==='outfit'&&!e.hidden).map(e=>e.commonLabel).filter(Boolean))].sort(),
        reorderOutfit:(entry,target)=>{if(entry.avatar!==target.avatar)throw new Error('Choose outfits from the same character.');const character=characters().find(c=>c.avatar===entry.avatar),list=character?outfitOptions(character,true):catalogFor(entry.avatar).outfits,index=list.findIndex(e=>e.folder===entry.folder),next=list.findIndex(e=>e.folder===target.folder);if(index>=0&&next>=0)moveOutfit(entry.avatar,entry.folder,next-index);},
        restoreSharedOutfit:(avatar,folder)=>{const c=characters().find(c=>c.avatar===avatar);if(!c)throw new Error('Character is no longer available.');return rememberOutfit(c,folder,{explicit:true});},
        updateOutfit:(entry,patch)=>editOutfit(entry.avatar,entry.folder,patch),
        removeOutfit:entry=>removeOutfit(entry.avatar,entry.folder),moveOutfit:(entry,delta)=>moveOutfit(entry.avatar,entry.folder,delta),
        wear:entry=>services.changeOutfit(entry.avatar,entry.folder),
        addOutfit:(avatar,folder,label)=>{const c=characters().find(c=>c.avatar===avatar);if(!c||!validFolder(folder))throw new Error('Choose a character and enter a valid sprite folder.');const added=rememberOutfit(c,folder,{label,explicit:true});if(!added&&label)editOutfit(avatar,folder,{label});},
        discover:avatar=>{const c=characters().find(c=>c.avatar===avatar);if(!c)throw new Error('Choose a character.');return discoverOutfits(c,active().has(avatar)?services.currentFolder(c):c.name,true);},
        importFolders:(avatar,files)=>{const c=characters().find(c=>c.avatar===avatar);if(!c)throw new Error('Choose a character.');return importFolderNames(c,files,active().has(avatar)?services.currentFolder(c):c.name);},
        updateBackground,chooseBackground:pickBackground,scanFolders:files=>scanOutfitFolders(characters(),files),uploadSprites:async(folder,...args)=>{folder=spriteFolder(folder);try{return await uploadOutfitImages(folder,...args);}finally{assets.delete(folder);await inspectOutfit(folder);changed();}},
        getExpressionLabels:async()=>{const labels=await getExpressionsList();if(!Array.isArray(labels)||!labels.length)throw new Error('Expression names could not be loaded. Try again after opening SillyTavern’s expressions settings.');return labels;},
        reviewExpression,editExpression:async(ticket,file)=>{try{return await editExpression(ticket,file);}finally{assets.delete(ticket.folder);await inspectOutfit(ticket.folder);changed();}},
        previewOutfit:async folder=>(await inspectOutfit(folder)).src,outfitExpressions:async folder=>(await inspectOutfit(folder)).expressions||[]
    });
    window.ImmersiveGroupsSceneLibrary=api;
    for(const name of ['CHAT_CHANGED','GROUP_UPDATED'])if(event_types[name])eventSource.on(event_types[name],()=>window.dispatchEvent(new Event('ig-scene-library-change')));
    onCatalogChange(()=>window.dispatchEvent(new Event('ig-scene-library-change')));
    return api;
}
