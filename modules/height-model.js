// SPDX-License-Identifier: AGPL-3.0-only
export function bounded(value,min,max,fallback) {
    if(value===''||value==null)return fallback;
    const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const hasFineTuning=profile=>own(profile,'fineTuneOffset')||own(profile,'fineTunePercent');
export const REFERENCE_HEIGHT_CM=165;
export function sharedHeightProfile(desktop={},visual={}) {
    return {...visual,heightCm:bounded(desktop.heightCm,30,300,bounded(visual.heightCm,30,300,REFERENCE_HEIGHT_CM))};
}
export function resetAllFineTuning(settings,avatars=[]) {
    for(const key of ['heightProfiles','mobileHeightProfiles']){
        const map=settings[key]||={};
        for(const avatar of new Set([...Object.keys(map),...avatars])){
            const profile=Object.prototype.hasOwnProperty.call(map,avatar)?{...map[avatar]}:{};
            profile.fineTuneOffset=0;delete profile.fineTunePercent;
            Object.defineProperty(map,avatar,{value:profile,writable:true,configurable:true,enumerable:true});
        }
    }
    settings.heightSchemaVersion=Math.max(3,Number(settings.heightSchemaVersion)||0);
}
export function outfitHeightOverride(value) {
    if(value===''||value==null)return null;
    const n=Number(value);if(!Number.isFinite(n)||n<30||n>300)throw Error('Outfit height must be blank or between 30 and 300 cm.');return n;
}
export function withOutfitHeight(profile={},outfit={}) {
    const override=outfitHeightOverride(outfit.heightOverrideCm);
    return override===null?profile:{...profile,heightCm:override};
}
export function heightFactor(profile={},reference=REFERENCE_HEIGHT_CM) {
    const fine=bounded(profile.fineTuneOffset,-99,7900,0);
    // The caller supplies the selected visible/group height reference.
    return Math.min(8,Math.max(.01,bounded(profile.heightCm,30,300,REFERENCE_HEIGHT_CM)/bounded(reference,30,300,REFERENCE_HEIGHT_CM)*(1+fine/100)));
}
export function tallestHeight(profiles,avatars) {
    return avatars.length?Math.max(30,...avatars.map(avatar=>bounded(own(profiles,avatar)?profiles[avatar]?.heightCm:null,30,300,REFERENCE_HEIGHT_CM))):REFERENCE_HEIGHT_CM;
}
export function legacyHeightFactor(profile={},mode='manual',reference=180,outfit='') {
    const relative=mode==='cm'?bounded(profile.heightCm,30,300,reference)/bounded(reference,30,300,180):mode==='percent'?bounded(profile.heightPercent,10,300,100)/100:1;
    const outfitScale=own(profile.outfits,outfit)?profile.outfits[outfit]?.calibrationPercent:100;
    return Math.min(8,Math.max(.01,bounded(profile.scalePercent,10,300,100)/100*relative*bounded(profile.calibrationPercent,10,300,100)/100*bounded(outfitScale,10,300,100)/100));
}
export function migrateHeightSettings(settings,avatars=[],folders={}) {
    if(settings.heightSchemaVersion>=2)return false;
    const desktop=settings.heightProfiles||{},mobile=settings.mobileHeightProfiles||{};
    // An offset proves the modern model has already been used. A missing
    // marker must not synthesize compensation for other or absent profiles.
    const modernEvidence=[...Object.values(desktop),...Object.values(mobile)].some(p=>p&&own(p,'fineTuneOffset'));
    const legacyTuning=p=>['scalePercent','heightPercent','calibrationPercent','outfits'].some(key=>own(p,key));
    // Retain all old fields and outfit calibrations before simplifying the UI.
    settings.heightProfilesV1Backup ||= structuredClone({heightProfiles:desktop,mobileHeightProfiles:mobile,heightMode:settings.heightMode,referenceHeightCm:settings.referenceHeightCm,scaleSprites:settings.scaleSprites,maxSpriteScale:settings.maxSpriteScale,layoutSpriteScale:settings.layoutSpriteScale,mobileLayoutSettings:settings.mobileLayoutSettings});
    const heights=Object.create(null);
    for(const avatar of new Set([...Object.keys(desktop),...Object.keys(mobile),...avatars])){
        const p=own(desktop,avatar)?desktop[avatar]:own(mobile,avatar)?mobile[avatar]:{};
        heights[avatar]={heightCm:bounded(p?.heightCm,30,300,hasFineTuning(p)||modernEvidence&&!legacyTuning(p)?REFERENCE_HEIGHT_CM:settings.heightMode==='percent'?180*bounded(p?.heightPercent,10,300,100)/100:180)};
    }
    const tallest=avatars.length?tallestHeight(heights,avatars):180;
    for(const [key,map] of [['heightProfiles',desktop],['mobileHeightProfiles',mobile]]) {
        const next={};
        for(const avatar of new Set([...Object.keys(map),...Object.keys(heights)])){
            const old=own(map,avatar)?map[avatar]:{},height=heights[avatar]?.heightCm||180;
            // A missing/older marker must not reinterpret an already converted
            // profile or turn an explicit zero into height compensation again.
            if(hasFineTuning(old)||modernEvidence&&!legacyTuning(old)||(!own(map,avatar)&&(hasFineTuning(own(desktop,avatar)?desktop[avatar]:null)||hasFineTuning(own(mobile,avatar)?mobile[avatar]:null)))){
                const profile=hasFineTuning(old)?{...old,heightCm:height}:{heightCm:height,fineTuneOffset:0};
                Object.defineProperty(next,avatar,{value:profile,writable:true,enumerable:true,configurable:true});continue;
            }
            const fine=legacyHeightFactor(old,settings.heightMode,settings.referenceHeightCm,folders[avatar]||'')/(height/tallest)*100;
            Object.defineProperty(next,avatar,{value:{heightCm:height,fineTunePercent:fine},writable:true,enumerable:true,configurable:true});
        }
        settings[key]=next;
    }
    const base=settings.scaleSprites?bounded(settings.maxSpriteScale,.1,2,1):1;
    settings.layoutSpriteScale=bounded(settings.layoutSpriteScale,10,300,100)*base;
    (settings.mobileLayoutSettings||={}).layoutSpriteScale=bounded(settings.mobileLayoutSettings.layoutSpriteScale,10,300,100)*base;
    settings.scaleSprites=false;settings.heightMode='cm';settings.heightSchemaVersion=2;
    return true;
}
export function migrateFineTuning(settings) {
    if(settings.heightSchemaVersion>=3)return false;
    settings.heightProfilesV2Backup ||= structuredClone({heightProfiles:settings.heightProfiles||{},mobileHeightProfiles:settings.mobileHeightProfiles||{}});
    for(const key of ['heightProfiles','mobileHeightProfiles'])for(const profile of Object.values(settings[key]||{})){
        if(!profile||typeof profile!=='object')continue;
        const offset=own(profile,'fineTuneOffset')?bounded(profile.fineTuneOffset,-99,7900,0):bounded(profile.fineTunePercent,1,8000,100)-100;
        profile.fineTuneOffset=Math.round(offset*1000000)/1000000;
        delete profile.fineTunePercent;
    }
    settings.heightSchemaVersion=3;
    return true;
}
