import test from 'node:test';
import assert from 'node:assert/strict';
import { availableInChat, buildDisplayPolicy, saveCatalogEntry, buildGalleryPrompt, safeImageSource } from '../gallery/src/gallery-model.js';
test('avatar bindings follow characters into groups and support all-required',()=>{
    const ctx={characters:[{name:'Same',avatar:'a.png'},{name:'Same',avatar:'b.png'}],characterId:0,groupId:1,groups:[{id:1,members:['b.png']}]};
    const image={gallery:'General',availability:'bound',characterBindings:['a.png']};assert.equal(availableInChat(image,ctx),false);image.characterBindings=['b.png'];assert.equal(availableInChat(image,ctx),true);image.characterBindings=['a.png','b.png'];image.requireAllCharacters=true;assert.equal(availableInChat(image,ctx),false);
});
test('repeat limits count user turns, ignore suppressed repeats, and use file identity',()=>{
    const chat=[{mes:'::img general scene::'},{is_user:true,mes:'one'},{mes:'::img Other alias::'},{is_user:true,mes:'two'},{mes:'::img general scene::'},{is_user:true,mes:'three'},{mes:'::img general scene::'}];
    const policy=buildDisplayPolicy(chat,{limits:{repeatEnabled:true,cooldownRounds:2}},()=>({src:'/same.png'}));assert.equal(policy.decisions.get(2).get('/same.png')[0],'recently shown');assert.equal(policy.decisions.get(4).get('/same.png')[0],'recently shown');assert.equal(policy.decisions.get(6).get('/same.png')[0],'');
});
test('name edits preserve aliases and prompt is optional',()=>{
    const entry={gallery:'__localimage_general__',name:'old',path:'user/images/a.png'};const settings={enabled:true,assignments:{},generalAssignments:{old:{path:entry.path}},prompt:{enabled:false},galleryDescriptions:{}};
    saveCatalogEntry(settings,entry,{name:'new',description:'A calm scene',availability:'all'});assert.deepEqual(settings.generalAssignments.new.aliases,['old']);const policy=buildDisplayPolicy([],settings,()=>null);assert.equal(buildGalleryPrompt(settings,{characters:[],groups:[]},[],policy),'');settings.prompt.enabled=true;assert.match(buildGalleryPrompt(settings,{characters:[],groups:[]},[],policy),/::img general new::/);assert.equal(safeImageSource('user/images/%2e%2e/a.png'),'');
});
