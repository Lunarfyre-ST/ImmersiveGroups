// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { extension_settings } from '../../../../extensions.js';
import { getRequestHeaders, saveSettingsDebounced, chat_metadata } from '../../../../../script.js';
import { floatingPanel } from './floating-panel.js';
import * as backgrounds from '../../../../backgrounds.js';
import { extensionName } from '../constants.js';

let api, panel, picker, popup, dialog, files = [], loading = false;
const settings = () => extension_settings[extensionName];
const getBackgroundPath = file => backgrounds.getBackgroundPath?.(file) || `backgrounds/${encodeURIComponent(file)}`;
const own = (o,k) => Object.prototype.hasOwnProperty.call(o || {},k);
const bindings = file => own(settings().backgroundBindings,file) && Array.isArray(settings().backgroundBindings[file]) ? settings().backgroundBindings[file] : [];
const description = file => own(settings().backgroundDescriptions,file) && typeof settings().backgroundDescriptions[file] === 'string' ? settings().backgroundDescriptions[file] : '';
export function backgroundSceneContext() {
    const lockedUrl = typeof chat_metadata?.custom_background === 'string' ? chat_metadata.custom_background : '';
    const activeUrl = lockedUrl || backgrounds.background_settings?.url || '';
    const current = lockedUrl ? files.find(file => activeUrl.includes(getBackgroundPath(file))) || null : backgrounds.background_settings?.name || null;
    const known = [...new Set([...files, ...(settings().backgroundFavorites || []), ...Object.keys(settings().backgroundDescriptions || {})])];
    return { current, locked: Boolean(lockedUrl), url: activeUrl,
        library: known.map(file => ({file, description:description(file), characterBindings:[...bindings(file)], favorite:(settings().backgroundFavorites || []).includes(file)})) };
}
const el = (tag,text='') => {const n=document.createElement(tag);n.textContent=text;return n;};
function status(text) { dialog.querySelector('[data-bg-status]').textContent=text; }
export async function readBackgrounds() {
    const response=await fetch('/api/backgrounds/all',{method:'POST',headers:getRequestHeaders(),body:JSON.stringify({})});
    if(!response.ok)throw new Error(`Could not load backgrounds (${response.status})`);
    const data=await response.json();
    // Support older ST arrays as well as the current { images } response.
    const images=Array.isArray(data)?data:data.images;
    if(!Array.isArray(images))throw new Error('Invalid background list');
    files=[...new Set(images.map(x=>typeof x==='string'?x:x?.filename).filter(x=>typeof x==='string'&&x.length>0))].sort((a,b)=>a.localeCompare(b));
    return files;
}
export function pickBackground(file) {
    if(!files.includes(file))throw new Error('This background is no longer available. Refresh the library.');
    // Use the native selection handler so chat locks and existing native UI
    // behavior stay consistent, without constructing/executing slash commands.
    const proxy=document.createElement('div');proxy.className='bg_example';proxy.hidden=true;proxy.setAttribute('bgfile',file);proxy.setAttribute('custom','false');
    $(proxy).data('url',`url("${getBackgroundPath(file)}")`);
    document.body.append(proxy);
    try {proxy.click();} finally {proxy.remove();}
}
function favorites() {
    const select=picker.querySelector('[data-bg-picker]'),character=picker.querySelector('[data-bg-character]');
    const previous=character.value;
    const charSignature=JSON.stringify(api.characters().map(c=>[c.avatar,c.name]));
    if(character.dataset.signature!==charSignature){character.replaceChildren(new Option('All characters',''));for(const c of api.characters())character.append(new Option(c.name,c.avatar));character.value=previous;character.dataset.signature=charSignature;}
    const starred=(settings().backgroundFavorites||[]).filter(f=>files.includes(f)&&(!character.value||!bindings(f).length||bindings(f).includes(character.value)));
    const signature=JSON.stringify(starred);
    // Leave a native touch picker alone while it has focus.
    if(select!==document.activeElement&&select.dataset.signature!==signature){select.replaceChildren(new Option(starred.length?'Starred backgrounds':'Star backgrounds in the library',''));for(const file of starred)select.append(new Option(file,file));select.dataset.signature=signature;}
    select.title='Choose a starred background';
}
export function refreshBackgrounds(layout) {
    if(!panel)return;
    panel.hidden=!settings().enableVN_UI||settings().sheldCharacterControls===false||settings().stageShowBackground!==true;
    const target=layout.stageBackgroundPlacement==='bottom'?api.bottom:api.top;
    if(panel.parentElement!==target)target.append(panel);
    if(panel.hidden)popup.close();
    favorites();
}
function renderLibrary() {
    const list=dialog.querySelector('[data-bg-list]'),search=dialog.querySelector('[data-bg-search]').value.toLocaleLowerCase();list.replaceChildren();
    for(const file of files.filter(f=>f.toLocaleLowerCase().includes(search))){
        const row=el('div');row.className='ig-background-row';
        const image=el('img');image.src=getBackgroundPath(file);image.loading='lazy';image.alt='';
        const star=el('button',(settings().backgroundFavorites||[]).includes(file)?'★':'☆');star.type='button';star.className='menu_button ig-star';star.setAttribute('aria-label',`Star ${file}`);star.setAttribute('aria-pressed',String((settings().backgroundFavorites||[]).includes(file)));
        star.addEventListener('click',()=>{const saved=settings().backgroundFavorites||[];settings().backgroundFavorites=saved.includes(file)?saved.filter(f=>f!==file):[...saved,file];saveSettingsDebounced();renderLibrary();favorites();});
        const label=el('span',file);label.className='ig-background-name';
        const use=el('button','Use');use.type='button';use.className='menu_button';use.addEventListener('click',()=>{try{pickBackground(file);status(`Selected ${file}`);}catch(e){status(e.message);}});
        const bound=el('details');bound.append(el('summary','Character bindings'));
        bound.append(el('small','No characters selected: available to everyone. Bindings filter the picker; they do not change the scene automatically.'));
        for(const c of api.characters()) {const item=el('label'),check=el('input');check.type='checkbox';check.checked=bindings(file).includes(c.avatar);check.addEventListener('change',()=>{const avatars=bindings(file).filter(a=>a!==c.avatar);if(check.checked)avatars.push(c.avatar);Object.defineProperty(settings().backgroundBindings,file,{value:avatars,writable:true,enumerable:true,configurable:true});saveSettingsDebounced();favorites();});item.append(check,document.createTextNode(c.name));bound.append(item);}
        const notes=el('label');notes.className='ig-background-description';notes.append(document.createTextNode('Scene description'));
        const input=el('textarea');input.className='text_pole';input.rows=2;input.maxLength=12000;input.value=description(file);input.placeholder='Location, atmosphere and useful scene details for future context injection';input.setAttribute('aria-label',`Scene description for ${file}`);
        input.addEventListener('input',()=>{Object.defineProperty(settings().backgroundDescriptions,file,{value:input.value.slice(0,12000),writable:true,enumerable:true,configurable:true});saveSettingsDebounced();});notes.append(input);
        row.append(image,star,label,use,notes,bound);list.append(row);
    }
}
async function openLibrary() {
    if(!dialog.open)dialog.showModal();status('Loading backgrounds…');
    if(loading)return;loading=true;
    try{await readBackgrounds();renderLibrary();favorites();status(`${files.length} backgrounds. Star favorites to show them on the Sheld.`);}catch(error){status(error.message);}finally{loading=false;}
}
export function setupBackgrounds(services) {
    api=services;const s=settings();if(!Array.isArray(s.backgroundFavorites))s.backgroundFavorites=[];if(!s.backgroundBindings||typeof s.backgroundBindings!=='object'||Array.isArray(s.backgroundBindings))s.backgroundBindings={};
    if(!s.backgroundDescriptions||typeof s.backgroundDescriptions!=='object'||Array.isArray(s.backgroundDescriptions))s.backgroundDescriptions={};
    panel=el('div');panel.className='ig-background-controls';
    const toggle=el('button');toggle.type='button';toggle.className='prome-stage-button';toggle.title='Backgrounds';toggle.setAttribute('aria-label','Choose background');toggle.innerHTML='<i class="fa-solid fa-image" aria-hidden="true"></i>';panel.append(toggle);api.top.append(panel);
    picker=el('section');picker.className='ig-background-popover';picker.setAttribute('aria-label','Background choices');picker.innerHTML='<strong>Backgrounds</strong><label>Character filter<select data-bg-character aria-label="Background character filter"></select></label><label>Favorite background<select data-bg-picker aria-label="Starred background"></select></label><button type="button" class="menu_button" data-bg-manage>Manage backgrounds &amp; favorites</button>';
    popup=floatingPanel(toggle,picker);
    toggle.addEventListener('click',async()=>{if(popup.isOpen){popup.close();return;}popup.open();if(!files.length&&!loading){loading=true;try{await readBackgrounds();favorites();popup.position();}catch(error){console.warn('[ImmersiveGroups]',error.message);}finally{loading=false;}}});
    picker.querySelector('[data-bg-character]').addEventListener('change',favorites);
    picker.querySelector('[data-bg-picker]').addEventListener('change',event=>{if(!event.target.value)return;try{pickBackground(event.target.value);popup.close();}catch(error){console.warn('[ImmersiveGroups]',error.message);}event.target.value='';event.target.blur();});
    picker.querySelector('[data-bg-manage]').addEventListener('click',()=>{popup.close();openLibrary();});
    dialog=el('dialog');dialog.className='prome-outfit-dialog ig-background-dialog';dialog.innerHTML='<div class="prome-outfit-dialog-header"><h3>Background library</h3><button type="button" class="menu_button" data-bg-close>Close</button></div><div class="prome-outfit-dialog-body"><input type="search" class="text_pole" data-bg-search placeholder="Find a background" aria-label="Find a background"><p data-bg-status role="status"></p><div data-bg-list></div></div>';document.body.append(dialog);
    dialog.querySelector('[data-bg-close]').addEventListener('click',()=>dialog.close());dialog.querySelector('[data-bg-search]').addEventListener('input',renderLibrary);
    document.getElementById('ig-open-backgrounds')?.addEventListener('click',openLibrary);
    // Load once only if the selector is enabled; otherwise the library loads on demand.
    if(s.stageShowBackground)readBackgrounds().then(favorites).catch(error=>console.warn('[ImmersiveGroups]',error.message));
    window.addEventListener('ig-layout-change',()=>{if(s.stageShowBackground&&!files.length&&!loading){loading=true;readBackgrounds().then(favorites).catch(error=>console.warn('[ImmersiveGroups]',error.message)).finally(()=>loading=false);}});
}
