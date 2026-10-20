import test from 'node:test';
import assert from 'node:assert/strict';
import {commonOutfitMatch,commonOutfitChoices,commonOutfitTargets} from '../modules/common-outfits-model.js';
import {captureCharacterBundle,validateCharacterBundle,applyCharacterBundle} from '../modules/character-transfer-model.js';
import {sceneCommandRejection,allowedSceneCommand,buildSceneInventory} from '../modules/scene-automation-model.js';
import {createImportReviewer} from '../modules/transfer-import-review.js';

test('shared outfit preference resolves only an explicit unique preferred match and preserves locks',()=>{
 const outfits=[{folder:'A/swimsuit',commonName:'swimwear'},{folder:'A/bikini',commonName:'swimwear'}],c={avatar:'a.png',outfits,currentOutfit:'A/main'};
 assert.equal(commonOutfitMatch(outfits,'swimwear'),null);assert.deepEqual(commonOutfitChoices([c]),[]);
 outfits[1].commonPreferred=true;assert.equal(commonOutfitMatch(outfits,'swimwear'),outfits[1]);assert.equal(commonOutfitChoices([c])[0].targets[0].folder,'A/bikini');assert.equal(commonOutfitTargets([c],'swimwear').targets[0].folder,'A/bikini');
 c.outfitLocked=true;assert.deepEqual(commonOutfitTargets([c],'swimwear',{respectLocks:true}).targets,[]);outfits[0].commonPreferred=true;assert.equal(commonOutfitMatch(outfits,'swimwear'),null);
});
test('preferred outfit transfer metadata is typed, optional and selection/policy bounded',()=>{
 const chars=[{avatar:'a.png',name:'A'}],source={outfitCatalog:{'a.png':{outfits:[{folder:'A/swim',label:'Swim',commonName:'swimwear',commonPreferred:true}],ignored:[]}}};
 const bundle=captureCharacterBundle(source,chars,['a.png'],{outfits:true},'Test',[]),before=JSON.stringify(bundle),mapping={'a.png':chars[0]};
 assert.equal(validateCharacterBundle(bundle).characters[0].outfits[0].commonPreferred,true);
 const local={outfitCatalog:{'a.png':{outfits:[{folder:'A/swim',label:'Local',commonPreferred:false}],ignored:[]}}};
 assert.equal(applyCharacterBundle(local,bundle,{mappings:mapping}).settings.outfitCatalog['a.png'].outfits[0].commonPreferred,false);
 assert.equal(applyCharacterBundle(local,bundle,{mappings:mapping,policy:'update'}).settings.outfitCatalog['a.png'].outfits[0].commonPreferred,true);
 delete bundle.characters[0].outfits[0].commonPreferred;local.outfitCatalog['a.png'].outfits[0].commonPreferred=true;assert.equal(applyCharacterBundle(local,bundle,{mappings:mapping,policy:'update'}).settings.outfitCatalog['a.png'].outfits[0].commonPreferred,true);
 bundle.characters[0].outfits[0].commonPreferred='yes';assert.throws(()=>validateCharacterBundle(bundle),/preference/);assert.equal(JSON.stringify(source).includes('yes'),false);assert.ok(before.includes('commonPreferred'));
});
test('automation rejections distinguish locks, scope and unavailability without changing permission decisions',()=>{
 const scene={characters:[{avatar:'a.png',outfitLocked:false,outfits:[{folder:'A/swim',name:'Swim'}]},{avatar:'b.png',outfits:[]}],backgrounds:{library:[]}},settings={enabled:true,scope:'speaker'},command={type:'outfit',avatar:'a.png',folder:'A/swim'},inventory=buildSceneInventory(scene,'a.png',settings);
 assert.equal(sceneCommandRejection(command,inventory,scene,settings),'');assert.equal(allowedSceneCommand(command,inventory,scene,settings),true);
 scene.characters[0].outfitLocked=true;assert.equal(sceneCommandRejection(command,inventory,scene,settings),'locked');scene.characters[0].outfitLocked=false;
 assert.equal(sceneCommandRejection({...command,avatar:'b.png'},inventory,scene,settings),'scope');assert.equal(sceneCommandRejection({...command,folder:'A/missing'},inventory,scene,settings),'unavailable');assert.equal(sceneCommandRejection(command,inventory,scene,{...settings,enabled:false}),'disabled');
});
test('shared outfit preference changes invalidate reviewed import metadata',async()=>{
 const chars=[{avatar:'a.png',name:'A'}],local={outfitCatalog:{'a.png':{outfits:[{folder:'A/swim',label:'Swim',commonName:'swimwear',commonPreferred:false}],ignored:[]}}};
 const source=structuredClone(local);source.outfitCatalog['a.png'].outfits[0].commonPreferred=true;
 const bundle=captureCharacterBundle(source,chars,['a.png'],{outfits:true},'Test',[]),options={mappingValues:{'a.png':'a.png'},overwriteAcknowledged:true,media:false};
 const reviewer=createImportReviewer({characters:()=>chars,settings:()=>local,readFolder:async()=>[],readFile:async()=>{throw Error('No files selected');}}),proof=await reviewer.review(bundle,options);
 assert.ok(proof.rows[0].differences.some(d=>d.field==='commonPreferred'));await reviewer.verify(proof,bundle,options);local.outfitCatalog['a.png'].outfits[0].commonPreferred=true;
 await assert.rejects(reviewer.verify(proof,bundle,options),/changed since review/);
});
