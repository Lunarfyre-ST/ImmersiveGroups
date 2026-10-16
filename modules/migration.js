// SPDX-License-Identifier: AGPL-3.0-only
// ImmersiveGroups modifications, 2026-10-15. Legacy settings are retained as backups.
const own = (object,key) => Object.prototype.hasOwnProperty.call(object || {},key);
const record = value => value && typeof value==='object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
const put = (object,key,value) => Object.defineProperty(object,key,{value,writable:true,enumerable:true,configurable:true});

export function migrateSettings(settings) {
    let changed=false;
    if(!own(settings,'ImmersiveGroups')||!record(settings.ImmersiveGroups)){put(settings,'ImmersiveGroups',{});changed=true;}
    const root=settings.ImmersiveGroups;
    if(root.schemaVersion===1)return {settings:root,changed};
    const scene=own(settings,'Prome-VN-Extension')&&record(settings['Prome-VN-Extension'])?settings['Prome-VN-Extension']:{};
    // A new scene setup already uses the current height model. Legacy installs
    // still run their old conversion, retaining saved scales and centimeter values.
    const freshScene=Object.keys(scene).length===0&&!Object.keys(root).some(key=>!['gallery','schemaVersion'].includes(key));
    if(freshScene)root.heightSchemaVersion=3;
    for(const [key,value] of Object.entries(scene))if(!own(root,key)&&!['gallery','schemaVersion'].includes(key))put(root,key,clone(value));
    if(!own(root,'gallery')||!record(root.gallery))put(root,'gallery',own(settings,'SillyTavern-LocalImage')&&record(settings['SillyTavern-LocalImage'])?clone(settings['SillyTavern-LocalImage']):{});
    root.schemaVersion=1;
    return {settings:root,changed:true};
}

export function findLegacyConflicts(names=[],disabled=[],current='third-party/ImmersiveGroups',manifestFor=()=>null) {
    const oldFolders=new Set(['prome-vn-extension','sillytavern-localimage','immersivegroups-gallery','immersivegroups gallery']);
    return names.filter(name=>{
        if(name===current||disabled.includes(name))return false;
        const leaf=name.split('/').pop().toLowerCase();
        if(oldFolders.has(leaf))return true;
        const manifest=manifestFor(name);
        if(['ImmersiveGroups','ImmersiveGroups Gallery','Prome Visual Novel Extension','Local Image'].includes(manifest?.display_name))return true;
        const homepage=String(manifest?.homePage||'').replace(/\/$/,'').toLowerCase();
        return homepage==='https://github.com/bronya-rand/prome-vn-extension'||homepage==='https://github.com/mechamarmot/sillytavern-localimage';
    });
}
