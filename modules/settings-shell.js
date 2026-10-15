// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { extension_settings } from '../../../../extensions.js';
import { extensionName } from '../constants.js';
import { setupResponsive, mobileLayout, editingLayout, layoutKeys } from './responsive.js';

export function setupSettingsShell() {
    setupResponsive();
    for(const link of document.querySelectorAll('[data-ig-document]')){link.href=new URL('../'+link.dataset.igDocument,import.meta.url).href;link.rel='noopener noreferrer';}
    const live=document.createElement('small');live.className='ig-layout-status';document.querySelector('.ig-settings-toolbar')?.append(live);
    const showLayout=()=>{
        const s=extension_settings[extensionName], active=mobileLayout()?'mobile':'desktop';
        const forced=s.layoutMode==='desktop'||s.layoutMode==='mobile';
        const mismatch=editingLayout()!==active;
        live.textContent=`Live: ${active==='mobile'?'Mobile':'PC'} (${forced?'forced':`automatic · width ${Math.round(window.innerWidth)} CSS px ≤ ${s.mobileLayoutWidth||1000} px selects Mobile`}). ${mismatch?'You are editing the other profile. Force that layout above to preview changes.':'Editing the live profile.'}`;
        live.classList.toggle('ig-profile-mismatch',mismatch);
        for(const badge of document.querySelectorAll('[data-ig-profile-badge]'))badge.textContent=editingLayout()==='mobile'?'Mobile':'PC';
    };
    // Mark only controls whose values are stored independently per profile.
    const profileControls=[...document.querySelectorAll('[data-prome-stage-setting]')].filter(control=>layoutKeys.has(control.dataset.promeStageSetting));
    profileControls.push(...['prome-sprite-spacing','prome-profile-fine-slider'].map(id=>document.getElementById(id)).filter(Boolean));
    const marked=new Set();
    for(const control of profileControls){
        const label=control.closest('label')||(control.parentElement.previousElementSibling?.matches('label')?control.parentElement.previousElementSibling:control.parentElement);
        if(marked.has(label))continue;marked.add(label);
        const badge=document.createElement('small');badge.className='ig-profile-badge';badge.dataset.igProfileBadge='';
        if(label.classList.contains('prome-number-setting'))label.firstElementChild.append(badge);
        else if(control.type!=='checkbox'&&label.contains(control))control.before(badge);
        else label.append(badge);
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
    window.addEventListener('ig-layout-change',align);align();select('controls');
}
