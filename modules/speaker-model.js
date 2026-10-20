// SPDX-License-Identifier: AGPL-3.0-only
export function speakerOrder(chat, characters, activeAvatar = '') {
    const avatars = new Set(characters.map(c => c.avatar));
    const order = activeAvatar && avatars.has(activeAvatar) ? [activeAvatar] : [];
    for (let i = chat.length - 1; i >= 0; i--) {
        const message = chat[i]; if (!message || message.is_user || message.is_system) continue;
        let avatar = message.original_avatar;
        if (!avatars.has(avatar) && typeof message.force_avatar === 'string') avatar = characters.find(c => message.force_avatar.includes(encodeURIComponent(c.avatar)))?.avatar;
        if (!avatars.has(avatar)) { const named = characters.filter(c => c.name === message.name); avatar = named.length === 1 ? named[0].avatar : ''; }
        if (avatars.has(avatar) && !order.includes(avatar)) order.push(avatar);
        if (order.length === avatars.size) break;
    }
    return order;
}
export function recentCharacters(chat,characters,limit=0,active='') {
    limit=Math.max(0,Math.floor(Number(limit)||0));if(!limit)return characters;
    const order=[...speakerOrder(chat,characters,active),...characters.map(c=>c.avatar)];
    const selected=new Set([...new Set(order)].slice(0,limit));return characters.filter(c=>selected.has(c.avatar));
}
