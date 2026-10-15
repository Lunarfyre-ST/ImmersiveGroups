// SPDX-License-Identifier: AGPL-3.0-only
import { extension_settings } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { captureVisualProfile, applyVisualProfile, exportVisualSettings, validateVisualImport } from './visual-presets.js';
import { extensionName, defaultSettings } from '../constants.js';
import { layoutSettings, mobileLayout, writeLayoutSetting, setLayoutMode } from './responsive.js';
import { floatingPanel } from './floating-panel.js';

export function setupLiveTuning(anchor, openOutfits) {
    const panel=document.createElement('section');panel.className='ig-live-tuning';panel.setAttribute('aria-label','Live scene tuning');
    panel.innerHTML=`<header><strong>Scene tuning</strong><button type="button" data-live-close aria-label="Close scene tuning">×</button></header>
    <label>Use layout<select data-live-mode aria-label="Live layout mode"><option value="auto">Automatic</option><option value="desktop">PC (forced)</option><option value="mobile">Mobile (forced)</option></select></label>
    <small data-live-status role="status"></small><div data-live-sliders></div>
    <details data-live-buttons><summary>Buttons</summary><div data-live-button-sliders></div><div data-live-toggles></div><div data-live-choices></div>
    <label><input type="checkbox" data-live-center> Center character buttons</label><small>Character and outfit colors are in Manage outfits.</small></details>
    <details data-live-offsets><summary>Position &amp; outfit menus</summary><div data-live-offset-sliders></div><small>Positive X moves right; positive Y moves down. Popup offsets are limited to the visible screen. Values are separate for PC and Mobile.</small><button type="button" class="menu_button" data-live-reset-offsets>Reset offsets</button></details>
    <details data-live-presets><summary>Presets &amp; reset</summary><label>Saved visual preset<select data-live-preset aria-label="Visual preset"></select></label><label>Preset name<input type="text" class="text_pole" maxlength="80" data-live-preset-name></label><div class="ig-tool-actions"><button type="button" class="menu_button" data-live-save>Save current</button><button type="button" class="menu_button" data-live-load>Apply</button><button type="button" class="menu_button" data-live-delete>Delete</button><button type="button" class="menu_button" data-live-export>Export layouts</button><button type="button" class="menu_button" data-live-import>Import layouts</button><input type="file" accept="application/json,.json" data-live-file hidden></div><small>Presets apply to the live profile. Exports include both visual profiles, character corrections and presets; no messages or scene descriptions.</small><button type="button" class="menu_button" data-live-reset-scale>Reset scaling corrections</button><button type="button" class="menu_button" data-live-reset-layout>Reset this visual profile</button><small data-live-notice role="status"></small></details>
    <button type="button" class="menu_button" data-live-outfits>Manage outfits</button>`;
    const popup=floatingPanel(anchor,panel),controls=[],toggles=[],choices=[];
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
    for(const args of [['sheldHeightPercent','Chat window height (%) · 0 = auto',0,100,0],['spriteSpacingPercent','Sprite spacing (%)',20,160,100],['layoutSpriteScale','Fit adjustment (%) · default 0',-20,20,100,100,-99,500],['spriteOffsetY','All sprites vertical offset (px)',-200,200,0,0,-1000,1000]])slider(panel.querySelector('[data-live-sliders]'),...args);
    for(const args of [['stageOffsetX','Character buttons X (px)',-100,100,0,0,-1000,1000],['stageOffsetY','Character buttons Y (px)',-100,100,0,0,-1000,1000],['outfitPopupOffsetX','Outfit menu X (px)',-100,100,0,0,-1000,1000],['outfitPopupOffsetY','Outfit menu Y (px)',-100,100,0,0,-1000,1000],['outfitMenuRows','Outfit menu visible rows',2,12,6]])slider(panel.querySelector('[data-live-offset-sliders]'),...args);
    for(const args of [['stageControlHeight','Button height (px)',24,56,32],['stageFontSize','Button text size (px)',10,22,13],['stageOutfitWidth','Outfit width (px)',80,260,130],['stageGap','Button gap (px)',2,16,6],['stageIdleOpacity','Idle opacity (%)',20,100,75]])slider(panel.querySelector('[data-live-button-sliders]'),...args);
    for(const [key,label] of [['stageShowSpeak','Show Speak buttons'],['stageShowOutfits','Show outfit selectors'],['stageShowNames','Show character names'],['stageShowLocks','Show outfit locks'],['stageNamesAbove','Names / Speak above outfits']]) {
        const field=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.liveToggle=key;field.append(input,document.createTextNode(label));
        input.addEventListener('change',()=>write(key,input.checked));panel.querySelector('[data-live-toggles]').append(field);toggles.push({key,input});
    }
    for(const [key,label,entries] of [['stageFlow','When space runs out',[['scroll','Scroll horizontally'],['wrap','Wrap into rows'],['stack','Stack characters']]],['stageSpeakPlacement','Speak buttons',[['top','Above chat'],['bottom','Below textbox']]],['stageOutfitPlacement','Outfit selectors',[['top','Above chat'],['bottom','Below textbox']]]]){
        const field=document.createElement('label'),input=document.createElement('select');input.dataset.liveChoice=key;input.setAttribute('aria-label',label);
        for(const [value,text] of entries)input.append(new Option(text,value));field.append(document.createTextNode(label),input);
        input.addEventListener('change',()=>write(key,input.value));panel.querySelector('[data-live-choices]').append(field);choices.push({key,input});
    }
    const config=()=>extension_settings[extensionName],notice=text=>panel.querySelector('[data-live-notice]').textContent=text;
    const saved=panel.querySelector('[data-live-preset]'),name=panel.querySelector('[data-live-preset-name]');
    function changed(text){saveSettingsDebounced();window.dispatchEvent(new Event('ig-layout-change'));notice(text);}
    function syncPresets(){const names=Object.keys(config().layoutPresets||{}),signature=JSON.stringify(names);if(saved.dataset.signature!==signature){const value=saved.value;saved.replaceChildren(new Option('Choose a preset',''),...names.map(n=>new Option(n,n)));saved.value=value;saved.dataset.signature=signature;}}
    saved.addEventListener('change',()=>{name.value=saved.value;});
    panel.querySelector('[data-live-save]').addEventListener('click',()=>{const key=name.value.trim();if(!key){notice('Enter a preset name.');return;}Object.defineProperty(config().layoutPresets||={},key,{value:captureVisualProfile(config(),activeLayout()),enumerable:true,writable:true,configurable:true});changed(`Saved ${key}.`);saved.value=key;});
    panel.querySelector('[data-live-load]').addEventListener('click',()=>{const key=saved.value;if(!Object.hasOwn(config().layoutPresets||{},key)){notice('Choose a preset.');return;}applyVisualProfile(config(),activeLayout(),config().layoutPresets[key]);changed(`Applied ${key} to ${activeLayout()}.`);});
    panel.querySelector('[data-live-delete]').addEventListener('click',()=>{if(!saved.value)return;delete config().layoutPresets[saved.value];changed('Preset removed.');});
    panel.querySelector('[data-live-export]').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(exportVisualSettings(config()),null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='ImmersiveGroups-visual-layouts.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    const file=panel.querySelector('[data-live-file]');panel.querySelector('[data-live-import]').addEventListener('click',()=>file.click());
    file.addEventListener('change',async()=>{try{const selected=file.files?.[0];if(!selected)return;if(selected.size>2000000)throw new Error('Layout file is too large.');const data=validateVisualImport(JSON.parse(await selected.text()));applyVisualProfile(config(),'desktop',data.desktop);applyVisualProfile(config(),'mobile',data.mobile);config().layoutPresets=data.presets;changed('Imported both visual profiles and presets.');}catch(error){notice(error.message);}finally{file.value='';}});
    panel.querySelector('[data-live-reset-offsets]').addEventListener('click',()=>{for(const key of ['stageOffsetX','stageOffsetY','outfitPopupOffsetX','outfitPopupOffsetY','spriteOffsetY'])write(key,0);changed('Offsets reset for the live profile.');});
    panel.querySelector('[data-live-reset-scale]').addEventListener('click',()=>{const s=config(),key=activeLayout()==='mobile'?'mobileHeightProfiles':'heightProfiles';for(const p of Object.values(s[key]||{}))p.fineTuneOffset=0;s.scaleSprites=false;s.maxSpriteScale=1;const toggle=document.getElementById('prome-sprite-scale');if(toggle)toggle.checked=false;for(const id of ['prome-sprite-scale-size','prome-sprite-scale-size-counter']){const field=document.getElementById(id);if(field)field.value=1;}write('layoutSpriteScale',100);changed('Fit and character fine tuning reset to 0%. Legacy scaling disabled; centimeter heights kept.');});
    panel.querySelector('[data-live-reset-layout]').addEventListener('click',()=>{const profile=captureVisualProfile(defaultSettings,'desktop');const s=config(),map=activeLayout()==='mobile'?s.mobileHeightProfiles:s.heightProfiles;profile.corrections=Object.fromEntries(Object.keys(map||{}).map(avatar=>[avatar,{fineTuneOffset:0,offsetY:0}]));applyVisualProfile(s,activeLayout(),profile);changed('Live visual profile reset; centimeter heights kept.');});
    function sync(){
        const s=extension_settings[extensionName],active=activeLayout(),layout=layoutSettings(active);
        mode.value=['desktop','mobile'].includes(s.layoutMode)?s.layoutMode:'auto';center.checked=Boolean(layout.stageCenterCards);
        panel.querySelector('[data-live-status]').textContent=`Tuning the live ${active==='mobile'?'Mobile':'PC'} profile. Window height applies to both.`;
        for(const {key,range,number,fallback,offset} of controls){range.value=(layout[key]??fallback)-offset;if(document.activeElement!==number)number.value=(layout[key]??fallback)-offset;}
        syncPresets();
        for(const {key,input} of toggles)input.checked=Boolean(layout[key]);
        for(const {key,input} of choices)if(document.activeElement!==input)input.value=layout[key];
        requestAnimationFrame(()=>popup.position());
    }
    window.addEventListener('ig-layout-change',sync);window.addEventListener('resize',sync);window.visualViewport?.addEventListener('resize',sync);sync();
    return popup;
}
