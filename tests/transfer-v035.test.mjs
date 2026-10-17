// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { captureCharacterBundle, validateCharacterBundle, applyCharacterBundle, portablePreferences } from '../modules/character-transfer-model.js';
import { comparePackVersions, validatePackMetadata, packRevisionNotice } from '../modules/transfer-pack-version.js';
import { createImportReviewer } from '../modules/transfer-import-review.js';
import { transferOutfitKey } from '../modules/transfer-outfit-model.js';
const characters=[{avatar:'a.png',name:'A'}],pack={id:'example-pack',version:'1.2.0'};
const source=()=>({outfitCatalog:{'a.png':{outfits:[{folder:'A/one',label:'First',description:'New coat',heightOverrideCm:140,fontColor:'#112233'},{folder:'A/two',label:'Second'}],ignored:[]}}});
const bundle=()=>captureCharacterBundle(source(),characters,['a.png'],{outfits:true,colors:true},'Pack',[],{pack});
const options=()=>({mappingValues:{'a.png':'a.png'},roots:{'a.png':'A'},categories:{outfits:true,colors:true}});
test('pack versions compare numerically, support prereleases and never imply overwrite permission',async()=>{
 for(const [a,b,expected] of [['1.10','1.9',1],['1','1.0.0',0],['2.0-beta.10','2.0-beta.2',1],['2.0','2.0-rc.1',1],['1.0.1','2',-1],['1.0-a','1.0-1',1]])assert.equal(comparePackVersions(a,b),expected);
 for(const version of ['', 'latest','01.2','1.2.3.4.5','1.0+build','1\n'])assert.throws(()=>validatePackMetadata({id:'pack',version}));
 assert.equal(validatePackMetadata(undefined),undefined);assert.throws(()=>validatePackMetadata({id:'../pack',version:'1'}));
 assert.equal(packRevisionNotice(pack,{packId:pack.id,version:'1'}).status,'newer');assert.equal(packRevisionNotice(pack,{packId:pack.id,version:'2'}).status,'older');assert.equal(packRevisionNotice(pack,{packId:'other',version:'1'}).status,'unknown');
 const b=bundle(),r=createImportReviewer({characters:()=>characters,settings:source,readFolder:async()=>[]}),o=options(),proof=await r.review(b,o);await assert.rejects(r.verify(proof,b,o),/Acknowledge/);
});
test('optional pack metadata round trips while older bundles and unknown required features retain their semantics',()=>{
 const b=bundle();assert.deepEqual(validateCharacterBundle(b).pack,pack);delete b.pack;assert.equal(validateCharacterBundle(b).pack,undefined);b.pack={...pack,version:'bad'};assert.throws(()=>validateCharacterBundle(b),/pack version/);b.pack=pack;b.requiredFeatures=['future-writes'];assert.throws(()=>validateCharacterBundle(b),/unsupported feature/);
});
test('export exclusions remove all per-outfit data without mutating source or character profiles',()=>{
 const s=source(),before=structuredClone(s),b=captureCharacterBundle(s,characters,['a.png'],{outfits:true,colors:true,heights:true},'Pack',[],{pack,excludedOutfits:[transferOutfitKey('a.png','A/one')]});
 assert.deepEqual(b.characters[0].outfits.map(o=>o.folder),['A/two']);assert.deepEqual(b.characters[0].outfitColors.map(o=>o.folder),['A/two']);assert.ok(b.characters[0].height);assert.deepEqual(s,before);assert.throws(()=>captureCharacterBundle(s,characters,['a.png'],{outfits:true},'Pack',[],{excludedOutfits:['other']}),/another bundle/);
});
test('local revision receipts record mapped, selected outfits only and remain outside portable preferences',()=>{
 const b=bundle(),current=source(),original=structuredClone(current),result=applyCharacterBundle(current,b,{mappings:{'a.png':{avatar:'target.png',name:'Target'}},excludedOutfits:[transferOutfitKey('a.png','A/two')]});
 const records=result.settings.transferOutfitOrigins;assert.equal(Object.keys(records).length,1);assert.equal(records[transferOutfitKey('target.png','Target/one')].version,pack.version);assert.deepEqual(current,original);assert.equal(portablePreferences(result.settings).transferOutfitOrigins,undefined);
});
test('content review detects identical, changed and renamed files and invalidates unchanged timestamps',async()=>{
 const b=bundle();b.selection.spriteFiles=true;b.assets=[{kind:'sprite',avatar:'a.png',folder:'A/one',filename:'neutral.png',size:10,sha256:'a'.repeat(64)}];let hash='a'.repeat(64),filename='neutral.png';
 const r=createImportReviewer({characters:()=>characters,settings:()=>({}),readFolder:async folder=>folder==='A/one'?[{filename,revision:'fixed'}]:[],readFile:async()=>({size:10,sha256:hash})}),o={...options(),selection:b.selection};
 let proof=await r.review(b,o);assert.equal(proof.rows[0].conflicts[0].comparison,'identical');hash='b'.repeat(64);await assert.rejects(r.verify(proof,b,{...o,overwriteAcknowledged:true}),/changed since review/);proof=await r.review(b,o);assert.equal(proof.rows[0].conflicts[0].comparison,'different');hash='a'.repeat(64);filename='neutral.jpg';proof=await r.review(b,o);assert.equal(proof.rows[0].conflicts[0].comparison,'renamed');
});
test('unreadable collision contents block selected sprite imports; metadata-only review does not read bytes',async()=>{
 const b=bundle();b.selection.spriteFiles=true;b.assets=[{kind:'sprite',avatar:'a.png',folder:'A/one',filename:'neutral.png'}];const r=createImportReviewer({characters:()=>characters,settings:()=>({}),readFolder:async()=>[{filename:'neutral.png'}],readFile:async()=>{throw Error('Offline');}}),o={...options(),selection:{...b.selection,spriteFiles:true}};
 const proof=await r.review(b,o);assert.equal(proof.rows[0].error,'Offline');await assert.rejects(r.verify(proof,b,{...o,overwriteAcknowledged:true}),/Cannot inspect/);const metadata=await r.review(b,{...o,selection:{...b.selection,spriteFiles:false}});assert.equal(metadata.rows[0].error,'');
});
test('revision context requires matching pack and source identities; changed receipts invalidate approval',async()=>{
 const b=bundle(),s=source(),key=transferOutfitKey('a.png','A/one');s.outfitCatalog['a.png'].outfits[0].description='Old coat';s.transferOutfitOrigins={[key]:{packId:pack.id,version:'1',sourceAvatar:'a.png',sourceFolder:'A/one'}};
 const r=createImportReviewer({characters:()=>characters,settings:()=>s,readFolder:async()=>[]}),o=options(),proof=await r.review(b,o);assert.equal(proof.rows[0].revision.status,'newer');assert.deepEqual(proof.rows[0].differences.find(d=>d.field==='description'),{field:'description',existing:'Old coat',incoming:'New coat'});s.transferOutfitOrigins[key].sourceFolder='Other';await assert.rejects(r.verify(proof,b,{...o,overwriteAcknowledged:true}),/changed since review/);assert.equal((await r.review(b,o)).rows[0].revision.status,'unknown');
});
test('review snapshots metadata before asynchronous reads rather than silently approving later edits',async()=>{
 const b=bundle(),s=source(),o=options();let edited=false;
 const r=createImportReviewer({characters:()=>characters,settings:()=>s,readFolder:async()=>{if(!edited){edited=true;s.outfitCatalog['a.png'].outfits[0].label='Changed during review';}return [];}});
 const proof=await r.review(b,o);assert.equal(proof.rows[0].metadata.label,'First');await assert.rejects(r.verify(proof,b,{...o,overwriteAcknowledged:true}),/changed since review/);
});
test('large conflict comparisons bound active reads and stop queued downloads after the budget',async()=>{
 const b=bundle();b.selection.spriteFiles=true;b.assets=Array.from({length:40},(_,i)=>({kind:'sprite',avatar:'a.png',folder:'A/one',filename:`sprite${i}.png`,size:1,sha256:'a'.repeat(64)}));let active=0,max=0,reads=0;
 const r=createImportReviewer({characters:()=>characters,settings:()=>({}),readFolder:async folder=>folder==='A/one'?b.assets.map(a=>({filename:a.filename})):[],readFile:async()=>{reads++;active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,0));active--;return {size:100*1024*1024,sha256:'a'.repeat(64)};}});
 const proof=await r.review(b,{...options(),selection:b.selection});assert.match(proof.rows[0].error,/500 MiB/);assert.ok(max<=3);await new Promise(resolve=>setTimeout(resolve,20));assert.ok(reads<12);
});
