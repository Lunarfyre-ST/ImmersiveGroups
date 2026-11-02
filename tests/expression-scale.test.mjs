// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import {expressionImageKey,expressionImageFactor,expressionImagePercent} from '../modules/expression-scale-model.js';
test('expression image scales distinguish character, folder and exact filename',()=>{
 const origin='https://example.test/',key=expressionImageKey('a.png','A/formal','/characters/A/formal/joy-2.png?rev=1',origin),scales={[key]:75};
 assert.equal(expressionImageFactor(scales,key),0.75);
 assert.equal(expressionImagePercent({[key]:33.3},key),33.3);
 for(const [avatar,folder,src] of [['b.png','A/formal','/characters/A/formal/joy-2.png'],['a.png','A/casual','/characters/A/casual/joy-2.png'],['a.png','A/formal','/characters/A/formal/joy.png']])assert.equal(expressionImageFactor(scales,expressionImageKey(avatar,folder,src,origin)),1);
 assert.equal(expressionImageKey('a.png','A/formal','https://other.test/characters/A/formal/joy.png',origin),'');
 assert.equal(expressionImageKey('a.png','A/formal','/characters/A/casual/joy.png',origin),'');
 assert.equal(expressionImageFactor({[key]:0},key),1);
});
