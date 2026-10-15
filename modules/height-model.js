// SPDX-License-Identifier: AGPL-3.0-only
export function bounded(value,min,max,fallback) {
    if(value===''||value==null)return fallback;
    const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
export function heightFactor(profile={},tallestCm=180) {
    return Math.min(8,Math.max(.01,bounded(profile.heightCm,30,300,180)/bounded(tallestCm,30,300,180)*bounded(profile.fineTunePercent,1,8000,100)/100));
}
export function tallestHeight(profiles,avatars) {
    return avatars.length?Math.max(30,...avatars.map(avatar=>bounded(own(profiles,avatar)?profiles[avatar]?.heightCm:null,30,300,180))):180;
}
export function legacyHeightFactor(profile={},mode='manual',reference=180,outfit='') {
    const relative=mode==='cm'?bounded(profile.heightCm,30,300,reference)/bounded(reference,30,300,180):mode==='percent'?bounded(profile.heightPercent,10,300,100)/100:1;
    const outfitScale=own(profile.outfits,outfit)?profile.outfits[outfit]?.calibrationPercent:100;
    return Math.min(8,Math.max(.01,bounded(profile.scalePercent,10,300,100)/100*relative*bounded(profile.calibrationPercent,10,300,100)/100*bounded(outfitScale,10,300,100)/100));
}
export function migrateHeightSettings(settings,avatars=[],folders={}) {
    if(settings.heightSchemaVersion>=2)return false;
    const desktop=settings.heightProfiles||{},mobile=settings.mobileHeightProfiles||{};
    // Retain all old fields and outfit calibrations before simplifying the UI.
    settings.heightProfilesV1Backup ||= structuredClone({heightProfiles:desktop,mobileHeightProfiles:mobile,heightMode:settings.heightMode,referenceHeightCm:settings.referenceHeightCm,scaleSprites:settings.scaleSprites,maxSpriteScale:settings.maxSpriteScale,layoutSpriteScale:settings.layoutSpriteScale,mobileLayoutSettings:settings.mobileLayoutSettings});
    const heights=Object.create(null);
    for(const avatar of new Set([...Object.keys(desktop),...Object.keys(mobile),...avatars])){
        const p=own(desktop,avatar)?desktop[avatar]:own(mobile,avatar)?mobile[avatar]:{};
        heights[avatar]={heightCm:bounded(p?.heightCm,30,300,settings.heightMode==='percent'?180*bounded(p?.heightPercent,10,300,100)/100:180)};
    }
    const tallest=avatars.length?tallestHeight(heights,avatars):180;
    for(const [key,map] of [['heightProfiles',desktop],['mobileHeightProfiles',mobile]]) {
        const next={};
        for(const avatar of new Set([...Object.keys(map),...Object.keys(heights)])){
            const old=own(map,avatar)?map[avatar]:{},height=heights[avatar]?.heightCm||180;
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
