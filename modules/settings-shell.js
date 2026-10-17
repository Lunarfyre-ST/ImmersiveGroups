// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { extension_settings } from '../../../../extensions.js';
import { eventSource, event_types } from '../../../../../script.js';
import { automationSettings, isCommandless } from './scene-automation-model.js';
import { mountAnimationControls } from './animation-controls.js';
import { setupSceneAnimations } from './scene-animations.js';
import { mountPresetControls, resetVisualSettings } from './preset-controls.js';
import { extensionName } from '../constants.js';
import { setupResponsive, mobileLayout, editingLayout, layoutKeys } from './responsive.js';

export function setupSettingsShell() {
    setupResponsive();
    setupSceneAnimations();
    mountAnimationControls(document.querySelector('[data-ig-animation-controls]'));
    mountPresetControls(document.querySelector('[data-ig-presets]'),{profile:editingLayout});
    for(const button of document.querySelectorAll('[data-ig-reset]'))button.addEventListener('click',()=>resetVisualSettings(button.dataset.igReset,editingLayout()));
    for(const link of document.querySelectorAll('[data-ig-document]')){link.href=new URL('../'+link.dataset.igDocument,import.meta.url).href;link.rel='noopener noreferrer';}
    const live=document.createElement('small');live.className='ig-layout-status';document.querySelector('.ig-settings-toolbar')?.append(live);
    const status=document.createElement('div');status.className='ig-automation-summary';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-label','Automation configuration');live.after(status);
    function showAutomation(){
        const root=extension_settings[extensionName],s=automationSettings(root.sceneAutomation),g=root.gallery||{};
        const placement={auto:'Auto',before:'Start of message',after:'End of message'}[g.prompt?.placement]||'End of message';
        const fields=[['automation',`Automation: ${s.enabled?'On':'Off'}`,s.enabled,'Master switch for outfit and background automation. Gallery instructions have their own switch.'],['mode',`Mode: ${s.mode==='api'?'API':'Prompt'}`,s.enabled,'Configured scene automation mode.'],['outfits',`Outfits: ${s.enabled&&s.outfits?s.scope==='speaker'?'Speaker':'All':'Off'}`,s.enabled&&s.outfits,'Active outfit automation scope.'],['background',`Background: ${s.enabled&&s.backgrounds?'On':'Off'}`,s.enabled&&s.backgrounds,'Background automation.'],['gallery',`Gallery: ${g.enabled!==false&&g.prompt?.enabled?'On':'Off'} | ${placement}`,g.enabled!==false&&g.prompt?.enabled,'Gallery image instructions and requested command placement. Image rendering has its own switch in Gallery.']];
        for(const [key,text,on,title] of fields){let pill=status.querySelector(`[data-ig-summary="${key}"]`);if(!pill){pill=document.createElement('span');pill.dataset.igSummary=key;status.append(pill);}if(pill.textContent!==text)pill.textContent=text;pill.dataset.enabled=String(Boolean(on));pill.title=title;}
        if(s.enabled&&isCommandless(s))for(const [key,text,on] of [['automation','Automation: Off (context only)',false],['mode','Mode: Descriptions only',true],['outfits',`Outfits: ${s.outfits?'Current descriptions':'Off'}`,s.outfits],['background',`Background: ${s.backgrounds?'Current description':'Off'}`,s.backgrounds]]){const pill=status.querySelector(`[data-ig-summary="${key}"]`);pill.textContent=text;pill.dataset.enabled=String(on);pill.title='Scene reference only. Model outfit and background changes are disabled.';}
    }
    for(const name of ['ig-automation-state-change','ig-gallery-change','ig-layout-change'])window.addEventListener(name,showAutomation);
    eventSource.on(event_types.SETTINGS_UPDATED,showAutomation);showAutomation();
    const showLayout=()=>{
        const s=extension_settings[extensionName], active=mobileLayout()?'mobile':'desktop';
        const forced=s.layoutMode==='desktop'||s.layoutMode==='mobile';
        const mismatch=editingLayout()!==active;
        live.textContent=`Live: ${active==='mobile'?'Mobile':'PC'} (${forced?'forced':`automatic · ${Math.round(window.innerWidth)} CSS px`}). ${mismatch?'You are editing the other profile. Use Preview layout to see that profile in the chat.':'Editing the live profile.'}`;
        live.classList.toggle('ig-profile-mismatch',mismatch);
        for(const badge of document.querySelectorAll('[data-ig-profile-badge]'))badge.textContent=editingLayout()==='mobile'?'Mobile':'PC';
    };
    // Mark only controls whose values are stored independently per profile.
    const profileControls=[...document.querySelectorAll('[data-prome-stage-setting]')].filter(control=>layoutKeys.has(control.dataset.promeStageSetting));
    profileControls.push(...['prome-sprite-spacing','prome-profile-fine-slider','prome-profile-y-slider'].map(id=>document.getElementById(id)).filter(Boolean));
    const marked=new Set();
    for(const control of profileControls){
        const label=control.closest('label')||(control.parentElement.previousElementSibling?.matches('label')?control.parentElement.previousElementSibling:control.parentElement);
        if(marked.has(label))continue;marked.add(label);
        const badge=document.createElement('small');badge.className='ig-profile-badge';badge.dataset.igProfileBadge='';
        if(label.classList.contains('prome-number-setting'))label.firstElementChild.append(badge);
        else if(control.type!=='checkbox'&&label.contains(control))control.before(badge);
        else label.append(badge);
    }
    // Shared scope is explicit too, so a Mobile profile never implies every toggle is mobile-only.
    for(const control of document.querySelectorAll('[data-prome-stage-setting]')){
        if(layoutKeys.has(control.dataset.promeStageSetting))continue;
        const label=control.closest('label');if(!label||marked.has(label))continue;marked.add(label);
        const badge=document.createElement('small');badge.className='ig-profile-badge ig-shared-badge';badge.textContent='Shared';
        if(label.classList.contains('prome-number-setting'))label.firstElementChild.append(badge);else label.append(badge);
    }
    for(const id of ['prome-profile-cm','prome-stage-enabled','prome-stable-slots','prome-profiles-enabled','prome-sprite-defocus-tint','prome-limit-quick-replies','prome-sheld-height-number','prome-mobile-layout-width-number']){
        const control=document.getElementById(id),label=control?.closest('label')||document.querySelector(`label[for="${id}"]`);if(!label||marked.has(label))continue;marked.add(label);
        const badge=document.createElement('small');badge.className='ig-profile-badge ig-shared-badge';badge.textContent='Shared';label.append(badge);
    }
    window.addEventListener('resize',showLayout);window.visualViewport?.addEventListener('resize',showLayout);window.addEventListener('ig-layout-change',showLayout);window.addEventListener('ig-editor-layout-change',showLayout);showLayout();
    const shell=document.querySelector('.ig-settings-shell');if(!shell)return;
    const buttons=()=>[...shell.querySelectorAll('[data-ig-tab]')];
    function select(key,focus=false){
        for(const button of buttons()){const active=button.dataset.igTab===key;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active&&focus)button.focus();}
        for(const pane of shell.querySelectorAll('[data-ig-pane]'))pane.hidden=pane.dataset.igPane!==key;
        shell.dataset.activeTab=key;

    }
    shell.addEventListener('click',event=>{const button=event.target.closest('[data-ig-tab]');if(button)select(button.dataset.igTab);});
    shell.querySelector('[role=tablist]').addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        const tabs=buttons();let index=tabs.indexOf(document.activeElement);if(index<0)return;
        event.preventDefault();index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(tabs[index].dataset.igTab,true);
    });
    const align=()=>shell.classList.toggle('ig-centered-tabs',Boolean(extension_settings[extensionName].settingsTabsCentered));
    window.addEventListener('ig-layout-change',align);align();select('chat');
}
