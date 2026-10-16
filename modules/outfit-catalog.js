// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { extension_settings, getContext } from '../../../../extensions.js';
import { saveSettingsDebounced } from '../../../../../script.js';
import { extensionName } from '../constants.js';
import { foreignOutfitFolder, characterFolderRoots, outfitRoot } from './outfit-ownership.js';

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
    if (record.quarantinedOutfits && !Array.isArray(record.quarantinedOutfits)) record.quarantinedOutfits = [];
    return record;
}
export function onCatalogChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function changed() { saveSettingsDebounced(); for (const listener of listeners) listener(); }
export function outfitFolderAllowed(character, folder) {
    return !foreignOutfitFolder(character, folder, getContext().characters || []) ||
        catalogFor(character.avatar).outfits.some(entry => entry.folder === folder && (entry.explicit === true || entry.source === 'manual'));
}
export function displayedOutfitAllowed(character, folder, nativeFolder) {
    if (!outfitFolderAllowed(character,folder)) return false;
    // A reused holder may still show an unrelated custom-root image. Only learn
    // such a root from an avatar-bound override or an existing catalog entry.
    return characterFolderRoots(character).includes(outfitRoot(folder)) || folder === nativeFolder ||
        catalogFor(character.avatar).outfits.some(entry => entry.folder === folder);
}
export function repairOutfitOwnership() {
    const config = settings(), characters = getContext().characters || []; let dirty = false;
    for (const avatar of Object.keys(config.outfitCatalog || {})) {
        const character = characters.find(c => c.avatar === avatar) || { avatar }, record = catalogFor(avatar);
        const bad = record.outfits.filter(entry => entry && foreignOutfitFolder(character, entry.folder, characters) && entry.explicit !== true && entry.source !== 'manual');
        if (bad.length) {
            if (!Array.isArray(record.quarantinedOutfits)) record.quarantinedOutfits = [];
            for (const entry of bad) if (!record.quarantinedOutfits.some(saved => saved.folder === entry.folder)) record.quarantinedOutfits.push({ ...entry });
            record.outfits = record.outfits.filter(entry => !bad.includes(entry)); dirty = true;
        }
    }
    // The old folder-name mirror must not re-seed a quarantined assignment.
    for (const avatar of Object.keys(config.outfitFolders || {})) {
        const folders = config.outfitFolders[avatar]; if (!Array.isArray(folders)) continue;
        const character = characters.find(c => c.avatar === avatar) || { avatar };
        const safe = folders.filter(folder => outfitFolderAllowed(character, folder));
        if (safe.length !== folders.length) {
            const record=catalogFor(avatar);record.quarantinedOutfits ||= [];
            for (const folder of folders.filter(folder=>!safe.includes(folder))) if (!record.quarantinedOutfits.some(entry=>entry.folder===folder)) record.quarantinedOutfits.push({folder,label:folderLabel(folder,character),description:'',source:'legacy'});
            Object.defineProperty(config.outfitFolders, avatar, { value: safe, writable: true, enumerable: true, configurable: true }); dirty = true;
        }
    }
    if (dirty) changed();
    return dirty;
}
export function quarantinedOutfits() {
    const config = settings(), characters = getContext().characters || [];
    return Object.keys(config.outfitCatalog || {}).flatMap(avatar => (catalogFor(avatar).quarantinedOutfits || []).map(entry => ({ ...entry, avatar, character: characters.find(c => c.avatar === avatar)?.name || avatar })));
}
export function discardQuarantinedOutfit(avatar,folder){
    const record=catalogFor(avatar);
    record.quarantinedOutfits=(record.quarantinedOutfits||[]).filter(e=>e.folder!==folder);
    record.ignored=[...new Set([...record.ignored,folder])];changed();
}
function rememberFolder(avatar, folder) {
    const config=settings();
    if(!config.outfitFolders||typeof config.outfitFolders!=='object'||Array.isArray(config.outfitFolders))config.outfitFolders={};
    const list=own(config.outfitFolders,avatar)&&Array.isArray(config.outfitFolders[avatar])?config.outfitFolders[avatar]:[];
    if(list.includes(folder))return false;
    Object.defineProperty(config.outfitFolders,avatar,{value:[...list,folder],enumerable:true,writable:true,configurable:true});return true;
}
export function rememberOutfit(character, raw, { label, source = 'observed', notify = true, explicit = false } = {}) {
    const folder = cleanFolder(raw); if (!folder || !character?.avatar) return false;
    if (!explicit && !outfitFolderAllowed(character, folder)) return false;
    const record = catalogFor(character.avatar);
    if (record.ignored.includes(folder) && !explicit) return false;
    if (explicit) record.ignored = record.ignored.filter(f => f !== folder);
    const existing = record.outfits.find(entry => entry.folder === folder);
    const remembered=rememberFolder(character.avatar,folder);
    if (existing) {const approved=explicit&&existing.explicit!==true;if(explicit){existing.explicit=true;existing.source='manual';}if(remembered||approved){if(notify)changed();else saveSettingsDebounced();}return false;}
    const archived = explicit && Array.isArray(record.quarantinedOutfits) ? record.quarantinedOutfits.find(entry => entry.folder === folder) : null;
    if (archived) record.quarantinedOutfits = record.quarantinedOutfits.filter(entry => entry !== archived);
    record.outfits.push({ folder, hidden: null, description: '', ...archived, label: label?.trim().slice(0,80) || archived?.label || folderLabel(folder, character), source: explicit ? 'manual' : source, explicit });
    if (notify) changed();
    return true;
}
// Native overrides are global per avatar, including Quick Reply changes. Read
// them before/after chat transitions even when that character has no loaded sprite.
export function rememberNativeOutfits(repair = true) {
    if (repair) repairOutfitOwnership();
    const ctx=getContext();let dirty=false;
    for(const override of Array.isArray(extension_settings.expressionOverrides)?extension_settings.expressionOverrides:[]) {
        const character=ctx.characters?.find(c=>c.avatar?.replace(/\.[^/.]+$/,'')===override?.name);
        if(character)dirty=rememberOutfit(character,override.path,{notify:false})||dirty;
    }
    if(dirty)changed();
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
    return Boolean(settings().hideBasicOutfit === true && basic && record.outfits.some(e => /\/outfit[ _-]?1$/i.test(e.folder)));
}
export function outfitOptions(character, includeHidden = false) {
    return catalogFor(character.avatar).outfits.filter(entry => validFolder(entry.folder) && outfitFolderAllowed(character,entry.folder) && (includeHidden || !hiddenOutfit(character, entry)));
}
export function editOutfit(avatar, folder, patch) {
    const record = catalogFor(avatar), entry = record.outfits.find(e => e.folder === folder);
    if (!entry) return;
    if (typeof patch.label === 'string') entry.label = patch.label.trim().slice(0,80) || folder.split('/').pop();
    if (typeof patch.description === 'string') entry.description = patch.description.trim().slice(0,1000);
    if (typeof patch.commonName === 'string') entry.commonName = patch.commonName.trim().slice(0,80);
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
    return Boolean(character && !record.locked && outfitFolderAllowed(character,folder) && record.outfits.some(e => e.folder === folder && !hiddenOutfit(character,e)));
}
const inFlight = new Map();
export function discoveryCandidates(character, active = '') {
    const preferred = active.includes('/') && outfitFolderAllowed(character,active) ? active.split('/')[0] : character.name;
    const roots = [...new Set([preferred, character.name])].filter(validFolder);
    const leaves = [...Array.from({ length: 8 }, (_, i) => `outfit${i+1}`), 'main','alt','pyjama','pajama','winter','swimsuit','bathrobe','party','special'];
    return [...new Set(roots.flatMap(root => leaves.map(leaf => `${root}/${leaf}`)))];
}
export async function discoverOutfits(character, active = '', force = false) {
    const key = character.avatar;
    const config = settings();
    if (!config.outfitDiscoveryDone || typeof config.outfitDiscoveryDone !== 'object' || Array.isArray(config.outfitDiscoveryDone)) config.outfitDiscoveryDone = {};
    if (inFlight.has(key)) return inFlight.get(key);
    const candidates = discoveryCandidates(character, active),signature=JSON.stringify(candidates);
    const previous=own(config.outfitDiscoveryDone,key)?config.outfitDiscoveryDone[key]:null,record=catalogFor(key);
    // A legacy boolean cannot tell which root was scanned, or whether its catalog
    // survived an import. Retry it once, and retry missing entries without reviving removals.
    if(!force&&previous?.signature===signature&&Array.isArray(previous.folders)&&previous.folders.every(folder=>record.outfits.some(e=>e.folder===folder)||record.ignored.includes(folder)))return {skipped:true,found:0};
    const work = (async () => {
        let cursor = 0, found = 0, failed = 0, dirty = false;const folders=[];
        const worker = async () => {
            while (cursor < candidates.length) {
                const folder = candidates[cursor++];
                try {
                    const response = await fetch(`/api/sprites/get?name=${encodeURIComponent(folder)}`);
                    if (!response.ok) { failed++; continue; }
                    const list = await response.json();
                    if (!Array.isArray(list)) { failed++; continue; }
                    if (list.some(s => typeof s?.path === 'string' && typeof s?.label === 'string')) {
                        found++;folders.push(folder);dirty = rememberOutfit(character, folder, { source:'discovered', notify:false }) || dirty;
                    }
                } catch { failed++; }
            }
        };
        await Promise.all([worker(),worker(),worker()]);
        if (!failed) Object.defineProperty(config.outfitDiscoveryDone,key,{value:{signature,folders},enumerable:true,writable:true,configurable:true});
        if (dirty || !failed) changed();
        return { found, failed };
    })();
    inFlight.set(key, work);
    try { return await work; } finally { inFlight.delete(key); }
}
// Reads file *names* only. This never uploads or opens the selected image files.
export function importFolderNames(character, files, active = '') {
    let added = 0;
    const aliases = [character.name, character.avatar.replace(/\.[^/.]+$/, ''), outfitFolderAllowed(character,active) ? active.split('/')[0] : ''].filter(Boolean).map(s => s.toLowerCase());
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
    return characters.map(character => {
        const folder=currentFolder(character),current=outfitOptions(character,true).find(o=>o.folder===folder);
        return { avatar: character.avatar, name: character.name,
        currentOutfit: folder,currentOutfitName:current?.label||'',currentOutfitDescription:current?.description||'',outfitLocked: Boolean(catalogFor(character.avatar).locked),
        outfits: outfitOptions(character).map(({folder,label,description,commonName}) => ({folder,name:label,description,commonName})) };
    });
}

export function setCharacterColors(avatar, patch) {
    const record = catalogFor(avatar);
    const colors = { ...(record.colors || {}) };
    for (const key of ['background','speak','text']) if (typeof patch[key] === 'string') colors[key] = /^#[a-f0-9]{6}$/i.test(patch[key]) ? patch[key] : '';
    if (typeof patch.inheritSpeak === 'boolean') colors.inheritSpeak = patch.inheritSpeak;
    record.colors = colors; changed();
}
