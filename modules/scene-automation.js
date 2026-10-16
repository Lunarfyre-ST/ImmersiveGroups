// SPDX-License-Identifier: AGPL-3.0-only
import { extension_settings, getContext } from '../../../../extensions.js';
import { eventSource, event_types, saveSettingsDebounced, isGenerating } from '../../../../../script.js';
import { extensionName } from '../constants.js';
import { getSceneContext, stageCharacters, requestAutomaticOutfit } from './stage-controls.js';
import { onCatalogChange } from './outfit-catalog.js';
import { ensureBackgrounds, requestAutomaticBackground } from './scene-backgrounds.js';
import { automationSettings, SCENE_PROMPT_KEY, buildSceneInventory, buildScenePrompt, messageSpeaker, parseSceneCommands, allowedSceneCommand, stripSceneCommands, stripSceneHistoryPrompt, plannerMessages, recentPlannerMessages, DEFAULT_ALL_INSTRUCTIONS, DEFAULT_SPEAKER_INSTRUCTIONS } from './scene-automation-model.js';
import { renderSceneCommandText } from './scene-command-view.js';
import { callScenePlanner } from './scene-api.js';

const root=()=>extension_settings[extensionName],settings=()=>automationSettings(root().sceneAutomation);
let epoch=0,ticket=null,drafted='',previewSpeaker='',apiBusy=false,apiAbort=null,previewTimer,domFrame=null,panel,statusText='Scene automation is off.',apiKey='',tokenSerial=0;
let pendingApi=null,autoTimer=null,groupRunning=false;
const chatKey=()=>{const c=getContext();return JSON.stringify([c.groupId??null,c.getCurrentChatId?.()??null,c.groupId==null?c.characters?.[c.characterId]?.avatar||'':null]);};
function lastReply(){const chat=getContext().chat||[];for(let i=chat.length-1;i>=0;i--)if(!chat[i].is_user&&!chat[i].is_system)return {message:chat[i],index:i};return null;}
function speaker({force_chid}={}){
    const c=getContext(),members=stageCharacters(),forced=c.characters?.[force_chid]?.avatar,current=c.characters?.[c.characterId]?.avatar;
    return [forced,drafted,current,messageSpeaker(lastReply()?.message,members)].find(avatar=>members.some(member=>member.avatar===avatar))||'';
}
function inventory(avatar){return buildSceneInventory(getSceneContext(),avatar,settings());}
function status(text){statusText=text;const node=panel?.querySelector('[data-scene-status]');if(node)node.textContent=text;}
function cancel(){epoch++;ticket=null;pendingApi=null;clearTimeout(autoTimer);autoTimer=null;apiAbort?.abort();}
let commandObserver=null,commandChat=null,allCommandRows=false;
const commandRows=new Set();
function renderCommands(rows){
    if(rows===undefined)allCommandRows=true;else for(const row of rows)commandRows.add(row);
    if(domFrame!==null)return;
    domFrame=requestAnimationFrame(()=>{
        domFrame=null;const s=settings(),chat=document.getElementById('chat');
        if(commandChat!==chat){commandObserver?.disconnect();commandChat=chat;allCommandRows=true;}
        const targets=allCommandRows?chat?.querySelectorAll('.mes_text')||[]:[...commandRows];
        allCommandRows=false;commandRows.clear();commandObserver?.disconnect();
        try{for(const row of targets)if(row.isConnected)renderSceneCommandText(row,s.enabled&&s.hideCommands);}
        finally{if(commandChat?.isConnected)commandObserver?.observe(commandChat,{childList:true,subtree:true,characterData:true});}
    });
}
function changedCommandRows(records){
    const rows=new Set();
    for(const record of records){
        const element=record.target.nodeType===Node.ELEMENT_NODE?record.target:record.target.parentElement,row=element?.closest('.mes_text');
        if(row)rows.add(row);
        for(const node of record.addedNodes||[])if(node.nodeType===Node.ELEMENT_NODE){if(node.matches('.mes_text'))rows.add(node);for(const child of node.querySelectorAll('.mes_text'))rows.add(child);}
    }
    if(rows.size)renderCommands(rows);
}

function updateInjection(avatar=speaker(),skip=false){
    const s=settings(),text=!skip&&s.enabled&&s.mode==='prompt'?buildScenePrompt(inventory(avatar),s):'';
    getContext().setExtensionPrompt?.(SCENE_PROMPT_KEY,text,1,s.depth,false,0);
    return text;
}
async function prepare(avatar){if(settings().backgrounds)await ensureBackgrounds();return inventory(avatar);}
function snapshot(message,index,offered,automatic=false){return {key:chatKey(),epoch,message,index,automatic,text:message.mes,swipe:message.swipe_id,inventory:offered,chatId:getContext().getCurrentChatId?.(),groupId:getContext().groupId};}
function validSnapshot(snap){const c=getContext(),s=settings();return s.enabled&&(!snap.recent||snap.recent.every(r=>c.chat?.includes(r.message)&&r.message.mes===r.text&&r.message.swipe_id===r.swipe))&&(!snap.automatic||(s.mode==='api'&&s.apiAutoAfterReply&&c.chat?.at(-1)===snap.message))&&snap.epoch===epoch&&snap.key===chatKey()&&c.chat?.[snap.index]===snap.message&&snap.message.mes===snap.text&&snap.message.swipe_id===snap.swipe;}
async function execute(text,snap){
    const parsed=parseSceneCommands(text),results=[];
    for(const command of parsed.commands){
        if(!validSnapshot(snap)){results.push({type:command.type,applied:false,reason:'Chat, message or settings changed.'});break;}
        const scene=getSceneContext();
        if(!allowedSceneCommand(command,snap.inventory,scene,settings())){results.push({type:command.type,applied:false,reason:'Locked, unavailable or outside the permitted character scope.'});continue;}
        try{
            let applied=false;
            const isCurrent=()=>validSnapshot(snap)&&allowedSceneCommand(command,snap.inventory,getSceneContext(),settings());
            if(command.type==='outfit'){
                const current=scene.characters.find(c=>c.avatar===command.avatar);
                if(current.currentOutfit===command.folder){results.push({type:'outfit',applied:false,reason:'Already wearing this outfit.'});continue;}
                applied=await requestAutomaticOutfit({...command,chatId:snap.chatId,groupId:snap.groupId,allowDuringGeneration:true,isCurrent});
            }else{
                if(scene.backgrounds.current===command.file){results.push({type:'background',applied:false,reason:'Background already selected.'});continue;}
                applied=await requestAutomaticBackground({...command,chatId:snap.chatId,groupId:snap.groupId,isCurrent});
            }
            results.push({type:command.type,applied,reason:applied?'Applied.':'Change cancelled.'});
        }catch(error){results.push({type:command.type,applied:false,reason:error.message});}
    }
    const changed=results.filter(r=>r.applied).length;
    status(`${changed} scene change${changed===1?'':'s'} applied.${results.length>changed?' '+results.filter(r=>!r.applied).map(r=>r.reason).join(' '):''}${parsed.issues.length?' '+parsed.issues.join(' '):''}${!results.length&&!parsed.issues.length?' No applicable scene commands.':''}`);
    updateInjection();renderCommands();return {results,issues:parsed.issues};
}
async function begin(type,options={},dryRun=false){
    if(['quiet','impersonate'].includes(type)||(apiBusy&&!apiAbort?.signal.aborted)){updateInjection('',true);return;}
    const avatar=speaker(options),s=settings();
    if(!dryRun){cancel();ticket=null;}
    if(!s.enabled){updateInjection();return;}
    const marker=epoch,key=chatKey(),chat=getContext().chat||[],last=chat.at(-1);
    const initial={length:chat.length,message:last,text:last?.mes,swipe:last?.swipe_id};
    let offered;
    try{offered=await prepare(avatar);}catch(error){status(`Could not load scene context: ${error.message}`);updateInjection('',true);return;}
    if(marker!==epoch||key!==chatKey())return;
    updateInjection(avatar);
    if(!dryRun&&(s.mode==='prompt'||s.apiAutoAfterReply))ticket={epoch:marker,key,mode:s.mode,inventory:offered,initial};
    if(dryRun)status('Prompt preview prepared; scene commands will not execute for a dry run.');
}
async function completed(id,type){
    renderCommands();const current=ticket;if(!current||['quiet','impersonate','first_message'].includes(type))return;
    const index=Number(id),chat=getContext().chat||[],message=chat[index];
    if(!Number.isInteger(index)||index!==chat.length-1||!message||message.is_user||message.is_system)return;
    if(current.epoch!==epoch||current.key!==chatKey())return;
    if(index<current.initial.length-1)return;
    if(message===current.initial.message&&message.mes===current.initial.text&&message.swipe_id===current.initial.swipe)return;
    ticket=null;
    const actualSpeaker=messageSpeaker(message,stageCharacters());
    // In speaker-only mode a generation cannot retarget itself by naming someone else.
    if(current.inventory.scope==='speaker'&&(!actualSpeaker||actualSpeaker!==current.inventory.speakerAvatar)){status('Ignored scene commands: reply speaker did not match the drafted character.');return;}
    if(current.mode==='api'){
        if(!settings().apiAutoAfterReply||settings().mode!=='api')return;
        pendingApi={...snapshot(message,index,current.inventory,true),queuedAt:Date.now()};
        status(groupRunning?'API analysis queued for the end of the group round…':'API analysis queued until roleplay generation finishes…');syncUi();scheduleAutomaticApi();return;
    }
    return execute(message.mes,snapshot(message,index,current.inventory));
}
async function applyLastReply(){
    if(isGenerating()||apiBusy)throw new Error('Wait for the current generation to finish.');
    if(!settings().enabled)throw new Error('Enable scene commands first.');
    const last=lastReply();if(!last)throw new Error('No assistant reply is available.');
    const marker=epoch,key=chatKey(),offered=await prepare(messageSpeaker(last.message,stageCharacters()));
    if(marker!==epoch||key!==chatKey())throw new Error('Chat changed.');return execute(last.message.mes,snapshot(last.message,last.index,offered));
}
function scheduleAutomaticApi(){
    clearTimeout(autoTimer);autoTimer=null;
    if(!pendingApi||groupRunning)return;
    autoTimer=setTimeout(runAutomaticApi,100);
}
async function runAutomaticApi(){
    autoTimer=null;const pending=pendingApi,s=settings();if(!pending)return;
    if(!s.enabled||s.mode!=='api'||!s.apiAutoAfterReply||!validSnapshot(pending)||lastReply()?.message!==pending.message){pendingApi=null;syncUi();return;}
    if(groupRunning)return;
    if(isGenerating()||apiBusy){
        if(Date.now()-pending.queuedAt>120000){pendingApi=null;status('Automatic API analysis skipped: generation did not become idle. You can retry manually.');syncUi();return;}
        scheduleAutomaticApi();return;
    }
    pendingApi=null;
    try{await analyzeLastReply(pending);}catch(error){status(`Automatic API analysis: ${error.message}`);}
}
async function analyzeLastReply(automatic=null){
    if(isGenerating()||apiBusy)throw new Error('Wait for the current generation or automation request to finish.');
    const s=settings();if(!s.enabled)throw new Error('Enable scene commands first.');
    if(automatic&&(!s.apiAutoAfterReply||s.mode!=='api'||!validSnapshot(automatic)||lastReply()?.message!==automatic.message))return;
    pendingApi=null;clearTimeout(autoTimer);autoTimer=null;
    const last=lastReply();if(!last)throw new Error('No assistant reply is available.');
    const marker=epoch,key=chatKey(),text=last.message.mes,swipe=last.message.swipe_id,controller=new AbortController();
    // Reserve the request before any await so a double-click cannot bill twice.
    apiAbort=controller;apiBusy=true;panel.querySelector('[data-scene-api-response]').textContent='';syncUi();status(automatic?'Automatically analyzing the last assistant reply…':'Analyzing the last assistant reply…');
    const timeout=setTimeout(()=>controller.abort(),90000);
    const aborted=new Promise((_,reject)=>{controller.signal.addEventListener('abort',()=>reject(new Error('Automation request cancelled.')),{once:true});});
    try{
        const offered=await Promise.race([prepare(messageSpeaker(last.message,stageCharacters())),aborted]);
        if(controller.signal.aborted||marker!==epoch||key!==chatKey()||text!==last.message.mes||swipe!==last.message.swipe_id||(automatic&&!validSnapshot(automatic)))throw new Error('Chat or reply changed.');
        const prompt=buildScenePrompt(offered,s,{api:true});if(!prompt)throw new Error('No unlocked outfits or eligible backgrounds are available.');
        const snap=snapshot(last.message,last.index,offered,Boolean(automatic));
        const recent=recentPlannerMessages(getContext().chat||[],last.index,s.apiRecentMessages);
        snap.recent=recent.map(message=>({message,text:message.mes,swipe:message.swipe_id}));
        const request=callScenePlanner(getContext(),s,plannerMessages(prompt,last.message,recent),{signal:controller.signal,apiKey});
        // Main-API requests have no extension-owned abort signal; late results
        // are discarded. Profile/custom transports also receive our signal.
        const response=await Promise.race([request,aborted]);
        if(!validSnapshot(snap)||controller.signal.aborted)throw new Error('Chat or reply changed; response discarded.');
        panel.querySelector('[data-scene-api-response]').textContent=response;
        return await execute(response,snap);
    }finally{clearTimeout(timeout);apiBusy=false;if(apiAbort===controller)apiAbort=null;updateInjection();syncUi();}
}

function syncUi(){
    if(!panel)return;const s=settings();
    for(const input of panel.querySelectorAll('[data-scene-setting]')){
        const key=input.dataset.sceneSetting;
        if(document.activeElement!==input){if(input.type==='checkbox')input.checked=Boolean(s[key]);else input.value=s[key];}
        if(key!=='enabled')input.disabled=!s.enabled||(key==='backgroundLinkedOnly'&&!s.backgrounds);
    }
    const offered=inventory(previewSpeaker||speaker()),background=getSceneContext().backgrounds;
    panel.querySelector('[data-scene-background-status]').textContent=!s.backgrounds?'Background changes are off.':background.locked||background.automationLocked?'Background changes are locked; no background commands are offered.':`${offered.backgrounds.length} background${offered.backgrounds.length===1?'':'s'} in context${s.backgroundLinkedOnly?' — linked to every active character.':' — shared links and unlinked backgrounds.'}${!offered.backgrounds.length&&s.backgroundLinkedOnly?' No shared links found. Add character bindings in the background library; unlinked backgrounds are not used as a fallback.':''}`;
    panel.querySelector('[data-scene-prompt-options]').hidden=s.mode!=='prompt';
    panel.querySelector('[data-scene-api-options]').hidden=s.mode!=='api';
    panel.querySelector('[data-scene-custom-options]').hidden=s.apiTransport!=='custom';
    panel.querySelector('[data-scene-profile-options]').hidden=s.apiTransport!=='profile';
    for(const button of panel.querySelectorAll('[data-scene-run],[data-scene-apply]'))button.disabled=!s.enabled||apiBusy;
    panel.querySelector('[data-scene-cancel]').disabled=!apiBusy&&!pendingApi;
    panel.querySelector('[data-scene-api-state]').textContent=s.apiAutoAfterReply?`Automatic analysis is on: one call after each solo reply or completed group round, using up to ${s.apiRecentMessages} recent message${s.apiRecentMessages===1?'':'s'}.`:'Automatic analysis is off. Use Analyze & apply last reply to test manually.';
    const select=panel.querySelector('[data-scene-profile]'),profiles=extension_settings.connectionManager?.profiles||[],signature=JSON.stringify(profiles.map(p=>[p.id,p.name]));
    if(select.dataset.signature!==signature&&document.activeElement!==select){select.replaceChildren(new Option('Choose a profile',''),...profiles.map(p=>new Option(p.name||p.id,p.id)));select.dataset.signature=signature;select.value=s.apiProfile;}
    const preview=panel.querySelector('[data-scene-speaker]'),characters=stageCharacters(),members=JSON.stringify(characters.map(c=>[c.avatar,c.name]));
    if(preview.dataset.signature!==members){preview.replaceChildren(new Option('Automatic (current / last speaker)',''),...characters.map(c=>new Option(c.name,c.avatar)));preview.value=characters.some(c=>c.avatar===previewSpeaker)?previewSpeaker:'';previewSpeaker=preview.value;preview.dataset.signature=members;}
    panel.querySelector('[data-scene-status]').textContent=statusText;
}
async function previewPrompt(){
    syncUi();const serial=++tokenSerial,s=settings(),key=chatKey();
    try{
        const offered=await prepare(previewSpeaker||speaker());if(serial!==tokenSerial||key!==chatKey())return;
        const text=buildScenePrompt(offered,s,{api:s.mode==='api'}),output=panel.querySelector('[data-scene-preview]');output.textContent=text||'No unlocked outfits or eligible backgrounds for this scope.';
        const counter=panel.querySelector('[data-scene-tokens]'),ctx=getContext();let count,approx=false;
        counter.textContent='Counting tokens…';
        if(typeof ctx.getTokenCountAsync==='function'){try{count=await ctx.getTokenCountAsync(text,0);}catch{approx=true;}}
        if(!Number.isFinite(count)){count=Math.ceil(text.length/4);approx=true;}
        if(serial!==tokenSerial||key!==chatKey())return;counter.textContent=`${approx?'Approximately ':''}${count} tokens${approx?' (character estimate)':' (current SillyTavern tokenizer)'}. ${offered.characters.length} outfit targets; ${offered.backgrounds.length} backgrounds.${s.enabled?'':' Preview only — automation is off.'}`;
    }catch(error){if(serial===tokenSerial)panel.querySelector('[data-scene-preview]').textContent=error.message;}
}
function schedulePreview(){clearTimeout(previewTimer);previewTimer=setTimeout(()=>{syncUi();if(panel.querySelector('[data-scene-preview-section]').open)previewPrompt();},120);}
function loadBackgroundContext(){if(settings().enabled&&settings().backgrounds)ensureBackgrounds().then(()=>{updateInjection();syncUi();schedulePreview();}).catch(error=>status(`Background context: ${error.message}`));}
function setupUi(){
    panel=document.createElement('section');panel.id='ig-scene-automation';panel.className='ig-gallery-section ig-scene-automation';
    panel.innerHTML=`<h4>Scene commands &amp; context</h4><label><input type="checkbox" data-scene-setting="enabled"> Enable model outfit / background commands</label><small>Off by default. Only fresh replies execute commands automatically; opening a chat does not replay its history. Manual outfit and background selectors keep working.</small>
    <div class="ig-settings-grid"><label>Mode<select data-scene-setting="mode"><option value="prompt">Prompt — commands in the RP reply</option><option value="api">API — separate scene analysis</option></select></label><label>Outfit context<select data-scene-setting="scope"><option value="all">All active, unlocked characters</option><option value="speaker">Speaking character only</option></select></label></div>
    <label><input type="checkbox" data-scene-setting="outfits"> Allow outfit changes</label><label><input type="checkbox" data-scene-setting="backgrounds"> Allow background changes</label>
    <div id="ig-scene-gallery-prompt"></div><div data-scene-background-options><label><input type="checkbox" data-scene-setting="backgroundLinkedOnly"> Linked backgrounds only (default)</label><small>Only backgrounds linked to every active character are offered to the model, including in speaking-character-only outfit mode. Uncheck to also include unlinked backgrounds. Stars affect sorting, not eligibility. Manual background choices remain available.</small><small data-scene-background-status role="status"></small><button type="button" class="menu_button" data-scene-background-library>Manage background links &amp; descriptions</button></div>
    <label><input type="checkbox" data-scene-setting="hideCommands"> Hide scene commands in displayed messages</label><label><input type="checkbox" data-scene-setting="includeDescriptions"> Include outfit / background descriptions</label>
    <div data-scene-prompt-options><label>Scene command placement<select data-scene-setting="commandPlacement"><option value="before">Always before</option><option value="after">Always after</option><option value="auto">Automatic — let the LLM decide</option></select></label><label>Injection depth<input class="text_pole" type="number" min="0" max="10000" step="1" data-scene-setting="depth"></label><small>Inserted as a system message through SillyTavern’s extension-prompt hook. Depth 0 is nearest the reply; default 1. A movable Prompt Manager entry is planned.</small></div>
    <details><summary>Prompt instructions &amp; catalog size</summary><label>All-character outfit instructions<textarea class="text_pole" rows="3" maxlength="6000" data-scene-setting="instructionsAll"></textarea></label><label>Speaker-only outfit instructions<textarea class="text_pole" rows="3" maxlength="6000" data-scene-setting="instructionsSpeaker"></textarea></label><label>Outfits per character<input type="number" class="text_pole" min="1" max="100" data-scene-setting="maxOutfits"></label><label>Backgrounds in context<input type="number" class="text_pole" min="1" max="100" data-scene-setting="maxBackgrounds"></label><button type="button" class="menu_button" data-scene-reset-instructions>Restore scene instructions</button></details>
    <details data-scene-preview-section><summary>Preview context &amp; token count</summary><label>Preview speaker<select data-scene-speaker aria-label="Scene preview speaker"></select></label><small>Preview only. Actual group generations use the member SillyTavern drafted; API trials use the last reply’s author.</small><button type="button" class="menu_button" data-scene-preview-refresh>Refresh preview</button><small data-scene-tokens></small><pre data-scene-preview></pre></details>
    <div data-scene-api-options><h4>Separate API analysis</h4><small>Sends the selected number of recent messages and the scene catalog, then applies valid returned commands. The final assistant reply determines the resulting scene. Your active connection profile stays unchanged.</small><label><input type="checkbox" data-scene-setting="apiAutoAfterReply"> Automatically analyze new replies</label><small data-scene-api-state></small><small>Off by default. Waits for roleplay generation to finish; runs once per group round. Opening chats, selecting existing swipes, quiet generations and prompt previews do not trigger a call. Uses the destination configured below.</small>
    <label>Destination<select data-scene-setting="apiTransport"><option value="main">Current main API</option><option value="profile">Connection profile</option><option value="custom">Custom OpenAI-compatible URL</option></select></label>
    <label data-scene-profile-options>Connection profile<select data-scene-setting="apiProfile" data-scene-profile></select></label>
    <div data-scene-custom-options><label>Full chat-completions URL<input type="url" class="text_pole" data-scene-setting="apiUrl" placeholder="http://localhost:8080/v1/chat/completions"></label><label>Model name<input class="text_pole" type="text" data-scene-setting="apiModel"></label><label>API key (this page session only)<input class="text_pole" type="password" data-scene-api-key autocomplete="off"></label><small>The browser must be allowed to reach this URL. Custom servers may need CORS enabled. Cancel discards every response; a main-API request may continue on the server.</small></div>
    <label>Recent messages sent to API (default 1)<input type="range" min="1" max="5" step="1" data-scene-setting="apiRecentMessages"><input aria-label="Recent API messages value" class="text_pole" type="number" min="1" max="1000" data-scene-setting="apiRecentMessages"></label><small>The slider covers 1–5; type up to 1000. Includes user and assistant messages in order, omitting system messages. Larger windows use more input tokens.</small><label>Maximum output tokens<input class="text_pole" type="number" min="32" max="2048" data-scene-setting="apiMaxTokens"></label><div class="ig-tool-actions"><button type="button" class="menu_button" data-scene-run>Analyze &amp; apply last reply</button><button type="button" class="menu_button" data-scene-cancel>Cancel API analysis</button></div><details><summary>Last API response</summary><pre data-scene-api-response></pre></details></div>
    <details><summary>Command reference &amp; manual test</summary><p>Put exact commands on separate lines before, between paragraphs, or after the RP text:</p><code>::outfit &quot;character-avatar.png&quot; &quot;Character/outfit2&quot;::<br>::background &quot;estate.jpg&quot;::</code><small>Use actual IDs / folders from the preview. Only listed visible outfits and eligible backgrounds are accepted. Outfit locks and background locks apply to model commands; manual selectors remain available. Existing swipe selections are not replayed automatically.</small><button type="button" class="menu_button" data-scene-apply>Apply commands from last reply</button></details><small role="status" data-scene-status></small>`;
    const parent=document.getElementById('ig-pane-context');parent.prepend(panel);
    for(const input of panel.querySelectorAll('[data-scene-setting]'))input.addEventListener(input.type==='range'?'input':'change',()=>{
        const key=input.dataset.sceneSetting,value=input.type==='checkbox'?input.checked:['number','range'].includes(input.type)?Number(input.value):input.value;
        root().sceneAutomation=automationSettings({...settings(),[key]:value});saveSettingsDebounced();cancel();syncUi();updateInjection();renderCommands();schedulePreview();
        window.dispatchEvent(new Event('ig-automation-state-change'));
        if(['enabled','backgrounds'].includes(key))loadBackgroundContext();
        if(key==='enabled')status(settings().enabled?'Scene commands enabled.':'Scene automation is off.');
    });
    panel.querySelector('[data-scene-background-library]').addEventListener('click',()=>document.getElementById('ig-open-backgrounds')?.click());
    panel.querySelector('[data-scene-speaker]').addEventListener('change',event=>{previewSpeaker=event.target.value;previewPrompt();});
    panel.querySelector('[data-scene-preview-refresh]').addEventListener('click',previewPrompt);
    panel.querySelector('[data-scene-preview-section]').addEventListener('toggle',event=>{if(event.target.open)previewPrompt();});
    panel.querySelector('[data-scene-reset-instructions]').addEventListener('click',()=>{root().sceneAutomation={...settings(),instructionsAll:DEFAULT_ALL_INSTRUCTIONS,instructionsSpeaker:DEFAULT_SPEAKER_INSTRUCTIONS};saveSettingsDebounced();cancel();syncUi();updateInjection();schedulePreview();});
    panel.querySelector('[data-scene-api-key]').addEventListener('input',event=>{apiKey=event.target.value;});
    panel.querySelector('[data-scene-run]').addEventListener('click',()=>analyzeLastReply().catch(error=>status(error.message)));
    panel.querySelector('[data-scene-apply]').addEventListener('click',()=>applyLastReply().catch(error=>status(error.message)));
    panel.querySelector('[data-scene-cancel]').addEventListener('click',()=>{cancel();status('Automation request cancelled.');});syncUi();
}
export function setupSceneAutomation(){
    root().sceneAutomation=automationSettings(root().sceneAutomation);setupUi();
    if(event_types.GENERATION_AFTER_COMMANDS)eventSource.on(event_types.GENERATION_AFTER_COMMANDS,begin);
    if(event_types.GENERATION_STARTED)eventSource.on(event_types.GENERATION_STARTED,(type,options,dryRun)=>{if(['quiet','impersonate'].includes(type)){updateInjection('',true);return;}if(!dryRun)cancel();updateInjection(speaker(options),['quiet','impersonate'].includes(type)||apiBusy);});
    if(event_types.GROUP_WRAPPER_STARTED)eventSource.on(event_types.GROUP_WRAPPER_STARTED,()=>{groupRunning=true;});
    if(event_types.GROUP_MEMBER_DRAFTED)eventSource.on(event_types.GROUP_MEMBER_DRAFTED,id=>{drafted=getContext().characters?.[id]?.avatar||'';updateInjection();schedulePreview();});
    if(event_types.GROUP_WRAPPER_FINISHED)eventSource.on(event_types.GROUP_WRAPPER_FINISHED,()=>{groupRunning=false;drafted='';updateInjection();scheduleAutomaticApi();});
    if(event_types.CHARACTER_MESSAGE_RENDERED)eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED,completed);
    if(event_types.GENERATION_ENDED)eventSource.on(event_types.GENERATION_ENDED,()=>{const pending=ticket;setTimeout(()=>{if(ticket===pending&&pending?.mode==='prompt')completed((getContext().chat?.length||0)-1);scheduleAutomaticApi();},0);});
    if(event_types.GENERATION_STOPPED)eventSource.on(event_types.GENERATION_STOPPED,()=>{cancel();status('Generation stopped; pending scene changes cancelled.');});
    for(const name of ['CHAT_CHANGED','GROUP_CHAT_CHANGED','GROUP_UPDATED'])if(event_types[name])eventSource.on(event_types[name],()=>{cancel();groupRunning=false;drafted='';updateInjection();renderCommands();schedulePreview();});
    for(const name of ['MESSAGE_SWIPED','MESSAGE_EDITED','MESSAGE_DELETED'])if(event_types[name])eventSource.on(event_types[name],()=>{cancel();renderCommands();updateInjection();schedulePreview();});
    if(event_types.SETTINGS_UPDATED)eventSource.on(event_types.SETTINGS_UPDATED,()=>{updateInjection();schedulePreview();renderCommands();});
    if(event_types.CHAT_COMPLETION_PROMPT_READY)eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY,data=>{
        if(!settings().enabled||apiBusy)return;
        const key=Array.isArray(data?.chat)?'chat':Array.isArray(data?.messages)?'messages':null;if(!key)return;
        data[key]=data[key].map(message=>{
            if(message.role==='system'||message.role==='developer')return message;
            return {...message,content:typeof message.content==='string'?stripSceneCommands(message.content):Array.isArray(message.content)?message.content.map(part=>part?.type==='text'?{...part,text:stripSceneCommands(part.text)}:part):message.content};
        });
    });
    if(event_types.GENERATE_AFTER_COMBINE_PROMPTS)eventSource.on(event_types.GENERATE_AFTER_COMBINE_PROMPTS,data=>{if(settings().enabled&&!apiBusy&&typeof data?.prompt==='string')data.prompt=stripSceneHistoryPrompt(data.prompt);});
    onCatalogChange(()=>{updateInjection();schedulePreview();});
    window.addEventListener('ig-background-catalog-change',()=>{updateInjection();schedulePreview();});
    window.addEventListener('ig-layout-change',()=>{updateInjection();schedulePreview();renderCommands();});
    commandObserver=new MutationObserver(changedCommandRows);
    updateInjection();renderCommands();loadBackgroundContext();
    return Object.freeze({preview:()=>buildScenePrompt(inventory(previewSpeaker||speaker()),settings()),getStatus:()=>({enabled:settings().enabled,mode:settings().mode,scope:settings().scope,automatic:settings().apiAutoAfterReply,pending:Boolean(pendingApi),busy:apiBusy,status:statusText}),applyLastReply,analyzeLastReply:()=>analyzeLastReply()});
}
