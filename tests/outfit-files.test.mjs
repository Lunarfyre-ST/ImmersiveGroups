import test from 'node:test';
import assert from 'node:assert/strict';
<<<<<<< HEAD
import {uniqueSpriteName,scanFolderCandidates,spriteFolder,readZipImage} from '../modules/outfit-files-model.js';
=======
import {uniqueSpriteName,scanFolderCandidates} from '../modules/outfit-files-model.js';
>>>>>>> 80eb6b24fe0276df89f7dec59ead36cc3c949b60
import JSZip from '../vendor/jszip.js';
test('sprite duplicates preserve stems and increment numeric variants case-insensitively',()=>{
 const used=new Set(['neutral','neutral-1','neutral-2','joy']);
 assert.deepEqual(uniqueSpriteName('neutral-1.png',used),{stem:'neutral-3',filename:'neutral-3.png',label:'neutral'});
 assert.equal(uniqueSpriteName('NEUTRAL.jpg',used).stem,'NEUTRAL-4');assert.equal(uniqueSpriteName('joy.webp',used).stem,'joy-1');assert.throws(()=>uniqueSpriteName('bad.exe',used));
});
<<<<<<< HEAD
test('large numeric sprite suffixes cannot stall duplicate numbering',()=>{
 const digits='99999999999999999999999999999999999999999999999999',stem='neutral-'+digits;
 assert.equal(uniqueSpriteName(stem+'.png',new Set([stem])).stem,'neutral-'+(BigInt(digits)+1n));
});
test('upload folder normalization prevents absolute, truncated and ambiguous destinations',()=>{
 assert.equal(spriteFolder(' Character\\outfit '),'Character/outfit');
 for(const folder of ['/Character/outfit','Character/../other','Character//outfit','Character/a/b','C:\\outfit','Character/','Character/\u0000bad','Character/outfit.','Character /outfit','Character/CON.png'])assert.throws(()=>spriteFolder(folder));
});
test('ZIP extraction counts real output bytes instead of trusting declared sizes',async()=>{
 const zip=new JSZip();zip.file('neutral.png',new Uint8Array(4096).fill(42));
 const loaded=await JSZip.loadAsync(await zip.generateAsync({type:'uint8array',compression:'DEFLATE'})),file=loaded.file('neutral.png');
 assert.equal((await readZipImage(file,4096)).size,4096);
 file._data.uncompressedSize=1;
 await assert.rejects(readZipImage(file,128),/size limit/);
});
=======
>>>>>>> 80eb6b24fe0276df89f7dec59ead36cc3c949b60
test('folder scans only select matching character folders with supported images',()=>{
 const characters=[{name:'Refiya',avatar:'refiya.png'},{name:'Maerwyn',avatar:'maerwyn.png'}],files=['characters/Refiya/swim/neutral.png','characters/Refiya/swim/joy.gif','characters/Maerwyn/robe/neutral.jpg','characters/Refiya/empty/readme.txt','characters/Other/swim/neutral.png','characters/Refiya/too/deep/neutral.png','characters/Refiya/../neutral.png'].map(webkitRelativePath=>({webkitRelativePath}));
 assert.deepEqual(scanFolderCandidates(characters,files).map(x=>x.folder),['Refiya/swim','Maerwyn/robe']);
});
test('vendored ZIP reader handles stored and compressed sprite packs',async()=>{
 for(const compression of ['STORE','DEFLATE']){const zip=new JSZip();zip.file('neutral-1.png',new Uint8Array([1,2,3]));const bytes=await zip.generateAsync({type:'uint8array',compression});const read=await JSZip.loadAsync(bytes);assert.deepEqual(await read.file('neutral-1.png').async('uint8array'),new Uint8Array([1,2,3]));}
});
