import test from 'node:test';
import assert from 'node:assert/strict';
import {uniqueSpriteName,scanFolderCandidates} from '../modules/outfit-files-model.js';
import JSZip from '../vendor/jszip.js';
test('sprite duplicates preserve stems and increment numeric variants case-insensitively',()=>{
 const used=new Set(['neutral','neutral-1','neutral-2','joy']);
 assert.deepEqual(uniqueSpriteName('neutral-1.png',used),{stem:'neutral-3',filename:'neutral-3.png',label:'neutral'});
 assert.equal(uniqueSpriteName('NEUTRAL.jpg',used).stem,'NEUTRAL-4');assert.equal(uniqueSpriteName('joy.webp',used).stem,'joy-1');assert.throws(()=>uniqueSpriteName('bad.exe',used));
});
test('folder scans only select matching character folders with supported images',()=>{
 const characters=[{name:'Refiya',avatar:'refiya.png'},{name:'Maerwyn',avatar:'maerwyn.png'}],files=['characters/Refiya/swim/neutral.png','characters/Refiya/swim/joy.gif','characters/Maerwyn/robe/neutral.jpg','characters/Refiya/empty/readme.txt','characters/Other/swim/neutral.png','characters/Refiya/too/deep/neutral.png','characters/Refiya/../neutral.png'].map(webkitRelativePath=>({webkitRelativePath}));
 assert.deepEqual(scanFolderCandidates(characters,files).map(x=>x.folder),['Refiya/swim','Maerwyn/robe']);
});
test('vendored ZIP reader handles stored and compressed sprite packs',async()=>{
 for(const compression of ['STORE','DEFLATE']){const zip=new JSZip();zip.file('neutral-1.png',new Uint8Array([1,2,3]));const bytes=await zip.generateAsync({type:'uint8array',compression});const read=await JSZip.loadAsync(bytes);assert.deepEqual(await read.file('neutral-1.png').async('uint8array'),new Uint8Array([1,2,3]));}
});
