// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { setCharacterColors, catalogFor, outfitOptions, hiddenOutfit, rememberOutfit, editOutfit, removeOutfit, moveOutfit, discoverOutfits, importFolderNames, validFolder, cleanFolder, onCatalogChange } from './outfit-catalog.js';

let services, dialog, selected = '', scanBusy = false;
const el = (tag, className = '', text = '') => { const node = document.createElement(tag); node.className = className; if (text) node.textContent = text; return node; };
function character() { return services.characters().find(c => c.avatar === selected); }
function status(text) { dialog.querySelector('[data-editor-status]').textContent = text; }
function action(title, icon, callback) {
    const button = el('button','prome-icon-button'); button.type = 'button'; button.title = title; button.setAttribute('aria-label',title);
    const glyph = el('i',`fa-solid ${icon}`); glyph.setAttribute('aria-hidden','true'); button.append(glyph); button.addEventListener('click',callback); return button;
}
function render() {
    const characters = services.characters();
    const picker = dialog.querySelector('[data-editor-character]');
    const before = picker.value;
    picker.replaceChildren();
    for (const c of characters) { const option = el('option','',characters.filter(other=>other.name===c.name).length>1?`${c.name} (${c.avatar})`:c.name); option.value = c.avatar; option.title = c.avatar; picker.append(option); }
    if (!characters.some(c => c.avatar === selected)) selected = characters.some(c => c.avatar === before) ? before : characters[0]?.avatar || '';
    picker.value = selected;
    const c = character(), list = dialog.querySelector('[data-editor-list]');
    list.replaceChildren();
    dialog.querySelector('[data-editor-empty]').hidden = Boolean(c);
    for (const button of dialog.querySelectorAll('[data-editor-requires-character]')) button.disabled = !c || scanBusy;
    const colors=dialog.querySelector('[data-editor-colors]');colors.replaceChildren();
    if (!c) return;
    colors.append(el('h4','','Character button colors'));
    for(const [key,label,fallback] of [['background','Button background','#20232c'],['speak','Speak button','#513d2c'],['text','Button text','#e8e9ee']]){
        const field=el('label','ig-color-field',label),input=el('input');input.type='color';input.value=catalogFor(c.avatar).colors?.[key]||fallback;input.setAttribute('aria-label',label);
        input.addEventListener('input',()=>setCharacterColors(c.avatar,{[key]:input.value}));
        const reset=el('button','menu_button','Theme default');reset.type='button';reset.addEventListener('click',()=>{setCharacterColors(c.avatar,{[key]:''});render();});field.append(input,reset);colors.append(field);
    }
    for (const entry of outfitOptions(c,true)) {
        const row = el('div','prome-outfit-editor-row');
        const main = el('div','prome-outfit-editor-main');
        const visible = el('input'); visible.type = 'checkbox'; visible.checked = !hiddenOutfit(c,entry); visible.title = 'Show in outfit selectors'; visible.setAttribute('aria-label',`Show ${entry.label}`);
        visible.addEventListener('change',()=> { editOutfit(c.avatar,entry.folder,{hidden:!visible.checked}); render(); });
        const name = el('input','text_pole'); name.value = entry.label; name.maxLength=80; name.setAttribute('aria-label','Outfit display name');
        name.addEventListener('change',()=>editOutfit(c.avatar,entry.folder,{label:name.value}));
        const actions = el('div','prome-outfit-row-actions');
        actions.append(action('Move up','fa-chevron-up',()=>{moveOutfit(c.avatar,entry.folder,-1);render();}),action('Move down','fa-chevron-down',()=>{moveOutfit(c.avatar,entry.folder,1);render();}),action('Remove from catalog (keeps files)','fa-trash-can',()=>{removeOutfit(c.avatar,entry.folder);render();}));
        main.append(visible,name,actions);
        const path = el('code','prome-outfit-path',entry.folder);
        const extra = el('details','prome-outfit-note'); extra.append(el('summary','','Scene description (for future automation)'));
        const note = el('textarea','text_pole'); note.value=entry.description||''; note.maxLength=1000; note.rows=2; note.setAttribute('aria-label','Outfit scene description'); note.placeholder='When this outfit fits the scene…';
        note.addEventListener('change',()=>editOutfit(c.avatar,entry.folder,{description:note.value})); extra.append(note);
        const font=el('label','ig-color-field','Outfit font color'),color=el('input');color.type='color';color.value=entry.fontColor||'#e8e9ee';color.setAttribute('aria-label','Outfit font color');color.addEventListener('input',()=>editOutfit(c.avatar,entry.folder,{fontColor:color.value}));
        const reset=el('button','menu_button','Use character color');reset.type='button';reset.addEventListener('click',()=>{editOutfit(c.avatar,entry.folder,{fontColor:''});color.value='#e8e9ee';});font.append(color,reset);extra.append(font);
        row.append(main,path,extra); list.append(row);
    }
    dialog.querySelector('[data-editor-count]').textContent = `${outfitOptions(c).length} visible · ${catalogFor(c.avatar).outfits.length} saved`;
}
export function openOutfitEditor(avatar = '') {
    if (!dialog) return;
    selected = avatar || selected;
    render(); status('');
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('.prome-outfit-dialog-body').scrollTop = 0;
    dialog.querySelector('[data-editor-close]').focus({preventScroll:true});
}
export function setupOutfitEditor(api) {
    services=api;
    dialog=el('dialog','prome-outfit-dialog'); dialog.id='prome-outfit-dialog';
    dialog.innerHTML=`<div class="prome-outfit-dialog-header"><div><h3>Outfit library</h3><small>Display names, visibility and scene notes</small></div><button type="button" class="prome-icon-button" data-editor-close aria-label="Close outfit library"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>
    <div class="prome-outfit-dialog-body"><label class="prome-editor-character">Character <select data-editor-character></select><small data-editor-count></small></label>
    <div class="prome-outfit-tools"><button type="button" class="menu_button" data-editor-scan data-editor-requires-character>Find outfits</button><button type="button" class="menu_button" data-editor-import data-editor-requires-character>Import folder names</button><input type="file" webkitdirectory multiple data-editor-files hidden></div>
    <p class="prome-help">Find outfits checks common names. Import folder names reads custom names from your character’s sprite folder. No images are uploaded.</p>
    <p data-editor-status class="prome-editor-status" role="status"></p><p data-editor-empty>No active character.</p><div data-editor-colors class="ig-editor-colors"></div><div data-editor-list class="prome-outfit-editor-list"></div>
    <form data-editor-add class="prome-outfit-add"><h4>Add an outfit</h4><label>Sprite folder<input class="text_pole" data-editor-folder required maxlength="200" placeholder="Nerys/outfit3"></label><label>Display name<input class="text_pole" data-editor-label maxlength="80" placeholder="Pyjamas"></label><button type="submit" class="menu_button" data-editor-requires-character>Add folder</button></form>
    <small class="prome-help">Renaming changes the display label. Hiding and removing entries keep the files on disk. Hidden outfits remain available through existing Quick Replies; removed entries stay excluded from automatic discovery.</small></div>`;
    document.body.append(dialog);
    dialog.querySelector('[data-editor-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
    dialog.querySelector('[data-editor-character]').addEventListener('change',event=>{selected=event.target.value;render();status('');});
    dialog.querySelector('[data-editor-scan]').addEventListener('click',async()=>{
        const c=character();if(!c||scanBusy)return;scanBusy=true;render();status('Checking existing sprite folders…');
        try {const result=await discoverOutfits(c,services.currentFolder(c),true);status(`Found ${result.found} outfit folders.${result.failed?' Some folders could not be checked; you can retry.':''}`);}
        finally {scanBusy=false;render();}
    });
    const files=dialog.querySelector('[data-editor-files]');
    dialog.querySelector('[data-editor-import]').addEventListener('click',()=>files.click());
    files.addEventListener('change',()=>{const c=character();if(!c)return;const count=importFolderNames(c,files.files,services.currentFolder(c));status(`Added ${count} folders. Select the character’s sprites folder if no names were found.`);files.value='';render();});
    dialog.querySelector('[data-editor-add]').addEventListener('submit',event=>{
        event.preventDefault();const c=character();if(!c)return;
        const field=dialog.querySelector('[data-editor-folder]'),label=dialog.querySelector('[data-editor-label]');
        if(!validFolder(field.value)){status('Enter a valid sprite folder.');return;}
        const folder=cleanFolder(field.value);
        const added=rememberOutfit(c,folder,{label:label.value,explicit:true});
        if(!added&&label.value.trim())editOutfit(c.avatar,folder,{label:label.value});
        status(added?'Outfit added. Select it on the Sheld to wear it.':'This folder is already in the library.');field.value=label.value='';render();
    });
    onCatalogChange(()=>{if(dialog.open&&!dialog.contains(document.activeElement))render();});
}
