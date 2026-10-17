// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { extension_settings } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { extensionName } from '../constants.js';

export const layoutKeys = new Set(['stageShowAllOutfits','stageAllOutfitColor','stageAutoFit','stageFitColumns','stageSpeakHeight','stageSpeakWidth','stageSpeakFontSize','stageAbbreviate','stageNameLetters','stageLayout','stageFlow','stageShowSpeak','stageShowOutfits','stageShowNames','stageShowLocks','stageShowManager','stageShowBackgroundArrows','stageControlHeight','stageFontSize','stageOutfitWidth','stageGap','stageIdleOpacity','stageFadeTarget','stageNamesAbove','stageCenterCards','stageSpeakPlacement','stageOutfitPlacement','stageBackgroundPlacement','spriteSpacingPercent','layoutSpriteScale','spriteOffsetY','stageOffsetX','stageOffsetY','outfitPopupOffsetX','outfitPopupOffsetY','outfitMenuRows']);
export function mobileLayout() {
    const s = extension_settings[extensionName];
    if (s.layoutMode === 'desktop') return false;
    if (s.layoutMode === 'mobile') return true;
    return (window.innerWidth) <= (Number(s.mobileLayoutWidth) || 1000);
}
export function editingLayout() { const selected=document.getElementById('ig-edit-layout')?.value;return selected==='desktop'||selected==='mobile'?selected:mobileLayout()?'mobile':'desktop'; }
export function layoutSettings(layout = mobileLayout() ? 'mobile' : 'desktop') {
    const s = extension_settings[extensionName];
    // Only profile-specific keys may override global preferences.
    return layout === 'mobile' ? { ...s, ...Object.fromEntries(Object.entries(s.mobileLayoutSettings || {}).filter(([key]) => layoutKeys.has(key))) } : s;
}
export function writeLayoutSetting(key, value, layout = editingLayout()) {
    const s = extension_settings[extensionName];
    if (layoutKeys.has(key) && layout === 'mobile') (s.mobileLayoutSettings ||= {})[key] = value;
    else s[key] = value;
    saveSettingsDebounced();
    window.dispatchEvent(new Event('ig-layout-change'));
}
export function setLayoutMode(mode) {
    extension_settings[extensionName].layoutMode = ['desktop','mobile'].includes(mode)?mode:'auto';
    const control=document.getElementById('ig-layout-mode');if(control)control.value=extension_settings[extensionName].layoutMode;
    saveSettingsDebounced();window.dispatchEvent(new Event('ig-layout-change'));
}
export function setupResponsive() {
    const s = extension_settings[extensionName];
    // Snapshot the working setup once. Desktop and mobile edits stay independent.
    if (!s.mobileLayoutSettings) s.mobileLayoutSettings = Object.fromEntries([...layoutKeys].map(key => [key, s[key]]));
    if (!s.mobileHeightProfiles) s.mobileHeightProfiles = JSON.parse(JSON.stringify(s.heightProfiles || {}));
    const editor=document.getElementById('ig-edit-layout');
    editor.value=['desktop','mobile'].includes(s.settingsEditProfile)?s.settingsEditProfile:'auto';
    editor.addEventListener('change',()=>{s.settingsEditProfile=editor.value;saveSettingsDebounced();window.dispatchEvent(new Event('ig-editor-layout-change'));});
    let previous=editingLayout();
    const follow=()=>{const current=editingLayout();if(current!==previous){previous=current;window.dispatchEvent(new Event('ig-editor-layout-change'));}};
    window.addEventListener('resize',follow);window.addEventListener('ig-layout-change',follow);
    editor.addEventListener('change',()=>{previous=editingLayout();});
    const mode = document.getElementById('ig-layout-mode');
    mode.value = ['desktop', 'mobile'].includes(s.layoutMode) ? s.layoutMode : 'auto';
    mode.addEventListener('change', () => {
        setLayoutMode(mode.value);
    });
}
