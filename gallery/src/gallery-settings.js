// SPDX-License-Identifier: AGPL-3.0-only
// Gallery subsystem derived from LocalImage by mechamarmot; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { DEFAULT_INSTRUCTIONS, integer } from './gallery-model';

let api, content, galleryPrompt, mountObserver;
const el=(tag,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
function field(label,control){const n=el('label');n.append(control,el('span',label));return n;}
function checkbox(parent,label,object,key){
    const input=el('input');input.type='checkbox';input.checked=object[key]===true;input.dataset.gallerySetting=key;
    input.addEventListener('change',()=>{object[key]=input.checked;api.saveSettings();});parent.append(field(label,input));return input;
}
function number(parent,label,object,key,min,max,fallback){
    const row=el('label'),text=el('span',label),input=el('input');input.type='number';input.className='text_pole';input.min=min;input.max=max;input.value=object[key]??fallback;input.dataset.gallerySetting=key;
    input.addEventListener('change',()=>{object[key]=integer(input.value,min,max,fallback);input.value=object[key];api.saveSettings();});row.append(text,input);parent.append(row);
}
function section(title){const n=el('section');n.className='ig-gallery-section';n.append(el('h4',title));content.append(n);return n;}
function buildContent(){
    const s=api.getSettings();content=el('div');content.className='ig-gallery-settings';content.id='ig-gallery-settings-content';
    const intro=el('div');intro.className='ig-gallery-intro';intro.append(el('h3','Gallery'),el('p','Shared and character images, scene descriptions, prompt guidance and display limits.'));
    const promptLink=el('button','Image prompt settings → Automation');promptLink.type='button';promptLink.className='menu_button';promptLink.addEventListener('click',()=>{const tab=document.getElementById('ig-tab-context');if(tab)tab.click();else galleryPrompt.scrollIntoView({block:'start'});});intro.append(promptLink);content.append(intro);
    const prompt=section('Gallery image prompt');galleryPrompt=prompt;prompt.id='ig-gallery-model-prompt';checkbox(prompt,' Enable image instructions and the available-image list',s.prompt,'enabled');
    prompt.append(el('small','Available now. Off by default. Uses your current chat, image descriptions and character/group bindings. Copies exact commands into model context before generation; no extra API call.'));
    const advanced=el('details');advanced.className='ig-gallery-prompt-advanced';advanced.append(el('summary','Instructions & prompt preview'));prompt.append(advanced);
    const instructions=el('textarea');instructions.className='text_pole';instructions.rows=7;instructions.value=s.prompt.instructions;instructions.setAttribute('aria-label','Gallery model instructions');instructions.dataset.gallerySetting='instructions';
    instructions.addEventListener('change',()=>{s.prompt.instructions=instructions.value.slice(0,12000)||DEFAULT_INSTRUCTIONS;instructions.value=s.prompt.instructions;api.saveSettings();});advanced.append(instructions);
    number(advanced,'Maximum images listed in the prompt',s.prompt,'maxImages',1,300,80);
    const actions=el('div');actions.className='local-image-panel-toolbar';const reset=el('button','Restore default instructions');reset.type='button';reset.className='menu_button';reset.addEventListener('click',()=>{s.prompt.instructions=DEFAULT_INSTRUCTIONS;instructions.value=DEFAULT_INSTRUCTIONS;api.saveSettings();});
    const preview=el('button','Preview current prompt');preview.type='button';preview.className='menu_button';const output=el('pre');output.className='ig-gallery-prompt-preview';output.hidden=true;preview.addEventListener('click',()=>{output.hidden=!output.hidden;output.textContent=api.preview()||'No images are eligible in this chat right now. Assign images, check bindings, or adjust cooldowns.';});actions.append(reset,preview);advanced.append(actions,output);
    const limits=section('Image loading limits');checkbox(limits,' Suppress recently shown images',s.limits,'repeatEnabled');number(limits,'Do not repeat within this many rounds',s.limits,'cooldownRounds',0,1000,3);
    const rounds=el('details');rounds.append(el('summary','How rounds and repeats work'),el('small','One round starts with a user message and includes all following group replies. With 3 rounds, an image shown in round 1 can return in round 5. A value of 0 blocks repeats in the same round only. Suppressed commands leave a blank and do not request the image. History and active swipes determine the result, so reloading stays consistent.'));limits.append(rounds);
    checkbox(limits,' Limit images per message',s.limits,'perMessageEnabled');number(limits,'Images per message',s.limits,'maxPerMessage',1,20,1);
    checkbox(limits,' Limit images per round (across group replies)',s.limits,'perRoundEnabled');number(limits,'Images per round',s.limits,'maxPerRound',1,100,1);
    const combined=el('details');combined.append(el('summary','How combined limits work'),el('small','Limits are off by default and can be combined. Suppressed occurrences do not restart the cooldown. Turning a limit off restores eligible images without editing messages.'));limits.append(combined);
    const shortcuts=section('Image display & shortcuts');shortcuts.append(api.createShortcutControls());content.insertBefore(shortcuts,limits);
    const credit=el('small');credit.className='ig-gallery-credit';credit.append(document.createTextNode('Based on LocalImage 1.6.0 by '));const link=el('a','mechamarmot');link.href='https://github.com/mechamarmot/SillyTavern-LocalImage';link.target='_blank';link.rel='noopener noreferrer';credit.append(link,document.createTextNode(' · Original license included.'));content.append(credit);
}
function attach(){
    if(!content)return;
    const shell=document.querySelector('.ig-settings-shell');
    if(shell){
        const nav=shell.querySelector('.ig-settings-tabs'),panes=shell.querySelector('.ig-settings-panes');if(!nav||!panes)return;
        let button=shell.querySelector('[data-ig-tab="gallery"]'),pane=shell.querySelector('[data-ig-pane="gallery"]');
        if(!button){button=el('button','Gallery');button.type='button';button.id='ig-tab-gallery';button.dataset.igTab='gallery';button.setAttribute('role','tab');button.setAttribute('aria-selected','false');button.setAttribute('aria-controls','ig-pane-gallery');button.tabIndex=-1;nav.insertBefore(button,nav.querySelector('[data-ig-tab="context"]')||nav.querySelector('[data-ig-tab="about"]')); }
        if(!pane){pane=el('section');pane.id='ig-pane-gallery';pane.dataset.igPane='gallery';pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby','ig-tab-gallery');pane.tabIndex=0;pane.hidden=true;panes.append(pane);}
        if(content.parentElement!==pane)pane.append(content);
        const automation=shell.querySelector('#ig-automation-gallery')||content;if(galleryPrompt.parentElement!==automation)automation.append(galleryPrompt);
        document.getElementById('localimage-extension-settings')?.remove();
    }else if(!content.isConnected){
        const target=document.getElementById('extensions_settings')||document.getElementById('extensions_settings2');if(!target)return;
        const drawer=el('div');drawer.id='localimage-extension-settings';drawer.className='inline-drawer localimage-extension-settings';
        const header=el('div');header.className='inline-drawer-toggle inline-drawer-header';header.append(el('b','ImmersiveGroups Gallery'));const icon=el('div');icon.className='inline-drawer-icon fa-solid fa-circle-chevron-down down';header.append(icon);
        const body=el('div');body.className='inline-drawer-content';body.style.display='none';body.append(content);drawer.append(header,body);target.append(drawer);
    }
}
export function installGallerySettings(services){
    api=services;if(!content)buildContent();attach();
    function syncDependencies(){
        const s=api.getSettings();
        for(const [toggle,key] of [['repeatEnabled','cooldownRounds'],['perMessageEnabled','maxPerMessage'],['perRoundEnabled','maxPerRound']]){const input=content.querySelector(`[data-gallery-setting="${key}"]`);if(input)input.disabled=!s.limits[toggle];}
        for(const input of galleryPrompt.querySelectorAll('textarea,input[type=number]'))input.disabled=!s.prompt.enabled;
    }
    content.addEventListener('change',syncDependencies);galleryPrompt.addEventListener('change',syncDependencies);syncDependencies();
    if(!mountObserver){let queued=false;mountObserver=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;attach();});});mountObserver.observe(document.body,{childList:true,subtree:true});}
}
