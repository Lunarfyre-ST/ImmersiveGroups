// SPDX-License-Identifier: AGPL-3.0-only
// Gallery subsystem derived from LocalImage by mechamarmot; modified for ImmersiveGroups, 2026-11-16. See CREDITS.md.
/* global SillyTavern */
import { useState, useEffect, useRef } from 'react';
import { assignmentInfo, namesForImage, normalizeImageName, imageNameFromFile, uniqueImageName, filterFolderImages, folderImages, sortRequest, assignmentValue } from './folder-gallery-model.js';

const headers=()=>SillyTavern.getContext().getRequestHeaders();
const plural=(count,word)=>`${count} ${word}${count===1?'':'s'}`;

/** Native SillyTavern confirmation when available; falls back to the browser dialog. */
async function confirmAction(message){
    const ctx=SillyTavern.getContext();
    if(typeof ctx.callGenericPopup==='function'&&ctx.POPUP_TYPE?.CONFIRM!==undefined){
        try{return Boolean(await ctx.callGenericPopup(message,ctx.POPUP_TYPE.CONFIRM));}catch{/* use fallback */}
    }
    return window.confirm(message);
}

function useFolderImages(folder,sort,owner,enabled=true){
    const [state,setState]=useState({images:[],loading:enabled,error:''}),request=useRef(null),[revision,setRevision]=useState(0);
    useEffect(()=>{
        if(!enabled)return undefined;
        request.current?.abort();const controller=new AbortController();request.current=controller;
        setState(s=>({...s,loading:true,error:''}));
        fetch('/api/images/list',{method:'POST',signal:controller.signal,headers:headers(),body:JSON.stringify({folder,...sortRequest(sort)})})
            .then(async response=>{if(controller.signal.aborted)return;const images=response.ok?folderImages(folder,await response.json(),owner):[];if(!controller.signal.aborted)setState({images,loading:false,error:''});})
            .catch(error=>{if(controller.signal.aborted)return;console.error('Failed to fetch images:',error);setState({images:[],loading:false,error:'Failed to load images'});});
        return()=>controller.abort();
    },[folder,sort,owner,enabled,revision]);
    return {...state,reload:()=>setRevision(value=>value+1)};
}

function ImageTile({image,info,selecting,picked,current,onClick}){
    const label=info.name?`${info.name}${image.readOnly?` (${image.owner})`:''}`:`${image.name} (no command name)`;
    return <button type="button" className={`local-image-item${info.name?' assigned':' unassigned'}${picked?' picked':''}${current?' current':''}${image.readOnly?' local-image-item-small':''}`} data-image-path={image.path} aria-label={label} aria-pressed={selecting?picked:undefined} title={info.description||info.name||image.name} onClick={onClick}>
        <img src={image.src} alt="" loading="lazy"/>
        {info.name?<span className="assignment-label"><span className="assignment-name">{info.name}</span>{info.description&&<span className="assignment-desc">{info.description}</span>}</span>:<span className="ig-unnamed-badge">Unnamed</span>}
        {selecting&&<span className="ig-pick-check" aria-hidden="true">✓</span>}
    </button>;
}

function ImageDetails({image,info,tagEntity,conflicts,onSave,onView,onRemoveNames,onDelete,onBindings,onClose,busy}){
    const [name,setName]=useState(info.name||imageNameFromFile(image.name)),[description,setDescription]=useState(info.description),[error,setError]=useState('');
    useEffect(()=>{setName(info.name||imageNameFromFile(image.name));setDescription(info.description);setError('');},[image.path,info.name,info.description]);
    const preview=normalizeImageName(name),dirty=preview!==(info.name||'')||description!==info.description;
    function submit(event){event.preventDefault();if(!preview){setError('Use a name without spaces or colons (for example RefiyaBedCuddle).');return;}try{onSave(preview,description.trim());setName(preview);setDescription(description.trim());setError('');}catch(e){setError(e.message);}}
    return <aside className="ig-folder-details" aria-label="Image details">
        <div className="ig-folder-details-heading"><h4>{image.readOnly?`${image.owner} image`:'Image details'}</h4><button type="button" className="menu_button" onClick={onClose}>Close details</button></div>
        <button type="button" className="ig-folder-details-preview" onClick={onView} aria-label={`View full size: ${image.name}`}><img src={image.src} alt=""/></button>
        <small className="ig-folder-details-file">{image.name}</small>
        {image.readOnly?<>
            <p>{info.name?<><strong>{info.name}</strong>{info.description?` — ${info.description}`:''}</>:'No command name in this member’s gallery.'}</p>
            {info.name&&<code>{`::img ${image.owner} ${info.name}::`}</code>}
            <small>Member images are managed in that character’s gallery or the library.</small>
        </>:<form onSubmit={submit}>
            <label>Command name<input className="text_pole" aria-label="Command name" value={name} maxLength={120} onChange={e=>setName(e.target.value)} required/></label>
            <small>Spaces become underscores; colons are not allowed.{info.name?' Renaming keeps the old name as an alias.':''}</small>
            <label>Scene description<textarea className="text_pole" aria-label="Scene description" rows={3} maxLength={2000} value={description} placeholder="What is shown and when this image fits…" onChange={e=>setDescription(e.target.value)}/></label>
            {conflicts.length>0&&<small className="ig-folder-warning" role="note">Also used by {conflicts.join(', ')}. <code>{`::img ${tagEntity} ${preview}::`}</code> still targets this image.</small>}
            {error&&<p className="local-image-error" role="alert">{error}</p>}
            <code>{`::img ${tagEntity} ${preview||'name'}::`}</code>
            <button type="submit" className="menu_button ig-folder-save" disabled={busy||!dirty}>{info.name?'Save details':'Assign name'}</button>
        </form>}
        <div className="ig-folder-details-actions">
            <button type="button" className="menu_button" onClick={onView}>View full size</button>
            {!image.readOnly&&info.name&&onBindings&&<button type="button" className="menu_button" onClick={onBindings}>Availability &amp; bindings…</button>}
            {!image.readOnly&&info.name&&<button type="button" className="menu_button" disabled={busy} onClick={onRemoveNames}>Remove name</button>}
            {!image.readOnly&&<button type="button" className="menu_button ig-danger-button" disabled={busy} onClick={onDelete}>Delete file</button>}
        </div>
    </aside>;
}

function MemberSection({member,sort,search,status,expanded,onToggle,renderTile}){
    const open=expanded||Boolean(search.trim());
    const {images,loading}=useFolderImages(member.folder,sort,member.name,open);
    const visible=filterFolderImages(images.map(image=>({...image,readOnly:true})),member.assignments,{search,status}),count=Object.keys(member.assignments||{}).length;
    return <div className="group-member-section">
        <button type="button" className="group-member-header" aria-expanded={open} onClick={onToggle}><i className={`fa-solid ${open?'fa-chevron-down':'fa-chevron-right'}`} aria-hidden="true"/><span className="member-name">{member.name}</span>{count>0&&<span className="member-count">{count} named</span>}</button>
        {open&&<div className="group-member-content">{loading?<div className="local-image-loading">Loading…</div>:visible.length===0?<div className="local-image-empty-small">{images.length?'No matching images':'No images'}</div>:<div className="local-image-grid local-image-grid-small">{visible.map(image=>renderTile(image,member.assignments))}</div>}</div>}
    </div>;
}

/**
 * Shared folder gallery. Uploads, names and deletions are saved through the owner callbacks,
 * which run even if the modal closes mid-upload; the modal never reopens itself.
 */
export default function FolderGallery({title,folder,owner,tagEntity,libraryGallery,assignments={},settings,onSaveSettings,onAssign,onUnassign,onRestore,onSaveDetails,onClose,onOpenLibrary,onOpenGeneral,onOpenExtensionSettings,members=[],conflictsFor=()=>[],usageHint,emptyHint='Drag and drop images here or use Upload.',uploadTitle='Upload images'}){
    const [sort,setSort]=useState(settings?.fileSort||'date-desc'),[search,setSearch]=useState(''),[status,setStatus]=useState('all');
    const {images,loading,error:loadError,reload}=useFolderImages(folder,sort,owner);
    const [detailPath,setDetailPath]=useState(null),[lightbox,setLightbox]=useState(null),[selecting,setSelecting]=useState(false),[picked,setPicked]=useState(()=>new Set());
    const [notice,setNotice]=useState(null),[error,setError]=useState(''),[upload,setUpload]=useState(null),[busy,setBusy]=useState(false),[dragging,setDragging]=useState(false),[expanded,setExpanded]=useState({});
    const modal=useRef(null),fileInput=useRef(null),mounted=useRef(true),dragDepth=useRef(0);
    useEffect(()=>{mounted.current=true;const previous=document.activeElement;modal.current?.querySelector('.local-image-modal-header button')?.focus({preventScroll:true});return()=>{mounted.current=false;if(previous?.isConnected&&previous.getClientRects().length)previous.focus({preventScroll:true});};},[]);
    const visible=filterFolderImages(images,assignments,{search,status});
    const detailImage=detailPath&&(images.find(i=>i.path===detailPath)||detailPath.member);
    const detailInfo=detailImage?assignmentInfo(detailImage.readOnly?detailPath.assignments:assignments,detailImage.src):null;
    const namedCount=images.filter(image=>assignmentInfo(assignments,image.src).name).length;
    const say=(text,undo)=>{if(mounted.current)setNotice({text,undo});};

    useEffect(()=>{const handler=event=>{if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;event.preventDefault();event.stopPropagation();if(lightbox)setLightbox(null);else if(detailPath)setDetailPath(null);else if(selecting){setSelecting(false);setPicked(new Set());}else onClose();};document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);},[lightbox,detailPath,selecting,onClose]);
    useEffect(()=>{if(detailPath)modal.current?.querySelector('.ig-folder-details input,.ig-folder-details button')?.focus({preventScroll:true});},[detailPath&&(detailPath.path||detailPath)]);

    function trapFocus(event){if(event.key!=='Tab'||!modal.current)return;const scope=modal.current.querySelector('.local-image-lightbox')||modal.current;const controls=[...scope.querySelectorAll('button,input,select,textarea,a[href]')].filter(n=>!n.disabled&&n.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
    function changeSort(value){setSort(value);onSaveSettings?.({...(settings||{}),fileSort:value});}

    async function uploadFiles(files){
        files=files.filter(file=>file&&(!file.type||file.type.startsWith('image/')));
        if(!files.length||upload)return;
        setError('');setNotice(null);const failures=[],taken={...assignments},named=[];
        for(const [index,file] of files.entries()){
            if(mounted.current)setUpload({done:index,total:files.length,failed:failures.length});
            try{
                const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error||new Error('Could not read file'));reader.readAsDataURL(file);});
                const response=await fetch('/api/images/upload',{method:'POST',headers:headers(),body:JSON.stringify({image:base64,ch_name:folder,filename:file.name.replace(/\.[^/.]+$/,'').replace(/[^a-zA-Z0-9._-]/g,'_'),format:file.name.split('.').pop().toLowerCase()})});
                if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||`Upload failed: ${response.statusText}`);}
                const uploaded=await response.json();if(typeof uploaded.path!=='string'||!uploaded.path.trim())throw new Error('Upload returned no image path');
                // Use the server's real filename (it can sanitize or rename it), and never take another file's name.
                const name=uniqueImageName(imageNameFromFile(uploaded.path),taken,uploaded.path);taken[name]={path:uploaded.path};
                onAssign(name,uploaded.path,name);named.push(name);
            }catch(e){console.error('Failed to upload image:',e);failures.push(`${file.name}: ${e.message}`);}
        }
        if(!mounted.current)return;
        setUpload(null);reload();
        if(failures.length)setError(`${plural(failures.length,'upload')} failed — ${failures.join('; ')}`);
        if(named.length)say(`Uploaded ${plural(named.length,'image')}${named.length<=3?`: ${named.join(', ')}`:''}.`);
    }

    function removeNames(list){
        const removed=[];for(const image of list)for(const name of namesForImage(assignments,image.src)){removed.push([name,structuredClone(assignmentValue(assignments[name]))]);onUnassign(name);}
        if(!removed.length)return;
        say(`Removed ${plural(removed.length,'name')}.`,onRestore?()=>{for(const [name,value] of removed)onRestore(name,value);say(`Restored ${plural(removed.length,'name')}.`);}:null);
    }
    async function deleteFiles(list){
        if(!list.length)return;
        const message=list.length===1?`Delete ${list[0].name}? The file is removed from the server and cannot be restored.`:`Delete ${plural(list.length,'file')}? They are removed from the server and cannot be restored.`;
        if(!await confirmAction(message))return;
        setBusy(true);setError('');const failures=[];let deleted=0;
        for(const image of list){
            try{const response=await fetch('/api/images/delete',{method:'POST',headers:headers(),body:JSON.stringify({path:image.path})});if(!response.ok)throw new Error('Delete failed');deleted++;for(const name of namesForImage(assignments,image.src))onUnassign(name);}
            catch(e){console.error('Failed to delete image:',e);failures.push(image.name);}
        }
        if(!mounted.current)return;
        setBusy(false);setPicked(new Set());if(list.some(i=>i.path===detailPath))setDetailPath(null);reload();
        if(failures.length)setError(`Could not delete ${failures.join(', ')}.`);
        if(deleted)say(`Deleted ${plural(deleted,'file')}.`);
    }
    function nameFromFilenames(list){
        const taken={...assignments};let count=0;
        for(const image of list){if(namesForImage(taken,image.src).length)continue;const name=uniqueImageName(imageNameFromFile(image.name),taken,image.path);taken[name]={path:image.path};onAssign(name,image.path,'');count++;}
        say(count?`Named ${plural(count,'image')} from filenames.`:'Every selected image already has a name.');
    }
    function saveDetails(image,name,description){
        const info=assignmentInfo(assignments,image.src);
        if(info.name){if(name!==info.name&&Object.hasOwn(assignments,name))throw new Error('This gallery already has that image name.');if(onSaveDetails)onSaveDetails(info.name,{name,description});else{onUnassign(info.name);onAssign(name,image.path,description);}}
        else{if(Object.hasOwn(assignments,name))throw new Error('This gallery already has that image name.');onAssign(name,image.path,description);}
        say(`Saved ${name}.`);
    }
    function tileClick(image){
        if(image.readOnly){setDetailPath({path:image.path,member:image,assignments:image.memberAssignments});return;}
        if(selecting){setPicked(prev=>{const next=new Set(prev);if(next.has(image.path))next.delete(image.path);else next.add(image.path);return next;});return;}
        setDetailPath(image.path);
    }
    const renderTile=(image,map)=><ImageTile key={image.path} image={map?{...image,memberAssignments:map}:image} info={assignmentInfo(map||assignments,image.src)} selecting={selecting&&!image.readOnly} picked={picked.has(image.path)} current={(detailPath?.path||detailPath)===image.path} onClick={()=>tileClick(map?{...image,memberAssignments:map}:image)}/>;
    const pickedImages=images.filter(i=>picked.has(i.path));

    return <div className="local-image-modal-backdrop" onClick={event=>{if(event.target===event.currentTarget)onClose();}}
        onDragEnter={event=>{if(!event.dataTransfer?.types?.includes('Files'))return;event.preventDefault();dragDepth.current++;setDragging(true);}}
        onDragOver={event=>{event.preventDefault();event.stopPropagation();}}
        onDragLeave={()=>{dragDepth.current=Math.max(0,dragDepth.current-1);if(!dragDepth.current)setDragging(false);}}
        onDrop={event=>{event.preventDefault();event.stopPropagation();dragDepth.current=0;setDragging(false);uploadFiles(Array.from(event.dataTransfer?.files||[]));}}>
        <div ref={modal} className={`local-image-modal ig-folder-gallery${members.length?' local-image-modal-large':''}${detailPath?' ig-folder-has-details':''}${dragging?' ig-folder-dragging':''}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={trapFocus}>
            <div className="local-image-modal-header">
                <h3>{title}</h3>
                <div className="local-image-modal-actions">
                    {onOpenLibrary&&<button type="button" className="menu_button" onClick={()=>onOpenLibrary({type:'image',gallery:libraryGallery})}>Image library</button>}
                    {onOpenGeneral&&<button type="button" className="menu_button" onClick={()=>onOpenGeneral()} title="Shared images for all chats">General</button>}
                    {onOpenExtensionSettings&&<button type="button" className="menu_button" onClick={()=>onOpenExtensionSettings()} title="Shortcut visibility, size and position">Shortcuts</button>}
                    <button type="button" className={`menu_button${selecting?' menu_button_active':''}`} aria-pressed={selecting} onClick={()=>{setSelecting(!selecting);setPicked(new Set());setDetailPath(null);}} title="Select several images">{selecting?'Done':'Select'}</button>
                    <button type="button" className="menu_button" onClick={()=>fileInput.current?.click()} disabled={Boolean(upload)} title={uploadTitle} aria-label={uploadTitle}><i className="fa-solid fa-upload" aria-hidden="true"/></button>
                    <button type="button" className="menu_button" onClick={onClose} title="Close" aria-label="Close"><i className="fa-solid fa-times" aria-hidden="true"/></button>
                </div>
                <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value='';uploadFiles(files);}}/>
            </div>
            {(error||loadError)&&<div className="local-image-error" role="alert">{error||loadError}</div>}
            <div className="local-image-info">
                <span>{usageHint||<>Use <code>{`::img ${tagEntity} name::`}</code> in messages.</>}</span>
                <span className="assigned-count">{namedCount} of {plural(images.length,'image')} named</span>
            </div>
            <div className="ig-file-search ig-folder-toolbar">
                <input type="search" className="text_pole" aria-label="Search gallery images" placeholder={members.length?'Search group and member images…':'Search filenames, names and descriptions…'} value={search} onChange={event=>setSearch(event.target.value)}/>
                <select aria-label="Filter gallery images" value={status} onChange={event=>setStatus(event.target.value)}><option value="all">All images</option><option value="named">Named</option><option value="unnamed">Unnamed</option></select>
                <select aria-label="Sort gallery files" value={sort} onChange={event=>changeSort(event.target.value)}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="name-asc">Filename A–Z</option><option value="name-desc">Filename Z–A</option></select>
            </div>
            {selecting&&<div className="ig-folder-bulk" role="toolbar" aria-label="Selected images">
                <span>{plural(picked.size,'image')} selected</span>
                <button type="button" className="menu_button" onClick={()=>setPicked(new Set(visible.map(i=>i.path)))}>Select all shown</button>
                <button type="button" className="menu_button" disabled={!picked.size} onClick={()=>nameFromFilenames(pickedImages)}>Name from filenames</button>
                <button type="button" className="menu_button" disabled={!picked.size} onClick={()=>{removeNames(pickedImages);setPicked(new Set());}}>Remove names</button>
                <button type="button" className="menu_button ig-danger-button" disabled={!picked.size||busy} onClick={()=>deleteFiles(pickedImages)}>Delete files</button>
            </div>}
            {(notice||upload)&&<div className="ig-folder-notice" role="status">{upload?<><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"/> Uploading {upload.done+1} / {upload.total}…</>:<>{notice.text}{notice.undo&&<button type="button" className="menu_button" onClick={()=>{const undo=notice.undo;setNotice(null);undo();}}>Undo</button>}</>}</div>}
            <div className="ig-folder-body">
                <div className={`local-image-modal-content${members.length?' group-gallery-content':''}`}>
                    {members.length>0&&<div className="group-section-header"><i className="fa-solid fa-users" aria-hidden="true"/><span>Group images</span></div>}
                    {loading?<div className="local-image-loading">Loading…</div>:visible.length===0?<div className="local-image-empty"><p>{images.length?'No matching images':'No images yet'}</p><p>{images.length?'Change the search or filter.':emptyHint}</p></div>:<div className="local-image-grid">{visible.map(image=>renderTile(image))}</div>}
                    {members.length>0&&<div className="group-section"><div className="group-section-header"><i className="fa-solid fa-user" aria-hidden="true"/><span>Member images</span><small>read-only</small></div><div className="group-members-list">{members.map(member=><MemberSection key={member.name} member={member} sort={sort} search={search} status={status} expanded={Boolean(expanded[member.name])} onToggle={()=>setExpanded(prev=>({...prev,[member.name]:!prev[member.name]}))} renderTile={renderTile}/>)}</div></div>}
                </div>
                {detailImage&&<ImageDetails image={detailImage} info={detailInfo} tagEntity={tagEntity} busy={busy} conflicts={detailImage.readOnly?[]:conflictsFor(normalizeImageName(detailInfo.name||imageNameFromFile(detailImage.name)))}
                    onSave={(name,description)=>saveDetails(detailImage,name,description)} onView={()=>setLightbox(detailImage)} onClose={()=>setDetailPath(null)}
                    onRemoveNames={()=>removeNames([detailImage])} onDelete={()=>deleteFiles([detailImage])}
                    onBindings={onOpenLibrary?()=>onOpenLibrary({type:'image',gallery:libraryGallery,search:detailInfo.name}):null}/>}
            </div>
            {dragging&&<div className="ig-folder-drop" aria-hidden="true">Drop images to upload</div>}
            {lightbox&&<div className="local-image-lightbox" onClick={()=>setLightbox(null)}><img src={lightbox.src} alt={lightbox.name}/><button type="button" className="lightbox-close" aria-label="Close preview" onClick={()=>setLightbox(null)}><i className="fa-solid fa-times" aria-hidden="true"/></button></div>}
        </div>
    </div>;
}
