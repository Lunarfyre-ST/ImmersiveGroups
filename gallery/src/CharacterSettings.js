// SPDX-License-Identifier: AGPL-3.0-only
import { useState } from 'react';

export function CharacterSettings({avatar,scene,onChange}){
    const [layout,setLayout]=useState('desktop'),[error,setError]=useState(''),settings=scene.getCharacterSettings(avatar),profile=settings[layout]||{};
    const update=patch=>{try{scene.updateCharacterSettings(avatar,patch,layout);setError('');onChange();}catch(cause){setError(cause.message);}};
    return <section className="ig-library-character-settings"><h4>Character settings</h4>
        <label>Character height (cm) · shared<input key={`${avatar}-height-${settings.heightCm}`} type="number" aria-label="Library character height" min="30" max="300" step="any" defaultValue={settings.heightCm} onBlur={event=>{if(event.target.value!==String(settings.heightCm))update({heightCm:event.target.value});}}/></label>
        <label>Adjustments for<select aria-label="Library adjustment layout" value={layout} onChange={event=>setLayout(event.target.value)}><option value="desktop">PC</option><option value="mobile">Mobile</option></select></label>
        <label>Fine tuning (%)<input key={`${avatar}-${layout}-fine-${profile.fineTuneOffset??0}`} type="number" aria-label="Library fine tuning" min="-99" max="7900" step="any" defaultValue={profile.fineTuneOffset??0} onBlur={event=>{if(event.target.value!==String(profile.fineTuneOffset??0))update({fineTuneOffset:event.target.value});}}/></label>
        <label>Vertical offset (px; positive = lower)<input key={`${avatar}-${layout}-y-${profile.offsetY??0}`} type="number" aria-label="Library vertical offset" min="-1000" max="1000" step="any" defaultValue={profile.offsetY??0} onBlur={event=>{if(event.target.value!==String(profile.offsetY??0))update({offsetY:event.target.value});}}/></label>
        <button type="button" className="menu_button" onClick={()=>update({fineTuneOffset:0})}>Reset {layout==='mobile'?'Mobile':'PC'} fine tuning</button>
        <small>Changing a height or adjustment enables character height scaling. Height is shared; fine tuning and offsets are saved separately for PC and Mobile.</small>
        <label><input type="checkbox" aria-label="Library outfit lock" checked={settings.locked} onChange={event=>update({locked:event.target.checked})}/> Lock automatic outfit changes</label><small>The lock also applies to background-linked outfits. Manual outfit selection remains available.</small>
        {error&&<p role="alert">{error}</p>}
    </section>;
}
