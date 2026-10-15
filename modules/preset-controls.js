// SPDX-License-Identifier: AGPL-3.0-only
import { extension_settings } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { extensionName, defaultSettings } from '../constants.js';
import { captureVisualProfile, applyVisualProfile, exportVisualSettings, validateVisualImport } from './visual-presets.js';

const config=()=>extension_settings[extensionName];
function changed(){saveSettingsDebounced();window.dispatchEvent(new Event('ig-layout-change'));}
export function resetVisualSettings(kind,layout){
    const s=config(),target=layout==='mobile'?(s.mobileLayoutSettings||={}):s;
    const profiles=layout==='mobile'?s.mobileHeightProfiles:s.heightProfiles;
    if(kind==='scale'){
        for(const p of Object.values(profiles||{}))p.fineTuneOffset=0;
        target.layoutSpriteScale=100;s.scaleSprites=false;s.maxSpriteScale=1;
        const toggle=document.getElementById('prome-sprite-scale');if(toggle)toggle.checked=false;
        for(const id of ['prome-sprite-scale-size','prome-sprite-scale-size-counter']){const field=document.getElementById(id);if(field)field.value=1;}
    }else if(kind==='layout'){
        const profile=captureVisualProfile(defaultSettings,'desktop');profile.corrections=Object.fromEntries(Object.keys(profiles||{}).map(avatar=>[avatar,{fineTuneOffset:0,offsetY:0}]));applyVisualProfile(s,layout,profile);
    }else if(kind==='controls-offsets'||kind==='offsets'){
        for(const key of ['stageOffsetX','stageOffsetY','outfitPopupOffsetX','outfitPopupOffsetY',...(kind==='offsets'?['spriteOffsetY']:[])])target[key]=0;
    }else return;
    changed();
}
export function mountPresetControls(parent,{profile,live=false}){
    const body=document.createElement('div');body.className='ig-preset-content';
    body.innerHTML=`<small data-presets-scope></small><label>Saved visual preset<select data-live-preset aria-label="Visual preset"></select></label><label>Preset name<input type="text" class="text_pole" maxlength="80" data-live-preset-name></label><div class="ig-tool-actions"><button type="button" class="menu_button" data-live-save>Save current</button><button type="button" class="menu_button" data-live-load>Apply</button><button type="button" class="menu_button" data-live-delete>Delete</button><button type="button" class="menu_button" data-live-export>Export layouts</button><button type="button" class="menu_button" data-live-import>Import layouts</button><input type="file" accept="application/json,.json" data-live-file hidden></div><details class="ig-preset-help"><summary>What is included?</summary><small>Presets apply visual controls and character fine tuning / Y offsets to the selected profile. Exports include both profiles and presets. Messages, centimeter heights, scene descriptions and API settings are excluded.</small></details><button type="button" class="menu_button" data-live-reset-scale>Reset scaling corrections</button><button type="button" class="menu_button" data-live-reset-layout>Reset this visual profile</button><small data-live-notice role="status"></small>`;
    parent.append(body);
    const saved=body.querySelector('[data-live-preset]'),name=body.querySelector('[data-live-preset-name]'),notice=text=>body.querySelector('[data-live-notice]').textContent=text;
    function sync(){
        const names=Object.keys(config().layoutPresets||{}),signature=JSON.stringify(names);
        if(saved.dataset.signature!==signature){const value=saved.value;saved.replaceChildren(new Option('Choose a preset',''),...names.map(n=>new Option(n,n)));saved.value=value;saved.dataset.signature=signature;}
        body.querySelector('[data-presets-scope]').textContent=`Applies to the ${profile()==='mobile'?'Mobile':'PC'} visual profile${live?' currently displayed':''}.`;
    }
    function done(text){changed();notice(text);}
    saved.addEventListener('change',()=>{name.value=saved.value;});
    body.querySelector('[data-live-save]').addEventListener('click',()=>{
        const key=name.value.trim();if(!key){notice('Enter a preset name.');return;}
        Object.defineProperty(config().layoutPresets||={},key,{value:captureVisualProfile(config(),profile()),enumerable:true,writable:true,configurable:true});done(`Saved ${key}.`);saved.value=key;
    });
    body.querySelector('[data-live-load]').addEventListener('click',()=>{
        const key=saved.value;if(!Object.hasOwn(config().layoutPresets||{},key)){notice('Choose a preset.');return;}
        applyVisualProfile(config(),profile(),config().layoutPresets[key]);done(`Applied ${key} to ${profile()==='mobile'?'Mobile':'PC'}.`);
    });
    body.querySelector('[data-live-delete]').addEventListener('click',()=>{if(!saved.value)return;delete config().layoutPresets[saved.value];done('Preset removed.');});
    body.querySelector('[data-live-export]').addEventListener('click',()=>{
        const url=URL.createObjectURL(new Blob([JSON.stringify(exportVisualSettings(config()),null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='ImmersiveGroups-visual-layouts.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    const file=body.querySelector('[data-live-file]');body.querySelector('[data-live-import]').addEventListener('click',()=>file.click());
    file.addEventListener('change',async()=>{
        try{
            const selected=file.files?.[0];if(!selected)return;if(selected.size>2000000)throw new Error('Layout file is too large.');
            const data=validateVisualImport(JSON.parse(await selected.text()));applyVisualProfile(config(),'desktop',data.desktop);applyVisualProfile(config(),'mobile',data.mobile);config().layoutPresets=data.presets;done('Imported both visual profiles and presets.');
        }catch(error){notice(error.message);}finally{file.value='';}
    });
    body.querySelector('[data-live-reset-scale]').addEventListener('click',()=>{resetVisualSettings('scale',profile());notice('Fit and fine tuning reset to 0%. Legacy scaling disabled; centimeter heights kept.');});
    body.querySelector('[data-live-reset-layout]').addEventListener('click',()=>{resetVisualSettings('layout',profile());notice('Visual profile reset; centimeter heights kept.');});
    window.addEventListener('ig-layout-change',sync);window.addEventListener('ig-editor-layout-change',sync);sync();
    return {sync};
}
