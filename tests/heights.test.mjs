import test from 'node:test';
import assert from 'node:assert/strict';
import { heightFactor, tallestHeight, migrateHeightSettings, legacyHeightFactor } from '../modules/height-model.js';
test('centimeters determine relative heights; fine tuning compensates framing',()=>{
    const profiles={a:{heightCm:150},b:{heightCm:200},unused:{heightCm:300}};
    const tallest=tallestHeight(profiles,['a','b']);assert.equal(tallest,200);
    assert.equal(heightFactor(profiles.a,tallest),.75);assert.equal(heightFactor(profiles.b,tallest),1);
    assert.ok(Math.abs(heightFactor({...profiles.a,fineTunePercent:110},tallest)-.825)<1e-12);
    assert.equal(tallestHeight({},[]),180);
});
test('height migration retains current visual scales and independent mobile fine tuning',()=>{
    const settings={heightMode:'cm',referenceHeightCm:180,scaleSprites:true,maxSpriteScale:1.2,layoutSpriteScale:90,mobileLayoutSettings:{layoutSpriteScale:60},heightProfiles:{a:{heightCm:150,scalePercent:110,calibrationPercent:95,outfits:{'A/two':{calibrationPercent:105}}},b:{heightCm:190,scalePercent:100}},mobileHeightProfiles:{a:{heightCm:150,scalePercent:75},b:{heightCm:190,scalePercent:85}}};
    const original=structuredClone(settings);const folders={a:'A/two'};
    assert.equal(migrateHeightSettings(settings,['a','b'],folders),true);
    const reference=tallestHeight(settings.heightProfiles,['a','b']);
    for(const key of ['heightProfiles','mobileHeightProfiles'])for(const avatar of ['a','b']){
        const before=legacyHeightFactor(original[key][avatar],original.heightMode,180,folders[avatar])*original.maxSpriteScale;
        const oldFit=key==='heightProfiles'?original.layoutSpriteScale:original.mobileLayoutSettings.layoutSpriteScale;
        const fit=key==='heightProfiles'?settings.layoutSpriteScale:settings.mobileLayoutSettings.layoutSpriteScale;
        assert.ok(Math.abs(heightFactor(settings[key][avatar],reference)*fit-before*oldFit)<1e-8);
    }
    assert.deepEqual(settings.heightProfilesV1Backup.heightProfiles,original.heightProfiles);
    const migrated=structuredClone(settings);assert.equal(migrateHeightSettings(settings,['a','b'],folders),false);assert.deepEqual(settings,migrated);
});
test('special avatar IDs do not change prototypes during height migration',()=>{
    const s=JSON.parse('{"heightProfiles":{"__proto__":{"heightCm":160,"scalePercent":80}},"mobileHeightProfiles":{},"heightMode":"manual"}');
    migrateHeightSettings(s,['__proto__']);assert.equal(Object.getPrototypeOf(s.heightProfiles),Object.prototype);assert.equal(s.heightProfiles.__proto__.heightCm,160);assert.equal({}.heightCm,undefined);
});
test('global calibration can preserve the full previous combination of scales',()=>{
    for(const [fit,base,expected] of [[300,2,600],[10,.1,1]]){
        const s={layoutSpriteScale:fit,mobileLayoutSettings:{layoutSpriteScale:fit},scaleSprites:true,maxSpriteScale:base,heightProfiles:{},mobileHeightProfiles:{}};
        migrateHeightSettings(s,['a']);assert.equal(s.layoutSpriteScale,expected);assert.equal(s.mobileLayoutSettings.layoutSpriteScale,expected);assert.equal(s.scaleSprites,false);
    }
});
