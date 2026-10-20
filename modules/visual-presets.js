// SPDX-License-Identifier: AGPL-3.0-only
// Explicit visual-only schema: chat content and automation settings never enter exports.
import { defaultSettings } from '../constants.js';
const bounds={recentSpeakerLimit:[0,50],stageFitColumns:[1,8],stageSpeakHeight:[0,80],stageSpeakWidth:[0,400],stageSpeakFontSize:[0,32],stageNameLetters:[1,40],stageControlHeight:[24,56],stageFontSize:[10,22],stageOutfitWidth:[80,260],stageGap:[2,16],stageIdleOpacity:[20,100],spriteSpacingPercent:[20,160],layoutSpriteScale:[1,600],spriteOffsetY:[-1000,1000],stageOffsetX:[-1000,1000],stageOffsetY:[-1000,1000],outfitPopupOffsetX:[-1000,1000],outfitPopupOffsetY:[-1000,1000],outfitMenuRows:[2,12]};
const enums={heightReferenceMode:['visible','group'],stageLayout:['characters','shared'],stageFlow:['scroll','wrap','stack'],stageFadeTarget:['outfits','all','none'],stageSpeakPlacement:['top','bottom'],stageOutfitPlacement:['top','bottom'],stageBackgroundPlacement:['top','bottom']};
const colors=['stageAllOutfitColor'];
const bools=['stageShowAllOutfits','stageAutoFit','stageAbbreviate','stageShowSpeak','stageShowOutfits','stageShowNames','stageShowLocks','stageShowManager','stageShowBackgroundArrows','stageNamesAbove','stageCenterCards'];
export const visualKeys=[...Object.keys(bounds),...Object.keys(enums),...bools,...colors];
const record=o=>Boolean(o&&typeof o==='object'&&!Array.isArray(o));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function validateVisualProfile(input) {
    if(!record(input)||!record(input.settings)||!record(input.corrections))throw new Error('Invalid visual profile.');
    const settings={},corrections={};
    for(const key of visualKeys){
        const value=own(input.settings,key)?input.settings[key]:defaultSettings[key];
        if(bounds[key]){if(typeof value!=='number'||!Number.isFinite(value)||value<bounds[key][0]||value>bounds[key][1])throw new Error(`Invalid ${key}.`);}
        else if(colors.includes(key)){if(typeof value!=='string'||!/^#[a-f0-9]{6}$/i.test(value))throw new Error(`Invalid ${key}.`);}
        else if(enums[key]?!enums[key].includes(value):typeof value!=='boolean')throw new Error(`Invalid ${key}.`);
        settings[key]=value;
    }
    for(const [avatar,p] of Object.entries(input.corrections)){
        if(!record(p)||typeof p.fineTuneOffset!=='number'||!Number.isFinite(p.fineTuneOffset)||p.fineTuneOffset< -99||p.fineTuneOffset>7900||typeof p.offsetY!=='number'||!Number.isFinite(p.offsetY)||Math.abs(p.offsetY)>1000)throw new Error('Invalid character correction.');
        Object.defineProperty(corrections,avatar,{value:{fineTuneOffset:p.fineTuneOffset,offsetY:p.offsetY},enumerable:true,writable:true,configurable:true});
    }
    return {settings,corrections};
}
export function captureVisualProfile(s,layout) {
    const values=layout==='mobile'?{...s,...s.mobileLayoutSettings}:s,profiles=layout==='mobile'?s.mobileHeightProfiles:s.heightProfiles;
    return validateVisualProfile({settings:Object.fromEntries(visualKeys.map(k=>[k,values[k]??defaultSettings[k]])),corrections:Object.fromEntries(Object.entries(profiles||{}).map(([avatar,p])=>[avatar,{fineTuneOffset:p.fineTuneOffset??0,offsetY:p.offsetY??0}]))});
}
export function applyVisualProfile(s,layout,input) {
    const validated=validateVisualProfile(input),target=layout==='mobile'?(s.mobileLayoutSettings||={}):s;
    Object.assign(target,validated.settings);
    const profiles=layout==='mobile'?(s.mobileHeightProfiles||={}):(s.heightProfiles||={});
    for(const [avatar,p] of Object.entries(validated.corrections))Object.defineProperty(profiles,avatar,{value:{...(own(profiles,avatar)?profiles[avatar]:{}),...p},enumerable:true,writable:true,configurable:true});
}
export function exportVisualSettings(s) {
    return {format:'ImmersiveGroups.visual-layouts',version:1,desktop:captureVisualProfile(s,'desktop'),mobile:captureVisualProfile(s,'mobile'),presets:Object.fromEntries(Object.entries(s.layoutPresets||{}).map(([name,p])=>[name,validateVisualProfile(p)]))};
}
export function validateVisualImport(data) {
    if(!record(data)||data.format!=='ImmersiveGroups.visual-layouts'||data.version!==1||!record(data.presets))throw new Error('Choose an ImmersiveGroups visual layout export.');
    const presets={};for(const [name,p] of Object.entries(data.presets)){if(!name.trim()||name.length>80)throw new Error('Invalid preset name.');Object.defineProperty(presets,name,{value:validateVisualProfile(p),enumerable:true,writable:true,configurable:true});}
    return {desktop:validateVisualProfile(data.desktop),mobile:validateVisualProfile(data.mobile),presets};
}
