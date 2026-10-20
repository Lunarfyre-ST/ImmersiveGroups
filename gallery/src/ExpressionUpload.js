// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useRef, useState } from 'react';
import { detectSpriteExpression, spriteImageName, validExpressionLabel } from '../../modules/outfit-files-model.js';

export function ExpressionUpload({draft,scene,busy,onUpload,onClose}){
    const mounted=useRef(false);
    useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
    const [labels,setLabels]=useState([]),[choices,setChoices]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0);
    useEffect(()=>{
        let alive=true;setLoading(true);setError('');
        Promise.resolve().then(()=>scene.getExpressionLabels()).then(values=>{
            if(!alive)return;
            const list=[...new Set(values.filter(validExpressionLabel))];
            if(!list.length)throw new Error('No supported expression names are available.');
            setLabels(list);setChoices(draft.files.map(file=>detectSpriteExpression(file.name,list)));setLoading(false);
        }).catch(cause=>{if(alive){setError(cause.message);setLoading(false);}});
        return()=>{alive=false;};
    },[draft,scene,attempt]);
    const supported=draft.files.every(file=>spriteImageName(file.name)),ready=!loading&&!error&&supported&&choices.length===draft.files.length&&choices.every(label=>labels.includes(label));
    return <form className="ig-library-expression-upload" onSubmit={async event=>{event.preventDefault();if(ready&&!busy){const success=await onUpload(choices);if(success&&mounted.current)onClose();}}}>
        <strong>{draft.entry.entity} / {draft.entry.name}</strong><code>{draft.entry.folder}</code>
        <p>Add images to this outfit. Recognized filenames select their expression automatically; choose one for any other image. Existing images are kept, with numbered variants added for duplicates.</p>
        <small>Up to 200 images, 20 MiB each and 250 MiB total. These images become outfit expressions; they are not added to chat image galleries.</small>
        <small>Use Manage expressions → Rescan sprite folder if SillyTavern has already cached this outfit’s expression choices.</small>
        {loading&&<p role="status">Loading expression names…</p>}
        {error&&<><p role="alert">{error}</p><button type="button" className="menu_button" disabled={busy} onClick={()=>setAttempt(n=>n+1)}>Retry expression names</button></>}
        {!supported&&<p role="alert">Choose PNG, JPEG, GIF, WebP, AVIF or BMP images.</p>}
        {draft.files.map((file,index)=><label key={index}>{file.name}<select aria-label={`Expression for image ${index+1}`} value={choices[index]||''} disabled={loading||busy||Boolean(error)} required onChange={event=>setChoices(previous=>previous.map((value,i)=>i===index?event.target.value:value))}><option value="">Choose an expression…</option>{labels.map(label=><option key={label} value={label}>{label}</option>)}</select></label>)}
        <button type="submit" className="menu_button" disabled={!ready||busy}>Upload expression images</button>
    </form>;
}
