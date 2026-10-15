// SPDX-License-Identifier: AGPL-3.0-only
import { floatingPanel } from './floating-panel.js';
export function createOutfitPicker(label) {
    const button=document.createElement('button');button.type='button';button.className='prome-stage-outfit';
    button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-label',label);
    const text=document.createElement('span'),chevron=document.createElement('i');chevron.className='fa-solid fa-chevron-down';chevron.setAttribute('aria-hidden','true');button.append(text,chevron);
    const list=document.createElement('div');list.className='ig-outfit-options';list.setAttribute('role','listbox');list.setAttribute('aria-label',label);
    let options=[],active=-1;
    const popup=floatingPanel(button,list,{onClose:()=>button.removeAttribute('aria-activedescendant')});
    function highlight(index,scroll=false) {
        active=index;
        for(const [i,row] of [...list.children].entries())row.classList.toggle('ig-option-active',i===active);
        const row=list.children[active];if(row){button.setAttribute('aria-activedescendant',row.id);if(scroll)row.scrollIntoView({block:'nearest'});}
    }
    function commit(index) {
        const entry=options[index];if(!entry||button.disabled)return;
        button.value=entry.folder;text.textContent=entry.label;
        popup.close(true);button.dispatchEvent(new Event('change',{bubbles:true}));
    }
    function open() {
        if(button.disabled||!options.length)return;
        list.style.fontSize=getComputedStyle(button).fontSize;
        list.replaceChildren();
        for(const [index,entry] of options.entries()) {
            const row=document.createElement('div');row.id=`${list.id}-option-${index}`;row.setAttribute('role','option');row.setAttribute('aria-selected',String(entry.folder===button.value));row.dataset.folder=entry.folder;
            const name=document.createElement('span');name.textContent=entry.label;
            const mark=document.createElement('span');mark.textContent=entry.folder===button.value?'✓':'';mark.setAttribute('aria-hidden','true');row.append(name,mark);
            row.title=entry.folder;row.addEventListener('pointermove',()=>highlight(index));row.addEventListener('click',()=>commit(index));list.append(row);
        }
        popup.open();highlight(Math.max(0,options.findIndex(entry=>entry.folder===button.value)),true);
    }
    button.addEventListener('click',()=>popup.isOpen?popup.close():open());
    button.addEventListener('keydown',event=>{
        if(event.key==='Tab'){popup.close();return;}
        if(!['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(event.key))return;
        event.preventDefault();
        if(!popup.isOpen){open();return;}
        if(event.key==='Enter'||event.key===' '){commit(active);return;}
        highlight(event.key==='Home'?0:event.key==='End'?options.length-1:(active+(event.key==='ArrowUp'?-1:1)+options.length)%options.length,true);
    });
    return {button,popup,update(entries,value){
        // Freeze row identities while open: background discovery/rendering cannot
        // change the folder under a pointer or a touch that's about to commit.
        if(popup.isOpen){if(button.disabled)popup.close();else return;}
        options=entries.map(entry=>({...entry}));button.value=value;
        text.textContent=options.find(entry=>entry.folder===value)?.label||'Choose outfit';
    },destroy:()=>popup.destroy()};
}
