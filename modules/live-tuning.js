// SPDX-License-Identifier: AGPL-3.0-only
import { extension_settings } from '../../../../extensions.js';
import { mountPresetControls, resetVisualSettings } from './preset-controls.js';
import { extensionName } from '../constants.js';
import { layoutSettings, mobileLayout, writeLayoutSetting, setLayoutMode } from './responsive.js';
import { floatingPanel } from './floating-panel.js';

export function setupLiveTuning(anchor, openOutfits) {
    const panel=document.createElement('section');panel.className='ig-live-tuning';panel.setAttribute('aria-label','Live scene tuning');
    panel.innerHTML=`<header><strong>Scene tuning</strong><button type="button" data-live-close aria-label="Close scene tuning">×</button></header>
    <label>Preview layout<select data-live-mode aria-label="Live layout mode"><option value="auto">Automatic</option><option value="desktop">PC (forced)</option><option value="mobile">Mobile (forced)</option></select></label>
    <small data-live-status role="status"></small><div data-live-sliders></div>
    <details data-live-buttons><summary>Buttons</summary><div data-live-button-sliders></div><div data-live-toggles></div><div data-live-choices></div>
    <label><input type="checkbox" data-live-center> Center character buttons</label><small>Character and outfit colors are in the library’s outfit tools.</small></details>
    <details data-live-offsets><summary>Position &amp; outfit menus</summary><div data-live-offset-sliders></div><small>Positive X moves right; positive Y moves down. Popup offsets are limited to the visible screen. Values are separate for PC and Mobile.</small><button type="button" class="menu_button" data-live-reset-offsets>Reset offsets</button></details>
    <details data-live-presets><summary>Presets &amp; reset</summary></details>
    <button type="button" class="menu_button" data-live-outfits>Manage outfits</button>`;
    const popup=floatingPanel(anchor,panel,{pinPosition:true}),controls=[],toggles=[],choices=[];
    const activeLayout=()=>mobileLayout()?'mobile':'desktop';
    const write=(key,value)=>writeLayoutSetting(key,value,activeLayout());
    anchor.addEventListener('click',()=>{sync();const opening=!popup.isOpen;popup.toggle();if(opening)panel.scrollTop=0;});
    panel.querySelector('[data-live-close]').addEventListener('click',()=>popup.close(true));
    panel.querySelector('[data-live-outfits]').addEventListener('click',()=>{popup.close();openOutfits();});
    const mode=panel.querySelector('[data-live-mode]');mode.addEventListener('change',()=>setLayoutMode(mode.value));
    const center=panel.querySelector('[data-live-center]');center.addEventListener('change',()=>write('stageCenterCards',center.checked));
    for(const detail of panel.querySelectorAll('details'))detail.addEventListener('toggle',()=>popup.position());

    function slider(parent,key,label,min,max,fallback,offset=0,typedMin=min,typedMax=max) {
        const field=document.createElement('label');field.className='ig-live-slider';field.append(document.createTextNode(label));
        const pair=document.createElement('span');pair.className='prome-number-pair';
        const range=document.createElement('input'),number=document.createElement('input');range.type='range';number.type='number';number.className='text_pole';
        for(const input of [range,number]){input.min=input===range?min:typedMin;input.max=input===range?max:typedMax;input.step=key==='layoutSpriteScale'?0.5:1;input.dataset.liveSetting=key;input.setAttribute('aria-label',`${label}${input===number?' value':''}`);pair.append(input);}
        const update=value=>{if(value==='')return;const n=Number(value);if(!Number.isFinite(n))return;const bounded=Math.max(typedMin,Math.min(typedMax,n));number.value=bounded;write(key,bounded+offset);};
        range.addEventListener('input',()=>update(range.value));number.addEventListener('change',()=>update(number.value));
        number.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();number.blur();}});
        field.append(pair);parent.append(field);controls.push({key,range,number,fallback,offset});
    }
    for(const args of [['sheldHeightPercent','Chat window height (%) · 0 = auto',0,100,0],['spriteSpacingPercent','Sprite spacing (%)',20,160,100],['layoutSpriteScale','Fit calibration (%) · default 0',-20,20,100,100,-99,500],['spriteOffsetY','All sprites vertical offset (px)',-200,200,0,0,-1000,1000]])slider(panel.querySelector('[data-live-sliders]'),...args);
    for(const args of [['stageOffsetX','Character buttons X (px)',-100,100,0,0,-1000,1000],['stageOffsetY','Character buttons Y (px)',-100,100,0,0,-1000,1000],['outfitPopupOffsetX','Outfit menu X (px)',-100,100,0,0,-1000,1000],['outfitPopupOffsetY','Outfit menu Y (px)',-100,100,0,0,-1000,1000],['outfitMenuRows','Outfit menu visible rows',2,12,6]])slider(panel.querySelector('[data-live-offset-sliders]'),...args);
    for(const args of [['stageFitColumns','Fit character boxes per row',1,8,3],['stageSpeakHeight','Name / Speak height (px; 0 = inherit)',0,80,0],['stageSpeakWidth','Name / Speak width (px; 0 = auto)',0,400,0],['stageSpeakFontSize','Name / Speak text (px; 0 = inherit)',0,32,0],['stageNameLetters','Name abbreviation letters',1,5,3,0,1,40],['stageControlHeight','Button height (px)',24,56,32],['stageFontSize','Button text size (px)',10,22,13],['stageOutfitWidth','Outfit width (px)',80,260,130],['stageGap','Button gap (px)',2,16,6],['stageIdleOpacity','Idle opacity (%)',20,100,75]])slider(panel.querySelector('[data-live-button-sliders]'),...args);
    for(const [key,label] of [['stageAutoFit','Fit character boxes to row'],['stageAbbreviate','Abbreviate character names'],['stageShowBackgroundArrows','Background arrows beside Scene tuning'],['stageShowSpeak','Show Speak buttons'],['stageShowOutfits','Show outfit selectors'],['stageShowNames','Show character names'],['stageShowLocks','Show outfit locks'],['stageNamesAbove','Names / Speak above outfits']]) {
        const field=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.liveToggle=key;const text=document.createElement('span');text.textContent=label;field.append(input,text);
        input.addEventListener('change',()=>write(key,input.checked));panel.querySelector('[data-live-toggles]').append(field);toggles.push({key,input});
    }
    for(const [key,label,entries] of [['stageFlow','When space runs out',[['scroll','Scroll horizontally'],['wrap','Wrap into rows'],['stack','Stack characters']]],['stageSpeakPlacement','Speak buttons',[['top','Above chat'],['bottom','Below textbox']]],['stageOutfitPlacement','Outfit selectors',[['top','Above chat'],['bottom','Below textbox']]]]){
        const field=document.createElement('label'),input=document.createElement('select');input.dataset.liveChoice=key;input.setAttribute('aria-label',label);
        for(const [value,text] of entries)input.append(new Option(text,value));field.append(document.createTextNode(label),input);
        input.addEventListener('change',()=>write(key,input.value));panel.querySelector('[data-live-choices]').append(field);choices.push({key,input});
    }
    const presets=mountPresetControls(panel.querySelector('[data-live-presets]'),{profile:activeLayout,live:true});
    panel.querySelector('[data-live-reset-offsets]').addEventListener('click',()=>resetVisualSettings('offsets',activeLayout()));
    function sync(){
        const s=extension_settings[extensionName],active=activeLayout(),layout=layoutSettings(active);
        mode.value=['desktop','mobile'].includes(s.layoutMode)?s.layoutMode:'auto';center.checked=Boolean(layout.stageCenterCards);
        panel.querySelector('[data-live-status]').textContent=`Tuning the live ${active==='mobile'?'Mobile':'PC'} profile. Window height applies to both.`;
        for(const {key,range,number,fallback,offset} of controls){range.value=(layout[key]??fallback)-offset;if(document.activeElement!==number)number.value=(layout[key]??fallback)-offset;}
        presets.sync();
        for(const {key,input} of toggles)input.checked=Boolean(layout[key]);
        for(const {key,input} of choices)if(document.activeElement!==input)input.value=layout[key];
        requestAnimationFrame(()=>popup.position());
    }
    window.addEventListener('ig-layout-change',sync);window.addEventListener('resize',sync);window.visualViewport?.addEventListener('resize',sync);sync();
    return popup;
}
