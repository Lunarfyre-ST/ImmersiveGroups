import test from 'node:test';
import assert from 'node:assert/strict';
import {automationSettings,buildSceneInventory,buildScenePrompt,outfitCommand,backgroundCommand,parseSceneCommands,allowedSceneCommand,stripSceneCommands,stripSceneHistoryPrompt,messageSpeaker,plannerMessages,recentPlannerMessages,customEndpoint,DEFAULT_ALL_INSTRUCTIONS,DEFAULT_SPEAKER_INSTRUCTIONS} from '../modules/scene-automation-model.js';
import {callScenePlanner,extractPlannerText} from '../modules/scene-api.js';
const character=(avatar,name,locked=false)=>({avatar,name,outfitLocked:locked,currentOutfit:name+'/one',outfits:[{folder:name+'/one',name:'Main',description:'Travel clothes'},{folder:name+'/two',name:'Sleep',description:'For sleeping'}]});
const scene=()=>({characters:[character('a.png','A'),character('b.png','B'),character('c.png','C',true)],backgrounds:{current:'forest.jpg',locked:false,automationLocked:false,library:[{file:'forest.jpg',available:true,description:'Outdoors',characterBindings:[]},{file:'room.jpg',available:true,description:'A room',characterBindings:['a.png','b.png','c.png']},{file:'a-only.jpg',available:true,characterBindings:['a.png']},{file:'gone.jpg',available:false,characterBindings:[]}]}});
const enabled={enabled:true,backgrounds:true,backgroundLinkedOnly:false};
test('0.2 upgrades untouched outfit instructions and preserves edited prompts and API preferences',()=>{
 const old={instructionsAll:'You may change outfits for any listed character, but only when the scene makes the change appropriate. Prioritize the speaking character. Do not change other characters just because they are listed.',instructionsSpeaker:'Only the speaking character listed below may receive an outfit change. Do not generate outfit commands for anyone else. Change their outfit only when the scene makes it appropriate.',apiTransport:'custom',apiUrl:'http://localhost:8080/v1/chat/completions',apiAutoAfterReply:true};
 const upgraded=automationSettings(old);assert.equal(upgraded.instructionsAll,DEFAULT_ALL_INSTRUCTIONS);assert.equal(upgraded.instructionsSpeaker,DEFAULT_SPEAKER_INSTRUCTIONS);assert.equal(upgraded.apiTransport,'custom');assert.equal(upgraded.apiUrl,old.apiUrl);assert.equal(upgraded.apiAutoAfterReply,true);
 const custom=automationSettings({...old,instructionsAll:'My custom group rules.',instructionsSpeaker:'My custom speaker rules.'});assert.equal(custom.instructionsAll,'My custom group rules.');assert.equal(custom.instructionsSpeaker,'My custom speaker rules.');assert.equal(old.instructionsAll.includes('EVERY'),false);
});
test('group-wide examples and mode-specific reply formats do not tell RP mode to output commands only',()=>{
 const inventory=buildSceneInventory(scene(),'b.png',enabled),rp=buildScenePrompt(inventory,enabled),api=buildScenePrompt(inventory,enabled,{api:true});
 assert.ok(rp.includes('check EVERY listed character'));assert.ok(rp.includes('including non-speaking characters'));assert.ok(rp.includes('swimsuits'));assert.ok(rp.includes('sleepwear'));
 assert.ok(rp.includes('RP reply format: Write the roleplay first'));assert.equal(rp.includes('API reply format:'),false);assert.ok(api.includes('API reply format: send only the appropriate command lines, or NONE.'));assert.equal(api.includes('RP reply format:'),false);
 const speakerOnly=buildScenePrompt(buildSceneInventory(scene(),'b.png',{...enabled,scope:'speaker'}),{...enabled,scope:'speaker'});assert.ok(speakerOnly.includes('Do not generate outfit commands for anyone else, even if'));assert.equal(speakerOnly.includes('check EVERY listed character'),false);
});
test('background context defaults to shared links and never falls back to unlinked images',()=>{
 const settings=automationSettings({enabled:true,backgrounds:true}),current=scene();assert.equal(settings.backgroundLinkedOnly,true);
 assert.deepEqual(buildSceneInventory(current,'a.png',settings).backgrounds.map(b=>b.file),['room.jpg']);
 current.backgrounds.library[1].characterBindings=['a.png'];assert.deepEqual(buildSceneInventory(current,'a.png',settings).backgrounds,[]);
 current.characters=[];assert.deepEqual(buildSceneInventory(current,'',settings).backgrounds,[]);
});
test('background filtering applies before the cap and remains group-wide in speaker-only mode',()=>{
 const current=scene(),settings={...enabled,backgroundLinkedOnly:true,scope:'speaker',maxBackgrounds:1};
 current.backgrounds.library[0].favorite=true;
 const inventory=buildSceneInventory(current,'a.png',settings);assert.deepEqual(inventory.backgrounds.map(b=>b.file),['room.jpg']);assert.equal(inventory.characters.length,1);
 const prompt=buildScenePrompt(inventory,settings);assert.ok(prompt.includes(backgroundCommand('room.jpg')));assert.equal(prompt.includes(backgroundCommand('forest.jpg')),false);assert.equal(prompt.includes('Outdoors'),false);
 assert.equal(plannerMessages(buildScenePrompt(inventory,settings,{api:true}),{mes:'Scene'}).some(m=>m.content.includes(backgroundCommand('forest.jpg'))),false);
});
test('background restrictions recheck live settings, links and offered commands',()=>{
 const current=scene(),offered=buildSceneInventory(current,'a.png',enabled),unlinked={type:'background',file:'forest.jpg'},linked={type:'background',file:'room.jpg'},restricted={...enabled,backgroundLinkedOnly:true};
 assert.equal(allowedSceneCommand(unlinked,offered,current,enabled),true);assert.equal(allowedSceneCommand(unlinked,offered,current,restricted),false);assert.equal(allowedSceneCommand(linked,offered,current,restricted),true);
 current.backgrounds.library[1].characterBindings=[];assert.equal(allowedSceneCommand(linked,offered,current,restricted),false);
 const narrower=buildSceneInventory(scene(),'a.png',restricted);assert.equal(allowedSceneCommand(unlinked,narrower,scene(),enabled),false);
});
test('all-character context omits locked members and preserves exact commands and descriptions',()=>{
 const inventory=buildSceneInventory(scene(),'b.png',enabled),prompt=buildScenePrompt(inventory,enabled);
 assert.deepEqual(inventory.characters.map(c=>c.avatar),['a.png','b.png']);assert.ok(prompt.includes(outfitCommand('b.png','B/two')));assert.ok(prompt.includes('For sleeping'));assert.match(prompt,/Prioritize the speaking character/);assert.equal(prompt.includes('C/two'),false);assert.deepEqual(inventory.backgrounds.map(b=>b.file),['forest.jpg','room.jpg']);
});
test('speaker-only context and execution cannot retarget another member',()=>{
 const settings={...enabled,scope:'speaker'},current=scene(),inventory=buildSceneInventory(current,'b.png',settings);
 assert.deepEqual(inventory.characters.map(c=>c.avatar),['b.png']);assert.equal(allowedSceneCommand({type:'outfit',avatar:'a.png',folder:'A/two'},inventory,current,settings),false);assert.equal(allowedSceneCommand({type:'outfit',avatar:'b.png',folder:'B/two'},inventory,current,settings),true);
 assert.equal(buildSceneInventory(current,'',settings).characters.length,0);
});
test('locks, hidden/removed outfits, bindings and feature switches are rechecked at execution',()=>{
 const current=scene(),inventory=buildSceneInventory(current,'a.png',enabled),outfit={type:'outfit',avatar:'a.png',folder:'A/two'},background={type:'background',file:'room.jpg'};
 current.characters[0].outfitLocked=true;assert.equal(allowedSceneCommand(outfit,inventory,current,enabled),false);current.characters[0].outfitLocked=false;current.characters[0].outfits=[];assert.equal(allowedSceneCommand(outfit,inventory,current,enabled),false);
 current.backgrounds.locked=true;assert.equal(allowedSceneCommand(background,inventory,current,enabled),false);current.backgrounds.locked=false;current.backgrounds.automationLocked=true;assert.equal(allowedSceneCommand(background,inventory,current,enabled),false);current.backgrounds.automationLocked=false;current.backgrounds.library[1].characterBindings=['a.png'];assert.equal(allowedSceneCommand(background,inventory,current,enabled),false);
 assert.equal(allowedSceneCommand(background,inventory,scene(),{...enabled,enabled:false}),false);assert.equal(buildSceneInventory(scene(),'a.png',{...enabled,backgrounds:false}).backgrounds.length,0);
});
test('parser accepts standalone commands before, within and after roleplay, escaping and last change per target',()=>{
 const cmd=outfitCommand('a".png','A/two');assert.deepEqual(parseSceneCommands('Roleplay\n'+cmd).commands,[{type:'outfit',avatar:'a".png',folder:'A/two'}]);
 assert.deepEqual(parseSceneCommands('RP\n'+outfitCommand('a.png','A/one')+'\n'+outfitCommand('a.png','A/two')+'\n'+backgroundCommand('room.jpg')).commands,[{type:'outfit',avatar:'a.png',folder:'A/two'},{type:'background',file:'room.jpg'}]);
 assert.equal(parseSceneCommands('RP '+backgroundCommand('room.jpg')).commands.length,0);assert.equal(parseSceneCommands(backgroundCommand('room.jpg')+'\nMore RP').commands.length,1);
});
test('examples, reasoning and malformed commands do not execute',()=>{
 for(const text of ['```\n'+backgroundCommand('room.jpg')+'\n```','```\n'+backgroundCommand('room.jpg'),'<think>\n'+backgroundCommand('room.jpg'),'`'+backgroundCommand('room.jpg')+'`'])assert.equal(parseSceneCommands(text).commands.length,0);
 assert.equal(parseSceneCommands('::outfit bad syntax::').issues.length,1);assert.equal(parseSceneCommands('::outfit "a.png" "bad\\q"::').commands.length,0);
});
test('history stripping preserves the system command protocol and does not mutate source messages',()=>{
 const s=scene(),inventory=buildSceneInventory(s,'a.png',enabled),prompt=buildScenePrompt(inventory,enabled),message={name:'A',mes:'Scene\n'+outfitCommand('a.png','A/two')};
 assert.equal(stripSceneCommands(message.mes),'Scene\n');const request=plannerMessages(prompt,message);assert.equal(message.mes.includes('::outfit'),true);assert.equal(request.length,2);assert.equal(request[1].content.includes('::outfit'),false);assert.ok(stripSceneHistoryPrompt(prompt+'\n'+backgroundCommand('room.jpg')).includes(outfitCommand('a.png','A/two')));assert.equal(stripSceneHistoryPrompt(prompt+'\n'+backgroundCommand('room.jpg')).endsWith(backgroundCommand('room.jpg')),false);
});
test('speaker identification rejects ambiguous names and excludes user/system messages',()=>{
 const members=[{avatar:'a',name:'Same'},{avatar:'b',name:'Same'}];assert.equal(messageSpeaker({name:'Same'},members),'');assert.equal(messageSpeaker({original_avatar:'b'},members),'b');assert.equal(messageSpeaker({is_user:true,original_avatar:'b'},members),'');
});
test('main and profile API trials pass only explicit messages without switching profiles',async()=>{
 const messages=[{role:'system',content:'catalog'},{role:'user',content:'last reply'}],calls=[],ctx={generateRaw:async args=>{calls.push(args);return 'NONE';},ConnectionManagerRequestService:{sendRequest:async(...args)=>{calls.push(args);return {content:'NONE'};}}};
 assert.equal(await callScenePlanner(ctx,automationSettings({apiTransport:'main'}),messages),'NONE');assert.deepEqual(calls[0].prompt,messages);
 assert.equal(await callScenePlanner(ctx,automationSettings({apiTransport:'profile',apiProfile:'profile-id'}),messages),'NONE');assert.equal(calls[1][0],'profile-id');assert.deepEqual(calls[1][1],messages);assert.equal(calls[1][3].stream,false);
});
test('custom API requests omit credentials and carry only a session-supplied key',async t=>{
 let request;t.mock.method(globalThis,'fetch',async(url,options)=>{request={url,options};return {ok:true,json:async()=>({choices:[{message:{content:'NONE'}}]})};});
 const s=automationSettings({apiTransport:'custom',apiUrl:'http://localhost:8080/v1/chat/completions',apiModel:'test-model'});assert.equal(await callScenePlanner({},s,[{role:'user',content:'last reply'}],{apiKey:'session-test-key'}),'NONE');assert.equal(request.options.credentials,'omit');assert.equal(request.options.headers.Authorization,'Bearer session-test-key');assert.equal(request.options.redirect,'error');assert.equal(JSON.parse(request.options.body).stream,false);assert.equal(JSON.stringify(s).includes('session-test-key'),false);
 assert.throws(()=>customEndpoint('javascript:alert(1)'));assert.throws(()=>customEndpoint('https://name:password@example.com/v1/chat/completions'));
});

test('all-character prompts keep the catalog prefix stable when the speaker changes',()=>{
 const a=buildScenePrompt(buildSceneInventory(scene(),'a.png',enabled),enabled),b=buildScenePrompt(buildSceneInventory(scene(),'b.png',enabled),enabled);
 const footer='Speaking character:';assert.equal(a.slice(0,a.indexOf(footer)),b.slice(0,b.indexOf(footer)));assert.ok(a.indexOf(footer)>a.indexOf('Allowed commands'));
});

test('placement instructions stay consistent in both prompt and API modes',()=>{
 for(const placement of ['before','after','auto']){
  const s={...enabled,commandPlacement:placement},inventory=buildSceneInventory(scene(),'a.png',s),rp=buildScenePrompt(inventory,s),api=buildScenePrompt(inventory,s,{api:true});
  assert.match(rp,placement==='before'?/BEFORE the roleplay/:placement==='after'?/AFTER the roleplay/:/between paragraphs/);
  assert.equal(api.includes('RP reply format:'),false);assert.match(api,/API reply format:/);
 }
 const command=backgroundCommand('room.jpg');assert.equal(parseSceneCommands('First paragraph\n'+command+'\nSecond paragraph').commands.length,1);
 for(const prefix of ['```','~~~','<think>','<analysis>','<!--'])assert.equal(parseSceneCommands(prefix+'\n'+command+'\nNarration').commands.length,0);
 assert.equal(parseSceneCommands('<think>\n'+command+'\n</think>\n'+command).commands.length,1);
});

test('API history uses a bounded chronological window without changing messages',()=>{
 const chat=[{is_system:true,mes:'private system prompt'},{is_user:true,name:'User',mes:'Everyone goes to the bath.'},{name:'A',mes:'We arrive.\n'+backgroundCommand('room.jpg')},{is_user:true,name:'User',mes:'Get changed.'},{name:'B',mes:'We do.'}],original=JSON.stringify(chat);
 assert.deepEqual(recentPlannerMessages(chat,4,1),[chat[4]]);assert.deepEqual(recentPlannerMessages(chat,4,3),chat.slice(2));assert.equal(recentPlannerMessages(chat,4,100).length,4);
 const body=JSON.parse(plannerMessages('catalog',chat[4],recentPlannerMessages(chat,4,3))[1].content.split('\n').slice(1).join('\n'));
 assert.deepEqual(body.messages.map(m=>m.role),['assistant','user','assistant']);assert.equal(body.messages[0].text.includes('::background'),false);assert.equal(JSON.stringify(chat),original);assert.equal(automationSettings().apiRecentMessages,1);assert.equal(automationSettings({apiRecentMessages:Infinity}).apiRecentMessages,1000);
});

test('API token limits, truncated results and malformed transport data fail before applying commands',async t=>{
 const calls=[],ctx={generateRaw:async options=>{calls.push(options);return 'NONE';}};
 for(const value of [0,-1,3.5,NaN,Infinity,2049])await assert.rejects(()=>callScenePlanner(ctx,{apiTransport:'main',apiMaxTokens:value},[{role:'user',content:'text'}]),/output tokens/);
 assert.equal(calls.length,0);
 for(const tokens of [32,256,2048]){await callScenePlanner(ctx,automationSettings({apiMaxTokens:tokens}),[{role:'user',content:'text'}]);assert.equal(calls.at(-1).responseLength,tokens);}
 for(const data of [{choices:[{finish_reason:'length',message:{content:backgroundCommand('room.jpg')}}]},{error:{message:'Context window exceeded'}},{choices:[{message:{content:null}}]}])assert.throws(()=>extractPlannerText(data));
 t.mock.method(globalThis,'fetch',async()=>({ok:false,status:400,json:async()=>({error:{message:'maximum context length exceeded'}})}));
 await assert.rejects(()=>callScenePlanner({},automationSettings({apiTransport:'custom',apiUrl:'http://localhost/v1/chat/completions',apiModel:'test'}),[{role:'user',content:'text'}]),/context length/);
});
