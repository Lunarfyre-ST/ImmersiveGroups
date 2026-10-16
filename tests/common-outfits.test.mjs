import test from 'node:test';
import assert from 'node:assert/strict';
import {commonOutfitKey,commonOutfitChoices,commonOutfitTargets,expressionInventory} from '../modules/common-outfits-model.js';
import {forgetBackground,relinkBackground,knownBackgrounds} from '../modules/background-catalog-model.js';
import {imageMatchesSearch} from '../gallery/src/library-model.js';
import {buildSceneInventory,buildScenePrompt} from '../modules/scene-automation-model.js';
const characters=()=>['a','b','c'].map(avatar=>({avatar,currentOutfit:avatar+'/main',outfits:[{folder:avatar+'/main',name:'Main'},{folder:avatar+'/sleep',name:avatar==='a'?'Pyjamas':'Pajamas'},{folder:avatar+'/winter',name:'Winter'}]}));
test('shared outfit choices match names across character roots and normalize pajama spelling',()=>{
 assert.equal(commonOutfitKey(' PAJAMAS '),'pyjama');assert.deepEqual(commonOutfitChoices(characters()).map(o=>o.key),['main','pyjama','winter']);
 assert.deepEqual(commonOutfitTargets(characters(),'pyjamas').targets.map(t=>t.folder),['a/sleep','b/sleep','c/sleep']);
 const c=characters();c[1].outfits[1].name='Sleep clothes';c[1].outfits[1].commonName='Pyjama';assert.ok(commonOutfitChoices(c).some(o=>o.key==='pyjama'));
 c[2].outfits.pop();assert.equal(commonOutfitChoices(c).some(o=>o.key==='winter'),false);assert.deepEqual(commonOutfitChoices([]),[]);
});
test('ambiguous shared names are omitted and linked changes skip locked, missing and current outfits',()=>{
 const c=characters();c[0].outfitLocked=true;c[1].outfits.push({folder:'b/sleep2',commonName:'pyjama'});assert.equal(commonOutfitChoices(c).some(o=>o.key==='pyjama'),false);
 const planned=commonOutfitTargets(c,'pyjama',{respectLocks:true});assert.deepEqual(planned.targets,[{avatar:'c',folder:'c/sleep'}]);assert.deepEqual(planned.skipped,['a','b']);
 c[2].currentOutfit='c/sleep';assert.deepEqual(commonOutfitTargets(c,'pyjama',{respectLocks:true}).targets,[]);
});
test('expression inventories count variants and reject external and non-sprite paths without mutating results',()=>{
 const input=[{path:'/characters/A/winter/joy-2.png',label:'joy-2'},{path:'/characters/A/winter/neutral.png',label:'neutral'},{path:'/characters/A/winter/joy-1.png',label:'joy-1'},{path:'/characters/A/winter/joy-1.png',label:'joy-1'},{path:'https://elsewhere.test/characters/A/x.png',label:'neutral'},{path:'/api/private.png',label:'neutral'},{path:'javascript:alert(1)',label:'neutral'}],before=JSON.stringify(input);
 const list=expressionInventory(input,'http://local.test/');assert.equal(list.length,3);assert.equal(list[0].emotion,'neutral');assert.equal(list.filter(e=>e.emotion==='joy').length,2);assert.equal(JSON.stringify(input),before);
});
test('background outfit links survive relinking and are included in background-only model context',()=>{
 const s={backgroundOutfitLinks:{old:'pyjama'}};assert.deepEqual(knownBackgrounds([],s),['old']);relinkBackground(s,'old','new');assert.equal(s.backgroundOutfitLinks.new,'pyjama');forgetBackground(s,'new');assert.deepEqual(s.backgroundOutfitLinks,{});
 const conflicting={backgroundOutfitLinks:{old:'pyjama',new:'winter'}};const before=JSON.stringify(conflicting);assert.throws(()=>relinkBackground(conflicting,'old','new'));assert.equal(JSON.stringify(conflicting),before);
 const scene={characters:characters(),backgrounds:{outfitsEnabled:true,library:[{file:'bedroom',description:'A bedroom',characterBindings:['a','b','c'],outfitPreset:'pyjama'}]}},settings={enabled:true,outfits:false,backgrounds:true};
 const inventory=buildSceneInventory(scene,'a',settings);assert.equal(inventory.backgrounds[0].linkedOutfitName,'pyjama');const prompt=buildScenePrompt(inventory,settings);assert.match(prompt,/Prefer the background command alone/);assert.equal(prompt.includes('::outfit'),false);
});

test('file-gallery search matches filenames, assignment names, descriptions and member names',()=>{
 const image={name:'forest.png',owner:'Alex'},assignment={name:'Camp',description:'Moonlit clearing'};
 for(const query of ['FOREST','camp','moonlit alex','clearing'])assert.equal(imageMatchesSearch(image,assignment,query),true);
 assert.equal(imageMatchesSearch(image,assignment,'winter'),false);
});
