// SPDX-License-Identifier: AGPL-3.0-only
const key = value => typeof value === 'string' ? value.trim().normalize('NFC').toLowerCase() : '';
export function outfitRoot(folder) { return key(String(folder || '').replace(/\\/g, '/').replace(/^\/+/, '').split('/')[0]); }
export function characterFolderRoots(character) {
    return [character?.name, character?.avatar?.replace(/\.[^/.]+$/, '')].map(key).filter(Boolean);
}
// Unknown/custom roots remain valid. Reject only roots clearly associated with
// another known character; identical character names are inherently shared.
export function foreignOutfitFolder(character, folder, characters = []) {
    const root = outfitRoot(folder);
    if (!root || characterFolderRoots(character).includes(root)) return false;
    return characters.some(other => other?.avatar !== character?.avatar && characterFolderRoots(other).includes(root));
}
