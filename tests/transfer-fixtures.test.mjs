import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import JSZip from '../vendor/jszip.js';
import { readTransferZip } from '../modules/character-transfer-archive.js';
import { applyCharacterBundle } from '../modules/character-transfer-model.js';
import { bundleSelection } from '../modules/transfer-selection.js';

const fixtures = [
    { file: 'v033-media.zip', version: 2, producer: '0.3.3', hash: '20ffe6e72082f4de8d9f2118e8c7d3cff1cfb98a90e715143454bfe86316a026' },
    { file: 'synthetic-v1-media.zip', version: 1, producer: 'synthetic-v1', hash: '99d83cca4db76df366c642b5fa46c8962b067db7e7057f7dfedab883801dcfb5' },
];
const fixtureBytes = file => readFile(new URL(`./fixtures/transfers/${file}`, import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

for (const fixture of fixtures) {
    test(`${fixture.file}: frozen archive verifies media and remaps character/group relationships`, async () => {
        const bytes = await fixtureBytes(fixture.file);
        assert.equal(sha256(bytes), fixture.hash, 'Do not regenerate a compatibility fixture with current code');
        const inspected = await readTransferZip(new Blob([bytes]));
        const bundle = inspected.manifest;
        assert.equal(bundle.version, fixture.version);
        assert.equal(bundle.extensionVersion, fixture.producer);
        assert.deepEqual(bundle.assets.map(asset => asset.kind), ['sprite', 'background', 'gallery']);
        for (const asset of bundle.assets) {
            const media = Buffer.from(await (await inspected.readAsset(asset)).arrayBuffer());
            assert.equal(media.length, asset.size);
            assert.equal(sha256(media), asset.sha256);
            assert.equal(sha256(media), '2640059609118b695c139804676372eca75c30d30e5906775902d13e44f5356c');
        }
        const selected = bundleSelection(bundle);
        for (const key of ['outfits', 'spriteFiles', 'backgroundFiles', 'galleryFiles']) assert.equal(selected[key], true);
        if (fixture.version === 1) assert.equal(bundle.selection, undefined, 'Legacy grouped options must work without a selection object');
        const local = {
            outfitCatalog: { 'destination.png': { outfits: [{ folder: 'Destination/winter', heightOverrideCm: 155 }, { folder: 'Destination/summer', label: 'Keep summer' }] } },
            sceneAutomation: { apiProfile: 'local-profile' },
        };
        const before = structuredClone(local);
        const original = structuredClone(bundle);
        const result = applyCharacterBundle(local, bundle, {
            mappings: { 'fixture.png': { avatar: 'destination.png', name: 'Destination' } },
            roots: { 'fixture.png': 'Destination' },
            galleryPaths: { 'user/images/Fixture/scene.png': 'user/images/Imports/scene.png' },
            policy: 'update',
        });
        const imported = result.settings;
        const winter = imported.outfitCatalog['destination.png'].outfits.find(outfit => outfit.folder === 'Destination/winter');
        assert.equal(winter.description, 'A warm coat');
        assert.equal(winter.heightOverrideCm, 155);
        assert.ok(imported.outfitCatalog['destination.png'].outfits.some(outfit => outfit.folder === 'Destination/summer'));
        assert.equal(imported.heightProfiles['destination.png'].heightCm, 170);
        assert.deepEqual(imported.bindingGroups[0].members, ['destination.png']);
        assert.deepEqual(imported.backgroundBindings['fixture-room.png'], ['destination.png']);
        assert.deepEqual(imported.gallery.generalAssignments.scene.characterBindings, ['destination.png']);
        assert.equal(imported.gallery.generalAssignments.scene.path, 'user/images/Imports/scene.png');
        assert.equal(imported.sceneAutomation.apiProfile, 'local-profile');
        assert.equal(imported.sceneAutomation.enabled, false);
        assert.equal(imported.sceneAutomation.apiAutoAfterReply, false);
        assert.deepEqual(local, before);
        assert.deepEqual(bundle, original);
    });

    test(`${fixture.file}: corrupted or missing media is rejected before an import is offered`, async () => {
        const bytes = await fixtureBytes(fixture.file);
        for (const scenario of ['corrupt', 'missing']) {
            const zip = await JSZip.loadAsync(bytes);
            const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
            const asset = manifest.assets[0];
            if (scenario === 'missing') zip.remove(asset.path);
            else {
                const media = await zip.file(asset.path).async('uint8array');
                media[media.length - 1] ^= 1;
                zip.file(asset.path, media);
            }
            const altered = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });
            await assert.rejects(readTransferZip(new Blob([altered])), scenario === 'missing' ? /Missing or duplicate asset/ : /checksum failed/);
        }
        assert.equal(sha256(await fixtureBytes(fixture.file)), fixture.hash);
    });
}
