// SPDX-License-Identifier: AGPL-3.0-only
import { extension_settings, getContext } from '../../../../extensions.js';
import { extensionName } from '../constants.js';
import { MOTION_EFFECTS, motionOptions, motionFrames } from './motion-model.js';
import { fadeExpressionChange, cancelExpressionFade } from './scene-animations.js';
import { diagnostic, diagnosticOperation } from './diagnostics.js';
import { visibleCharacters } from './scene-visibility.js';
import { mobileLayout } from './responsive.js';

const selector='#visual-novel-wrapper > .expression-holder img, #ig-mobile-sprites > .expression-holder img, #expression-wrapper .expression-holder img';
const states=new Map(),active=new Set(),jobs=new WeakMap(),nativeWaiting=new WeakSet();
let installed=false,frame=0,speaker='',previousScope='',background=null,backgroundSource='',suppressExits=false;
const settings=()=>extension_settings[extensionName]||{};
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const allowed=()=>Boolean(settings().enableVN_UI&&!reduced()&&!document.hidden);
const options=id=>motionOptions(settings(),id);
const enabled=id=>allowed()&&options(id).enabled;
const scope=()=>{const c=getContext();return JSON.stringify([c.groupId,c.characterId,c.getCurrentChatId?.()]);};
function currentCharacters(){return visibleCharacters();}
function identity(image){const holder=image.closest('.expression-holder');return holder?.id==='expression-holder'?getContext().characters?.[getContext().characterId]?.avatar:holder?.dataset.avatar||holder?.id.replace(/^(?:ig-)?expression-/,'');}
function visible(image){
    const group=getContext().groupId!=null,root=group?(document.body.classList.contains('ig-mobile-group')?'#ig-mobile-sprites':'#visual-novel-wrapper'):'#expression-wrapper';
    return Boolean(image.getAttribute('src')&&image.closest(root)&&image.isConnected&&image.getClientRects().length>0&&getComputedStyle(image).visibility!=='hidden'&&getComputedStyle(image.closest('.expression-holder')).display!=='none');
}
function sourceFolder(src){try{return new URL(src,location.href).pathname.split('/').slice(0,-1).join('/');}catch{return '';}}
function cancel(node,id,reason='superseded'){const map=jobs.get(node);if(id)map?.get(id)?.cancel(reason);else for(const job of [...(map?.values()||[])])job.cancel(reason);}
function animate(node,id,frames,{loop=false,preview=false,exiting=false,cleanup=()=>{},valid=()=>true}={}){
    const fields={effect:id,loop,preview,exiting};
    cancel(node,id);if(!node.animate||!node.isConnected||!allowed()||!valid()){diagnostic('animation.motion',{...fields,outcome:'skipped',reason:!node.animate?'unsupported':!node.isConnected?'removed':!allowed()?'disabled':'stale'});cleanup();return null;}
    const config=options(id);if(!config.duration||!config.strength&&id!=='entrance'){diagnostic('animation.motion',{...fields,outcome:'skipped',reason:'zero_motion'});cleanup();return null;}
    const trace=diagnosticOperation('animation.motion',fields);
    const map=jobs.get(node)||new Map();jobs.set(node,map);
    const epoch=scope(),animations=[],job={node,id,preview,configuration:JSON.stringify(config),cancel(reason='superseded',outcome='cancelled'){if(job.done)return;job.done=true;trace.finish({outcome,reason});for(const animation of animations)animation.cancel();cleanup();active.delete(job);if(map.get(id)===job)map.delete(id);}};
    try{
        const timing={duration:config.duration,iterations:loop?Infinity:1,direction:loop?'alternate':'normal',easing:'ease-in-out',fill:'none'};
        const play=(keyframes,options)=>{const animation=node.animate(keyframes,options);void animation.finished.catch(()=>{});animations.push(animation);};
        const movement=frames.map(({opacity,backgroundPosition,...values})=>values);
        if(id==='backgroundPan'&&frames.some(f=>f.backgroundPosition))play(frames.map(f=>({backgroundPosition:f.backgroundPosition})),timing);
        if(movement.some(f=>Object.keys(f).some(k=>k!=='offset'))){
            play([{transformOrigin:id==='backgroundPan'?'50% 50%':'50% 100%'}],timing);
            play(movement,{...timing,composite:'add'});
        }
        if(frames.some(f=>f.opacity!==undefined)){const base=Number(getComputedStyle(node).opacity);play(frames.map(f=>({opacity:(f.opacity??1)*base,...(f.offset!==undefined?{offset:f.offset}:{})})),timing);}
        if(!animations.length){trace.finish({outcome:'skipped',reason:'zero_motion'});cleanup();return null;}
        map.set(id,job);active.add(job);
        job.finished=Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{const completed=!job.done&&scope()===epoch&&node.isConnected&&valid();job.cancel(completed?'finished':'stale',completed?'completed':'cancelled');return completed;});
        return job;
    }catch{job.cancel('animation_api','failed');return null;}
}
function breathing(image){
    const state=states.get(image),config=options('breathing');
    if(state?.avatar!==speaker)config.strength*=Math.max(0,Math.min(100,Number(settings().breathingMotionWaitingStrength??100)))/100;
    const wanted=state&&!state.entrancePending&&state.scope===scope()&&image.complete&&image.naturalWidth>0&&enabled('breathing')&&config.strength>0&&(config.scope==='all'||state.avatar===speaker)&&!jobs.get(image)?.has('speaking')&&!jobs.get(image)?.has('reaction')&&!jobs.get(image)?.has('entrance');
    if(!wanted){cancel(image,'breathing');return;}
    const current=jobs.get(image)?.get('breathing');if(current&&current.strength!==config.strength)current.cancel('settings_changed');
    if(!jobs.get(image)?.has('breathing')){const job=animate(image,'breathing',motionFrames('breathing',config),{loop:true,valid:()=>states.get(image)===state&&visible(image)});if(job)job.strength=config.strength;}
}
function transient(image,id){
    if(!enabled(id)||states.get(image)?.scope!==scope())return false;
    if(states.get(image)?.entrancePending||jobs.get(image)?.has('entrance')){diagnostic('animation.motion',{effect:id,outcome:'skipped',reason:'entrance_active'});return false;}
    cancel(image,'speaking');cancel(image,'reaction');cancel(image,'entrance');cancel(image,'breathing');
    const state=states.get(image),job=animate(image,id,motionFrames(id,options(id)),{valid:()=>states.get(image)===state&&visible(image)});
    if(job)void job.finished.then(()=>{if(states.get(image)===state)breathing(image);});
    return Boolean(job);
}
function snapshot(image){const rect=image.getBoundingClientRect(),style=getComputedStyle(image),parent=getComputedStyle(image.closest('.expression-holder'));return {src:image.currentSrc||image.src,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},opacity:style.opacity,filter:[parent.filter,style.filter].filter(v=>v!=='none').join(' ')||'none',fit:style.objectFit,position:style.objectPosition};}
function exit(state){
    if(!enabled('entrance')||!state.snapshot?.rect.width)return;
    const {src,rect,opacity,filter,fit,position}=state.snapshot,copy=document.createElement('div');copy.className='ig-motion-exit';copy.setAttribute('aria-hidden','true');
    Object.assign(copy.style,{position:'fixed',left:`${rect.x}px`,top:`${rect.y}px`,width:`${rect.width}px`,height:`${rect.height}px`,backgroundImage:`url(${JSON.stringify(src)})`,backgroundSize:['contain','cover'].includes(fit)?fit:'100% 100%',backgroundPosition:position,backgroundRepeat:'no-repeat',opacity,filter,pointerEvents:'none',zIndex:'100'});
    document.body.append(copy);animate(copy,'entrance',motionFrames('entrance',options('entrance'),true),{exiting:true,cleanup:()=>copy.remove()});
}
function sceneFade(){
    if(!enabled('scene'))return;for(const job of [...active])if(job.id==='scene'&&!job.preview)job.cancel();const layer=document.createElement('div');layer.className='ig-motion-scene-fade';layer.setAttribute('aria-hidden','true');
    Object.assign(layer.style,{position:'fixed',inset:'0',background:'#000',pointerEvents:'none',zIndex:'9990'});document.body.append(layer);
    animate(layer,'scene',motionFrames('scene',options('scene')),{cleanup:()=>layer.remove()});
}
function syncBackground(){
    const node=document.getElementById('bg1'),src=node?.style.backgroundImage||'';
    if(background!==node){if(background)cancel(background);background=node;backgroundSource=src;}
    else if(src!==backgroundSource){backgroundSource=src;if(node)cancel(node,'backgroundPan');sceneFade();}
    if(!node||!src||src==='none'||!enabled('backgroundPan')){if(node)cancel(node,'backgroundPan');return;}
    const config=options('backgroundPan'),mobile=mobileLayout(),vertical=Boolean(config.mobileVertical&&mobile),panAxis=mobile?(vertical?'vertical':'horizontal'):'desktop',current=jobs.get(node)?.get('backgroundPan');
    if(current&&current.panAxis!==panAxis)current.cancel('layout_changed');
    if(!jobs.get(node)?.has('backgroundPan')){const job=animate(node,'backgroundPan',motionFrames('backgroundPan',{...config,vertical,horizontal:mobile&&!vertical}),{loop:true});if(job)job.panAxis=panAxis;}
}
function sync(){
    frame=0;const nextScope=scope();
    if(previousScope!==nextScope){stop(true,true,'chat_changed');previousScope=nextScope;}
    const focus=enabled('focus');if(document.body.classList.contains('ig-smooth-speaker-focus')!==focus)document.body.classList.toggle('ig-smooth-speaker-focus',focus);
    const duration=`${options('focus').duration}ms`;if(document.documentElement.style.getPropertyValue('--ig-focus-duration')!==duration)document.documentElement.style.setProperty('--ig-focus-duration',duration);
    if(!allowed()||!MOTION_EFFECTS.some(e=>options(e.id).enabled)){stop(true,!allowed(),'disabled');return;}
    const characters=new Set(currentCharacters().map(c=>c.avatar)),found=new Set();
    for(const job of [...active])if(job.configuration!==JSON.stringify(options(job.id)))job.cancel('settings_changed');
    const holders=new Set();
    for(const image of document.querySelectorAll(selector)){
        const holder=image.closest('.expression-holder'),avatar=identity(image);if(!characters.has(avatar)||!visible(image)||holders.has(holder))continue;
        // Native setImage temporarily keeps two images, then replaces the old
        // node. Its opacity transition owns that interval; a holder is still
        // the same character throughout it.
        if(holder.querySelector('img.expression-animating,img.expression-clone')){
            if(!nativeWaiting.has(holder)){nativeWaiting.add(holder);diagnostic('motion.lifecycle',{effect:'entrance',stage:'native_wait',reason:'native_transition'});}
            holders.add(holder);for(const [node,state] of states)if(state.holder===holder){found.add(node);cancel(node,undefined,'native_transition');}continue;
        }
        nativeWaiting.delete(holder);
        holders.add(holder);found.add(image);
        let state=states.get(image),src=image.getAttribute('src')||'';
        let replaced=false;
        if(!state)for(const [node,previous] of states)if(previous.holder===holder&&previous.avatar===avatar){state=previous;states.delete(node);cancel(node,undefined,'node_replaced');cancelExpressionFade(node);states.set(image,state);replaced=true;diagnostic('motion.lifecycle',{stage:'node_replaced',changed:true});break;}
        if(state&&state.avatar!==avatar){cancel(image);cancelExpressionFade(image);states.delete(image);state=null;}
        if(!state){
            state={avatar,src,holder,scope:scope(),entrancePending:enabled('entrance'),snapshot:snapshot(image)};states.set(image,state);
        }else if(src!==state.src){
            const previous=state.src;state.src=src;cancel(image,undefined,'source_changed');cancelExpressionFade(image);
            if(!replaced&&!state.entrancePending&&previous&&sourceFolder(previous)===sourceFolder(src)&&enabled('expression')){
                const blend=()=>{if(states.get(image)!==state||state.src!==src||state.scope!==scope())return;void fadeExpressionChange(image,previous,()=>states.get(image)===state&&state.scope===scope()&&image.getAttribute('src')===src&&visible(image)).catch(()=>{});};
                if(image.complete)blend();else image.addEventListener('load',blend,{once:true});
            }
        }
        if(state.entrancePending){
            if(!enabled('entrance'))state.entrancePending=false;
            else if(image.complete&&image.naturalWidth>0){state.entrancePending=false;const job=animate(image,'entrance',motionFrames('entrance',options('entrance')),{valid:()=>states.get(image)===state&&state.scope===scope()&&image.getAttribute('src')===state.src&&visible(image)});if(job)void job.finished.then(()=>{if(states.get(image)===state)breathing(image);});}
            else if(state.waitingSource!==src){state.waitingSource=src;diagnostic('motion.lifecycle',{effect:'entrance',stage:'load_wait',imageReady:false});}
        }
        state.snapshot=snapshot(image);breathing(image);
    }
    for(const [image,state] of states)if(!found.has(image)){states.delete(image);cancel(image,undefined,'removed');cancelExpressionFade(image);if(!suppressExits)exit(state);}
    suppressExits=false;
    for(const job of [...active])if(!job.node.isConnected||!job.node.getClientRects().length)job.cancel();
    syncBackground();
}
function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
function stop(clear=true,previews=true,reason='superseded'){for(const job of [...active])if(previews||!job.preview)job.cancel(reason);for(const image of states.keys())cancelExpressionFade(image);if(clear)states.clear();}
export function updateMotionSpeaker(avatar=''){
    if(speaker===avatar)return;speaker=avatar;
    for(const [image,state] of states){if(state.avatar===speaker)transient(image,'speaking');breathing(image);}
}
export function motionTargets(){return currentCharacters().filter(c=>[...states.values()].some(s=>s.avatar===c.avatar));}
export function playReaction(avatar=speaker){let played=false;for(const [image,state] of states)if(state.avatar===avatar)played=transient(image,'reaction')||played;return played;}
export function previewMotion(id,host){
    if(!MOTION_EFFECTS.some(effect=>effect.id===id))return false;
    for(const node of host.querySelectorAll('[data-motion-demo]'))cancel(node);
    const figure=host.querySelector('[data-motion-demo=figure]'),backdrop=host.querySelector('[data-motion-demo=background]');
    const target=['backgroundPan','scene'].includes(id)?backdrop:figure;if(!allowed())return false;
    const config=options(id),mobile=id==='backgroundPan'&&mobileLayout(),job=animate(target,id,motionFrames(id,{...config,vertical:mobile&&config.mobileVertical,horizontal:mobile&&!config.mobileVertical}),{preview:true});return Boolean(job);
}
export function stopMotionPreview(host){for(const node of host.querySelectorAll('[data-motion-demo]'))cancel(node);}
export function setupSceneMotion(){
    if(installed)return;installed=true;previousScope=scope();
    new MutationObserver(records=>{
        if(!allowed()||!MOTION_EFFECTS.some(e=>options(e.id).enabled))return;
        if(records.some(r=>r.target===document.body||r.target.closest?.('#visual-novel-wrapper,#ig-mobile-sprites,#expression-wrapper')))schedule();
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','class','hidden','style']});
    // Native background styles are observed independently of sprite mutations.
    let backgroundObserver;
    const watchBackground=()=>{const node=document.getElementById('bg1');if(node===backgroundObserver?.node)return;backgroundObserver?.observer.disconnect();if(node){const observer=new MutationObserver(schedule);observer.observe(node,{attributes:true,attributeFilter:['style']});backgroundObserver={node,observer};}};
    new MutationObserver(watchBackground).observe(document.body,{childList:true});watchBackground();
    const restart=event=>{const reason=({'ig-layout-change':'layout_changed',resize:'viewport_changed',visibilitychange:'visibility_changed',change:'motion_changed'})[event?.type]||'unknown';if(event?.type==='ig-layout-change'){schedule();return;}diagnostic('motion.lifecycle',{stage:'restart',reason});stop(false,true,reason);suppressExits=true;schedule();};
    window.addEventListener('ig-layout-change',restart);window.addEventListener('resize',restart);
    document.addEventListener('visibilitychange',restart);window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',restart);
    document.getElementById('prome-enable-vn')?.addEventListener('change',restart);
    document.addEventListener('load',event=>{if(event.target instanceof HTMLImageElement&&event.target.matches(selector))schedule();},true);
    const c=getContext(),types=c.eventTypes||c.event_types||{};
    if(types.CHAT_CHANGED)c.eventSource?.on(types.CHAT_CHANGED,restart);
    if(types.GROUP_UPDATED)c.eventSource?.on(types.GROUP_UPDATED,schedule);
    schedule();
}
