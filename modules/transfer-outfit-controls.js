// SPDX-License-Identifier: AGPL-3.0-only
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
export const UPDATE_WARNING='Update mode should NOT appear during your first import, if it is your first time importing this pack, it is highly likely there are unplanned file conflicts. Choosing to override may result in permanent data loss. Please backup any sensitive files and review the conflicts before proceeding.';
export function mountOutfitImportChoices(parent,{bundle,state,review,onChange}) {
    const host=node('fieldset',null,'ig-transfer-outfits'),legend=node('legend','Choose outfits'),status=node('p','Checking destination folders…'),list=node('div',null,'ig-transfer-outfit-list'),warning=node('section',null,'ig-transfer-conflict-warning');
    const recheck=node('button','Recheck outfit conflicts','menu_button');recheck.type='button';recheck.addEventListener('click',()=>refresh());
    host.append(legend,status,recheck,list,warning);parent.append(host);let serial=0,timer,rows=[],disposed=false;const choices=new Map();
    const relevant=()=>['outfits','spriteFiles','outfitDescriptions','outfitHeights','outfitOrder','colors'].some(k=>state.selection[k]);
    const activeConflicts=()=>relevant()?rows.filter(row=>row.existing&&!state.excludedOutfits.has(row.key)):[];
    function showWarning(){
        warning.replaceChildren();const conflicts=activeConflicts();warning.hidden=!conflicts.length;if(!conflicts.length)return;
        warning.setAttribute('role','alert');warning.append(node('strong','Update mode — review before replacing files'),node('p',UPDATE_WARNING));
        const files=conflicts.flatMap(row=>state.selection.spriteFiles?row.conflicts.map(f=>`characters/${row.destination}/${f.filename} ← ${f.incoming}`):[]);
        if(files.length){warning.append(node('strong',`${files.length} conflicting sprite ${files.length===1?'file':'files'}`));const ul=node('ul');for(const path of files)ul.append(node('li',path));warning.append(ul);}
        else warning.append(node('small','Existing outfit entries/folders detected. There are no matching sprite files selected for replacement; unrelated files are kept.'));
        warning.append(node('small','The metadata conflict policy below controls names, descriptions and other saved values. Character cards and background files are never overwritten by this option.'));
        const label=node('label',null,'ig-transfer-check'),ack=node('input');ack.type='checkbox';ack.checked=state.overwriteAcknowledged===true;ack.dataset.transferOverwriteAck='';ack.addEventListener('change',()=>{state.overwriteAcknowledged=ack.checked;onChange();});label.append(ack,document.createTextNode('I understand what I am doing'));warning.append(label);
    }
    function render(){
        list.replaceChildren();legend.textContent=state.updateMode?'Choose outfits — Update mode':'Choose outfits';
        status.textContent=state.updateMode?'Existing outfits detected. Conflicting outfits start unchecked. Select only the outfits you intend to update.':rows.length?'Choose the outfits to import. New entries start checked.':'This bundle has no outfit entries.';
        for(const row of rows){const box=node('div',null,'ig-transfer-outfit-row'),label=node('label',null,'ig-transfer-check'),input=node('input');input.type='checkbox';input.dataset.transferOutfit=row.key;input.checked=!state.excludedOutfits.has(row.key);input.disabled=row.unmapped||Boolean(row.error)||!relevant();input.dataset.keepDisabled=String(input.disabled);
            label.append(input,document.createTextNode(`${row.character} / ${row.label}`));box.append(label,node('code',row.destination|| (row.newCardRoot?'A new character root will be checked after card creation.':'No destination character mapped.')));
            const info=row.error?`Check failed: ${row.error}`:row.unmapped?'Unmapped — skipped':row.existing?`Already present · ${row.conflicts.length} matching sprite files${row.metadata?' · saved outfit entry':''}`:'New outfit';box.append(node('small',info));
            if(row.existing||row.error){const alert=node('p',row.error?'Conflict review failed; this outfit cannot be imported.':'Conflict found for this outfit. Review the differences before selecting it.','ig-transfer-outfit-notice');alert.setAttribute('role','status');box.append(alert);}
            if(row.revision)box.append(node('small',row.revision.text));
            if(row.differences?.length){const details=node('details');details.append(node('summary','Metadata differences'));for(const diff of row.differences)details.append(node('p',`${diff.field}: ${diff.existing===undefined?'(absent)':JSON.stringify(diff.existing)} → ${JSON.stringify(diff.incoming)}`));box.append(details);}
            if(state.selection.spriteFiles&&row.conflicts.length){const details=node('details');details.append(node('summary',`${row.conflicts.length} file comparisons`));for(const file of row.conflicts){
                const text={identical:'Identical bytes and filename — file will be kept',different:'Different file contents',renamed:'Identical bytes, different filename — replacement required',unchecked:'Contents not compared'}[file.comparison]||'Contents not compared';
                details.append(node('p',`${file.filename} ← ${file.incoming}: ${text}`));
                if(file.sha256)details.append(node('code',`Existing: ${file.size} bytes · SHA-256 ${file.sha256}\nIncoming: ${file.incomingSize} bytes · SHA-256 ${file.incomingHash}`));
            }box.append(details);}
            input.addEventListener('change',()=>{if(input.checked)state.excludedOutfits.delete(row.key);else state.excludedOutfits.add(row.key);choices.set(row.key,{signature:row.signature,checked:input.checked});state.overwriteAcknowledged=false;showWarning();onChange();});list.append(box);
        }showWarning();
    }
    function refresh(){
        clearTimeout(timer);const request=++serial;state.conflictReview=null;state.reviewPending=true;state.overwriteAcknowledged=false;
        for(const input of list.querySelectorAll('input')){input.disabled=true;input.dataset.keepDisabled='true';}status.textContent='Checking destination folders…';warning.hidden=true;onChange();
        timer=setTimeout(async()=>{try{
            const proof=await review(bundle,{mappingValues:{...state.mappingValues},roots:{...state.roots},folders:{...state.folders},categories:{...state.options},selection:{...state.selection},media:state.media});
            if(disposed||request!==serial||!host.isConnected)return;rows=proof.rows;state.updateMode=proof.updateMode;state.conflictReview=proof;
            for(const row of rows){const previous=choices.get(row.key),checked=previous?.signature===row.signature?previous.checked:!row.existing&&!row.unmapped&&!row.error;if(checked)state.excludedOutfits.delete(row.key);else state.excludedOutfits.add(row.key);choices.set(row.key,{signature:row.signature,checked});}
            state.reviewPending=false;render();onChange();
        }catch(error){if(!disposed&&request===serial&&host.isConnected){state.reviewPending=false;status.textContent=error.message;onChange();}}},180);
    }
    function ready(){return Boolean(!state.reviewPending&&state.conflictReview&&(!activeConflicts().length||state.overwriteAcknowledged));}
    refresh();return {refresh,ready,dispose(){disposed=true;serial++;clearTimeout(timer);}};
}
