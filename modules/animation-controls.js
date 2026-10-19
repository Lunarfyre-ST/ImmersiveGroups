// SPDX-License-Identifier: AGPL-3.0-only
import { extension_settings } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { extensionName, defaultSettings } from '../constants.js';
import { motionKeys, motionValue, animationDisplayValue, animationStoredValue } from './motion-model.js';
import { mountMotionControls } from './motion-controls.js';

export const animationKeys = [...['outfit', 'background'].flatMap(kind => ['Enabled', 'Mode', 'Linked', 'Out', 'In'].map(suffix => `${kind}Fade${suffix}`)),...motionKeys];
const settings = () => extension_settings[extensionName];
function valueFor(key, value) {
    if(motionKeys.includes(key))return motionValue(key,value);
    if (key.endsWith('Mode')) return value === 'sequential' ? 'sequential' : 'cross';
    if (key.endsWith('Enabled') || key.endsWith('Linked')) return typeof value === 'boolean' ? value : defaultSettings[key];
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(3000, Math.round(n))) : defaultSettings[key];
}
export function normalizeAnimationSettings() {
    const s = settings(); let changed = false;
    for (const key of animationKeys) {
        const value = valueFor(key, s[key] ?? defaultSettings[key]);
        if (s[key] !== value) { s[key] = value; changed = true; }
    }
    for (const kind of ['outfit', 'background']) if (s[`${kind}FadeLinked`] && s[`${kind}FadeOut`] !== s[`${kind}FadeIn`]) {
        s[`${kind}FadeOut`] = s[`${kind}FadeIn`]; changed = true;
    }
    if (changed) saveSettingsDebounced();
}
export function writeAnimationSetting(key, value) {
    if (!animationKeys.includes(key)) return;
    const s = settings(), kind = key.startsWith('outfit') ? 'outfit' : 'background';
    s[key] = valueFor(key, value);
    if (!motionKeys.includes(key)){
        if (s[`${kind}FadeLinked`] && (key.endsWith('Out') || key.endsWith('In'))) s[`${kind}FadeOut`] = s[`${kind}FadeIn`] = s[key];
        if (key.endsWith('Linked') && s[key]) s[`${kind}FadeOut`] = s[`${kind}FadeIn`];
    }
    saveSettingsDebounced(); window.dispatchEvent(new Event('ig-layout-change'));
}
export function resetAnimationSettings() {
    for (const key of animationKeys) settings()[key] = defaultSettings[key];
    saveSettingsDebounced(); window.dispatchEvent(new Event('ig-layout-change'));
}
const el = (tag, text = '') => { const node = document.createElement(tag); node.textContent = text; return node; };
let panelSerial=0;
export function mountAnimationControls(parent) {
    normalizeAnimationSettings();
    const tabs=el('div'),normal=el('div'),experimental=el('div'),serial=++panelSerial;
    tabs.className='ig-animation-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Animation sections');
    const panels=[normal,experimental],buttons=[];let motion;
    for(const [index,title] of ['Animations','Experimental'].entries()){
        const button=el('button',title),panel=panels[index];button.type='button';button.className='menu_button';button.setAttribute('role','tab');button.dataset.animationTab=index===0?'idle':'experimental';button.id=`ig-animation-tab-${serial}-${index}`;panel.id=`ig-animation-panel-${serial}-${index}`;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);button.setAttribute('aria-controls',panel.id);tabs.append(button);buttons.push(button);
        button.addEventListener('click',()=>{for(const [i,p] of panels.entries()){p.hidden=i!==index;buttons[i].setAttribute('aria-selected',String(i===index));buttons[i].tabIndex=i===index?0:-1;}motion?.sync();});
        button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?1:1-index;buttons[next].click();buttons[next].focus();}});
    }
    parent.append(tabs,normal,experimental);buttons[0].click();
    experimental.append(el('p','Experimental effects may interact with native sprite transitions. Enable and adjust them individually.'));
    motion=mountMotionControls(normal,{settings,write:writeAnimationSetting,experimental});
    const controls = [], help = el('small', 'Shared between PC and Mobile. Crossfade blends the old scene into the new one. Linked timings keep both values equal; linking uses the current fade-in value. Reduced-motion preferences are respected.');
    normal.append(help);
    function field(group, key, title, type) {
        const label = el('label'), input = el(type === 'select' ? 'select' : 'input');
        input.dataset.animationSetting = key; input.setAttribute('aria-label', title);
        if (type === 'select') input.append(new Option('Crossfade · together', 'cross'), new Option('Fade out, then fade in', 'sequential'));
        else input.type = type;
        if (type === 'checkbox') label.append(input, document.createTextNode(title)); else label.append(document.createTextNode(title), input);
        input.addEventListener('change', () => writeAnimationSetting(key, type === 'checkbox' ? input.checked : input.value));
        group.append(label); controls.push(input);
    }
    for (const [kind, title] of [['outfit', 'Outfit changes'], ['background', 'Background changes']]) {
        const group = el('div'); group.className = 'ig-animation-group prome-settings-section'; group.append(el('h4', title));
        field(group, `${kind}FadeEnabled`, `Enable ${kind} fades`, 'checkbox');
        field(group, `${kind}FadeMode`, `${title}: transition`, 'select');
        field(group, `${kind}FadeLinked`, 'Link fade-in and fade-out timings', 'checkbox');
        for (const direction of ['Out', 'In']) {
            const key = `${kind}Fade${direction}`, label = el('label', `Fade ${direction.toLowerCase()} (seconds)`), pair = el('span');
            label.className = 'ig-live-slider'; pair.className = 'prome-number-pair';
            for (const type of ['range', 'number']) {
                const input = el('input'); input.type = type; input.min = '0'; input.max = '3'; input.step = type==='range'?'0.1':'any'; input.dataset.animationSetting = key;
                input.setAttribute('aria-label', `${title}: fade ${direction.toLowerCase()} (seconds)${type === 'number' ? ', exact value' : ''}`);
                if (type === 'number') input.className = 'text_pole';
                input.addEventListener(type === 'range' ? 'input' : 'change', () => { if (input.value !== '') writeAnimationSetting(key, animationStoredValue(key,input.value)); });
                pair.append(input); controls.push(input);
            }
            label.append(pair); group.append(label);
        }
        group.append(el('small', `Defaults: Crossfade, linked timings, ${defaultSettings[`${kind}FadeIn`]/1000} seconds. Fades off.`)); normal.append(group);
    }
    const reset = el('button', 'Reset animation defaults'); reset.type = 'button'; reset.className = 'menu_button'; reset.dataset.animationReset = '';
    reset.addEventListener('click', resetAnimationSettings); parent.append(reset);
    function sync() { for (const input of controls) { const key=input.dataset.animationSetting,value = settings()[key]; if (input.type === 'checkbox') input.checked = value; else if (input.type !== 'number' || input !== document.activeElement) input.value = animationDisplayValue(key,value); } motion.sync(); }
    window.addEventListener('ig-layout-change', sync); sync();
    return { sync };
}
