import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateSettings, findLegacyConflicts } from '../modules/migration.js';

test('imports both legacy settings without altering their backups',()=>{
    const oldScene={enableVN_UI:true,heightProfiles:{'a.png':{scalePercent:84}},outfitCatalog:{'a.png':{locked:true,outfits:[{folder:'A/one',description:'Scene'}]}}};
    const oldGallery={generalAssignments:{bed:{path:'user/images/general/bed.png',characterBindings:['a.png']}},prompt:{enabled:true},limits:{repeatEnabled:true,cooldownRounds:2}};
    const settings={'Prome-VN-Extension':oldScene,'SillyTavern-LocalImage':oldGallery};const before=JSON.stringify(settings);
    const result=migrateSettings(settings);assert.equal(result.changed,true);assert.deepEqual(result.settings.gallery,oldGallery);assert.deepEqual(result.settings.heightProfiles,oldScene.heightProfiles);
    assert.equal(JSON.stringify({'Prome-VN-Extension':oldScene,'SillyTavern-LocalImage':oldGallery}),before);
    result.settings.heightProfiles['a.png'].scalePercent=120;result.settings.gallery.generalAssignments.bed.characterBindings.push('b.png');assert.equal(oldScene.heightProfiles['a.png'].scalePercent,84);assert.deepEqual(oldGallery.generalAssignments.bed.characterBindings,['a.png']);
});
test('migration is idempotent and existing combined preferences win',()=>{
    const settings={ImmersiveGroups:{stageFontSize:16},'Prome-VN-Extension':{stageFontSize:13,stageGap:5}};
    const first=migrateSettings(settings);assert.equal(first.settings.stageFontSize,16);assert.equal(first.settings.stageGap,5);
    settings['Prome-VN-Extension'].stageGap=11;const second=migrateSettings(settings);assert.equal(second.changed,false);assert.equal(second.settings.stageGap,5);
});
test('fresh install has an independent gallery and leaves native settings alone',()=>{
    const settings={disabledExtensions:['third-party/Other'],expressionOverrides:[{name:'A',path:'A/outfit1'}]};const result=migrateSettings(settings);assert.deepEqual(result.settings.gallery,{});assert.deepEqual(settings.expressionOverrides,[{name:'A',path:'A/outfit1'}]);assert.deepEqual(settings.disabledExtensions,['third-party/Other']);
});
test('new scene setups use the current height schema; existing profiles still migrate',()=>{
    assert.equal(migrateSettings({}).settings.heightSchemaVersion,3);
    assert.equal(migrateSettings({'SillyTavern-LocalImage':{enabled:true}}).settings.heightSchemaVersion,3);
    assert.equal(migrateSettings({'Prome-VN-Extension':{heightProfiles:{a:{scalePercent:75}}}}).settings.heightSchemaVersion,undefined);
    const settings={ImmersiveGroups:{schemaVersion:1,heightSchemaVersion:2,heightProfiles:{a:{heightCm:180}}}};
    assert.equal(migrateSettings(settings).settings.heightSchemaVersion,2);
    assert.equal(settings.ImmersiveGroups.heightProfiles.a.heightCm,180);
});
test('special gallery/character names stay own properties',()=>{
    const old=JSON.parse('{"heightProfiles":{"__proto__":{"scalePercent":75}},"__proto__":{"custom":true}}');const settings={'Prome-VN-Extension':old};const {settings:root}=migrateSettings(settings);assert.equal(Object.getPrototypeOf(root),Object.prototype);assert.equal(root.heightProfiles.__proto__.scalePercent,75);assert.equal({}.custom,undefined);
});
test('detects enabled old/renamed copies but accepts disabled copies and self',()=>{
    const names=['third-party/ImmersiveGroups','third-party/Prome-VN-Extension','third-party/SillyTavern-LocalImage','third-party/MyGalleryFork'];
    const manifestFor=name=>name.endsWith('MyGalleryFork')?{display_name:'ImmersiveGroups Gallery'}:null;
    assert.deepEqual(findLegacyConflicts(names,['third-party/Prome-VN-Extension'],'third-party/ImmersiveGroups',manifestFor),['third-party/SillyTavern-LocalImage','third-party/MyGalleryFork']);
});
