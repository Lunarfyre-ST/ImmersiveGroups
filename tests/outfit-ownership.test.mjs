import test from 'node:test';
import assert from 'node:assert/strict';
import {foreignOutfitFolder} from '../modules/outfit-ownership.js';
const characters=[{name:'Refiya',avatar:'Refiya-main.png'},{name:'Maerwyn',avatar:'Maerwyn-main.png'}];
test('outfit ownership rejects folders rooted in another known character',()=>{
 assert.equal(foreignOutfitFolder(characters[0],'Maerwyn/winter',characters),true);
 assert.equal(foreignOutfitFolder(characters[0],'Maerwyn-main/outfit2',characters),true);
 assert.equal(foreignOutfitFolder(characters[0],'Refiya/winter',characters),false);
});
test('outfit ownership compares whole folder roots with case and Unicode normalization',()=>{
 assert.equal(foreignOutfitFolder(characters[0],'MAERWYN\\winter',characters),true);
 assert.equal(foreignOutfitFolder(characters[0],'Maerwyn-other/winter',characters),false);
 const chars=[characters[0],{name:'Élise',avatar:'elise.png'}];
 assert.equal(foreignOutfitFolder(chars[0],'E\u0301LISE/winter',chars),true);
});
test('custom roots and deliberately duplicated character names are not misclassified',()=>{
 assert.equal(foreignOutfitFolder(characters[0],'SharedCostumes/winter',characters),false);
 const twin={name:'Maerwyn',avatar:'copy.png'};
 assert.equal(foreignOutfitFolder(twin,'Maerwyn/winter',[...characters,twin]),false);
});
