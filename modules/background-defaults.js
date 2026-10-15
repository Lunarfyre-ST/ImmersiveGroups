// SPDX-License-Identifier: AGPL-3.0-only
import { getContext } from '../../../../extensions.js';
import { saveSettingsDebounced, eventSource, event_types, chat_metadata } from '../../../../../script.js';
import { chooseBackgroundDefault } from './background-model.js';
const el=(tag,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
// Only extension settings are saved here. Never save, reload, or edit chat messages.
export function setupBackgroundDefaults({settings,characters,readFiles,pick}) {
    let timer,epoch=0,stoppedScope='',lastScope='';
    const avatars=()=>characters().map(c=>c.avatar).sort();
    const chatKey=()=>{const ctx=getContext(),id=ctx.getCurrentChatId?.();return id?JSON.stringify([ctx.groupId!=null?`group:${ctx.groupId}`:`character:${ctx.characters?.[ctx.characterId]?.avatar||''}`,String(id)]):'';};
    const scope=()=>JSON.stringify([chatKey(),avatars()]);
    const report=text=>{if(status)status.textContent=text;};
    function cancel(){clearTimeout(timer);epoch++;}
    function manual(file){cancel();stoppedScope=scope();const key=chatKey();if(key&&typeof file==='string'&&file){Object.defineProperty(settings().backgroundChatChoices||={},key,{value:file,writable:true,enumerable:true,configurable:true});saveSettingsDebounced();}report('Manual background choice kept for this chat.');}
    async function apply(token,expected){
        const valid=()=>token===epoch&&scope()===expected&&settings().backgroundAutoLoad&&stoppedScope!==expected&&!chat_metadata?.custom_background;
        if(!valid())return;
        try{
            const files=await readFiles();if(!valid())return;
            const s=settings(),key=chatKey(),saved=s.backgroundRestoreChat&&own(s.backgroundChatChoices,key)?s.backgroundChatChoices[key]:'';
            const choice=files.includes(saved)?{file:saved,reason:'saved chat background'}:chooseBackgroundDefault(files,s,avatars());
            if(!choice){report('No matching default or shared linked background.');return;}
            if(!valid())return;pick(choice.file,{automatic:true});report(`Loaded ${choice.file} (${choice.reason}).`);
        }catch(error){report(error.message);console.warn('[ImmersiveGroups] Background default:',error.message);}
    }
    function schedule(){
        cancel();const current=scope();if(current!==lastScope){lastScope=current;stoppedScope='';}
        if(!settings().backgroundAutoLoad||!chatKey()||!avatars().length)return;
        const token=epoch,delay=Math.max(0,Math.min(10000,Number(settings().backgroundAutoDelay)||0));
        timer=setTimeout(()=>apply(token,current),delay);
    }
    // Native user choices also cancel in-flight fetches and pending delayed defaults.
    document.addEventListener('click',event=>{const node=event.target.closest?.('.bg_example');if(node&&node.dataset.igAutomatic!=='true')manual(node.getAttribute('bgfile'));},true);
    for(const key of ['CHAT_CHANGED','GROUP_UPDATED'])if(event_types[key])eventSource.on(event_types[key],()=>{refreshCharacters();schedule();});
    const pane=document.getElementById('ig-pane-backgrounds'),section=el('details');section.className='ig-advanced ig-background-defaults';section.append(el('summary','On chat load'));
    const enabled=el('input');enabled.type='checkbox';enabled.checked=Boolean(settings().backgroundAutoLoad);enabled.dataset.bgAuto='';const enabledLabel=el('label');enabledLabel.append(enabled,document.createTextNode(' Load a matching background when opening a chat'));section.append(enabledLabel);
    const delay=el('input');delay.type='number';delay.className='text_pole';delay.min=0;delay.max=10000;delay.step=100;delay.value=settings().backgroundAutoDelay??1000;delay.setAttribute('aria-label','Background load delay (ms)');const delayLabel=el('label','Delay (milliseconds, 0–10000)');delayLabel.append(delay);section.append(delayLabel);
    const restore=el('input');restore.type='checkbox';restore.checked=settings().backgroundRestoreChat!==false;const restoreLabel=el('label');restoreLabel.append(restore,document.createTextNode(' Restore the last background chosen for this chat first'));section.append(restoreLabel);
    const fallback=el('select');fallback.setAttribute('aria-label','Global default background');const fallbackLabel=el('label','Global fallback');fallbackLabel.append(fallback);section.append(fallbackLabel);
    section.append(el('small','Priority: saved chat choice → exact group → shared character rule → individual character rule → global fallback → first shared linked background. Rules of the same kind use the order below. Native chat background locks always take precedence. A manual choice cancels pending loading.'));
    const toolbar=el('div');toolbar.className='ig-tool-actions';const refresh=el('button','Refresh backgrounds');refresh.type='button';refresh.className='menu_button';const forget=el('button','Forget saved background for this chat');forget.type='button';forget.className='menu_button';toolbar.append(refresh,forget);section.append(toolbar);
    const list=el('div');list.dataset.bgRules='';section.append(list);
    const form=el('details');form.append(el('summary','Add default rule'));
    const title=el('input');title.type='text';title.className='text_pole';title.maxLength=80;title.placeholder='Optional rule name';title.setAttribute('aria-label','Background rule name');form.append(title);
    const match=el('select');match.setAttribute('aria-label','Background rule matching');for(const [value,label] of [['exact','Exactly these chat members'],['all','Chat includes all selected members'],['character','A single character is present']])match.append(new Option(label,value));form.append(match);
    const members=el('div');members.className='ig-background-rule-members';form.append(members);
    const file=el('select');file.setAttribute('aria-label','Rule default background');form.append(file);
    const add=el('button','Add rule');add.type='button';add.className='menu_button';form.append(add);section.append(form);
    const status=el('small');status.setAttribute('role','status');status.dataset.bgDefaultStatus='';section.append(status);pane?.append(section);
    let files=[];
    function refreshCharacters(){const selected=[...members.querySelectorAll('input:checked')].map(n=>n.value);members.replaceChildren();for(const c of characters()){const label=el('label'),check=el('input');check.type='checkbox';check.value=c.avatar;check.checked=!selected.length||selected.includes(c.avatar);label.append(check,document.createTextNode(c.name));members.append(label);}renderRules();}
    function renderRules(){list.replaceChildren();const rules=settings().backgroundDefaultRules||[];if(!rules.length)list.append(el('small','No explicit rules. Add one for a character or for the current group.'));for(const [index,rule] of rules.entries()){
        const row=el('div');row.className='ig-background-rule';
        const names=(rule.characters||[]).map(avatar=>characters().find(c=>c.avatar===avatar)?.name||avatar).join(', ');
        row.append(el('strong',rule.label||rule.file),el('small',`${rule.match==='exact'?'Exactly':rule.match==='all'?'Includes all':'Character'}: ${names} → ${rule.file}`));
        const enabled=el('input');enabled.type='checkbox';enabled.checked=rule.enabled!==false;const enabledLabel=el('label');enabledLabel.append(enabled,document.createTextNode(' Enabled'));enabled.addEventListener('change',()=>{rule.enabled=enabled.checked;saveSettingsDebounced();});row.append(enabledLabel);
        const actions=el('div');actions.className='ig-tool-actions';for(const [label,direction] of [['↑',-1],['↓',1],['Delete',0]]){const button=el('button',label);button.type='button';button.className='menu_button';button.setAttribute('aria-label',`${label==='Delete'?'Delete':direction<0?'Move up':'Move down'} ${rule.label||rule.file}`);button.disabled=direction<0?index===0:direction>0?index===rules.length-1:false;button.addEventListener('click',()=>{if(direction){[rules[index],rules[index+direction]]=[rules[index+direction],rules[index]];}else rules.splice(index,1);saveSettingsDebounced();renderRules();});actions.append(button);}row.append(actions);list.append(row);
    }}
    async function load(){try{files=await readFiles();for(const select of [fallback,file]){const previous=select===fallback?settings().backgroundGlobalDefault:select.value;select.replaceChildren(new Option(select===fallback?'None — use linked backgrounds':'Choose background',''),...files.map(f=>new Option(f,f)));select.value=previous||'';}report(`${files.length} backgrounds available.`);}catch(error){report(error.message);}}
    enabled.addEventListener('change',()=>{settings().backgroundAutoLoad=enabled.checked;saveSettingsDebounced();schedule();});
    delay.addEventListener('change',()=>{const value=Number(delay.value);settings().backgroundAutoDelay=Number.isFinite(value)?Math.max(0,Math.min(10000,value)):1000;delay.value=settings().backgroundAutoDelay;saveSettingsDebounced();schedule();});
    restore.addEventListener('change',()=>{settings().backgroundRestoreChat=restore.checked;saveSettingsDebounced();});
    fallback.addEventListener('change',()=>{settings().backgroundGlobalDefault=fallback.value;saveSettingsDebounced();});
    refresh.addEventListener('click',load);section.addEventListener('toggle',()=>{if(section.open&&!files.length)load();});
    forget.addEventListener('click',()=>{const key=chatKey();if(key)delete settings().backgroundChatChoices?.[key];saveSettingsDebounced();report('Saved background forgotten; applies on next chat load.');});
    add.addEventListener('click',()=>{const selected=[...members.querySelectorAll('input:checked')].map(n=>n.value);if(!file.value||!selected.length){report('Choose a background and at least one character.');return;}if(match.value==='character'&&selected.length!==1){report('A single-character rule needs exactly one selected character.');return;}(settings().backgroundDefaultRules||=[]).push({label:title.value.trim(),file:file.value,characters:selected,match:match.value,enabled:true});saveSettingsDebounced();renderRules();report('Default rule added.');});
    refreshCharacters();schedule();return {cancel,manual,schedule};
}
