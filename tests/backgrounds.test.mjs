import test from 'node:test';
import assert from 'node:assert/strict';
import { backgroundChoices, chooseBackgroundDefault } from '../modules/background-model.js';

test('linked backgrounds do not require stars and follow active character filters',()=>{
    const files=['forest','room','town','other','shared'];
    const settings={backgroundBindings:{forest:['a'],room:['b'],other:['c'],shared:['a','b']},backgroundFavorites:['town','room','other','gone']};
    assert.deepEqual(backgroundChoices(files,settings,['a','b']).linked,['shared']);
    assert.deepEqual(backgroundChoices(files,settings,['a','b'],'a'),{linked:['forest','shared'],starred:['town']});
    assert.deepEqual(backgroundChoices(files,settings,['a','b'],'b'),{linked:['room','shared'],starred:['town','room']});
    assert.deepEqual(backgroundChoices(files,settings,[]).linked,[]);
});
test('unlinked and missing backgrounds do not leak into the linked list',()=>{
    const s=JSON.parse('{"backgroundBindings":{"__proto__":["a"],"empty":[]},"backgroundFavorites":["empty","empty"]}');
    assert.deepEqual(backgroundChoices(['__proto__','empty'],s,['a']),{linked:['__proto__'],starred:['empty']});
    assert.equal({}.a,undefined);
});

test('default backgrounds use explicit priority and ordered ties',()=>{
    const files=['shared','solo','fallback','exact','exact2'];
    const s={backgroundBindings:{shared:['a','b']},backgroundGlobalDefault:'fallback',backgroundDefaultRules:[
        {match:'character',characters:['a'],file:'solo'},
        {match:'all',characters:['a','b'],file:'shared'},
        {match:'exact',characters:['a','b'],file:'exact'},
        {match:'exact',characters:['a','b'],file:'exact2'},
    ]};
    assert.equal(chooseBackgroundDefault(files,s,['b','a']).file,'exact');
    s.backgroundDefaultRules[2].enabled=false;assert.equal(chooseBackgroundDefault(files,s,['a','b']).file,'exact2');
    assert.equal(chooseBackgroundDefault(files,s,['a','b','c']).file,'shared');
    assert.equal(chooseBackgroundDefault(files,s,['a']).file,'solo');
    assert.equal(chooseBackgroundDefault(files,s,['c']).file,'fallback');
    assert.equal(chooseBackgroundDefault(files,s,[]),null);
    s.backgroundDefaultRules=[];s.backgroundGlobalDefault='missing';
    assert.equal(chooseBackgroundDefault(files,s,['a','b']).file,'shared');
    assert.equal(chooseBackgroundDefault(files,s,['a','b','c']),null);
});
