// SPDX-License-Identifier: AGPL-3.0-only
// Disable dependent inputs without clearing their stored preferences.
export function setupSettingsDependencies(){
    function group(toggle,container,selectors='input,select,textarea'){
        const enabled=document.querySelector(toggle),root=document.querySelector(container);if(!enabled||!root)return;
        for(const control of root.querySelectorAll(selectors))if(control!==enabled)control.disabled=!enabled.checked;
    }
    function sync(){
        group('#prome-limit-quick-replies','#ig-quick-replies');
        group('#prome-stage-enabled','#ig-pane-controls');
        const dim=document.getElementById('prome-sprite-defocus-tint');if(dim)for(const field of dim.closest('details').querySelectorAll('[data-prome-stage-setting]'))field.disabled=!dim.checked;
        const stable=document.getElementById('prome-stable-slots');for(const id of ['prome-sprite-spacing','prome-sprite-spacing-number']){const field=document.getElementById(id);if(field)field.disabled=!stable.checked;}
    }
    const root=document.querySelector('.ig-settings-shell');root.addEventListener('change',sync);root.addEventListener('input',sync);
    window.addEventListener('ig-layout-change',sync);window.addEventListener('ig-editor-layout-change',sync);sync();
}
