import test from 'node:test';
import assert from 'node:assert/strict';
import { heightFactor, tallestHeight, migrateHeightSettings, migrateFineTuning, legacyHeightFactor } from '../modules/height-model.js';

test('centimeters use the tallest active reference before signed fine tuning',()=>{
    const short={heightCm:150,fineTuneOffset:0},tall={heightCm:200,fineTuneOffset:0};
    assert.equal(heightFactor(short),150/165);
    assert.ok(Math.abs(heightFactor(short)/heightFactor(tall)-.75)<1e-12);
    assert.equal(heightFactor(short,150),1);
    assert.equal(heightFactor(short,200),.75);
    assert.equal(tallestHeight({a:short,b:tall},['a','b']),200);
    assert.equal(tallestHeight({a:short,b:tall},['a']),150);
    assert.ok(Math.abs(heightFactor({...short,fineTuneOffset:10})-(150/165)*1.1)<1e-12);
    assert.equal(heightFactor({heightCm:180,fineTuneOffset:75},180),1.75);
    assert.equal(heightFactor({heightCm:180,fineTuneOffset:-35},180),.65);
});
test('unset character heights default to 165 cm without replacing saved heights',()=>{
    assert.equal(heightFactor(),1);
    assert.equal(tallestHeight({},[]),165);
    assert.equal(tallestHeight({},['new.png']),165);
    assert.equal(tallestHeight({saved:{heightCm:150}},['saved','new.png']),165);
    assert.equal(tallestHeight({saved:{heightCm:180}},['saved','new.png']),180);
});
test('legacy height migration retains backups and independent device adjustments',()=>{
    const settings={heightMode:'cm',referenceHeightCm:180,scaleSprites:true,maxSpriteScale:1.2,layoutSpriteScale:90,mobileLayoutSettings:{layoutSpriteScale:60},heightProfiles:{a:{heightCm:150,scalePercent:110,calibrationPercent:95,outfits:{'A/two':{calibrationPercent:105}}},b:{heightCm:190,scalePercent:100}},mobileHeightProfiles:{a:{heightCm:150,scalePercent:75},b:{heightCm:190,scalePercent:85}}};
    const original=structuredClone(settings),folders={a:'A/two'};
    assert.equal(migrateHeightSettings(settings,['a','b'],folders),true);
    const reference=tallestHeight(settings.heightProfiles,['a','b']);
    for(const key of ['heightProfiles','mobileHeightProfiles'])for(const avatar of ['a','b']){
        const before=legacyHeightFactor(original[key][avatar],original.heightMode,180,folders[avatar])*original.maxSpriteScale;
        const oldFit=key==='heightProfiles'?original.layoutSpriteScale:original.mobileLayoutSettings.layoutSpriteScale;
        const fit=key==='heightProfiles'?settings.layoutSpriteScale:settings.mobileLayoutSettings.layoutSpriteScale;
        const v2=settings[key][avatar];assert.ok(Math.abs(v2.heightCm/reference*v2.fineTunePercent/100*fit-before*oldFit)<1e-8);
    }
    assert.deepEqual(settings.heightProfilesV1Backup.heightProfiles,original.heightProfiles);
    const v2=structuredClone(settings);assert.equal(migrateFineTuning(settings),true);
    assert.deepEqual(settings.heightProfilesV2Backup.heightProfiles,v2.heightProfiles);
    const migrated=structuredClone(settings);
    assert.equal(migrateHeightSettings(settings,['a','b'],folders),false);assert.equal(migrateFineTuning(settings),false);assert.deepEqual(settings,migrated);
});
test('0.1.2 multipliers become signed adjustments without resetting either layout',()=>{
    const s={heightSchemaVersion:2,heightProfiles:{a:{heightCm:145,fineTunePercent:100},b:{heightCm:180,fineTunePercent:120}},mobileHeightProfiles:{a:{heightCm:145,fineTunePercent:75},b:{heightCm:180,fineTunePercent:140}},layoutSpriteScale:110,mobileLayoutSettings:{layoutSpriteScale:85}};
    migrateFineTuning(s);assert.equal(s.heightProfiles.a.fineTuneOffset,0);assert.equal(s.heightProfiles.b.fineTuneOffset,20);assert.equal(s.mobileHeightProfiles.a.fineTuneOffset,-25);assert.equal(s.mobileHeightProfiles.b.fineTuneOffset,40);
    assert.equal(s.heightProfiles.a.heightCm,145);assert.equal(s.layoutSpriteScale,110);assert.equal(s.mobileLayoutSettings.layoutSpriteScale,85);assert.equal(s.heightSchemaVersion,3);
});
test('special avatar IDs do not change prototypes during height migration',()=>{
    const s=JSON.parse('{"heightProfiles":{"__proto__":{"heightCm":160,"scalePercent":80}},"mobileHeightProfiles":{},"heightMode":"manual"}');
    migrateHeightSettings(s,['__proto__']);migrateFineTuning(s);assert.equal(Object.getPrototypeOf(s.heightProfiles),Object.prototype);assert.equal(s.heightProfiles.__proto__.heightCm,160);assert.equal({}.heightCm,undefined);
});
test('global calibration can preserve the full previous combination of scales',()=>{
    for(const [fit,base,expected] of [[300,2,600],[10,.1,1]]){
        const s={layoutSpriteScale:fit,mobileLayoutSettings:{layoutSpriteScale:fit},scaleSprites:true,maxSpriteScale:base,heightProfiles:{},mobileHeightProfiles:{}};
        migrateHeightSettings(s,['a']);migrateFineTuning(s);assert.equal(s.layoutSpriteScale,expected);assert.equal(s.mobileLayoutSettings.layoutSpriteScale,expected);assert.equal(s.scaleSprites,false);
    }
});
