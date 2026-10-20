const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, firefox } = require('playwright');
const { createBrowserDiagnostics } = require('../browser/diagnostics.cjs');

// This test writes synthetic cards/media. Never point it at a live library.
if (process.env.IG_ST_DISPOSABLE !== '1') throw Error('Set IG_ST_DISPOSABLE=1 only for an isolated SillyTavern test installation.');
const target = new URL(process.env.IG_ST_URL || 'http://127.0.0.1:8179');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) || !['http:', 'https:'].includes(target.protocol)) throw Error('Native validation requires a local disposable server.');
const browserName = process.env.IG_BROWSER || 'chromium';
const engine = { chromium, firefox }[browserName];
if (!engine) throw Error('IG_BROWSER must be chromium or firefox.');
const artifactDirectory = path.resolve(__dirname, '../artifacts/native', browserName);

(async () => {
    await fs.mkdir(artifactDirectory, { recursive: true });
    const browser = await engine.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const captureFailure = createBrowserDiagnostics(context, artifactDirectory);
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        // External model-provider discovery is outside this native file/API test.
        await page.route('**/api/horde/**', route => route.fulfill({ json: route.request().url().includes('text-models') ? [] : {} }));
        await page.goto(target.origin);
        await page.waitForFunction(() => window.ImmersiveGroups?.getStatus().status === 'ready');
        // Finish native first-run onboarding instead of testing behind its modal.
        await page.waitForFunction(async () => (await import('/script.js')).settingsReady || document.querySelector('dialog .onboarding'));
        async function completeOnboarding() {
            const onboarding = page.locator('dialog[open]:has(.onboarding)');
            if (await onboarding.count()) {
                await onboarding.locator('.popup-input').fill('IG Native Test User');
                await onboarding.locator('.popup-button-ok').click();
                await onboarding.waitFor({ state: 'hidden' });
            }
        }
        await completeOnboarding();
        await page.waitForFunction(async () => (await import('/script.js')).settingsReady);
        await page.locator('#send_textarea').waitFor({ state: 'visible' });
        const report = await page.evaluate(async () => {
            const ctx = SillyTavern.getContext();
            const headers = () => ({ ...ctx.getRequestHeaders() });
            const multipartHeaders = () => { const result = headers(); for (const key of Object.keys(result)) if (key.toLowerCase() === 'content-type') delete result[key]; return result; };
            const request = async (url, body, multipart = false) => {
                const response = await fetch(url, { method: 'POST', headers: multipart ? multipartHeaders() : headers(), body: multipart ? body : JSON.stringify(body) });
                if (!response.ok) throw Error(`${url}: HTTP ${response.status} ${await response.text()}`);
                return response;
            };
            const prefix = `IG-Test-${Date.now()}`;
            const sourceName = prefix + '-Source', destinationName = prefix + '-Destination';
            async function createCharacter(name) {
                const form = new FormData(); form.append('ch_name', name); form.append('description', 'Synthetic integration fixture'); form.append('first_mes', 'Synthetic greeting.');
                return (await (await request('/api/characters/create', form, true)).text()).trim();
            }
            const sourceAvatar = await createCharacter(sourceName), destinationAvatar = await createCharacter(destinationName);
            await ctx.getCharacters();
            await ctx.selectCharacterById(ctx.characters.findIndex(character => character.avatar === sourceAvatar));
            const sourceFolder = sourceName + '/winter', destinationFolder = destinationName + '/winter';
            const image = new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='), value => value.charCodeAt(0))], { type: 'image/png' });
            async function uploadSprite(folder, filename, bytes=image) {
                const form = new FormData(); form.append('name', folder); form.append('label', filename.split('.')[0]); form.append('spriteName', filename.split('.')[0]); form.append('avatar', bytes, filename);
                await request('/api/sprites/upload', form, true);
            }
            const sprites = async folder => { const response = await fetch('/api/sprites/get?name=' + encodeURIComponent(folder), { cache: 'no-store' }); if (!response.ok) throw Error('Native sprite inventory failed'); return response.json(); };
            await uploadSprite(sourceFolder, 'neutral.png');
            const backgroundName = prefix + '-room.png', backgroundForm = new FormData(); backgroundForm.append('avatar', image, backgroundName);
            const background = (await (await request('/api/backgrounds/upload', backgroundForm, true)).text()).trim();
            const data = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(image); });
            const gallery = await (await request('/api/images/upload', { image: data, format: 'png', filename: prefix + '-scene.png', ch_name: 'IG-Native-Fixtures' })).json();
            const settings = ctx.extensionSettings.ImmersiveGroups;
            settings.autoDiscoverOutfits = false;
            ImmersiveGroupsSceneLibrary.addOutfit(sourceAvatar, sourceFolder, 'Winter');
            settings.heightProfiles[sourceAvatar] = { heightCm: 170, fineTuneOffset: 2 };
            const groupId = prefix + '-group';
            settings.bindingGroups.push({ id: groupId, name: 'Synthetic group', description: 'Native validation', members: [sourceAvatar] });
            settings.backgroundDescriptions[background] = 'Synthetic room';
            settings.backgroundBindings[background] = [sourceAvatar];
            settings.backgroundGroupBindings[background] = [groupId];
            settings.gallery.generalAssignments[prefix] = { path: gallery.path, description: 'Synthetic scene', availability: 'bound', characterBindings: [sourceAvatar], presetBindings: [groupId] };
            ctx.saveSettingsDebounced();
            const chatBefore = JSON.stringify(ctx.chat);
            const { background_settings } = await import('/scripts/backgrounds.js');
            const backgroundBefore = JSON.stringify(background_settings);
            const overridesBefore = JSON.stringify(ctx.extensionSettings.expressionOverrides);
            const options = { outfits: true, heights: true, cards: true, backgrounds: true, gallery: true, groups: true };
            const exported = await ImmersiveGroupsTransfers.exportBundle({ avatars: [sourceAvatar], options, name: 'Native compatibility smoke', media: true });
            const inspected = await ImmersiveGroupsTransfers.inspectBundle(new File([exported.blob], 'native.zip'));
            const mapping = { mappingValues: { [sourceAvatar]: destinationAvatar }, roots: { [sourceAvatar]: destinationName }, categories: inspected.manifest.options };
            const imported = await ImmersiveGroupsTransfers.importBundle(inspected, mapping);
            const firstSprites = await sprites(destinationFolder);
            const repeated = await ImmersiveGroupsTransfers.importBundle(inspected, mapping);
            await uploadSprite(destinationFolder, 'happy.png');
            const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;canvas.getContext('2d').fillRect(0,0,2,2);
            await uploadSprite(destinationFolder, 'neutral.png',await new Promise(resolve=>canvas.toBlob(resolve)));
            const proof = await ImmersiveGroupsTransfers.reviewDestinations(inspected.manifest, mapping);
            const updated = await ImmersiveGroupsTransfers.importBundle(inspected, { ...mapping, policy: 'update', conflictReview: proof, overwriteAcknowledged: true });
            const finalSprites = await sprites(destinationFolder);
            const identicalProof=await ImmersiveGroupsTransfers.reviewDestinations(inspected.manifest,mapping);
            const identical=await ImmersiveGroupsTransfers.importBundle(inspected,{...mapping,conflictReview:identicalProof,overwriteAcknowledged:true});
            const createdCards = {};
            for (const cardFormat of ['png', 'json']) {
                const pack = await ImmersiveGroupsTransfers.exportBundle({ avatars: [sourceAvatar], options: { cards: true }, selection: { cards: true, cardFormat }, name: 'Native card fixture' });
                const card = await ImmersiveGroupsTransfers.inspectBundle(new File([pack.blob], 'card.zip'));
                const result = await ImmersiveGroupsTransfers.importBundle(card, { mappingValues: { [sourceAvatar]: '__create__' }, categories: { cards: true }, media: false });
                createdCards[cardFormat] = result.created;
            }
            return {
                extension: ImmersiveGroups.getStatus(), prefix, imported, repeated, updated, identical, createdCards,
                firstSprites: firstSprites.map(sprite => sprite.path.split('?')[0].split('/').pop()),
                finalSprites: finalSprites.map(sprite => sprite.path.split('?')[0].split('/').pop()).sort(),
                height: settings.heightProfiles[destinationAvatar].heightCm,
                remapped: settings.bindingGroups.some(group => group.members.includes(destinationAvatar)),
                backgroundRemapped: settings.backgroundBindings[background].includes(destinationAvatar),
                galleryRemapped: settings.gallery.generalAssignments[prefix].characterBindings.includes(destinationAvatar),
                galleryCopied: settings.gallery.generalAssignments[prefix].path !== gallery.path,
                currentBackgroundUnchanged: JSON.stringify(background_settings) === backgroundBefore,
                currentOutfitUnchanged: JSON.stringify(ctx.extensionSettings.expressionOverrides) === overridesBefore,
                chatUnchanged: JSON.stringify(ctx.chat) === chatBefore,
                assetKinds: [...new Set(inspected.manifest.assets.map(asset => asset.kind))].sort(),
            };
        });
        assert.equal(report.extension.status, 'ready');
        assert.deepEqual(report.extension.errors, []);
        assert.deepEqual(report.firstSprites, ['neutral.png']);
        assert.deepEqual(report.finalSprites, ['happy.png', 'neutral.png']);
        assert.equal(report.updated.replaced, 1);
        assert.equal(report.identical.replaced,0);
        assert.equal(report.identical.unchanged,1);
        assert.equal(report.updated.images, 1);
        assert.ok(report.updated.uploaded >= 2);
        assert.ok(report.imported.kept >= 1, 'Existing native background is retained');
        assert.ok(report.repeated.kept >= 1);
        assert.deepEqual(report.createdCards, { png: 1, json: 1 });
        assert.equal(report.height, 170);
        assert.equal(report.remapped, true);
        assert.equal(report.backgroundRemapped, true);
        assert.equal(report.galleryRemapped, true);
        assert.equal(report.galleryCopied, true);
        assert.equal(report.currentBackgroundUnchanged, true);
        assert.equal(report.currentOutfitUnchanged, true);
        assert.equal(report.chatUnchanged, true);
        assert.deepEqual(report.assetKinds, ['background', 'card', 'gallery', 'sprite']);
        assert.deepEqual(errors, []);
        report.browser = { name: browserName, version: browser.version() };
        report.server = await (await page.request.get(target.origin + '/version')).json();
        await completeOnboarding();
        await page.screenshot({ path: path.join(artifactDirectory, 'desktop.png') });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => ImmersiveGroupsGallery.openLibrary());
        await page.locator('.ig-unified-library').waitFor();
        assert.equal(await page.locator('.ig-unified-library').evaluate(node => node.scrollWidth <= node.clientWidth), true);
        await page.locator('.ig-unified-library').getByRole('button', { name: 'Filters', exact: true }).click();
        await page.getByRole('dialog', { name: 'Library filters', exact: true }).waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog', { name: 'Library filters', exact: true }).waitFor({ state: 'hidden' });
        const libraryScroll=page.locator('.ig-unified-library .ig-library-main');
        await libraryScroll.evaluate(node=>{node.scrollTop=node.scrollHeight;});
        assert.ok(await libraryScroll.evaluate(node=>node.clientHeight>200&&node.scrollTop>0),'Mobile library toolbar and results must share a usable scroll surface.');
        await page.screenshot({ path: path.join(artifactDirectory, 'mobile-viewport.png') });
        await fs.writeFile(path.join(artifactDirectory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
        console.log(`PASS: native ${browserName} startup, sprite/background/gallery uploads, repeat/update imports, PNG/JSON cards, remapping, chat preservation, and mobile viewport.`);
    } catch (error) {
        await captureFailure(error).catch(captureError => console.error(captureError));
        throw error;
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
