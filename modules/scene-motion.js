// SPDX-License-Identifier: AGPL-3.0-only
import { extension_settings, getContext } from '../../../../extensions.js';
import { extensionName } from '../constants.js';
import { MOTION_EFFECTS, motionOptions, motionFrames } from './motion-model.js';
import { fadeExpressionChange, cancelExpressionFade } from './scene-animations.js';

const selector='#visual-novel-wrapper > .expression-holder img, #ig-mobile-sprites > .expression-holder img, #expression-wrapper .expression-holder img';
const states=new Map(),active=new Set(),jobs=new WeakMap();
let installed=false,frame=0,speaker='',previousScope='',background=null,backgroundSource='',suppressExits=false;
const settings=()=>extension_settings[extensionName]||{};
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const allowed=()=>Boolean(settings().enableVN_UI&&!reduced()&&!document.hidden);
const options=id=>motionOptions(settings(),id);
const enabled=id=>allowed()&&options(id).enabled;
const scope=()=>{const c=getContext();return JSON.stringify([c.groupId,c.characterId,c.getCurrentChatId?.()]);};
function currentCharacters(){const c=getContext(),group=c.groups?.find(g=>String(g.id)===String(c.groupId));return group?(group.members||[]).filter(a=>!(group.disabled_members||[]).includes(a)).map(a=>c.characters?.find(v=>v.avatar===a)).filter(Boolean):[c.characters?.[c.characterId]].filter(Boolean);}
function identity(image){const holder=image.closest('.expression-holder');return holder?.id==='expression-holder'?getContext().characters?.[getContext().characterId]?.avatar:holder?.dataset.avatar||holder?.id.replace(/^(?:ig-)?expression-/,'');}
function visible(image){
    const group=getContext().groupId!=null,root=group?(document.body.classList.contains('ig-mobile-group')?'#ig-mobile-sprites':'#visual-novel-wrapper'):'#expression-wrapper';
    return Boolean(image.getAttribute('src')&&image.closest(root)&&image.isConnected&&image.getClientRects().length>0&&getComputedStyle(image).visibility!=='hidden'&&getComputedStyle(image.closest('.expression-holder')).display!=='none');
}
function sourceFolder(src){try{return new URL(src,location.href).pathname.split('/').slice(0,-1).join('/');}catch{return '';}}
function cancel(node,id){const map=jobs.get(node);if(id)map?.get(id)?.cancel();else for(const job of [...(map?.values()||[])])job.cancel();}
function animate(node,id,frames,{loop=false,preview=false,cleanup=()=>{},valid=()=>true}={}){
    cancel(node,id);if(!node.animate||!node.isConnected||!allowed()||!valid()){cleanup();return null;}
    const config=options(id);if(!config.duration||!config.strength&&id!=='entrance'){cleanup();return null;}
    const map=jobs.get(node)||new Map();jobs.set(node,map);
    const epoch=scope(),animations=[],job={node,id,preview,cancel(){if(job.done)return;job.done=true;for(const animation of animations)animation.cancel();cleanup();active.delete(job);if(map.get(id)===job)map.delete(id);}};
    try{
        const timing={duration:config.duration,iterations:loop?Infinity:1,direction:loop?'alternate':'normal',easing:'ease-in-out',fill:'none'};
        const play=(keyframes,options)=>{const animation=node.animate(keyframes,options);void animation.finished.catch(()=>{});animations.push(animation);};
        const movement=frames.map(({opacity,...values})=>values);
        if(movement.some(f=>Object.keys(f).some(k=>k!=='offset'))){
            play([{transformOrigin:id==='backgroundPan'?'50% 50%':'50% 100%'}],timing);
            play(movement,{...timing,composite:'add'});
        }
        if(frames.some(f=>f.opacity!==undefined)){const base=Number(getComputedStyle(node).opacity);play(frames.map(f=>({opacity:(f.opacity??1)*base,...(f.offset!==undefined?{offset:f.offset}:{})})),timing);}
        if(!animations.length){cleanup();return null;}
        map.set(id,job);active.add(job);
        job.finished=Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{const completed=!job.done&&scope()===epoch&&node.isConnected&&valid();job.cancel();return completed;});
        return job;
    }catch{job.cancel();return null;}
}
function breathing(image){
    const state=states.get(image),config=options('breathing');
    const wanted=state&&state.scope===scope()&&enabled('breathing')&&(config.scope==='all'||state.avatar===speaker)&&!jobs.get(image)?.has('speaking')&&!jobs.get(image)?.has('reaction')&&!jobs.get(image)?.has('entrance');
    if(!wanted){cancel(image,'breathing');return;}
    if(!jobs.get(image)?.has('breathing'))animate(image,'breathing',motionFrames('breathing',config),{loop:true,valid:()=>states.get(image)===state&&visible(image)});
}
function transient(image,id){
    if(!enabled(id)||states.get(image)?.scope!==scope())return false;
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
    document.body.append(copy);animate(copy,'entrance',motionFrames('entrance',options('entrance'),true),{cleanup:()=>copy.remove()});
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
    if(!jobs.get(node)?.has('backgroundPan'))animate(node,'backgroundPan',motionFrames('backgroundPan',options('backgroundPan')),{loop:true});
}
function sync(){
    frame=0;const nextScope=scope();
    if(previousScope!==nextScope){stop();previousScope=nextScope;}
    const focus=enabled('focus');if(document.body.classList.contains('ig-smooth-speaker-focus')!==focus)document.body.classList.toggle('ig-smooth-speaker-focus',focus);
    const duration=`${options('focus').duration}ms`;if(document.documentElement.style.getPropertyValue('--ig-focus-duration')!==duration)document.documentElement.style.setProperty('--ig-focus-duration',duration);
    if(!allowed()||!MOTION_EFFECTS.some(e=>options(e.id).enabled)){stop(true,!allowed());return;}
    const characters=new Set(currentCharacters().map(c=>c.avatar)),found=new Set();
    for(const image of document.querySelectorAll(selector)){
        const avatar=identity(image);if(!characters.has(avatar)||!visible(image))continue;found.add(image);
        let state=states.get(image),src=image.getAttribute('src')||'';
        if(state&&state.avatar!==avatar){cancel(image);cancelExpressionFade(image);states.delete(image);state=null;}
        if(!state){
            state={avatar,src,scope:scope(),snapshot:snapshot(image)};states.set(image,state);
            if(enabled('entrance')){
                const enter=()=>{if(states.get(image)!==state||state.scope!==scope()||!visible(image)||!enabled('entrance'))return;const job=animate(image,'entrance',motionFrames('entrance',options('entrance')));if(job)void job.finished.then(()=>breathing(image));};
                if(image.complete)enter();else image.addEventListener('load',enter,{once:true});
            }
        }else if(src!==state.src){
            const previous=state.src;state.src=src;cancel(image);cancelExpressionFade(image);
            if(previous&&sourceFolder(previous)===sourceFolder(src)&&enabled('expression')){
                const blend=()=>{if(states.get(image)!==state||state.src!==src||state.scope!==scope())return;void fadeExpressionChange(image,previous,()=>states.get(image)===state&&state.scope===scope()&&image.getAttribute('src')===src&&visible(image)).catch(()=>{});};
                if(image.complete)blend();else image.addEventListener('load',blend,{once:true});
            }
        }
        state.snapshot=snapshot(image);breathing(image);
    }
    for(const [image,state] of states)if(!found.has(image)){states.delete(image);cancel(image);cancelExpressionFade(image);if(!suppressExits)exit(state);}
    suppressExits=false;
    for(const job of [...active])if(!job.node.isConnected||!job.node.getClientRects().length)job.cancel();
    syncBackground();
}
function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
function stop(clear=true,previews=true){for(const job of [...active])if(previews||!job.preview)job.cancel();for(const image of states.keys())cancelExpressionFade(image);if(clear)states.clear();}
export function updateMotionSpeaker(avatar=''){
    if(speaker===avatar)return;speaker=avatar;
    for(const [image,state] of states){if(state.avatar===speaker)transient(image,'speaking');breathing(image);}
}
export function motionTargets(){return currentCharacters().filter(c=>[...states.values()].some(s=>s.avatar===c.avatar));}
export function playReaction(avatar=speaker){let played=false;for(const [image,state] of states)if(state.avatar===avatar)played=transient(image,'reaction')||played;return played;}
export function previewMotion(id,host){
    for(const node of host.querySelectorAll('[data-motion-demo]'))cancel(node);
    const figure=host.querySelector('[data-motion-demo=figure]'),backdrop=host.querySelector('[data-motion-demo=background]');
    const target=['backgroundPan','scene'].includes(id)?backdrop:figure;if(!allowed())return false;
    const job=animate(target,id,motionFrames(id,options(id)),{preview:true});return Boolean(job);
}
export function stopMotionPreview(host){for(const node of host.querySelectorAll('[data-motion-demo]'))cancel(node);}
export function setupSceneMotion(){
    if(installed)return;installed=true;previousScope=scope();
    new MutationObserver(records=>{
        if(!allowed()||!MOTION_EFFECTS.some(e=>options(e.id).enabled))return;
        if(records.some(r=>r.target===document.body||r.target.closest?.('#visual-novel-wrapper,#ig-mobile-sprites,#expression-wrapper')))schedule();
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','class','hidden']});
    // Native background styles are observed independently of sprite mutations.
    let backgroundObserver;
    const watchBackground=()=>{const node=document.getElementById('bg1');if(node===backgroundObserver?.node)return;backgroundObserver?.observer.disconnect();if(node){const observer=new MutationObserver(schedule);observer.observe(node,{attributes:true,attributeFilter:['style']});backgroundObserver={node,observer};}};
    new MutationObserver(watchBackground).observe(document.body,{childList:true});watchBackground();
    const restart=()=>{stop(false);suppressExits=true;schedule();};
    window.addEventListener('ig-layout-change',restart);window.addEventListener('resize',restart);
    document.addEventListener('visibilitychange',restart);window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',restart);
    document.getElementById('prome-enable-vn')?.addEventListener('change',restart);
    document.addEventListener('load',event=>{if(event.target instanceof HTMLImageElement&&event.target.matches(selector))schedule();},true);
    const c=getContext(),types=c.eventTypes||c.event_types||{};
    for(const name of ['CHAT_CHANGED','GROUP_UPDATED'])if(types[name])c.eventSource?.on(types[name],restart);
    schedule();
}
