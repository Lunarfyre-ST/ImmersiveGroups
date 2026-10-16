import test from 'node:test';
import assert from 'node:assert/strict';
import { filterLibrary, imageLibraryEntries } from '../gallery/src/library-model.js';
import { nextLinkedBackground } from '../modules/background-model.js';
const ctx={characters:[{avatar:'a.png',name:'Alex'},{avatar:'b.png',name:'Bea'}],groups:[{id:1,name:'Bath group',members:['a.png','b.png']}],groupId:1};
const entries=[{kind:'outfit',id:'o',name:'Pyjamas',entity:'Alex',folder:'Alex/sleep',description:'Yö at the estate',characterBindings:['a.png'],inChat:true,hidden:true},{kind:'background',id:'b',name:'EstateBath.png',entity:'Backgrounds',description:'Warm estate bath',characterBindings:['a.png','b.png'],inChat:true,linked:true,favorite:false},{kind:'image',id:'i',name:'BathScene',entity:'General',description:'Shared bath illustration',filterCharacters:['b.png'],inChat:true,gallery:'general'}];
test('library search spans asset types, descriptions, paths and character names without changing records',()=>{
 const original=JSON.stringify(entries);assert.deepEqual(filterLibrary(entries,{search:'bath',sort:'library'},ctx).map(e=>e.id),['b','i']);assert.deepEqual(filterLibrary(entries,{search:'yo alex',sort:'library'},ctx).map(e=>e.id),['o']);assert.deepEqual(filterLibrary(entries,{search:'Alex/sleep'},ctx).map(e=>e.id),['o']);assert.equal(JSON.stringify(entries),original);
});
test('library filters preserve type-specific semantics across the All view',()=>{
 assert.deepEqual(filterLibrary(entries,{type:'outfit',character:'b.png'},ctx),[]);assert.deepEqual(filterLibrary(entries,{type:'background',backgrounds:'linked'},ctx).map(e=>e.id),['b']);assert.deepEqual(filterLibrary(entries,{visibility:'visible',sort:'library'},ctx).map(e=>e.id),['b','i']);assert.deepEqual(filterLibrary(entries,{backgrounds:'starred',sort:'library'},ctx).map(e=>e.id),['o','i']);assert.deepEqual(filterLibrary(entries,{description:'missing'},ctx),[]);
});
test('image character filters follow inherited owners and explicit group bindings',()=>{
 const images=imageLibraryEntries([{id:'a',name:'A',gallery:'Alex'},{id:'b',name:'B',gallery:'Other',availability:'bound',characterBindings:[],groupBindings:['1']},{id:'c',name:'C',gallery:'Other',availability:'all',characterBindings:['a.png']}],ctx);
 assert.deepEqual(images[0].filterCharacters,['a.png']);assert.deepEqual(images[1].filterCharacters,['a.png','b.png']);assert.deepEqual(images[2].filterCharacters,[]);
});
test('linked background navigation wraps and excludes partial links, unbound favorites and missing files',()=>{
 const files=['first.jpg','second.jpg','other.jpg'],s={backgroundBindings:{'first.jpg':['a','b'],'second.jpg':['a','b'],'other.jpg':['a'],'missing.jpg':['a','b']},backgroundFavorites:['other.jpg']};
 assert.equal(nextLinkedBackground(files,s,['a','b'],'first.jpg',1),'second.jpg');assert.equal(nextLinkedBackground(files,s,['a','b'],'first.jpg',-1),'second.jpg');assert.equal(nextLinkedBackground(files,s,['a','b'],'second.jpg',1),'first.jpg');assert.equal(nextLinkedBackground(files,s,['a','b'],'outside.jpg',1),'first.jpg');assert.equal(nextLinkedBackground(files,s,['a','b'],'outside.jpg',-1),'second.jpg');assert.equal(nextLinkedBackground(files,s,[],'first.jpg',1),null);
});
test('description length, character activity and recent-character sorts change order',()=>{
 assert.deepEqual(filterLibrary(entries,{sort:'description-long'},ctx).map(e=>e.id),['i','b','o']);assert.deepEqual(filterLibrary(entries,{sort:'description-short'},ctx).map(e=>e.id),['b','o','i']);
 const rows=[{kind:'outfit',id:'a',name:'A',characterBindings:['a.png']},{kind:'outfit',id:'b',name:'B',characterBindings:['b.png']}],context={characters:[{avatar:'a.png',chat_size:5,date_last_chat:500},{avatar:'b.png',chat_size:50,date_last_chat:1000}]};
 assert.deepEqual(filterLibrary(rows,{sort:'activity'},context).map(e=>e.id),['b','a']);assert.deepEqual(filterLibrary(rows,{sort:'recent'},context).map(e=>e.id),['b','a']);
});
test('Basic and sprite-image filters affect outfits only; unknown folders are not treated as empty',()=>{
 const rows=[{kind:'outfit',id:'basic',name:'Renamed root',basic:true,hasImages:true},{kind:'outfit',id:'with',name:'Swim',basic:false,hasImages:true},{kind:'outfit',id:'empty',name:'Empty',hasImages:false},{kind:'outfit',id:'unknown',name:'Unknown',hasImages:null},{kind:'image',id:'image',name:'Image'}];
 assert.deepEqual(filterLibrary(rows,{type:'outfit',hideBasic:true,sort:'library'},ctx).map(e=>e.id),['with','empty','unknown']);
 assert.deepEqual(filterLibrary(rows,{outfitImages:'without',sort:'library'},ctx).map(e=>e.id),['empty','image']);
 assert.deepEqual(filterLibrary(rows,{outfitImages:'with',hideBasic:true,sort:'library'},ctx).map(e=>e.id),['with','image']);
});
