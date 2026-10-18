// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { MOTION_EFFECTS,MOTION_DEFAULTS,motionValue,motionOptions,motionFrames } from '../modules/motion-model.js';
import { portablePreferences } from '../modules/character-transfer-model.js';
test('all eight motion experiments are opt-in with bounded defaults',()=>{
    assert.equal(MOTION_EFFECTS.length,8);
    for(const effect of MOTION_EFFECTS){const options=motionOptions({},effect.id);assert.equal(options.enabled,false);assert.ok(options.duration>=effect.min&&options.duration<=effect.max);assert.ok(options.strength<=effect.limit);assert.equal(motionValue(`${effect.id}MotionDuration`,Infinity),effect.duration);assert.equal(motionValue(`${effect.id}MotionDuration`,-1),effect.min);assert.equal(motionValue(`${effect.id}MotionStrength`,1e6),effect.limit);}
    assert.equal(motionValue('breathingMotionScope','unknown'),'speaker');assert.equal(motionValue('reactionMotionStyle','injected text'),'hop');assert.equal(motionValue('sceneMotionEnabled','true'),false);assert.equal(motionValue('other','private'),undefined);
});
test('motion frames return to neutral without writing settings or height corrections',()=>{
    const settings={...MOTION_DEFAULTS,heightProfiles:{a:{heightCm:155,fineTuneOffset:0}},mobileHeightProfiles:{a:{heightCm:155,fineTuneOffset:12}}},before=structuredClone(settings);
    for(const id of ['speaking','reaction']){const frames=motionFrames(id,motionOptions(settings,id));assert.deepEqual(frames[0],frames.at(-1));}
    for(const style of ['hop','nod','tilt','shake'])assert.ok(motionFrames('reaction',{strength:8,style}).length>=3);
    const entrance=motionFrames('entrance',{strength:24,style:'slide'}),exit=motionFrames('entrance',{strength:24,style:'slide'},true);assert.equal(entrance[0].opacity,exit.at(-1).opacity);assert.equal(entrance[0].translate,'24px 0px');assert.equal(exit.at(-1).translate,'-24px 0px');
    assert.deepEqual(settings,before);
});
test('background pan provides zoom margin and fixed directions without changing native paths',()=>{
    for(const direction of ['left','right','up','down']){const frames=motionFrames('backgroundPan',{strength:2,direction});assert.ok(frames[0].scale>1);assert.ok(frames[1].scale>frames[0].scale);assert.match(frames[1].translate,/%/);assert.ok(!('backgroundImage' in frames[0]));}
});
test('portable animation preferences remain separate from character heights and recorder state',()=>{
    const preferences=portablePreferences({...MOTION_DEFAULTS,breathingMotionEnabled:true,breathingMotionStrength:1.2,lunarDebugRecording:['private'],heightProfiles:{a:{heightCm:155}}});
    assert.equal(preferences.breathingMotionEnabled,true);assert.equal(preferences.breathingMotionStrength,1.2);assert.equal(preferences.heightProfiles,undefined);assert.equal(preferences.lunarDebugRecording,undefined);
});
