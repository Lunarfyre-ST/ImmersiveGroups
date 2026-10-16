// SPDX-License-Identifier: AGPL-3.0-only
// Combined project entry point. See CREDITS.md for upstream authors and origins.
import * as extensions from '../../../extensions.js';
import { migrateSettings, findLegacyConflicts } from './modules/migration.js';

let sceneAutomation=null;
const runtimeKey=Symbol.for('ImmersiveGroups.runtime');
const rootUrl=new URL('.',import.meta.url);
const current='third-party/'+decodeURIComponent(rootUrl.pathname.split('/').filter(Boolean).pop());
<<<<<<< HEAD
const runtime=globalThis[runtimeKey] ||= {version:'0.2.8',status:'idle',components:{},errors:[]};
=======
const runtime=globalThis[runtimeKey] ||= {version:'0.2.5',status:'idle',components:{},errors:[]};
>>>>>>> 80eb6b24fe0276df89f7dec59ead36cc3c949b60

function showProblem(text) {
    console.error('[ImmersiveGroups]',text);
    globalThis.toastr?.error(text,'ImmersiveGroups');
    const target=document.getElementById('extensions_settings');
    if(target&&!document.getElementById('immersivegroups-startup-status')){
        const message=document.createElement('div');message.id='immersivegroups-startup-status';message.className='ig-startup-status';message.setAttribute('role','alert');message.textContent=text;target.append(message);
    }
}

async function start() {
    if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
    const context=extensions.getContext();
    const settings=context.extensionSettings || extensions.extension_settings;
    const conflicts=findLegacyConflicts(extensions.extensionNames||[],settings.disabledExtensions||[],current,name=>extensions.getExtensionManifest?.(name));
    if(conflicts.length){runtime.status='blocked';showProblem(`Disable the old standalone extensions, then reload: ${conflicts.join(', ')}. ImmersiveGroups has not started duplicate handlers.`);return;}
    // Check already-loaded scripts as a fallback for older ST versions.
    const legacyScripts=[...document.scripts].filter(script=>/\/third-party\/(?:Prome-VN-Extension|SillyTavern-LocalImage|ImmersiveGroups-Gallery)\//i.test(script.src)&&!script.src.startsWith(rootUrl.href));
    if(legacyScripts.length){runtime.status='blocked';showProblem('Disable the old Prome and LocalImage standalone copies, then reload. Keep only the combined ImmersiveGroups enabled.');return;}
    const migrated=migrateSettings(settings);
    if(migrated.changed)context.saveSettingsDebounced?.();
    // An old prompt key is transient context only; clear it before using the new namespace.
    context.setExtensionPrompt?.('SillyTavern-LocalImage','',1,0,false,0);
    runtime.status='starting';
    const results=await Promise.allSettled([
        import('./gallery/dist/gallery.js').then(module=>module.initGallery()).then(()=>{runtime.components.gallery=true;}),
        import('./prome.js').then(module=>module.initScene()).then(async()=>{runtime.components.scene=true;sceneAutomation=(await import('./modules/scene-automation.js')).setupSceneAutomation();runtime.components.automation=true;}),
    ]);
    for(const [index,result] of results.entries())if(result.status==='rejected'){
        runtime.errors.push(String(result.reason?.message||result.reason));showProblem(`${index===0?'Gallery':'Scene controls'} could not start: ${result.reason?.message||result.reason}`);
    }
    runtime.status=runtime.errors.length?'partial':'ready';
    globalThis.ImmersiveGroups=Object.freeze({version:runtime.version,automation:sceneAutomation,getStatus:()=>JSON.parse(JSON.stringify(runtime)),getSceneContext:async()=>{
        const stage=runtime.components.scene?await import('./modules/stage-controls.js'):null;
        return {version:1,scene:stage?.getSceneContext(),gallery:globalThis.ImmersiveGroupsGallery?.getSceneContext()};
    }});
    document.dispatchEvent(new CustomEvent('immersivegroups:ready',{detail:{version:runtime.version,status:runtime.status}}));
}

if(runtime.status==='idle'){
    runtime.status='loading';
    runtime.ready=start().catch(error=>{runtime.status='failed';runtime.errors.push(String(error?.message||error));showProblem(`Startup failed: ${error?.message||error}`);});
}
export const ready=runtime.ready;
