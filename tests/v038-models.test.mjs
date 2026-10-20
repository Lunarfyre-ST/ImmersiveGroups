// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { sharedHeightProfile,resetAllFineTuning,heightFactor,migrateHeightSettings,migrateFineTuning } from '../modules/height-model.js';
import { speakerOrder,recentCharacters } from '../modules/speaker-model.js';
import { motionFrames } from '../modules/motion-model.js';
import { captureCharacterBundle } from '../modules/character-transfer-model.js';
test('shared centimeter height prevents old mobile values inflating an otherwise reset character',()=>{
 const desktop={heightCm:155,fineTuneOffset:0},mobile={heightCm:180,fineTuneOffset:0,offsetY:12};
 assert.ok(heightFactor(mobile,155)>1.16);assert.equal(heightFactor(sharedHeightProfile(desktop,mobile),155),1);assert.equal(sharedHeightProfile(desktop,mobile).offsetY,12);assert.equal(mobile.heightCm,180);
});
test('reset all clears both profiles and legacy multipliers without changing heights, offsets or backups',()=>{
 const s={heightSchemaVersion:3,heightProfiles:{a:{heightCm:155,fineTuneOffset:9.09,offsetY:12}},mobileHeightProfiles:{a:{heightCm:180,fineTuneOffset:116,fineTunePercent:109.09,offsetY:-7}},heightProfilesV2Backup:{saved:true}};
 resetAllFineTuning(s,['a','b']);for(const map of [s.heightProfiles,s.mobileHeightProfiles]){assert.equal(map.a.fineTuneOffset,0);assert.equal(map.b.fineTuneOffset,0);assert.equal(map.a.fineTunePercent,undefined);}assert.equal(s.heightProfiles.a.heightCm,155);assert.equal(s.mobileHeightProfiles.a.offsetY,-7);assert.deepEqual(s.heightProfilesV2Backup,{saved:true});
 delete s.heightSchemaVersion;migrateHeightSettings(s,['a','b']);migrateFineTuning(s);assert.equal(s.mobileHeightProfiles.a.fineTuneOffset,0);
});
test('modern installation missing its marker does not invent compensation for height-only entries',()=>{
 const s={heightProfiles:{a:{heightCm:165,fineTuneOffset:0},b:{heightCm:155}},mobileHeightProfiles:{},heightMode:'manual'};
 migrateHeightSettings(s,['a','b']);migrateFineTuning(s);assert.equal(s.heightProfiles.b.fineTuneOffset,0);assert.equal(s.mobileHeightProfiles.b.fineTuneOffset,0);
});
test('recent visibility prioritizes the active and latest distinct speakers, with deterministic empty-chat fallback',()=>{
 const c=['a','b','c'].map(avatar=>({avatar,name:avatar})),chat=[{original_avatar:'a'},{original_avatar:'b'},{original_avatar:'b'},{is_user:true,original_avatar:'c'}];
 assert.deepEqual(speakerOrder(chat,c),['b','a']);assert.deepEqual(recentCharacters(chat,c,1).map(c=>c.avatar),['b']);assert.deepEqual(recentCharacters(chat,c,2,'c').map(c=>c.avatar),['b','c']);assert.equal(recentCharacters(chat,c,0).length,3);assert.deepEqual(recentCharacters([],c,2).map(c=>c.avatar),['a','b']);
});
test('mobile full-height pan changes only background positioning and supports reverse',()=>{
 const frames=motionFrames('backgroundPan',{vertical:true,direction:'down',strength:2});assert.deepEqual(frames.map(f=>f.backgroundPosition),['50% 0%','50% 100%']);assert.ok(frames.every(f=>f.scale>1));assert.deepEqual(motionFrames('backgroundPan',{vertical:true,direction:'up',strength:2}),[...frames].reverse());
});
test('export carries the shared centimeter height while preserving independent visual corrections',()=>{
 const s={heightProfiles:{a:{heightCm:155,fineTuneOffset:3}},mobileHeightProfiles:{a:{heightCm:180,fineTuneOffset:-5,offsetY:12}}},before=structuredClone(s);
 const bundle=captureCharacterBundle(s,[{avatar:'a',name:'A'}],['a'],{heights:true});
 assert.equal(bundle.characters[0].height.desktop.heightCm,155);assert.equal(bundle.characters[0].height.mobile.heightCm,155);assert.equal(bundle.characters[0].height.mobile.fineTuneOffset,-5);assert.equal(bundle.characters[0].height.mobile.offsetY,12);assert.deepEqual(s,before);
});
