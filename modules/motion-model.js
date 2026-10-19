// SPDX-License-Identifier: AGPL-3.0-only
// Optional scene motion. These settings never alter stored height corrections.
export const MOTION_EFFECTS=Object.freeze([
    {id:'expression',title:'Expression transitions',section:'More transitions',duration:200,min:0,max:3000,strength:100,limit:100,unit:'Blend (%)',help:'Blend facial expressions within the same outfit. Outfit changes keep their separate fade settings.'},
    {id:'scene',title:'Scene fade through black',section:'More transitions',duration:800,min:0,max:3000,strength:100,limit:100,unit:'Darkness (%)',help:'Briefly cover the scene when the background changes. Native background selection still happens immediately.'},
    {id:'entrance',title:'Character entrances / exits',section:'Character movement',duration:350,min:0,max:3000,strength:24,limit:80,unit:'Slide distance (px)',help:'Animate characters appearing or leaving the visible scene. Exits use a temporary visual copy.'},
    {id:'speaking',title:'Speaking emphasis',section:'Character movement',duration:450,min:0,max:3000,strength:8,limit:30,unit:'Lift (px)',help:'Give the new speaker a small lift and scale pulse. This does not change their height or fine tuning.'},
    {id:'breathing',title:'Idle breathing',section:'Character movement',duration:4000,min:1000,max:20000,strength:0.6,limit:3,unit:'Scale variation (%)',help:'A subtle repeating motion, anchored near the feet. Pause while a reaction or emphasis is playing.'},
    {id:'reaction',title:'Reaction motions',section:'Character movement',duration:500,min:0,max:3000,strength:8,limit:20,unit:'Strength',help:'Play a hop, nod, tilt or shake manually. Reactions are not selected by the model.'},
    {id:'focus',title:'Smooth speaker focus',section:'Character movement',duration:400,min:0,max:3000,strength:100,limit:100,unit:'Dimming strength (%)',help:'Smooth speaking-order brightness changes. Enable sprite dimming to see this; off retains the existing focus behavior.'},
    {id:'backgroundPan',title:'Idle background movement',section:'Background movement',duration:20000,min:5000,max:120000,strength:2,limit:10,unit:'Travel (%)',help:'Slowly pan and zoom the background, then reverse. Stops while the page is hidden.'},
]);
export const MOTION_RULES=Object.freeze(Object.fromEntries([
    ...MOTION_EFFECTS.flatMap(effect=>[[`${effect.id}MotionEnabled`,{type:'boolean',value:false}],[`${effect.id}MotionDuration`,{type:'number',min:effect.min,max:effect.max,value:effect.duration}],[`${effect.id}MotionStrength`,{type:'number',min:0,max:effect.limit,value:effect.strength}]]),
    ['entranceMotionStyle',{type:'enum',values:['fade','slide'],value:'fade'}],
    ['breathingMotionScope',{type:'enum',values:['speaker','all'],value:'speaker'}],
    ['breathingMotionWaitingStrength',{type:'number',min:0,max:100,value:100}],
    ['reactionMotionStyle',{type:'enum',values:['hop','nod','tilt','shake'],value:'hop'}],
    ['backgroundPanMotionDirection',{type:'enum',values:['left','right','up','down'],value:'right'}],
]));
export const MOTION_DEFAULTS=Object.freeze(Object.fromEntries(Object.entries(MOTION_RULES).map(([key,rule])=>[key,rule.value])));
export const motionKeys=Object.keys(MOTION_RULES);
export const animationSeconds=key=>key.endsWith('MotionDuration')||/Fade(?:In|Out)$/.test(key);
export const animationDisplayValue=(key,value)=>animationSeconds(key)?value/1000:value;
export const animationStoredValue=(key,value)=>animationSeconds(key)?Number(value)*1000:value;
export function motionValue(key,value){
    const rule=MOTION_RULES[key];if(!rule)return undefined;
    if(rule.type==='boolean')return typeof value==='boolean'?value:rule.value;
    if(rule.type==='enum')return rule.values.includes(value)?value:rule.value;
    const n=value===''||value==null?NaN:Number(value);return Number.isFinite(n)?Math.round(Math.min(rule.max,Math.max(rule.min,n))*100)/100:rule.value;
}
export function motionOptions(settings,id){
    const read=suffix=>motionValue(`${id}Motion${suffix}`,settings[`${id}Motion${suffix}`]);
    return {enabled:read('Enabled')===true,duration:read('Duration'),strength:read('Strength'),style:read('Style'),scope:read('Scope'),direction:read('Direction')};
}
export function motionFrames(id,options,exiting=false){
    const amount=options.strength||0,neutral={translate:'0px 0px',scale:1,rotate:'0deg'};
    if(id==='entrance'){const from={opacity:0,translate:options.style==='slide'?`${exiting?-amount:amount}px 0px`:'0px 0px'},to={opacity:1,translate:'0px 0px'};return exiting?[to,from]:[from,to];}
    if(id==='speaking')return [neutral,{translate:`0px ${-amount}px`,scale:1+amount/1000,offset:.35},neutral];
    if(id==='breathing')return [{scale:1},{scale:1+amount/100}];
    if(id==='reaction'){
        if(options.style==='shake')return [neutral,...[-1,1,-.7,.7].map(n=>({translate:`${n*amount}px 0px`})),neutral];
        if(options.style==='tilt')return [neutral,{rotate:`${amount/2}deg`},neutral];
        if(options.style==='nod')return [neutral,{translate:`0px ${amount/2}px`,scale:1-amount/1000},neutral];
        return [neutral,{translate:`0px ${-amount*2}px`,offset:.4},neutral];
    }
    if(id==='backgroundPan'){
        const horizontal=['left','right'].includes(options.direction),sign=['left','up'].includes(options.direction)?-1:1;
        return [{scale:1+amount/50,translate:'0% 0%'},{scale:1+amount/40,translate:horizontal?`${sign*amount/2}% 0%`:`0% ${sign*amount/2}%`}];
    }
    if(id==='scene')return [{opacity:0},{opacity:amount/100,offset:.5},{opacity:0}];
    if(id==='focus')return [{opacity:1-amount/100},{opacity:1}];
    return [{opacity:1-amount/100},{opacity:1}];
}
