import test from 'node:test';
import assert from 'node:assert/strict';
import { captureCharacterBundle, validateCharacterBundle, applyCharacterBundle } from '../modules/character-transfer-model.js';
import { transferOutfitKey } from '../modules/transfer-outfit-model.js';
import { createImportReviewer } from '../modules/transfer-import-review.js';
import { withOutfitHeight } from '../modules/height-model.js';
import { checkTransferZipIndex } from '../modules/transfer-archive-index.js';
import { safeCardJson } from '../modules/character-card-data.js';
import JSZip from '../vendor/jszip.js';
const characters=[{avatar:'a.png',name:'A'}];
function source(){return {outfitCatalog:{'a.png':{outfits:[{folder:'A/one',label:'First',description:'A coat',heightOverrideCm:145,fontColor:'#112233'},{folder:'A/two',label:'Second',description:'A dress',heightOverrideCm:null}],ignored:[]}}};}
function bundle(){return captureCharacterBundle(source(),characters,['a.png'],{outfits:true,colors:true},'Pack');}
const options=()=>({mappingValues:{'a.png':'a.png'},roots:{'a.png':'A'},categories:{outfits:true,colors:true}});
test('outfit height inheritance and bounds preserve fine tuning without mutating base profiles',()=>{
 const p={heightCm:165,fineTuneOffset:4};assert.equal(withOutfitHeight(p,{heightOverrideCm:null}),p);assert.deepEqual(withOutfitHeight(p,{heightOverrideCm:120}),{heightCm:120,fineTuneOffset:4});assert.equal(p.heightCm,165);for(const bad of [-1,0,301,Infinity,'abc'])assert.throws(()=>withOutfitHeight(p,{heightOverrideCm:bad}));
});
test('outfit heights round trip independently and older bundles do not clear existing overrides',()=>{
 const b=bundle(),mappings={'a.png':characters[0]};assert.equal(b.characters[0].outfits[0].heightOverrideCm,145);let result=applyCharacterBundle({},b,{mappings});assert.equal(result.settings.outfitCatalog['a.png'].outfits[0].heightOverrideCm,145);
 const old=structuredClone(b);delete old.selection.outfitHeights;for(const o of old.characters[0].outfits)delete o.heightOverrideCm;result=applyCharacterBundle(source(),validateCharacterBundle(old),{mappings,policy:'update'});assert.equal(result.settings.outfitCatalog['a.png'].outfits[0].heightOverrideCm,145);
 b.characters[0].outfits[0].heightOverrideCm='150';assert.throws(()=>validateCharacterBundle(b),/height/);
});
test('per-outfit exclusion protects entries, descriptions, order and outfit colors together',()=>{
 const current=source(),b=bundle();b.characters[0].outfits[0].label='Overwrite';b.characters[0].outfits[0].heightOverrideCm=200;b.characters[0].outfitColors[0].fontColor='#ffffff';
 const result=applyCharacterBundle(current,b,{mappings:{'a.png':characters[0]},policy:'update',excludedOutfits:[transferOutfitKey('a.png','A/one')]});assert.deepEqual(result.settings.outfitCatalog['a.png'].outfits.find(o=>o.folder==='A/one'),current.outfitCatalog['a.png'].outfits[0]);assert.equal(result.report.outfits,1);assert.throws(()=>applyCharacterBundle({},b,{excludedOutfits:['unknown']}),/another bundle/);
});
test('duplicate logical sprite targets are rejected even with different ZIP paths or extensions',()=>{
 const b=bundle(),asset={kind:'sprite',avatar:'a.png',folder:'A/one',filename:'neutral.png',path:'assets/0/neutral.png',size:8,sha256:'0'.repeat(64)};b.assets=[asset,{...asset,filename:'NEUTRAL.jpg',path:'assets/1/NEUTRAL.jpg'}];assert.throws(()=>validateCharacterBundle(b),/Duplicate asset destination/);
});
test('review detects existing metadata, inventory conflicts, unknown folders and new-card destinations',async()=>{
 const b=bundle(),reviewer=createImportReviewer({characters:()=>characters,settings:source,readFolder:async folder=>folder.endsWith('one')?[{filename:'neutral.png',revision:'?t=1'}]:[]}),o=options();b.assets=[{kind:'sprite',avatar:'a.png',folder:'A/one',filename:'neutral.png'}];
 const review=await reviewer.review(b,o);assert.equal(review.updateMode,true);assert.equal(review.rows[0].conflicts.length,1);await assert.rejects(reviewer.verify(review,b,o),/Acknowledge/);await reviewer.verify(review,b,{...o,overwriteAcknowledged:true});
 const newCard=await reviewer.review(b,{...o,mappingValues:{'a.png':'__create__'}});assert.equal(newCard.rows[0].newCardRoot,true);assert.equal(newCard.rows[0].existing,false);
});
test('review approval is scoped to original mappings, folder revisions and saved metadata',async()=>{
 let revision='1',label='Local';const b=bundle(),o=options(),reviewer=createImportReviewer({characters:()=>characters,settings:()=>({outfitCatalog:{'a.png':{outfits:[{folder:'A/one',label}]}}}),readFolder:async()=>[{filename:'neutral.png',revision}]});
 const proof=await reviewer.review(b,o);await assert.rejects(reviewer.verify({...proof},b,{...o,overwriteAcknowledged:true}),/Recheck/);await assert.rejects(reviewer.verify(proof,b,{...o,roots:{'a.png':'Other'},overwriteAcknowledged:true}),/Recheck/);
 revision='2';await assert.rejects(reviewer.verify(proof,b,{...o,overwriteAcknowledged:true}),/changed since review/);revision='1';label='Changed';await assert.rejects(reviewer.verify(proof,b,{...o,overwriteAcknowledged:true}),/changed since review/);
});
test('excluding existing outfits allows new outfits without acknowledgement; failed inspections remain blocking',async()=>{
 const b=bundle(),o=options();const reviewer=createImportReviewer({characters:()=>characters,settings:()=>({}),readFolder:async f=>f.endsWith('one')?[{filename:'neutral.png'}]:[]}),proof=await reviewer.review(b,o);await reviewer.verify(proof,b,{...o,excludedOutfits:[transferOutfitKey('a.png','A/one')]});
 const failed=createImportReviewer({characters:()=>characters,settings:()=>({}),readFolder:async()=>{throw Error('Offline');}}),bad=await failed.review(b,o);assert.equal(bad.rows[0].error,'Offline');await assert.rejects(failed.verify(bad,b,o),/Cannot inspect/);
});
test('ambiguous case-only overwrites are refused before writes',async()=>{
 const b=bundle();b.selection.spriteFiles=true;b.assets=[{kind:'sprite',avatar:'a.png',folder:'A/one',filename:'neutral.png'}];const o={...options(),selection:b.selection},reviewer=createImportReviewer({characters:()=>characters,settings:()=>({}),readFolder:async()=>[{filename:'Neutral.jpg'}]}),proof=await reviewer.review(b,o);await assert.rejects(reviewer.verify(proof,b,{...o,overwriteAcknowledged:true}),/Case-only/);
});
test('archive audit accepts generated STORE/DEFLATE Unicode bundles and rejects truncation and duplicate names',async()=>{
 for(const compression of ['STORE','DEFLATE']){const zip=new JSZip();zip.file('å.png','a');const bytes=await zip.generateAsync({type:'uint8array',compression});assert.ok(checkTransferZipIndex(bytes).has('å.png'));assert.throws(()=>checkTransferZipIndex(bytes.subarray(0,-1)),/Incomplete/);}
 const zip=new JSZip();zip.file('a.txt','a');zip.file('b.txt','b');const bytes=await zip.generateAsync({type:'uint8array'});for(let i=0;i<bytes.length-5;i++)if(String.fromCharCode(...bytes.subarray(i,i+5))==='b.txt')bytes[i]=97;assert.throws(()=>checkTransferZipIndex(bytes),/Duplicate/);
});
test('legacy and modern card metadata both discard embedded sprite side effects',()=>{
 const modern={data:{name:'A',extensions:{risuai:{emotions:['bad'],additionalAssets:['bad'],other:1}}}},legacy={name:'A',extensions:{risuai:{emotions:['bad'],additionalAssets:['bad'],other:2}}};assert.deepEqual(safeCardJson(modern).data.extensions.risuai,{other:1});assert.deepEqual(safeCardJson(legacy).extensions.risuai,{other:2});assert.ok(legacy.extensions.risuai.emotions);
});

test('future required capabilities fail before import while optional metadata remains forward compatible',()=>{const b=bundle();b.futureOptional={note:'ignored'};assert.equal(validateCharacterBundle(b).name,b.name);b.requiredFeatures=['future-unsafe-mode'];assert.throws(()=>validateCharacterBundle(b),/unsupported feature/);b.requiredFeatures=['outfit-height-cm'];assert.deepEqual(validateCharacterBundle(b).requiredFeatures,['outfit-height-cm']);b.version=999;assert.throws(()=>validateCharacterBundle(b),/version 1 or 2/);});

test('asset hashes normalize hexadecimal case and card formats must match their declarations',()=>{const b=bundle();b.selection.cards=true;b.assets=[{kind:'card',avatar:'a.png',filename:'a.json',path:'assets/0/a.json',size:20,sha256:'AB'.repeat(32)}];assert.throws(()=>validateCharacterBundle(b),/declared format/);b.selection.cardFormat='json';assert.equal(validateCharacterBundle(b).assets[0].sha256,'ab'.repeat(32));});
