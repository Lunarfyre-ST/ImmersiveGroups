import test from 'node:test';
import assert from 'node:assert/strict';
import { transferContents, createTransferCounter } from '../modules/transfer-preview.js';

const bundle=()=>({characters:[{avatar:'a.png',locked:true,height:{},colors:{},outfits:[{folder:'A/main',description:'Winter coat'},{folder:'A/bath',description:''}]}],backgrounds:[{file:'snow.png',available:true,description:'Snowy garden'},{file:'gone.png',available:false,description:'Stale'}],groups:[{id:'pair'}],gallery:{generalAssignments:{first:{path:'user/images/a.png',description:'A painting'},alias:{path:'user/images/a.png',description:''}},assignments:{},galleryDescriptions:{general:'Collected art'}},assets:[{kind:'sprite'},{kind:'background',filename:'gone.png'},{kind:'background',filename:'snow.png'},{kind:'gallery'}]});
test('transfer counts respect exclusions and count actual bundle assets',()=>{
 const data=transferContents(bundle(),['gone.png']);assert.equal(data.counts.outfits,2);assert.equal(data.counts.spriteFiles,1);assert.equal(data.counts.backgrounds,1);assert.equal(data.counts.backgroundFiles,1);assert.equal(data.counts.gallery,2);assert.equal(data.counts.galleryFiles,1);assert.equal(data.counts.outfitLocks,1);assert.equal(data.descriptions.backgroundDescriptions,'Snowy garden');assert.equal(data.descriptions.galleryDescriptions,'A painting\n\nCollected art');
});
test('live counts inspect inventories, cache shared folders and tokenize without downloading media',async()=>{
 const reads=[],tokenReads=[];const count=createTransferCounter({readSprites:async folder=>{reads.push(folder);return folder.endsWith('main')?5:2;},countTokens:async text=>{tokenReads.push(text);return 9;}}),b=bundle();b.characters[0].outfits.push({folder:'A/main',description:'Winter coat'});
 const result=await count(b,{live:true});assert.equal(result.counts.spriteFiles,12);assert.equal(result.counts.backgroundFiles,1);assert.equal(result.counts.galleryFiles,1);assert.deepEqual(result.descriptionCounts.outfitDescriptions,{value:9,unit:'tokens'});await count(b,{live:true});assert.equal(reads.length,2);assert.equal(tokenReads.length,3);
});
test('failed inventories stay visibly unknown and tokenizer failure uses characters',async()=>{
 const count=createTransferCounter({readSprites:async()=>{throw Error('Unavailable');},countTokens:async()=>{throw Error('No tokenizer');}}),result=await count(bundle(),{live:true});assert.equal(result.unavailableFolders,2);assert.deepEqual(result.descriptionCounts.outfitDescriptions,{value:11,unit:'characters'});
});
test('rapid scope changes bound concurrency, discard stale updates and skip obsolete queued reads',async()=>{
 let current=true,running=0,max=0,updates=0;const reads=[],release=[];
 const count=createTransferCounter({readSprites:async folder=>{reads.push(folder);running++;max=Math.max(max,running);await new Promise(resolve=>release.push(resolve));running--;return 1;}}),b=bundle();b.characters[0].outfits=Array.from({length:10},(_,i)=>({folder:'A/'+i}));
 const stale=count(b,{live:true,isCurrent:()=>current,onUpdate:()=>updates++});await new Promise(resolve=>setImmediate(resolve));assert.equal(reads.length,3);current=false;const previous=updates;
 const fresh=bundle();fresh.characters[0].outfits=[{folder:'A/new'}];const next=count(fresh,{live:true});release.splice(0).forEach(resolve=>resolve());await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(reads,['A/0','A/1','A/2','A/new']);release.splice(0).forEach(resolve=>resolve());const [,result]=await Promise.all([stale,next]);assert.equal(max,3);assert.equal(updates,previous);assert.equal(result.counts.spriteFiles,1);
});
