// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { extension_settings, getContext } from '../../../../extensions.js';
import { isGenerating, eventSource, event_types } from '../../../../../script.js';
import { extensionName } from '../constants.js';
import { bounded } from './height-profiles.js';
let activeSpeaker='';
export function setActiveSpeaker(avatar=''){activeSpeaker=avatar;}
export function setupSpeakerTracking(){
    if(event_types.GROUP_MEMBER_DRAFTED)eventSource.on(event_types.GROUP_MEMBER_DRAFTED,id=>{activeSpeaker=getContext().characters?.[id]?.avatar||'';applySpeakerDimming();});
    for(const name of ['GENERATION_ENDED','GENERATION_STOPPED','CHAT_CHANGED'])if(event_types[name])eventSource.on(event_types[name],()=>{activeSpeaker='';applySpeakerDimming();});
}

export function speakerOrder(chat, characters, activeAvatar = '') {
    const avatars = new Set(characters.map(c => c.avatar));
    const order = activeAvatar && avatars.has(activeAvatar) ? [activeAvatar] : [];
    for (let i = chat.length - 1; i >= 0; i--) {
        const message = chat[i]; if (!message || message.is_user || message.is_system) continue;
        let avatar = message.original_avatar;
        if (!avatars.has(avatar) && typeof message.force_avatar === 'string') avatar = characters.find(c => message.force_avatar.includes(encodeURIComponent(c.avatar)))?.avatar;
        if (!avatars.has(avatar)) {
            const named = characters.filter(c => c.name === message.name);
            avatar = named.length === 1 ? named[0].avatar : '';
        }
        if (avatars.has(avatar) && !order.includes(avatar)) order.push(avatar);
        if (order.length === avatars.size) break;
    }
    return order;
}
export function dimPercent(avatar, order, settings) {
    if (!order.length) return 0;
    const rank = order.indexOf(avatar);
    return rank === 0 ? bounded(settings.speakerDimCurrent,0,100,0)
        : rank === 1 ? bounded(settings.speakerDimPrevious,0,100,25)
        : rank === 2 ? bounded(settings.speakerDimThird,0,100,settings.speakerDimOthers ?? 50)
        : rank === 3 ? bounded(settings.speakerDimFourth,0,100,75)
        : bounded(settings.speakerDimFifth,0,100,100);
}
export function applySpeakerDimming() {
    const config = extension_settings[extensionName]; if (!config) return;
    const ctx = getContext();
    const group = ctx.groups?.find(g => String(g.id) === String(ctx.groupId));
    const characters = group ? (group.members || []).filter(a => !(group.disabled_members || []).includes(a))
        .map(a => ctx.characters?.find(c => c.avatar === a)).filter(Boolean) : [ctx.characters?.[ctx.characterId]].filter(Boolean);
    const active = activeSpeaker || (isGenerating() ? ctx.characters?.[ctx.characterId]?.avatar : '');
    const order = speakerOrder(ctx.chat || [], characters, active);
    const ranks=characters.map((character,index)=>({avatar:character.avatar,index,rank:order.includes(character.avatar)?order.indexOf(character.avatar):characters.length,dim:config.spriteDefocusTint?dimPercent(character.avatar,order,config):0}));
    ranks.sort((a,b)=>a.dim-b.dim||a.rank-b.rank||a.index-b.index);
    const managed=new Set();
    for (const character of characters) {
        const nodes=group?[document.getElementById(`ig-expression-${character.avatar}`),document.getElementById(`expression-${character.avatar}`)]:[document.getElementById('expression-holder')];
        const enabled = config.enableVN_UI && config.spriteDefocusTint;
        const dim = enabled ? dimPercent(character.avatar, order, config) : 0;
        const brightness = String(1 - dim / 100);
        for(const node of nodes.filter(Boolean)){
        managed.add(node);
        if (node.style.getPropertyValue('--prome-defocus-brightness') !== brightness) node.style.setProperty('--prome-defocus-brightness', brightness);
        node.classList.toggle('prome-sprite-defocus', Boolean(dim > 0));
        node.classList.toggle('prome-speaker-dimming', Boolean(enabled));
        node.classList.toggle('ig-layered-sprite',Boolean(config.enableVN_UI&&group));
        if(config.enableVN_UI&&group){const layer=String(characters.length-ranks.findIndex(entry=>entry.avatar===character.avatar)+1);if(node.style.getPropertyValue('--ig-sprite-layer')!==layer)node.style.setProperty('--ig-sprite-layer',layer);}
        else node.style.removeProperty('--ig-sprite-layer');
        }
    }
    for(const node of document.querySelectorAll('.ig-layered-sprite'))if(!managed.has(node)){
        node.classList.remove('ig-layered-sprite','prome-speaker-dimming','prome-sprite-defocus');
        node.style.removeProperty('--ig-sprite-layer');node.style.removeProperty('--prome-defocus-brightness');
    }
}
