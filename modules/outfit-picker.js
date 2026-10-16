// SPDX-License-Identifier: AGPL-3.0-only
import { floatingPanel } from './floating-panel.js';
import { layoutSettings } from './responsive.js';
export function createOutfitPicker(label,readState=null) {
    const button=document.createElement('button');button.type='button';button.className='prome-stage-outfit';
    button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-label',label);
    const text=document.createElement('span'),chevron=document.createElement('i');chevron.className='fa-solid fa-chevron-down';chevron.setAttribute('aria-hidden','true');button.append(text,chevron);
    const list=document.createElement('div');list.className='ig-outfit-options';
    const search=document.createElement('input');search.type='search';search.className='text_pole';search.placeholder='Find outfit';search.setAttribute('aria-label',`Find ${label}`);
    const rows=document.createElement('div');rows.className='ig-outfit-rows';rows.setAttribute('role','listbox');rows.setAttribute('aria-label',label);
    const empty=document.createElement('small');empty.textContent='No matching outfits';empty.hidden=true;list.append(search,rows,empty);
    let options=[],visible=[],active=-1,wheelDelta=0,lastWheel=0;
    const popup=floatingPanel(button,list,{lockSide:true,maxHeight:()=>Math.max(2,Math.min(12,Number(layoutSettings().outfitMenuRows)||6))*46+14+(search.hidden?0:46),offset:()=>({x:layoutSettings().outfitPopupOffsetX,y:layoutSettings().outfitPopupOffsetY}),onClose:()=>button.removeAttribute('aria-activedescendant')});
    rows.id=`${list.id}-rows`;button.setAttribute('aria-controls',rows.id);
    function highlight(index,scroll=false) {
        active=index;
        for(const [i,row] of [...rows.children].entries())row.classList.toggle('ig-option-active',i===active);
        const row=rows.children[active];if(!row)return;
        button.setAttribute('aria-activedescendant',row.id);
        if(scroll){const r=row.getBoundingClientRect(),box=rows.getBoundingClientRect();if(r.top<box.top)rows.scrollTop-=box.top-r.top;else if(r.bottom>box.bottom)rows.scrollTop+=r.bottom-box.bottom;}
    }
    function commit(entry,focus=true) {
        if(!entry||button.disabled)return;
        const changed=button.value!==entry.folder;button.value=entry.folder;text.textContent=entry.label;
        popup.close(focus);if(changed)button.dispatchEvent(new Event('change',{bubbles:true}));
    }
    function render() {
        visible=options.filter(entry=>`${entry.label} ${entry.folder}`.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()));rows.replaceChildren();
        for(const [index,entry] of visible.entries()) {
            const row=document.createElement('div');row.id=`${list.id}-option-${index}`;row.setAttribute('role','option');row.setAttribute('aria-selected',String(entry.folder===button.value));row.dataset.folder=entry.folder;
            const name=document.createElement('span');name.textContent=entry.label;
            const mark=document.createElement('span');mark.textContent=entry.folder===button.value?'✓':'';mark.setAttribute('aria-hidden','true');row.append(name,mark);
            row.title=entry.folder;row.addEventListener('pointermove',()=>highlight(index));row.addEventListener('click',()=>commit(entry));rows.append(row);
        }
        empty.hidden=Boolean(visible.length);popup.position();highlight(Math.max(0,visible.findIndex(entry=>entry.folder===button.value)),true);
    }
    function freshOptions(){
        if(!readState)return;
        const {entries,value}=readState();options=entries.map(entry=>({...entry}));button.value=options.some(entry=>entry.folder===value)?value:'';
        text.textContent=options.find(entry=>entry.folder===button.value)?.label||'Choose outfit';
    }
    function open() {
        freshOptions();
        if(button.disabled||!options.length)return;
        list.style.fontSize=getComputedStyle(button).fontSize;search.value='';search.hidden=options.length<=8;
        render();popup.open();highlight(Math.max(0,visible.findIndex(entry=>entry.folder===button.value)),true);
    }
    search.addEventListener('input',render);
    search.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();button.focus({preventScroll:true});highlight(0,true);}});
    button.addEventListener('click',()=>popup.isOpen?popup.close():open());
    button.addEventListener('keydown',event=>{
        if(event.key==='Tab'){popup.close();return;}
        if(!['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(event.key))return;
        event.preventDefault();
        if(!popup.isOpen){open();return;}
        if(event.key==='Enter'||event.key===' '){commit(visible[active]);return;}
        if(visible.length)highlight(event.key==='Home'?0:event.key==='End'?visible.length-1:(active+(event.key==='ArrowUp'?-1:1)+visible.length)%visible.length,true);
    });
    button.addEventListener('wheel',event=>{
        if(!popup.isOpen)freshOptions();
        if(button.disabled||options.length<2||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
        event.preventDefault();
        const now=performance.now();if(now-lastWheel>300)wheelDelta=0;
        const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?200:1);
        if(wheelDelta&&Math.sign(wheelDelta)!==Math.sign(delta))wheelDelta=0;
        wheelDelta+=delta;
        if(Math.abs(wheelDelta)<35||now-lastWheel<160)return;
        const direction=Math.sign(wheelDelta);wheelDelta=0;lastWheel=now;
        const current=options.findIndex(entry=>entry.folder===button.value);
        commit(options[(Math.max(0,current)+direction+options.length)%options.length],false);
    },{passive:false});
    return {button,popup,update(entries,value){
        // Freeze row identities while open, including during async discovery.
        if(popup.isOpen){if(button.disabled)popup.close();else return;}
        options=entries.map(entry=>({...entry}));button.value=value;
        text.textContent=options.find(entry=>entry.folder===value)?.label||'Choose outfit';
    },destroy:()=>popup.destroy()};
}
