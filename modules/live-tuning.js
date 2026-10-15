// SPDX-License-Identifier: AGPL-3.0-only
import { extension_settings } from '../../../../extensions.js';
import { extensionName } from '../constants.js';
import { layoutSettings, mobileLayout, writeLayoutSetting, setLayoutMode } from './responsive.js';
import { floatingPanel } from './floating-panel.js';

export function setupLiveTuning(anchor, openOutfits) {
    const panel=document.createElement('section');panel.className='ig-live-tuning';panel.setAttribute('aria-label','Live scene tuning');
    panel.innerHTML=`<header><strong>Scene tuning</strong><button type="button" data-live-close aria-label="Close scene tuning">×</button></header>
    <label>Use layout<select data-live-mode aria-label="Live layout mode"><option value="auto">Automatic</option><option value="desktop">PC (forced)</option><option value="mobile">Mobile (forced)</option></select></label>
    <small data-live-status role="status"></small><div data-live-sliders></div>
    <label><input type="checkbox" data-live-center> Center character buttons</label>
    <button type="button" class="menu_button" data-live-outfits>Manage outfits</button>`;
    const popup=floatingPanel(anchor,panel);anchor.addEventListener('click',()=>{sync();popup.toggle();});
    panel.querySelector('[data-live-close]').addEventListener('click',()=>popup.close(true));
    panel.querySelector('[data-live-outfits]').addEventListener('click',()=>{popup.close();openOutfits();});
    const mode=panel.querySelector('[data-live-mode]');mode.addEventListener('change',()=>setLayoutMode(mode.value));
    const center=panel.querySelector('[data-live-center]');center.addEventListener('change',()=>writeLayoutSetting('stageCenterCards',center.checked,mobileLayout()?'mobile':'desktop'));
    const controls=[];
    for(const [key,label,min,max,fallback] of [['sheldHeightPercent','Chat window height (%) · 0 = auto',0,100,0],['spriteSpacingPercent','Sprite spacing (%)',20,160,100],['layoutSpriteScale','Fit calibration (%)',1,600,100]]){
        const field=document.createElement('label');field.className='ig-live-slider';field.append(document.createTextNode(label));
        const pair=document.createElement('span');pair.className='prome-number-pair';
        const range=document.createElement('input'),number=document.createElement('input');range.type='range';number.type='number';number.className='text_pole';
        for(const input of [range,number]){input.min=min;input.max=max;input.step=1;input.dataset.liveSetting=key;input.setAttribute('aria-label',`${label}${input===number?' value':''}`);pair.append(input);}
        const update=value=>{if(value==='')return;const n=Number(value);if(!Number.isFinite(n))return;writeLayoutSetting(key,Math.max(min,Math.min(max,n)),mobileLayout()?'mobile':'desktop');};
        range.addEventListener('input',()=>update(range.value));number.addEventListener('change',()=>update(number.value));
        field.append(pair);panel.querySelector('[data-live-sliders]').append(field);controls.push({key,range,number,fallback});
    }
    function sync(){
        const s=extension_settings[extensionName],active=mobileLayout()?'mobile':'desktop',layout=layoutSettings(active);
        mode.value=['desktop','mobile'].includes(s.layoutMode)?s.layoutMode:'auto';center.checked=Boolean(layout.stageCenterCards);
        panel.querySelector('[data-live-status]').textContent=`Tuning the live ${active==='mobile'?'Mobile':'PC'} profile. Window height applies to both.`;
        for(const {key,range,number,fallback} of controls)range.value=number.value=layout[key]??fallback;
        requestAnimationFrame(()=>popup.position());
    }
    window.addEventListener('ig-layout-change',sync);window.addEventListener('resize',sync);window.visualViewport?.addEventListener('resize',sync);sync();
    return popup;
}
