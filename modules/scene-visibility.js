// SPDX-License-Identifier: AGPL-3.0-only
import { getContext } from '../../../../extensions.js';
import { layoutSettings } from './responsive.js';
import { recentCharacters } from './speaker-model.js';
let active='';
export const setSceneSpeaker=avatar=>{active=avatar||'';};
export function sceneCharacters(includeMuted=false){
    const c=getContext(),group=c.groups?.find(g=>String(g.id)===String(c.groupId));
    return group?(group.members||[]).filter(a=>a!=='prome-user'&&(includeMuted||!(group.disabled_members||[]).includes(a))).map(a=>c.characters?.find(v=>v.avatar===a)).filter(Boolean):[c.characters?.[c.characterId]].filter(Boolean);
}
export function visibleCharacters(){const s=layoutSettings();return recentCharacters(getContext().chat||[],sceneCharacters(),s.enableVN_UI?s.recentSpeakerLimit:0,active);}
