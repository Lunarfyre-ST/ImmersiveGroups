// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { isMobile } from '../../../../RossAscends-mods.js';
import { extension_settings, getContext } from '../../../../extensions.js';
import * as expressions from '../../../expressions/index.js';
import { extensionName } from '../constants.js';
import { mobileLayout } from './responsive.js';

const jobs = new Map();
const retryAfter = new Map();
// Folder listings are shared by expression changes; rescans and uploads clear them.
const lists = new Map(), LIST_TTL = 60000, FETCH_TIMEOUT = 15000;
let scope = '';
// Native classification finishes after the message events that schedule a
// refresh, and its hidden native image does not always change. Watch the
// classifier result itself for a bounded window after chat activity.
const WATCH_INTERVAL = 500, WATCH_WINDOW = 45000;
let watchTimer = 0, watchUntil = 0, watchSeen = '';
export function mobileSpritesActive() {
    const s = extension_settings[extensionName];
    return Boolean(s?.enableVN_UI && s.mobileGroupSprites !== false && mobileLayout() && (isMobile() || s.layoutMode === 'mobile') && getContext().groupId != null);
}
export function mobileSprite(character) { return document.getElementById(`ig-expression-${character.avatar}`); }
export const expressionRoot = folder => String(folder || '').split('/')[0];
export function nativeExpression(folder) { return expressions.lastExpression?.[expressionRoot(folder)] || ''; }
export function forgetMobileSpriteFolder(folder) { if (folder) lists.delete(folder); else lists.clear(); }
function spriteList(folder) {
    const cached = lists.get(folder);
    if (cached && Date.now() - cached.at < LIST_TTL) return cached.promise;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const promise = (async () => {
        try {
            const response = await fetch(`/api/sprites/get?name=${encodeURIComponent(folder)}`, { signal: controller.signal });
            if (!response.ok) throw new Error(`Sprite folder unavailable (${response.status})`);
            const list = await response.json();
            if (!Array.isArray(list)) throw new Error('Invalid sprite list');
            return list;
        } catch (error) {
            throw controller.signal.aborted ? new Error('Sprite folder request timed out') : error;
        } finally { clearTimeout(timer); }
    })();
    const record = { at: Date.now(), promise };
    lists.set(folder, record);
    promise.catch(() => { if (lists.get(folder) === record) lists.delete(folder); });
    return promise;
}
export function watchNativeExpressions(signature, changed) {
    if (!mobileSpritesActive()) return;
    watchUntil = Date.now() + WATCH_WINDOW;
    if (watchTimer) return;
    watchSeen = signature();
    watchTimer = setInterval(() => {
        if (!mobileSpritesActive() || Date.now() > watchUntil) { clearInterval(watchTimer); watchTimer = 0; return; }
        const next = signature();
        if (next !== watchSeen) { watchSeen = next; changed(); }
    }, WATCH_INTERVAL);
}
export function syncMobileSprites(characters, folderFor, changed) {
    let wrapper = document.getElementById('ig-mobile-sprites');
    if (!wrapper) { wrapper = document.createElement('div'); wrapper.id = 'ig-mobile-sprites'; document.body.append(wrapper); }
    const active = mobileSpritesActive();
    document.body.classList.toggle('ig-mobile-group', active);
    wrapper.hidden = !active;
    const nextScope = `${getContext().groupId}:${getContext().getCurrentChatId?.()}`;
    if (!active || nextScope !== scope) { wrapper.replaceChildren(); jobs.clear(); retryAfter.clear(); lists.clear(); scope = nextScope; }
    if (!active) return;
    for (const avatar of jobs.keys()) if (!characters.some(c=>c.avatar===avatar)) jobs.delete(avatar);
    for (const node of [...wrapper.children]) if (!characters.some(c => c.avatar === node.dataset.avatar)) { jobs.delete(node.dataset.avatar); node.remove(); }
    for (const c of characters) {
        const folder = folderFor(c);
        const expression = nativeExpression(folder) || 'neutral';
        const key = `${scope}:${folder}:${expression}`;
        const node = mobileSprite(c);
        if (node?.dataset.request === key || jobs.get(c.avatar)?.key === key || (retryAfter.get(key)||0)>Date.now()) continue;
        const job = { key }; jobs.set(c.avatar, job);
        (async () => {
            const list = await spriteList(folder);
            const sprite = list.find(s => s.label === expression) || list.find(s => s.label === 'neutral') || list[0];
            if (!sprite) { retryAfter.set(key,Date.now()+30000); return; }
            const url = new URL(sprite.path, window.location.href);
            if (url.origin !== window.location.origin || !url.pathname.startsWith('/characters/')) return;
            const image = new Image();
            await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Sprite load timed out')),15000); image.onload = () => {clearTimeout(timer);resolve();}; image.onerror = () => {clearTimeout(timer);reject(new Error('Sprite failed to load'));}; image.src = url.href; });
            if (!mobileSpritesActive() || jobs.get(c.avatar) !== job || scope !== nextScope) return;
            // Native classification can finish while this older sprite is loading,
            // even when the native image does not produce a DOM change.
            if ((nativeExpression(folder) || 'neutral') !== expression) { changed(); return; }
            let holder = mobileSprite(c);
            if (!holder) { holder = document.createElement('div'); holder.className = 'expression-holder'; holder.id = `ig-expression-${c.avatar}`; holder.dataset.avatar = c.avatar; holder.append(document.createElement('img')); wrapper.append(holder); }
            const img = holder.querySelector('img');
            // A manual outfit change during loading wins over this background job.
            if (folderFor(c) !== folder) return;
            img.setAttribute('src',sprite.path); img.dataset.expression = sprite.label; img.dataset.spriteFolderName = folder; img.title = sprite.label;
            holder.dataset.request = key;
            changed();
        })().catch(error => {retryAfter.set(key,Date.now()+30000);console.warn('[ImmersiveGroups] Mobile sprite:',c.name,error.message);}).finally(() => { if (jobs.get(c.avatar) === job) jobs.delete(c.avatar); });
    }
}
