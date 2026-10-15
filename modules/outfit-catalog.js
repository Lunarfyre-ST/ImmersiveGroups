// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { extension_settings, getContext } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { extensionName } from '../constants.js';

const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const settings = () => extension_settings[extensionName];
const listeners = new Set();
export const validFolder = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 200 && !/[\r\n\0]/.test(value) && !value.split(/[\\/]/).some(p => p === '..' || p === '.');
export function cleanFolder(value) { return validFolder(value) ? value.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') : ''; }
export function folderLabel(folder, character = {}) {
    if (folder === character.name || folder === character.avatar?.replace(/\.[^/.]+$/, '')) return 'Basic';
    const leaf = folder.split('/').pop();
    const label = leaf.replace(/^outfit[ _-]?(\d+)$/i, 'Outfit $1').replace(/[_-]+/g, ' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
}
export function catalogFor(avatar) {
    const config = settings();
    if (!config.outfitCatalog || typeof config.outfitCatalog !== 'object' || Array.isArray(config.outfitCatalog)) config.outfitCatalog = {};
    let record = own(config.outfitCatalog, avatar) ? config.outfitCatalog[avatar] : null;
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
        record = { outfits: [], ignored: [], locked: false };
        Object.defineProperty(config.outfitCatalog, avatar, { value: record, writable: true, enumerable: true, configurable: true });
    }
    if (!Array.isArray(record.outfits)) record.outfits = [];
    if (!Array.isArray(record.ignored)) record.ignored = [];
    return record;
}
export function onCatalogChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function changed() { saveSettingsDebounced(); for (const listener of listeners) listener(); }
export function rememberOutfit(character, raw, { label, source = 'observed', notify = true, explicit = false } = {}) {
    const folder = cleanFolder(raw); if (!folder) return false;
    const record = catalogFor(character.avatar);
    if (record.ignored.includes(folder) && !explicit) return false;
    if (explicit) record.ignored = record.ignored.filter(f => f !== folder);
    const existing = record.outfits.find(entry => entry.folder === folder);
    if (existing) return false;
    record.outfits.push({ folder, label: label?.trim().slice(0,80) || folderLabel(folder, character), hidden: null, description: '', source });
    if (notify) changed();
    return true;
}
export function seedOutfits(character, active = '') {
    let dirty = false;
    const config = settings();
    const old = own(config.outfitFolders, character.avatar) && Array.isArray(config.outfitFolders[character.avatar]) ? config.outfitFolders[character.avatar] : [];
    const profile = own(config.heightProfiles, character.avatar) ? config.heightProfiles[character.avatar] : {};
    for (const folder of [character.name, ...old, ...Object.keys(profile?.outfits || {}), active].filter(Boolean)) {
        dirty = rememberOutfit(character, folder, { notify: false }) || dirty;
    }
    if (dirty) changed();
}
export function hiddenOutfit(character, entry) {
    if (typeof entry.hidden === 'boolean') return entry.hidden;
    const record = catalogFor(character.avatar);
    const basic = entry.folder === character.name || entry.folder === character.avatar.replace(/\.[^/.]+$/, '');
    return Boolean(settings().hideBasicOutfit !== false && basic && record.outfits.some(e => /\/outfit[ _-]?1$/i.test(e.folder)));
}
export function outfitOptions(character, includeHidden = false) {
    return catalogFor(character.avatar).outfits.filter(entry => validFolder(entry.folder) && (includeHidden || !hiddenOutfit(character, entry)));
}
export function editOutfit(avatar, folder, patch) {
    const record = catalogFor(avatar), entry = record.outfits.find(e => e.folder === folder);
    if (!entry) return;
    if (typeof patch.label === 'string') entry.label = patch.label.trim().slice(0,80) || folder.split('/').pop();
    if (typeof patch.description === 'string') entry.description = patch.description.trim().slice(0,1000);
    if (typeof patch.fontColor === 'string') entry.fontColor = /^#[a-f0-9]{6}$/i.test(patch.fontColor) ? patch.fontColor : '';
    if (typeof patch.hidden === 'boolean' || patch.hidden === null) entry.hidden = patch.hidden;
    changed();
}
export function moveOutfit(avatar, folder, delta) {
    const list = catalogFor(avatar).outfits, index = list.findIndex(e => e.folder === folder), next = index + delta;
    if (index < 0 || next < 0 || next >= list.length) return;
    [list[index], list[next]] = [list[next], list[index]]; changed();
}
export function removeOutfit(avatar, folder) {
    const record = catalogFor(avatar);
    record.outfits = record.outfits.filter(e => e.folder !== folder);
    record.ignored = [...new Set([...record.ignored, folder])]; changed();
}
export function setOutfitLock(avatar, locked) { catalogFor(avatar).locked = Boolean(locked); changed(); }
export function automaticOutfitAllowed(avatar, folder) {
    const record = catalogFor(avatar);
    const character = getContext().characters?.find(c => c.avatar === avatar);
    return Boolean(character && !record.locked && record.outfits.some(e => e.folder === folder && !hiddenOutfit(character,e)));
}
const inFlight = new Map();
export function discoveryCandidates(character, active = '') {
    const preferred = active.includes('/') ? active.split('/')[0] : character.name;
    const roots = [...new Set([preferred, character.name])].filter(validFolder);
    const leaves = [...Array.from({ length: 8 }, (_, i) => `outfit${i+1}`), 'main','alt','pyjama','pajama','winter','swimsuit','bathrobe','party','special'];
    return [...new Set(roots.flatMap(root => leaves.map(leaf => `${root}/${leaf}`)))];
}
export async function discoverOutfits(character, active = '', force = false) {
    const key = character.avatar;
    const config = settings();
    if (!config.outfitDiscoveryDone || typeof config.outfitDiscoveryDone !== 'object' || Array.isArray(config.outfitDiscoveryDone)) config.outfitDiscoveryDone = {};
    if (inFlight.has(key)) return inFlight.get(key);
    if (!force && own(config.outfitDiscoveryDone, key) && config.outfitDiscoveryDone[key]) return { skipped: true, found: 0 };
    const work = (async () => {
        const candidates = discoveryCandidates(character, active);
        let cursor = 0, found = 0, failed = 0, dirty = false;
        const worker = async () => {
            while (cursor < candidates.length) {
                const folder = candidates[cursor++];
                try {
                    const response = await fetch(`/api/sprites/get?name=${encodeURIComponent(folder)}`);
                    if (!response.ok) { failed++; continue; }
                    const list = await response.json();
                    if (!Array.isArray(list)) { failed++; continue; }
                    if (list.some(s => typeof s?.path === 'string' && typeof s?.label === 'string')) {
                        found++; dirty = rememberOutfit(character, folder, { source:'discovered', notify:false }) || dirty;
                    }
                } catch { failed++; }
            }
        };
        await Promise.all([worker(),worker(),worker()]);
        if (!failed) Object.defineProperty(config.outfitDiscoveryDone,key,{value:true,enumerable:true,writable:true,configurable:true});
        if (dirty || !failed) changed();
        return { found, failed };
    })();
    inFlight.set(key, work);
    try { return await work; } finally { inFlight.delete(key); }
}
// Reads file *names* only. This never uploads or opens the selected image files.
export function importFolderNames(character, files, active = '') {
    let added = 0;
    const aliases = [character.name, character.avatar.replace(/\.[^/.]+$/, ''), active.split('/')[0]].filter(Boolean).map(s => s.toLowerCase());
    for (const file of files) {
        const path = String(file.webkitRelativePath || '').replace(/\\/g,'/');
        if (!/\.(png|jpe?g|webp|gif|avif)$/i.test(path)) continue;
        const parts = path.split('/'); parts.pop();
        const start = parts.findIndex(part => aliases.includes(part.toLowerCase()));
        if (start < 0 || parts.length - start > 2) continue;
        const folder = parts.slice(start).join('/');
        if (rememberOutfit(character, folder, { source:'imported', notify:false })) added++;
    }
    if (added) changed(); return added;
}
export function sceneOutfitContext(characters, currentFolder) {
    return characters.map(character => ({ avatar: character.avatar, name: character.name,
        currentOutfit: currentFolder(character), outfitLocked: Boolean(catalogFor(character.avatar).locked),
        outfits: outfitOptions(character).map(({folder,label,description}) => ({folder,name:label,description})) }));
}

export function setCharacterColors(avatar, patch) {
    const record = catalogFor(avatar);
    const colors = { ...(record.colors || {}) };
    for (const key of ['background','speak','text']) if (typeof patch[key] === 'string') colors[key] = /^#[a-f0-9]{6}$/i.test(patch[key]) ? patch[key] : '';
    record.colors = colors; changed();
}
