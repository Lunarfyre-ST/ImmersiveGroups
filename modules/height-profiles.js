// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome; simplified height editor by ImmersiveGroups.
import { mobileLayout, editingLayout, layoutSettings } from './responsive.js';
import { getContext, extension_settings } from '../../../../extensions.js';
import { saveSettingsDebounced, eventSource, event_types } from '../../../../../script.js';
import { extensionName } from '../constants.js';
import { bounded, heightFactor, tallestHeight, migrateHeightSettings } from './height-model.js';
export { bounded } from './height-model.js';

const owns=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const config=()=>extension_settings[extensionName];
const el=id=>document.getElementById(id);
function profileMap(layout=mobileLayout()?'mobile':'desktop'){return layout==='mobile'?config().mobileHeightProfiles:config().heightProfiles;}
export function profileFor(avatar,layout){const map=profileMap(layout);return owns(map,avatar)?map[avatar]:{};}
export function profileFactor(profile={},tallest=180){return heightFactor(profile,tallest);}
export function packFromSource(src,fallback='') {
    try{const match=new URL(src,window.location.href).pathname.match(/\/characters\/(.+)\/[^/]+$/);return match?decodeURIComponent(match[1]):fallback;}catch{return fallback;}
}
function groupCharacters(){
    const ctx=getContext(),group=ctx.groups?.find(g=>String(g.id)===String(ctx.groupId));
    return group?(group.members||[]).filter(a=>a!=='prome-user'&&!(group.disabled_members||[]).includes(a)).map(a=>ctx.characters?.find(c=>c.avatar===a)).filter(Boolean):[ctx.characters?.[ctx.characterId]].filter(Boolean);
}
function characterFor(node){
    const ctx=getContext();
    const avatar=node.dataset?.avatar||node.id?.replace(/^(?:ig-)?expression-/,'');
    return node.id==='expression-holder'?ctx.characters?.[ctx.characterId]:ctx.characters?.find(c=>c.avatar===avatar);
}
export function spriteProfileFactor(node){
    if(!config().enableHeightProfiles)return 1;
    const character=characterFor(node);if(!character)return 1;
    const tallest=tallestHeight(config().heightProfiles,groupCharacters().map(c=>c.avatar));
    return heightFactor(profileFor(character.avatar),tallest);
}
function scopeKey(){const c=getContext();return c.groupId!=null?`group:${c.groupId}`:`solo:${c.characters?.[c.characterId]?.avatar||''}`;}
function selectedCharacter(){return groupCharacters().find(c=>c.avatar===el('prome-profile-character')?.value);}
let applyScaleCallback=()=>{},timer;
function scheduleRefresh(){clearTimeout(timer);timer=setTimeout(()=>{applyScaleCallback();refreshProfileEditor();},100);}
function rememberSelection(){Object.defineProperty(config().heightEditorSelections,scopeKey(),{value:{avatar:el('prome-profile-character').value},writable:true,enumerable:true,configurable:true});saveSettingsDebounced();}
export function refreshProfileEditor(force=false){
    const picker=el('prome-profile-character');if(!picker)return;
    if(!force&&document.activeElement?.closest('#prome-profile-fields'))return;
    const characters=groupCharacters(),signature=JSON.stringify([scopeKey(),characters.map(c=>[c.avatar,c.name])]);
    if(picker.dataset.signature!==signature){
        const saved=config().heightEditorSelections[scopeKey()]?.avatar;
        const previous=picker.dataset.scope===scopeKey()?picker.value:saved;
        picker.replaceChildren(...characters.map(c=>new Option(c.name,c.avatar)));
        picker.value=characters.some(c=>c.avatar===previous)?previous:characters[0]?.avatar||'';
        picker.dataset.signature=signature;picker.dataset.scope=scopeKey();
    }
    el('prome-profile-fields').disabled=!selectedCharacter();loadFields();
}
function loadFields(){
    const character=selectedCharacter();if(!character){el('prome-profile-preview').textContent='Open a character or group chat to adjust heights.';return;}
    const profile=profileFor(character.avatar,editingLayout()),height=profileFor(character.avatar,'desktop').heightCm||180,fine=profile.fineTunePercent??100;
    el('prome-profile-cm').value=height;
    const range=el('prome-profile-fine-slider');if(document.activeElement!==range){range.min=Math.min(25,fine);range.max=Math.max(200,fine);}range.value=fine;
    el('prome-profile-fine').value=Math.round(fine*100)/100;
    el('prome-profiles-enabled').checked=Boolean(config().enableHeightProfiles);
    const tallest=tallestHeight(config().heightProfiles,groupCharacters().map(c=>c.avatar));
    const base=config().scaleSprites?Number(config().maxSpriteScale)||1:1;
    const factor=(config().enableHeightProfiles?heightFactor({...profile,heightCm:height},tallest):1)*Number(layoutSettings(editingLayout()).layoutSpriteScale||100)*base;
    el('prome-profile-preview').textContent=`Tallest active character: ${tallest} cm. ${character.name}: ${Math.round(factor)}% of the sprite frame${config().enableHeightProfiles?'':' (height scaling off)'}.`;
}
function writeProfile(key,value){
    const c=selectedCharacter();if(!c)return;
    const layout=editingLayout(),profile={...profileFor(c.avatar,layout),[key]:value};
    Object.defineProperty(profileMap(layout),c.avatar,{value:profile,writable:true,enumerable:true,configurable:true});
    // Centimeters describe the character; only visual fine tuning differs by device.
    if(key==='heightCm')for(const other of ['desktop','mobile'])if(other!==layout)Object.defineProperty(profileMap(other),c.avatar,{value:{...profileFor(c.avatar,other),heightCm:value},writable:true,enumerable:true,configurable:true});
    config().enableHeightProfiles=true;
    rememberSelection();applyScaleCallback();loadFields();
}
export function setupHeightProfiles(applyScale){
    applyScaleCallback=applyScale;const s=config();
    for(const key of ['heightProfiles','mobileHeightProfiles','heightEditorSelections'])if(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key]))s[key]={};
    const folders=Object.fromEntries((getContext().characters||[]).map(c=>[c.avatar,extension_settings.expressionOverrides?.find(e=>e.name===c.avatar.replace(/\.[^/.]+$/,''))?.path||c.name]));
    if(migrateHeightSettings(s,groupCharacters().map(c=>c.avatar),folders)){const legacyToggle=el('prome-sprite-scale');if(legacyToggle)legacyToggle.checked=false;saveSettingsDebounced();}
    el('prome-profiles-enabled').addEventListener('change',event=>{s.enableHeightProfiles=event.target.checked;saveSettingsDebounced();applyScale();loadFields();});
    el('prome-profile-character').addEventListener('change',()=>{rememberSelection();loadFields();});
    el('prome-profile-cm').addEventListener('change',event=>writeProfile('heightCm',bounded(event.target.value,30,300,180)));
    el('prome-profile-fine').addEventListener('change',event=>writeProfile('fineTunePercent',bounded(event.target.value,1,8000,100)));
    el('prome-profile-fine-slider').addEventListener('input',event=>writeProfile('fineTunePercent',Number(event.target.value)));
    el('prome-profile-reset').addEventListener('click',()=>writeProfile('fineTunePercent',100));
    for(const name of ['CHAT_CHANGED','GROUP_UPDATED','CHARACTER_MESSAGE_RENDERED','MESSAGE_SWIPED','SETTINGS_UPDATED'])if(event_types[name])eventSource.on(event_types[name],scheduleRefresh);
    new MutationObserver(records=>{if(records.some(r=>r.target?.closest?.('#visual-novel-wrapper,#expression-wrapper,#ig-mobile-sprites')))scheduleRefresh();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    el('prome-height-profile-editor').addEventListener('focusout',scheduleRefresh);
    window.addEventListener('ig-editor-layout-change',()=>refreshProfileEditor(true));
    window.addEventListener('ig-layout-change',()=>{applyScale();refreshProfileEditor();});
    window.addEventListener('resize',applyScale.bind(null,null));window.visualViewport?.addEventListener('resize',applyScale.bind(null,null));
    refreshProfileEditor(true);applyScale();
}
