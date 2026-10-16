import test from 'node:test';
import assert from 'node:assert/strict';
import { commandsInText, buildDisplayPolicy } from '../gallery/src/gallery-model.js';
const names = text => commandsInText(text).map(match => match[1]);
test('image commands retain source offsets before, inside and after normal formatting', () => {
    const text='::img general before::\n<p><em>::img general middle::</em></p>\n::IMG general after::';
    const matches=commandsInText(text);
    assert.deepEqual(matches.map(match=>match[1]),['general before','general middle','general after']);
    for(const match of matches){assert.equal(text.slice(match.index,match.index+match[0].length),match[0]);assert.equal(match.input,text);}
});
test('HTML parsing handles malformed closing tags accepted by browsers', () => {
    for(const tag of ['script','style','textarea','pre','a','button']) for(const end of [`</${tag} >`,`</${tag} ignored="value">`,`</${tag}\n>`]){
        assert.deepEqual(names(`<${tag} data-test=">">::img general hidden::${end} ::img general visible::`),['general visible'],tag+end);
    }
    assert.deepEqual(names('<ScRiPt>::img general hidden::</ScRiPt invalid=x>::img general visible::'),['general visible']);
});
test('unclosed and nested excluded HTML regions do not consume display limits', () => {
    for(const tag of ['script','style','textarea','pre','a','button']) assert.deepEqual(names(`<${tag}>::img general hidden::`),[],tag);
    assert.deepEqual(names('<pre><pre>::img general inner::</pre>::img general outer::</pre>::img general visible::'),['general visible']);
    assert.deepEqual(names('<template>::img general hidden::</template><iframe>::img general hidden::</iframe>::img general visible::'),['general visible']);
});
test('removing excluded content cannot assemble a new image command', () => {
    const valid='::img general visible::\n';
    for(const split of ['::im<script>ignored</script>g general invented::','::im<pre>ignored</pre>g general invented::','::im```ignored```g general invented::','::im`example`g general invented::','::img general ```ignored```invented::']){
        assert.deepEqual(names(valid+split),['general visible'],split);
    }
});
test('attributes, comments and decoded entities cannot introduce image commands', () => {
    const text='<span title="::img general attribute::">Text</span><img alt="::img general alt::"><!-- ::img general comment:: --!><p>&#58;&#58;img general encoded::</p>';
    assert.deepEqual(names(text),[]);
    assert.deepEqual(names(text+'<p>::img general literal::</p>'),['general literal']);
});
test('code examples stay excluded while standalone inline commands remain supported', () => {
    for(const example of ['```\n::img general example::\n```','~~~\n::img general example::\n~~~','```\n::img general example::','`Example ::img general example::`','<code>Example ::img general example::</code>']) assert.deepEqual(names(example),[],example);
    assert.deepEqual(names('`::img general literal::` <code>::img general html::</code>'),['general literal','general html']);
});
test('hidden examples do not exhaust image caps or cooldown and cached text follows edits', () => {
    const message={mes:'<pre>::img general hidden::</pre invalid=x>\n::img general visible::'},chat=[message],before=JSON.stringify(chat),calls=[];
    const settings={limits:{perMessageEnabled:true,maxPerMessage:1,repeatEnabled:true,cooldownRounds:3}},resolve=args=>{calls.push(args);return {src:'/image.png'};};
    const first=buildDisplayPolicy(chat,settings,resolve);
    assert.deepEqual(calls,['general visible']);assert.deepEqual(first.decisions.get(0).get('/image.png'),['']);assert.equal(JSON.stringify(chat),before);
    message.mes='<pre>::img general hidden::';calls.length=0;
    assert.equal(buildDisplayPolicy(chat,settings,resolve).decisions.get(0).size,0);assert.deepEqual(calls,[]);
    message.mes='::img general edited::';buildDisplayPolicy(chat,settings,resolve);assert.deepEqual(calls,['general edited']);
});
