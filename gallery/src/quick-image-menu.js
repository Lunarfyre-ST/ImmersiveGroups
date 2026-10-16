// SPDX-License-Identifier: AGPL-3.0-only
// Shared by the scene menu and the optional floating Gallery shortcut.
export function mountQuickImageMenu(container, { readEntries, readContext, send, openLibrary, openGeneral, openSettings }) {
    container.classList.add('ig-quick-images');
    container.innerHTML=`<label>Find an image<input type="search" class="text_pole" data-quick-search placeholder="Name, description or gallery" aria-label="Find an image"></label>
    <label>Gallery<select data-quick-gallery aria-label="Quick image gallery"><option value="">All available galleries</option></select></label>
    <label>Image<select data-quick-image aria-label="Quick image"><option value="">Choose an image</option></select></label>
    <div class="ig-quick-preview" hidden><img alt="" data-quick-preview><small data-quick-description></small></div>
    <div class="ig-tool-actions"><button type="button" class="menu_button ig-image-send" data-quick-send disabled>Send image</button><button type="button" class="menu_button" data-quick-insert disabled>Insert command</button></div>
    <small data-quick-status role="status"></small>
    <div class="ig-tool-actions"><button type="button" class="menu_button" data-quick-library>Image library &amp; bindings</button><button type="button" class="menu_button" data-quick-general>Upload / General</button><button type="button" class="menu_button" data-quick-settings>Gallery settings</button></div>`;
    const query=selector=>container.querySelector(selector),search=query('[data-quick-search]'),gallery=query('[data-quick-gallery]'),images=query('[data-quick-image]'),status=query('[data-quick-status]');
    let entries=[],signature='',scope='',sending=false;
    const chatScope=()=>{const ctx=readContext();return JSON.stringify([ctx.groupId??null,ctx.getCurrentChatId?.()??null,ctx.groupId==null?ctx.characters?.[ctx.characterId]?.avatar:null]);};
    function selected(){return entries.find(e=>e.id===images.value);}
    function showSelected(){
        const entry=selected(),image=query('[data-quick-preview]'),preview=container.querySelector('.ig-quick-preview');preview.hidden=!entry;
        if(entry){image.src=entry.src;query('[data-quick-description]').textContent=entry.description||entry.command;}else image.removeAttribute('src');
        const draft=document.getElementById('send_textarea')?.value.trim();
        query('[data-quick-send]').disabled=!entry||sending||Boolean(draft);query('[data-quick-insert]').disabled=!entry||sending;
        status.textContent=draft?'Draft present: Insert command keeps your text. Send image is available when the textbox is empty.':entries.length?'Sends a narrator image message without asking the model to reply.':'No available images. Open the image library to upload images or adjust their bindings.';
    }
    function refresh(){
        const nextScope=chatScope();if(scope!==nextScope){scope=nextScope;search.value='';gallery.value='';images.value='';}
        const available=readEntries(),galleries=[...new Set(available.map(e=>e.entity))].sort((a,b)=>a.localeCompare(b));
        const gallerySignature=JSON.stringify(galleries);
        if(gallery.dataset.signature!==gallerySignature&&document.activeElement!==gallery){const previous=gallery.value;gallery.replaceChildren(new Option('All available galleries',''));for(const name of galleries)gallery.append(new Option(name==='general'?'General':name,name));gallery.value=galleries.includes(previous)?previous:'';gallery.dataset.signature=gallerySignature;}
        const text=search.value.toLocaleLowerCase();entries=available.filter(e=>(!gallery.value||e.entity===gallery.value)&&`${e.name} ${e.entity} ${e.description}`.toLocaleLowerCase().includes(text)).sort((a,b)=>a.name.localeCompare(b.name)||a.entity.localeCompare(b.entity));
        const next=JSON.stringify(entries.map(e=>[e.id,e.name,e.entity]));
        if(next!==signature&&document.activeElement!==images){const previous=images.value;images.replaceChildren(new Option(entries.length?'Choose an image':'No matching images',''));for(const entry of entries)images.append(new Option(`${entry.name}${gallery.value?'':` · ${entry.entity==='general'?'General':entry.entity}`}`,entry.id));images.value=entries.some(e=>e.id===previous)?previous:'';signature=next;}
        showSelected();
    }
    function current(){const entry=selected();return scope===chatScope()&&readEntries().find(e=>e.id===entry?.id&&e.src===entry.src&&e.command===entry.command);}
    images.addEventListener('change',showSelected);images.addEventListener('blur',refresh);search.addEventListener('input',refresh);gallery.addEventListener('change',refresh);gallery.addEventListener('blur',refresh);
    query('[data-quick-send]').addEventListener('click',async()=>{const entry=current();if(!entry){refresh();return;}if(sending)return;let failure='';sending=true;showSelected();try{if(!await send(entry.command))failure='Could not send. Keep the textbox empty and open an active chat.';}catch(error){failure=error.message;}finally{sending=false;showSelected();if(failure)status.textContent=failure;}});
    query('[data-quick-insert]').addEventListener('click',()=>{const entry=current(),textarea=document.getElementById('send_textarea');if(!entry||!textarea){refresh();return;}textarea.value+=`${textarea.value&&!textarea.value.endsWith('\n')?'\n':''}${entry.command}`;textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.focus({preventScroll:true});});
    for(const [selector,action] of [['[data-quick-library]',openLibrary],['[data-quick-general]',openGeneral],['[data-quick-settings]',openSettings]])query(selector).addEventListener('click',action);
    const onInput=event=>{if(event.target.id==='send_textarea')showSelected();};document.addEventListener('input',onInput);
    refresh();return {refresh,destroy(){document.removeEventListener('input',onInput);container.replaceChildren();}};
}
