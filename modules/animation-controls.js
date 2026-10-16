// SPDX-License-Identifier: AGPL-3.0-only
import { extension_settings } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { extensionName, defaultSettings } from '../constants.js';

export const animationKeys = ['outfit', 'background'].flatMap(kind => ['Enabled', 'Mode', 'Linked', 'Out', 'In'].map(suffix => `${kind}Fade${suffix}`));
const settings = () => extension_settings[extensionName];
function valueFor(key, value) {
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
    if (s[`${kind}FadeLinked`] && (key.endsWith('Out') || key.endsWith('In'))) s[`${kind}FadeOut`] = s[`${kind}FadeIn`] = s[key];
    if (key.endsWith('Linked') && s[key]) s[`${kind}FadeOut`] = s[`${kind}FadeIn`];
    saveSettingsDebounced(); window.dispatchEvent(new Event('ig-layout-change'));
}
export function resetAnimationSettings() {
    for (const key of animationKeys) settings()[key] = defaultSettings[key];
    saveSettingsDebounced(); window.dispatchEvent(new Event('ig-layout-change'));
}
const el = (tag, text = '') => { const node = document.createElement(tag); node.textContent = text; return node; };
export function mountAnimationControls(parent) {
    normalizeAnimationSettings();
    const controls = [], help = el('small', 'Shared between PC and Mobile. Crossfade blends the old scene into the new one. Linked timings keep both values equal; linking uses the current fade-in value. Reduced-motion preferences are respected.');
    parent.append(help);
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
            const key = `${kind}Fade${direction}`, label = el('label', `Fade ${direction.toLowerCase()} (ms)`), pair = el('span');
            label.className = 'ig-live-slider'; pair.className = 'prome-number-pair';
            for (const type of ['range', 'number']) {
                const input = el('input'); input.type = type; input.min = '0'; input.max = '3000'; input.step = '1'; input.dataset.animationSetting = key;
                input.setAttribute('aria-label', `${title}: fade ${direction.toLowerCase()} (ms)${type === 'number' ? ', exact value' : ''}`);
                if (type === 'number') input.className = 'text_pole';
                input.addEventListener(type === 'range' ? 'input' : 'change', () => { if (input.value !== '') writeAnimationSetting(key, input.value); });
                pair.append(input); controls.push(input);
            }
            label.append(pair); group.append(label);
        }
        group.append(el('small', `Defaults: Crossfade, linked timings, ${defaultSettings[`${kind}FadeIn`]} ms. Fades off.`)); parent.append(group);
    }
    const reset = el('button', 'Reset animation defaults'); reset.type = 'button'; reset.className = 'menu_button'; reset.dataset.animationReset = '';
    reset.addEventListener('click', resetAnimationSettings); parent.append(reset);
    function sync() { for (const input of controls) { const value = settings()[input.dataset.animationSetting]; if (input.type === 'checkbox') input.checked = value; else if (input.type !== 'number' || input !== document.activeElement) input.value = value; } }
    window.addEventListener('ig-layout-change', sync); sync();
    return { sync };
}
