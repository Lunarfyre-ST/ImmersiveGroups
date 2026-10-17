import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCharacterBundle, applyCharacterBundle } from '../modules/character-transfer-model.js';

test('tagged 0.3.3 settings export imports with remapping and preserves newer outfit heights', async () => {
    const source = await readFile(new URL('./fixtures/transfers/v033-settings.json', import.meta.url), 'utf8');
    const bundle = JSON.parse(source);
    assert.equal(bundle.extensionVersion, '0.3.3');
    assert.equal(bundle.version, 2);
    assert.equal(bundle.selection.outfitHeights, undefined);
    const validated = validateCharacterBundle(bundle);
    const existing = {
        outfitCatalog: { 'destination.png': { outfits: [
            { folder: 'Destination/winter', label: 'Local coat', heightOverrideCm: 155 },
            { folder: 'Destination/summer', label: 'Local summer' },
        ] } },
        sceneAutomation: { apiProfile: 'local-profile' },
    };
    const before = JSON.stringify(existing);
    const result = applyCharacterBundle(existing, validated, {
        mappings: { 'fixture.png': { avatar: 'destination.png', name: 'Destination' } },
        roots: { 'fixture.png': 'Destination' },
        policy: 'update',
    });
    const outfits = result.settings.outfitCatalog['destination.png'].outfits;
    const winter = outfits.find(outfit => outfit.folder === 'Destination/winter');
    assert.equal(winter.label, 'Winter');
    assert.equal(winter.description, 'A warm coat');
    assert.equal(winter.heightOverrideCm, 155);
    assert.ok(outfits.some(outfit => outfit.folder === 'Destination/summer'));
    assert.equal(result.settings.heightProfiles['destination.png'].heightCm, 170);
    assert.equal(result.settings.sceneAutomation.apiProfile, 'local-profile');
    assert.equal(result.settings.sceneAutomation.enabled, false);
    assert.equal(result.settings.sceneAutomation.apiAutoAfterReply, false);
    assert.equal(JSON.stringify(existing), before);
    assert.deepEqual(bundle, JSON.parse(source));
});
