import test from 'node:test';
import assert from 'node:assert/strict';
import {bindingGroups,matchingBindingGroups,saveBindingGroup,removeBindingGroup,backgroundIsEligible} from '../modules/binding-groups-model.js';
import {knownBackgrounds,forgetBackground,relinkBackground} from '../modules/background-catalog-model.js';
import {backgroundChoices} from '../modules/background-model.js';
import {availableInChat,saveCatalogEntry,GENERAL_KEY} from '../gallery/src/gallery-model.js';
import {imageLibraryEntries,filterLibrary} from '../gallery/src/library-model.js';
import {buildSceneInventory,buildScenePrompt,allowedSceneCommand,automationSettings} from '../modules/scene-automation-model.js';
const presets=[{id:'trio',name:'Travel party',description:'Three adventurers',members:['a','b','c']}];
const ctx={groupId:'new-chat',characters:[{avatar:'a',name:'A'},{avatar:'b',name:'B'},{avatar:'c',name:'C'},{avatar:'d',name:'D'}],groups:[{id:'new-chat',members:['c','b','a','d']}],extensionSettings:{ImmersiveGroups:{bindingGroups:presets}}};
test('named groups require every member, survive different chat IDs, and reject empty/missing groups',()=>{
 assert.equal(matchingBindingGroups(presets,['a','b']).length,0);assert.equal(matchingBindingGroups(presets,['c','b','a','d']).length,1);
 assert.equal(matchingBindingGroups([{id:'empty',members:[]}],['a']).length,0);assert.equal(matchingBindingGroups(presets,['a','b','c'],['missing']).length,0);
 assert.equal(bindingGroups([...presets,...presets]).length,1);
 const image={availability:'bound',presetBindings:['trio']};assert.equal(availableInChat(image,ctx),true);
 assert.equal(availableInChat(image,{...ctx,groups:[{id:'new-chat',members:['a','b']}]}),false);
 assert.equal(availableInChat({...image,presetBindings:['missing']},ctx),false);
});
test('group bindings affect background navigation, context eligibility, image search and character filters',()=>{
 const s={bindingGroups:presets,backgroundGroupBindings:{room:['trio']},backgroundFavorites:['room']};
 assert.deepEqual(backgroundChoices(['room'],s,['a','b']).linked,[]);assert.deepEqual(backgroundChoices(['room'],s,['a','b','c','d']).linked,['room']);
 assert.deepEqual(backgroundChoices(['room'],s,['a','b','c'],'a').linked,['room']);
 assert.equal(backgroundIsEligible({presetBindings:['trio']},['a','b'],presets,false),false);
 const image={id:'i',name:'Camp',availability:'bound',presetBindings:['trio']},[entry]=imageLibraryEntries([image],ctx);
 assert.deepEqual(entry.filterCharacters,['a','b','c']);assert.equal(filterLibrary([entry],{search:'Travel party',character:'b',group:'trio'},ctx).length,1);
 assert.equal(filterLibrary([entry],{character:'d'},ctx).length,0);
});
test('preset edits keep stable IDs and deleting one removes only its links',()=>{
 const s={bindingGroups:structuredClone(presets),backgroundGroupBindings:{room:['trio','other']},gallery:{generalAssignments:{i:{presetBindings:['trio','other'],path:'keep.png',description:'Keep'}},assignments:{A:{j:{presetBindings:['trio']}}}}};
 const saved=saveBindingGroup(s,{...presets[0],name:'Updated',members:['a','a','b']});assert.equal(saved.id,'trio');assert.deepEqual(saved.members,['a','b']);
 assert.throws(()=>saveBindingGroup(s,{name:'Empty',members:[]}));
 removeBindingGroup(s,'trio');assert.deepEqual(s.backgroundGroupBindings.room,['other']);assert.equal(s.gallery.generalAssignments.i.path,'keep.png');assert.deepEqual(s.gallery.generalAssignments.i.presetBindings,['other']);assert.deepEqual(s.gallery.assignments.A.j.presetBindings,[]);
 const gallery={generalAssignments:{},assignments:{}};saveCatalogEntry(gallery,{gallery:GENERAL_KEY,name:'Camp',path:'camp.png'},{availability:'bound',presetBindings:['other']});assert.deepEqual(gallery.generalAssignments.Camp.presetBindings,['other']);
});
test('discarding stale background metadata removes every reference while preserving unrelated entries',()=>{
 const s={backgroundDescriptions:{gone:'Old',keep:'Keep'},backgroundBindings:{gone:['a']},backgroundGroupBindings:{gone:['trio']},backgroundFavorites:['gone','keep'],backgroundDefaultRules:[{file:'gone'},{file:'keep'}],backgroundGlobalDefault:'gone',backgroundChatChoices:{one:'gone',two:'keep'}};
 assert.deepEqual(knownBackgrounds(['keep'],s),['keep','gone']);forgetBackground(s,'gone');assert.deepEqual(knownBackgrounds(['keep'],s),['keep']);assert.equal(s.backgroundGlobalDefault,'');assert.deepEqual(s.backgroundChatChoices,{two:'keep'});
});
test('relinking a renamed background merges descriptions and bindings and moves defaults without data loss',()=>{
 const s={backgroundDescriptions:{old:'Old details',next:'New details'},backgroundBindings:{old:['a'],next:['b']},backgroundGroupBindings:{old:['trio']},backgroundFavorites:['old'],backgroundDefaultRules:[{file:'old'}],backgroundChatChoices:{chat:'old'},backgroundGlobalDefault:'old'};
 relinkBackground(s,'old','next');assert.equal(s.backgroundDescriptions.next,'New details\n\nOld details');assert.deepEqual(s.backgroundBindings.next,['b','a']);assert.deepEqual(s.backgroundGroupBindings.next,['trio']);assert.deepEqual(s.backgroundFavorites,['next']);assert.equal(s.backgroundDefaultRules[0].file,'next');assert.equal(s.backgroundChatChoices.chat,'next');assert.equal(s.backgroundGlobalDefault,'next');assert.equal('old' in s.backgroundDescriptions,false);
 const oversized={backgroundDescriptions:{old:'a'.repeat(12000),next:'b'},backgroundBindings:{old:['a'],next:['b']}};const before=JSON.stringify(oversized);assert.throws(()=>relinkBackground(oversized,'old','next'));assert.equal(JSON.stringify(oversized),before);
 const special=JSON.parse('{"backgroundDescriptions":{"__proto__":"Details"},"backgroundBindings":{"__proto__":["a"]}}');relinkBackground(special,'__proto__','constructor');assert.equal(Object.getPrototypeOf(special.backgroundDescriptions),Object.prototype);assert.equal(special.backgroundDescriptions.constructor,'Details');
});
const scene=()=>({bindingGroups:presets,characters:['a','b','c'].map(a=>({avatar:a,name:a.toUpperCase(),currentOutfit:a+'/main',outfitLocked:a==='b',outfits:[{folder:a+'/main',name:'Main',description:'Current travel clothes'},{folder:a+'/sleep',name:'Sleep',description:'Unused sleepwear'}]})),backgrounds:{current:'room',locked:true,automationLocked:true,library:[{file:'room',description:'Warm room',available:true,presetBindings:['trio']},{file:'elsewhere',description:'Unused background'}]}});
test('descriptions-only prompts include current locked outfits, background and matching groups without commands',()=>{
 const s={enabled:true,mode:'prompt',commandless:true,outfits:true,backgrounds:true,includeDescriptions:false},current=scene(),inventory=buildSceneInventory(current,'a',s),prompt=buildScenePrompt(inventory,s);
 assert.match(prompt,/Current travel clothes/);assert.match(prompt,/Warm room/);assert.match(prompt,/Travel party/);assert.equal(inventory.descriptionContext.characters.length,3);
 for(const text of ['::outfit','::background','Allowed commands','Unused sleepwear','Unused background','Output NONE','Prioritize the speaking'])assert.equal(prompt.includes(text),false,text);
 assert.equal(allowedSceneCommand({type:'outfit',avatar:'a',folder:'a/main'},inventory,current,s),false);
 assert.equal(buildScenePrompt(inventory,s,{api:true}),'');
 const speaker=buildSceneInventory(current,'b',{...s,scope:'speaker'});assert.equal(speaker.descriptionContext.characters[0].name,'B');assert.equal(speaker.descriptionContext.characters.length,1);
 const disabled=buildSceneInventory(current,'a',{...s,outfits:false,backgrounds:false});assert.equal(buildScenePrompt(disabled,{...s,outfits:false,backgrounds:false}),'');
 assert.equal(automationSettings().commandless,false);
});
test('API mode ignores the prompt-only descriptions toggle and still rechecks complete group membership',()=>{
 const s={enabled:true,mode:'api',commandless:true,backgrounds:true},current=scene();current.backgrounds.locked=false;current.backgrounds.automationLocked=false;
 const offered=buildSceneInventory(current,'a',s);assert.equal(offered.backgrounds.length,1);assert.match(buildScenePrompt(offered,s,{api:true}),/::background/);
 assert.equal(allowedSceneCommand({type:'background',file:'room'},offered,current,s),true);current.characters.pop();assert.equal(allowedSceneCommand({type:'background',file:'room'},offered,current,s),false);
});
