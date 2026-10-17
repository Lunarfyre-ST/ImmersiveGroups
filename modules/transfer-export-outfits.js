// SPDX-License-Identifier: AGPL-3.0-only
export function mountOutfitExportChoices(parent,{state,getEntries,onChange}) {
    let entries=[],disposed=false;
    const list=document.createElement('div');list.className='ig-transfer-outfit-list';parent.append(list);
    function refresh(){
        if(disposed)return;
        entries=getEntries();const known=new Set(entries.map(entry=>entry.key));
        for(const key of state.excludedOutfits)if(!known.has(key))state.excludedOutfits.delete(key);
        list.replaceChildren();
        if(!entries.length){const empty=document.createElement('small');empty.textContent='No outfits in the selected character scope.';list.append(empty);}
        for(const entry of entries){
            const label=document.createElement('label'),input=document.createElement('input'),folder=document.createElement('code');
            label.className='ig-transfer-check';input.type='checkbox';input.checked=!state.excludedOutfits.has(entry.key);input.dataset.transferExportOutfit=entry.key;
            input.disabled=!['outfits','spriteFiles','outfitDescriptions','outfitHeights','outfitOrder','colors'].some(key=>state.selection[key]);input.dataset.keepDisabled=String(input.disabled);
            folder.textContent=entry.folder;label.append(input,document.createTextNode(`${entry.character} / ${entry.label}`),folder);list.append(label);
            input.addEventListener('change',()=>{if(input.checked)state.excludedOutfits.delete(entry.key);else state.excludedOutfits.add(entry.key);notify();});
        }
        notify();
    }
    function notify(){onChange({total:entries.length,selected:entries.filter(entry=>!state.excludedOutfits.has(entry.key)).length});}
    refresh();return {refresh,dispose(){disposed=true;}};
}
