// SPDX-License-Identifier: AGPL-3.0-only
import { MOTION_EFFECTS, MOTION_RULES } from './motion-model.js';
import { previewMotion, stopMotionPreview, playReaction, motionTargets } from './scene-motion.js';
const el=(tag,text='')=>{const node=document.createElement(tag);node.textContent=text;return node;};
export function mountMotionControls(parent,{settings,write}){
    const controls=[],previews=[];let section='';
    for(const effect of MOTION_EFFECTS){
        if(section!==effect.section){section=effect.section;parent.append(el('h3',section));}
        const box=el('details');box.className='ig-motion-controls';box.dataset.motionEffect=effect.id;
        const summary=el('summary',effect.title);box.append(summary,el('small',effect.help));
        const check=el('input');check.type='checkbox';check.dataset.animationSetting=`${effect.id}MotionEnabled`;check.setAttribute('aria-label',`Enable ${effect.title.toLowerCase()}`);
        const label=el('label');label.append(check,document.createTextNode(`Enable ${effect.title.toLowerCase()}`));box.append(label);controls.push(check);check.addEventListener('change',()=>write(check.dataset.animationSetting,check.checked));
        for(const [suffix,title] of [['Duration',effect.id==='breathing'||effect.id==='backgroundPan'?'One-way duration (ms)':'Duration (ms)'],['Strength',effect.unit]]){
            const key=`${effect.id}Motion${suffix}`,rule=MOTION_RULES[key],label=el('label',title),pair=el('span');label.className='ig-live-slider';pair.className='prome-number-pair';
            for(const type of ['range','number']){const input=el('input');input.type=type;input.min=String(rule.min);input.max=String(rule.max);input.step=suffix==='Strength'?'0.1':'1';input.dataset.animationSetting=key;input.setAttribute('aria-label',`${effect.title}: ${title}${type==='number'?', exact value':''}`);if(type==='number')input.className='text_pole';input.addEventListener(type==='range'?'input':'change',()=>{if(input.value!=='')write(key,input.value);});pair.append(input);controls.push(input);}
            label.append(pair);box.append(label);
        }
        const choices={entrance:['Style','Entrance style',[['fade','Fade'],['slide','Slide and fade']]],breathing:['Scope','Animate',[['speaker','Current speaker only'],['all','All visible characters']]],reaction:['Style','Reaction',[['hop','Hop'],['nod','Nod'],['tilt','Tilt'],['shake','Shake']]],backgroundPan:['Direction','Direction',[['left','Left'],['right','Right'],['up','Up'],['down','Down']]]}[effect.id];
        if(choices){const [suffix,title,items]=choices,input=el('select'),label=el('label',title);input.dataset.animationSetting=`${effect.id}Motion${suffix}`;input.setAttribute('aria-label',`${effect.title}: ${title}`);for(const [value,text] of items)input.append(new Option(text,value));input.addEventListener('change',()=>write(input.dataset.animationSetting,input.value));label.append(input);box.append(label);controls.push(input);}
        const demo=el('div');demo.className='ig-motion-demo';demo.setAttribute('aria-hidden','true');
        const backdrop=el('div'),figure=el('div');backdrop.dataset.motionDemo='background';figure.dataset.motionDemo='figure';backdrop.append(figure);demo.append(backdrop);box.append(demo);previews.push(demo);
        const actions=el('div');actions.className='ig-tool-actions';const preview=el('button','Preview'),stop=el('button','Stop preview'),status=el('small');status.setAttribute('role','status');
        for(const button of [preview,stop]){button.type='button';button.className='menu_button';actions.append(button);}
        preview.addEventListener('click',()=>{stopMotionPreview(demo);status.textContent=previewMotion(effect.id,demo)?'Previewing. The live scene is unchanged.':'Enable VN mode to preview. Reduced motion, a hidden page or zero duration/strength can disable previews.';});stop.addEventListener('click',()=>{stopMotionPreview(demo);status.textContent='Preview stopped.';});
        box.addEventListener('toggle',()=>{if(!box.open)stopMotionPreview(demo);});
        if(effect.id==='reaction'){
            const target=el('select');target.setAttribute('aria-label','Reaction target');
            const refresh=()=>{const value=target.value;target.replaceChildren(new Option('Current speaker',''),...motionTargets().map(c=>new Option(c.name,c.avatar)));target.value=value;};target.addEventListener('focus',refresh);refresh();
            const play=el('button','Play reaction in scene');play.type='button';play.className='menu_button';play.addEventListener('click',()=>{const played=target.value?playReaction(target.value):playReaction();status.textContent=played?'Reaction played.':'Enable reaction motions and choose a visible character, or wait for a current speaker.';});actions.append(target,play);
        }
        box.append(actions,status);parent.append(box);
    }
    function sync(){for(const input of controls){const value=settings()[input.dataset.animationSetting];if(input.type==='checkbox')input.checked=value;else if(input!==document.activeElement)input.value=value;}for(const preview of previews)stopMotionPreview(preview);}
    return {sync};
}
