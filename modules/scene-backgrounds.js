// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { extension_settings, getContext } from '../../../../extensions.js';
import { getRequestHeaders, saveSettingsDebounced, chat_metadata } from '../../../../../script.js';
import { floatingPanel } from './floating-panel.js';
import { layoutSettings } from './responsive.js';
import { setupBackgroundDefaults } from './background-defaults.js';
import { backgroundChoices, nextLinkedBackground } from './background-model.js';
import { bindingGroups } from './binding-groups-model.js';
import { knownBackgrounds, forgetBackground, relinkBackground } from './background-catalog-model.js';
import * as backgrounds from '../../../../backgrounds.js';
import { extensionName } from '../constants.js';

let imageMenu, mediaPane='backgrounds',linkedNav,linkedCursor='',linkedScope='';
let api, panel, picker, popup, dialog, files = [], loading = false, filesLoaded = false, backgroundRevision = 0, defaultController;
const settings = () => extension_settings[extensionName];
export const getBackgroundPath = file => backgrounds.getBackgroundPath?.(file) || `backgrounds/${encodeURIComponent(file)}`;
const own = (o,k) => Object.prototype.hasOwnProperty.call(o || {},k);
const bindings = file => own(settings().backgroundBindings,file) && Array.isArray(settings().backgroundBindings[file]) ? settings().backgroundBindings[file] : [];
const description = file => own(settings().backgroundDescriptions,file) && typeof settings().backgroundDescriptions[file] === 'string' ? settings().backgroundDescriptions[file] : '';
export function backgroundSceneContext() {
    const lockedUrl = typeof chat_metadata?.custom_background === 'string' ? chat_metadata.custom_background : '';
    const activeUrl = lockedUrl || backgrounds.background_settings?.url || '';
    const current = lockedUrl ? files.find(file => activeUrl.includes(getBackgroundPath(file))) || null : backgrounds.background_settings?.name || null;
    const known = knownBackgrounds(files,settings());
    return { current, locked: Boolean(lockedUrl), automationLocked: Boolean(settings().backgroundAutomationLocked), url: activeUrl,
        library: known.map(file => ({file, available:files.includes(file), description:description(file), characterBindings:[...bindings(file)], presetBindings:own(settings().backgroundGroupBindings,file)&&Array.isArray(settings().backgroundGroupBindings[file])?[...settings().backgroundGroupBindings[file]]:[], favorite:(settings().backgroundFavorites || []).includes(file)})) };
}
const el = (tag,text='') => {const n=document.createElement(tag);n.textContent=text;return n;};
function status(text) { dialog.querySelector('[data-bg-status]').textContent=text; }
function saveLibrary(){saveSettingsDebounced();window.dispatchEvent(new Event('ig-background-catalog-change'));}
export function discardBackground(file){
    if(!filesLoaded)throw new Error('Refresh the background library first.');
    if(files.includes(file))throw new Error('Only missing entries can be discarded. Delete files through SillyTavern first.');
    forgetBackground(settings(),file);saveLibrary();favorites();refreshLinkedArrows();
}
export function relinkBackgroundEntry(oldFile,newFile){
    if(!filesLoaded||files.includes(oldFile)||!files.includes(newFile))throw new Error('Refresh the library and select an available replacement for a missing entry.');
    relinkBackground(settings(),oldFile,newFile);saveLibrary();favorites();refreshLinkedArrows();
}
export function updateBackground(file,patch){
    if(!backgroundSceneContext().library.some(entry=>entry.file===file))throw new Error('Background is no longer in the library.');
    if(typeof patch.description==='string')Object.defineProperty(settings().backgroundDescriptions,file,{value:patch.description.slice(0,12000),enumerable:true,writable:true,configurable:true});
    if(Array.isArray(patch.characterBindings))Object.defineProperty(settings().backgroundBindings,file,{value:[...new Set(patch.characterBindings.filter(a=>typeof a==='string'))],enumerable:true,writable:true,configurable:true});
    if(Array.isArray(patch.presetBindings))Object.defineProperty(settings().backgroundGroupBindings,file,{value:[...new Set(patch.presetBindings.filter(id=>bindingGroups(settings().bindingGroups).some(g=>g.id===id)))],enumerable:true,writable:true,configurable:true});
    if(typeof patch.favorite==='boolean'){const list=settings().backgroundFavorites||[];settings().backgroundFavorites=patch.favorite?[...new Set([...list,file])]:list.filter(f=>f!==file);}
    saveLibrary();favorites();refreshLinkedArrows();
}
export async function readBackgrounds() {
    const response=await fetch('/api/backgrounds/all',{method:'POST',headers:getRequestHeaders(),body:JSON.stringify({})});
    if(!response.ok)throw new Error(`Could not load backgrounds (${response.status})`);
    const data=await response.json();
    // Support older ST arrays as well as the current { images } response.
    const images=Array.isArray(data)?data:data.images;
    if(!Array.isArray(images))throw new Error('Invalid background list');
    files=[...new Set(images.map(x=>typeof x==='string'?x:x?.filename).filter(x=>typeof x==='string'&&x.length>0))].sort((a,b)=>a.localeCompare(b));
    filesLoaded=true;refreshLinkedArrows();return files;
}
export function ensureBackgrounds(){return filesLoaded?Promise.resolve(files):readBackgrounds();}
export function pickBackground(file,{automatic=false}={}) {
    if(!files.includes(file))throw new Error('This background is no longer available. Refresh the library.');
    // Use the native selection handler so chat locks and existing native UI
    // behavior stay consistent, without constructing/executing slash commands.
    const proxy=document.createElement('div');proxy.className='bg_example';proxy.hidden=true;proxy.setAttribute('bgfile',file);proxy.setAttribute('custom','false');proxy.dataset.igAutomatic=String(automatic);
    $(proxy).data('url',`url("${getBackgroundPath(file)}")`);
    document.body.append(proxy);
    try {proxy.click();linkedCursor=file;refreshLinkedArrows();} finally {proxy.remove();}
}
function refreshLinkedArrows(){
    if(!linkedNav)return;
    const ctx=getContext(),scope=JSON.stringify([ctx.groupId??null,ctx.getCurrentChatId?.(),api.characters().map(c=>c.avatar)]);
    if(scope!==linkedScope){linkedScope=scope;linkedCursor='';}
    const layout=layoutSettings(),pool=backgroundChoices(files,settings(),api.characters().map(c=>c.avatar)).linked;
    linkedNav.hidden=!settings().enableVN_UI||settings().sheldCharacterControls===false||!layout.stageShowBackgroundArrows;
    const current=linkedCursor||backgroundSceneContext().current,index=pool.indexOf(current);
    for(const button of linkedNav.querySelectorAll('button'))button.disabled=!pool.length||(pool.length===1&&index===0);

}
export async function requestAutomaticBackground({file,chatId,groupId,isCurrent=()=>true}={}){
    const revision=backgroundRevision;
    const valid=()=>isCurrent()&&String(getContext().getCurrentChatId?.())===String(chatId)&&String(getContext().groupId??'')===String(groupId??'')&&!chat_metadata?.custom_background&&!settings().backgroundAutomationLocked&&backgroundRevision===revision;
    if(!valid())return false;await ensureBackgrounds();if(!files.includes(file)||!valid())return false;
    await new Promise((resolve,reject)=>{const image=new Image(),timer=setTimeout(()=>done(new Error('Background image load timed out')),15000);function done(error){clearTimeout(timer);image.onload=image.onerror=null;error?reject(error):resolve();}image.onload=()=>done();image.onerror=()=>done(new Error('Background image could not load'));image.src=getBackgroundPath(file);});
    if(!valid())return false;defaultController?.cancel();pickBackground(file,{automatic:true});return true;
}
function favorites() {
    const character=picker.querySelector('[data-bg-character]');
    const previous=character.value;
    const characters=api.characters(),charSignature=JSON.stringify(characters.map(c=>[c.avatar,c.name]));
    if(character!==document.activeElement&&character.dataset.signature!==charSignature){character.replaceChildren(new Option('All characters',''));for(const c of characters)character.append(new Option(c.name,c.avatar));character.value=characters.some(c=>c.avatar===previous)?previous:'';character.dataset.signature=charSignature;}
    const {linked,starred}=backgroundChoices(files,settings(),characters.map(c=>c.avatar),character.value);
    for(const [selector,entries,label,empty] of [['[data-bg-linked]',linked,'Choose linked background','No linked backgrounds'],['[data-bg-picker]',starred,'Choose starred background','Star backgrounds in the library']]){
        const select=picker.querySelector(selector),signature=JSON.stringify(entries);
        // Never replace rows while a native touch picker is open.
        if(select!==document.activeElement&&select.dataset.signature!==signature){select.replaceChildren(new Option(entries.length?label:empty,''));for(const file of entries)select.append(new Option(file,file));select.disabled=!entries.length;select.dataset.signature=signature;}
        select.title=label;
    }
    picker.querySelector('[data-bg-linked-empty]').hidden=linked.length>0;
}
export function refreshBackgrounds(layout) {
    if(!panel)return;
    refreshLinkedArrows();
    const showImages=window.ImmersiveGroupsGallery?.getShortcutState?.().showInScene===true;
    panel.hidden=!settings().enableVN_UI||settings().sheldCharacterControls===false||(!settings().stageShowBackground&&!showImages);
    if(!imageMenu&&window.ImmersiveGroupsGallery?.mountQuickSend)imageMenu=window.ImmersiveGroupsGallery.mountQuickSend(picker.querySelector('[data-media-pane="images"]'));
    const available={backgrounds:settings().stageShowBackground===true,images:showImages};
    if(!available[mediaPane])mediaPane=available.backgrounds?'backgrounds':'images';
    picker.querySelector('[data-media-tabs]').hidden=!(available.backgrounds&&available.images);
    for(const tab of picker.querySelectorAll('[data-media-tab]')){tab.hidden=!available[tab.dataset.mediaTab];tab.setAttribute('aria-selected',String(mediaPane===tab.dataset.mediaTab));tab.tabIndex=mediaPane===tab.dataset.mediaTab?0:-1;}
    for(const pane of picker.querySelectorAll('[data-media-pane]'))pane.hidden=pane.dataset.mediaPane!==mediaPane;
    imageMenu?.refresh();
    const target=layout.stageBackgroundPlacement==='bottom'?api.bottom:api.top;
    if(panel.parentElement!==target)target.append(panel);
    if(panel.hidden)popup.close();
    picker.querySelector('[data-bg-model-lock]').checked=Boolean(settings().backgroundAutomationLocked);favorites();
}
function renderLibrary() {
    const list=dialog.querySelector('[data-bg-list]'),search=dialog.querySelector('[data-bg-search]').value.toLocaleLowerCase();list.replaceChildren();
    for(const file of files.filter(f=>f.toLocaleLowerCase().includes(search))){
        const row=el('div');row.className='ig-background-row';
        const image=el('img');image.src=getBackgroundPath(file);image.loading='lazy';image.alt='';
        const star=el('button',(settings().backgroundFavorites||[]).includes(file)?'★':'☆');star.type='button';star.className='menu_button ig-star';star.setAttribute('aria-label',`Star ${file}`);star.setAttribute('aria-pressed',String((settings().backgroundFavorites||[]).includes(file)));
        star.addEventListener('click',()=>{const saved=settings().backgroundFavorites||[];settings().backgroundFavorites=saved.includes(file)?saved.filter(f=>f!==file):[...saved,file];saveLibrary();renderLibrary();favorites();});
        const label=el('span',file);label.className='ig-background-name';
        const use=el('button','Use');use.type='button';use.className='menu_button';use.addEventListener('click',()=>{try{pickBackground(file);status(`Selected ${file}`);}catch(e){status(e.message);}});
        const bound=el('details');bound.append(el('summary','Character bindings'));
        bound.append(el('small','Linked backgrounds appear for their characters even without a star. No characters selected: available to everyone when starred. Optional chat-load defaults can select a bound scene; configure them under Backgrounds → On chat load.'));
        for(const c of api.characters()) {const item=el('label'),check=el('input');check.type='checkbox';check.checked=bindings(file).includes(c.avatar);check.addEventListener('change',()=>{const avatars=bindings(file).filter(a=>a!==c.avatar);if(check.checked)avatars.push(c.avatar);Object.defineProperty(settings().backgroundBindings,file,{value:avatars,writable:true,enumerable:true,configurable:true});saveLibrary();favorites();});item.append(check,document.createTextNode(c.name));bound.append(item);}
        const notes=el('label');notes.className='ig-background-description';notes.append(document.createTextNode('Scene description'));
        const input=el('textarea');input.className='text_pole';input.rows=2;input.maxLength=12000;input.value=description(file);input.placeholder='Location, atmosphere and useful scene details for Automation context';input.setAttribute('aria-label',`Scene description for ${file}`);
        input.addEventListener('input',()=>{Object.defineProperty(settings().backgroundDescriptions,file,{value:input.value.slice(0,12000),writable:true,enumerable:true,configurable:true});saveLibrary();});notes.append(input);
        row.append(image,star,label,use,notes,bound);list.append(row);
    }
}
async function openLibrary() {
    if(window.ImmersiveGroupsGallery?.openLibrary)return window.ImmersiveGroupsGallery.openLibrary({type:'background'});
    if(!dialog.open)dialog.showModal();status('Loading backgrounds…');
    if(loading)return;loading=true;
    try{await readBackgrounds();renderLibrary();favorites();status(`${files.length} backgrounds. Star favorites to show them on the Sheld.`);}catch(error){status(error.message);}finally{loading=false;}
}
export function setupBackgrounds(services) {
    api=services;const s=settings();if(!Array.isArray(s.backgroundFavorites))s.backgroundFavorites=[];if(!s.backgroundBindings||typeof s.backgroundBindings!=='object'||Array.isArray(s.backgroundBindings))s.backgroundBindings={};
    if(!s.backgroundDescriptions||typeof s.backgroundDescriptions!=='object'||Array.isArray(s.backgroundDescriptions))s.backgroundDescriptions={};
    if(!s.backgroundGroupBindings||typeof s.backgroundGroupBindings!=='object'||Array.isArray(s.backgroundGroupBindings))s.backgroundGroupBindings={};
    panel=el('div');panel.className='ig-background-controls';
    linkedNav=el('div');linkedNav.id='ig-linked-background-nav';linkedNav.setAttribute('aria-label','Linked background navigation');linkedNav.hidden=true;
    for(const [direction,label] of [[-1,'Previous linked background'],[1,'Next linked background']]){const button=el('button',direction<0?'‹':'›');button.type='button';button.className='prome-stage-button';button.setAttribute('aria-label',label);button.title=label;button.addEventListener('click',()=>{const file=nextLinkedBackground(files,settings(),api.characters().map(c=>c.avatar),linkedCursor||backgroundSceneContext().current,direction);if(file)try{pickBackground(file);}catch(error){console.warn('[ImmersiveGroups]',error.message);}});linkedNav.append(button);}
    document.getElementById('prome-stage-manage').after(linkedNav);
    window.addEventListener('ig-background-catalog-change',refreshLinkedArrows);
    window.addEventListener('ig-binding-groups-change',()=>{favorites();refreshLinkedArrows();});
    document.addEventListener('click',event=>{const node=event.target.closest?.('.bg_example');if(node){linkedCursor=node.getAttribute('bgfile')||'';requestAnimationFrame(refreshLinkedArrows);}},true);
    const toggle=el('button');toggle.type='button';toggle.className='prome-stage-button';toggle.title='Backgrounds & images';toggle.setAttribute('aria-label','Backgrounds and images');toggle.innerHTML='<i class="fa-solid fa-image" aria-hidden="true"></i>';panel.append(toggle);api.top.append(panel);
    picker=el('section');picker.className='ig-background-popover';picker.setAttribute('aria-label','Backgrounds and images');picker.innerHTML=`<header><strong>Backgrounds &amp; images</strong><button type="button" data-media-close aria-label="Close backgrounds and images">×</button></header>
    <div class="ig-media-tabs" data-media-tabs role="tablist" aria-label="Scene media"><button type="button" role="tab" id="ig-media-backgrounds-tab" data-media-tab="backgrounds" aria-controls="ig-media-backgrounds">Backgrounds</button><button type="button" role="tab" id="ig-media-images-tab" data-media-tab="images" aria-controls="ig-media-images">Send image</button></div>
    <div id="ig-media-backgrounds" data-media-pane="backgrounds" role="tabpanel" aria-labelledby="ig-media-backgrounds-tab"><label><input type="checkbox" data-bg-model-lock> Lock model background changes</label><label>Character filter<select data-bg-character aria-label="Background character filter"></select></label><section class="ig-media-linked"><h4>Linked backgrounds</h4><select data-bg-linked aria-label="Linked background"></select><small data-bg-linked-empty>Link backgrounds to characters in the library. All characters only shows backgrounds linked to every active member. Choose one character to see their individual links.</small></section><section class="ig-media-starred"><h4>Starred backgrounds</h4><select data-bg-picker aria-label="Starred background"></select></section><button type="button" class="menu_button" data-bg-manage>Manage backgrounds &amp; favorites</button></div>
    <div id="ig-media-images" data-media-pane="images" role="tabpanel" aria-labelledby="ig-media-images-tab" hidden></div>`;
    picker.querySelector('[data-bg-model-lock]').addEventListener('change',event=>{settings().backgroundAutomationLocked=event.target.checked;saveSettingsDebounced();window.dispatchEvent(new Event('ig-layout-change'));});
    document.addEventListener('click',event=>{const node=event.target.closest?.('.bg_example');if(node&&node.dataset.igAutomatic!=='true')backgroundRevision++;},true);
    popup=floatingPanel(toggle,picker);
    picker.querySelector('[data-media-close]').addEventListener('click',()=>popup.close(true));
    for(const tab of picker.querySelectorAll('[data-media-tab]')){
        tab.addEventListener('click',()=>{mediaPane=tab.dataset.mediaTab;refreshBackgrounds(layoutSettings());popup.position();});
        tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...picker.querySelectorAll('[data-media-tab]')].filter(n=>!n.hidden);const next=tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(tabs.indexOf(tab)+1)%tabs.length];next?.click();next?.focus();});
    }
    window.addEventListener('ig-gallery-change',()=>refreshBackgrounds(layoutSettings()));
    toggle.addEventListener('click',async()=>{if(popup.isOpen){popup.close();return;}refreshBackgrounds(layoutSettings());popup.open();if(!files.length&&!loading){loading=true;try{await readBackgrounds();favorites();popup.position();}catch(error){console.warn('[ImmersiveGroups]',error.message);}finally{loading=false;}}});
    picker.querySelector('[data-bg-character]').addEventListener('change',favorites);
    for(const select of picker.querySelectorAll('[data-bg-picker],[data-bg-linked]')){
        select.addEventListener('change',event=>{if(!event.target.value)return;try{pickBackground(event.target.value);popup.close();}catch(error){console.warn('[ImmersiveGroups]',error.message);}event.target.value='';event.target.blur();});
        select.addEventListener('blur',favorites);
    }
    picker.querySelector('[data-bg-character]').addEventListener('blur',favorites);
    picker.querySelector('[data-bg-manage]').addEventListener('click',()=>{popup.close();openLibrary();});
    dialog=el('dialog');dialog.className='prome-outfit-dialog ig-background-dialog';dialog.innerHTML='<div class="prome-outfit-dialog-header"><h3>Background library</h3><button type="button" class="menu_button" data-bg-close>Close</button></div><div class="prome-outfit-dialog-body"><input type="search" class="text_pole" data-bg-search placeholder="Find a background" aria-label="Find a background"><p data-bg-status role="status"></p><div data-bg-list></div></div>';document.body.append(dialog);
    dialog.querySelector('[data-bg-close]').addEventListener('click',()=>dialog.close());dialog.querySelector('[data-bg-search]').addEventListener('input',renderLibrary);
    document.getElementById('ig-open-backgrounds')?.addEventListener('click',openLibrary);
    defaultController=setupBackgroundDefaults({settings,characters:api.characters,readFiles:readBackgrounds,pick:pickBackground});
    // Load once only if the selector is enabled; otherwise the library loads on demand.
    if(s.stageShowBackground||layoutSettings().stageShowBackgroundArrows)readBackgrounds().then(favorites).catch(error=>console.warn('[ImmersiveGroups]',error.message));
    window.addEventListener('ig-layout-change',()=>{if((s.stageShowBackground||layoutSettings().stageShowBackgroundArrows)&&!files.length&&!loading){loading=true;readBackgrounds().then(favorites).catch(error=>console.warn('[ImmersiveGroups]',error.message)).finally(()=>loading=false);}});
}
