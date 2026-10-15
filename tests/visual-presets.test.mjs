import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSettings} from '../constants.js';
import {captureVisualProfile,applyVisualProfile,exportVisualSettings,validateVisualImport} from '../modules/visual-presets.js';
test('visual exports only include whitelisted layout fields and corrections',()=>{
    const s={...structuredClone(defaultSettings),chat:[{mes:'private'}],apiKey:'secret',backgroundDescriptions:{a:'notes'},heightProfiles:{a:{heightCm:145,fineTuneOffset:9,offsetY:-12}},mobileHeightProfiles:{a:{heightCm:145,fineTuneOffset:-4}},mobileLayoutSettings:{stageOffsetX:15}};
    const exported=exportVisualSettings(s),text=JSON.stringify(exported);
    assert.equal(text.includes('private'),false);assert.equal(text.includes('secret'),false);assert.equal(text.includes('notes'),false);assert.equal(text.includes('heightCm'),false);
    assert.equal(exported.desktop.corrections.a.fineTuneOffset,9);assert.equal(exported.mobile.settings.stageOffsetX,15);
    const validated=validateVisualImport(exported),target=structuredClone(s);target.heightProfiles.a.heightCm=190;
    applyVisualProfile(target,'desktop',validated.desktop);assert.equal(target.heightProfiles.a.heightCm,190);assert.equal(target.mobileLayoutSettings.stageOffsetX,15);
});
test('preset import validates every profile before callers mutate settings',()=>{
    const data=exportVisualSettings(defaultSettings);data.mobile.settings.layoutSpriteScale=Infinity;
    assert.throws(()=>validateVisualImport(data),/layoutSpriteScale/);
    data.mobile.settings.layoutSpriteScale=100;data.desktop.settings.stageFlow='invalid';assert.throws(()=>validateVisualImport(data),/stageFlow/);
});
test('special preset and character names stay own properties',()=>{
    const s=structuredClone(defaultSettings),profile=captureVisualProfile(s,'desktop');profile.corrections=JSON.parse('{"__proto__":{"fineTuneOffset":5,"offsetY":8}}');
    applyVisualProfile(s,'desktop',profile);assert.equal({}.fineTuneOffset,undefined);assert.equal(s.heightProfiles.__proto__.offsetY,8);
    const data=exportVisualSettings(s);Object.defineProperty(data.presets,'__proto__',{value:profile,enumerable:true});const imported=validateVisualImport(data);assert.equal(Object.hasOwn(imported.presets,'__proto__'),true);assert.equal(Object.getPrototypeOf(imported.presets),Object.prototype);
});
