// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome; simplified height editor by ImmersiveGroups.
import { mobileLayout, editingLayout, layoutSettings } from './responsive.js';
import { getContext, extension_settings } from '../../../../extensions.js';
import { saveSettingsDebounced, eventSource, event_types } from '../../../../../script.js';
import { extensionName } from '../constants.js';
import { bounded, heightFactor, tallestHeight, migrateHeightSettings, migrateFineTuning, REFERENCE_HEIGHT_CM, withOutfitHeight } from './height-model.js';
export { bounded } from './height-model.js';

const owns=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const config=()=>extension_settings[extensionName];
const el=id=>document.getElementById(id);
function profileMap(layout=mobileLayout()?'mobile':'desktop'){return layout==='mobile'?config().mobileHeightProfiles:config().heightProfiles;}
export function profileFor(avatar,layout){const map=profileMap(layout);return owns(map,avatar)?map[avatar]:{};}
export function profileFactor(profile={},reference){return heightFactor(profile,reference);}
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
function activeFolder(character){
    const stem=character.avatar.replace(/\.[^/.]+$/,'');
    return extension_settings.expressionOverrides?.find(e=>e.name===stem)?.path||character.name;
}
function effectiveProfile(character,layout,folder=activeFolder(character)){
    const entry=config().outfitCatalog?.[character.avatar]?.outfits?.find(o=>o.folder===folder);
    try{return withOutfitHeight(profileFor(character.avatar,layout),entry);}catch{return profileFor(character.avatar,layout);}
}
function activeReference(){const characters=groupCharacters();return tallestHeight(Object.fromEntries(characters.map(c=>[c.avatar,effectiveProfile(c,'desktop')])),characters.map(c=>c.avatar));}
export function spriteProfileFactor(node){
    if(!config().enableHeightProfiles)return 1;
    const character=characterFor(node);if(!character)return 1;
    return heightFactor(effectiveProfile(character),activeReference());
}
export function spriteProfileOffset(node){const c=characterFor(node);return c?bounded(profileFor(c.avatar).offsetY,-1000,1000,0):0;}
function scopeKey(){const c=getContext();return c.groupId!=null?`group:${c.groupId}`:`solo:${c.characters?.[c.characterId]?.avatar||''}`;}
export function selectProfileCharacter(avatar){const picker=el('prome-profile-character');if(picker&&[...picker.options].some(option=>option.value===avatar)&&picker.value!==avatar){picker.value=avatar;picker.dispatchEvent(new Event('change',{bubbles:true}));}}
function selectedCharacter(){return groupCharacters().find(c=>c.avatar===el('prome-profile-character')?.value);}
let applyScaleCallback=()=>{},timer;
function scheduleRefresh(){clearTimeout(timer);timer=setTimeout(()=>{applyScaleCallback();refreshProfileEditor();},100);}
function rememberSelection(){Object.defineProperty(config().heightEditorSelections,scopeKey(),{value:{avatar:el('prome-profile-character').value},writable:true,enumerable:true,configurable:true});saveSettingsDebounced();}
export function refreshProfileEditor(force=false){
    const picker=el('prome-profile-character');if(!picker)return;
    if(!force&&document.activeElement?.closest('#prome-profile-fields'))return;
    const before=picker.value;
    const characters=groupCharacters(),signature=JSON.stringify([scopeKey(),characters.map(c=>[c.avatar,c.name])]);
    if(picker.dataset.signature!==signature){
        const saved=config().heightEditorSelections[scopeKey()]?.avatar;
        const previous=picker.dataset.scope===scopeKey()?picker.value:saved;
        picker.replaceChildren(...characters.map(c=>new Option(c.name,c.avatar)));
        picker.value=characters.some(c=>c.avatar===previous)?previous:characters[0]?.avatar||'';
        picker.dataset.signature=signature;picker.dataset.scope=scopeKey();
    }
    el('prome-profile-fields').disabled=!selectedCharacter();loadFields();
    if(before!==picker.value)window.dispatchEvent(new CustomEvent('ig-character-selection',{detail:picker.value}));
}
function loadFields(){
    const character=selectedCharacter();if(!character){el('prome-profile-preview').textContent='Open a character or group chat to adjust heights.';return;}
    const profile=profileFor(character.avatar,editingLayout()),height=profileFor(character.avatar,'desktop').heightCm||REFERENCE_HEIGHT_CM,fine=profile.fineTuneOffset??0;
    el('prome-profile-cm').value=height;
    const range=el('prome-profile-fine-slider');range.value=Math.max(-20,Math.min(20,fine));
    el('prome-profile-fine').value=Math.round(fine*100)/100;
    el('prome-profiles-enabled').checked=Boolean(config().enableHeightProfiles);
    el('prome-profile-y').value=profile.offsetY||0;el('prome-profile-y-slider').value=profile.offsetY||0;
    const reference=activeReference(),effective=effectiveProfile(character,editingLayout()),visualHeight=effective.heightCm||height;
    const base=config().scaleSprites?Number(config().maxSpriteScale)||1:1;
    const usingHeights=Boolean(config().enableHeightProfiles);
    const factor=(usingHeights?heightFactor({...profile,heightCm:visualHeight},reference):1)*Number(layoutSettings(editingLayout()).layoutSpriteScale||100)*base;
    el('prome-profiles-enabled').checked=Boolean(config().enableHeightProfiles);
    el('prome-profile-preview').textContent=`Tallest reference: ${reference} cm. ${character.name}${visualHeight!==height?' (outfit height override)':''}: ${usingHeights?Math.round(visualHeight/reference*100):100}% height × ${usingHeights?Math.round((1+fine/100)*10000)/100:100}% fine × ${layoutSettings(editingLayout()).layoutSpriteScale||100}% fit × ${Math.round(base*100)}% legacy = ${Math.round(factor)}% of the sprite frame${config().enableHeightProfiles?'':' (height scaling off)'}.`;
    el('prome-fine-range-status').textContent=Math.abs(fine)>20?`Typed adjustment: ${fine>0?'+':''}${Math.round(fine*100)/100}%. The slider stays within −20% to +20%.`:'Slider: −20% to +20%. Type a larger adjustment if needed; 0% leaves the scale unchanged.';
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
    if(migrateFineTuning(s))saveSettingsDebounced();
    el('prome-profiles-enabled').addEventListener('change',event=>{s.enableHeightProfiles=event.target.checked;saveSettingsDebounced();applyScale();loadFields();});
    el('prome-profile-character').addEventListener('change',()=>{rememberSelection();loadFields();window.dispatchEvent(new CustomEvent('ig-character-selection',{detail:el('prome-profile-character').value}));});
    el('prome-profile-cm').addEventListener('change',event=>writeProfile('heightCm',bounded(event.target.value,30,300,REFERENCE_HEIGHT_CM)));
    el('prome-profile-fine').addEventListener('change',event=>writeProfile('fineTuneOffset',bounded(event.target.value,-99,7900,0)));
    el('prome-profile-fine-slider').addEventListener('input',event=>writeProfile('fineTuneOffset',Number(event.target.value)));
    el('prome-profile-y').addEventListener('change',event=>writeProfile('offsetY',bounded(event.target.value,-1000,1000,0)));
    el('prome-profile-y-slider').addEventListener('input',event=>writeProfile('offsetY',Number(event.target.value)));
    el('prome-profile-reset').addEventListener('click',()=>writeProfile('fineTuneOffset',0));
    for(const name of ['CHAT_CHANGED','GROUP_UPDATED','CHARACTER_MESSAGE_RENDERED','MESSAGE_SWIPED','SETTINGS_UPDATED'])if(event_types[name])eventSource.on(event_types[name],scheduleRefresh);
    new MutationObserver(records=>{if(records.some(r=>r.target?.closest?.('#visual-novel-wrapper,#expression-wrapper,#ig-mobile-sprites')))scheduleRefresh();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    el('prome-height-profile-editor').addEventListener('focusout',scheduleRefresh);
    window.addEventListener('ig-scene-library-change',scheduleRefresh);
    window.addEventListener('ig-editor-layout-change',()=>refreshProfileEditor(true));
    window.addEventListener('ig-layout-change',()=>{applyScale();refreshProfileEditor();});
    window.addEventListener('resize',applyScale.bind(null,null));window.visualViewport?.addEventListener('resize',applyScale.bind(null,null));
    refreshProfileEditor(true);applyScale();
}
