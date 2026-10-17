const assert = require('node:assert/strict');

const base = '/scripts/extensions/third-party/ImmersiveGroups/modules/';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');

async function open(context, url) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Fresh settings avoid legacy auto-discovery running behind our paused reads.
    await page.goto(url + '/?clean');
    await page.waitForFunction(() => window.ImmersiveGroups?.getStatus().status === 'ready');
    await page.evaluate(() => {
        const settings = ctx.extensionSettings.ImmersiveGroups;
        settings.autoDiscoverOutfits = false;
        settings.outfitFadeEnabled = false;
        (settings.outfitCatalog['alex.png'] ||= { outfits: [], ignored: [] }).locked = false;
    });
    return { page, errors };
}

async function delayedOutfit(context, url, scenario) {
    const { page, errors } = await open(context, url);
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    try {
        await page.evaluate(() => ImmersiveGroupsSceneLibrary.addOutfit('alex.png', 'Alex/lifecycle', 'Delayed outfit'));
        await page.route('**/api/sprites/get?*', route => {
            const folder = new URL(route.request().url()).searchParams.get('name');
            return route.fulfill({ json: [{ label: 'neutral', path: `/characters/${folder}/neutral.png` }] });
        });
        await page.route('**/characters/Alex/lifecycle/neutral.png', async route => {
            await gate;
            await route.fulfill({ contentType: 'image/png', body: png });
        });
        const requested = page.waitForRequest('**/characters/Alex/lifecycle/neutral.png');
        await page.evaluate(async ({ base, automatic }) => {
            const { changeOutfit } = await import(base + 'stage-controls.js');
            const options = automatic ? { source: 'automatic', chatId: ctx.getCurrentChatId(), groupId: ctx.groupId } : {};
            window.pendingOutfit = changeOutfit('alex.png', 'Alex/lifecycle', options);
        }, { base, automatic: scenario === 'lock' });
        await requested;
        await page.evaluate(async ({ scenario, base }) => {
            const holder = document.getElementById('expression-alex.png');
            if (scenario === 'chat') {
                ctx.getCurrentChatId = () => 'different-chat';
                emit('CHAT_CHANGED');
            } else if (scenario === 'holder') {
                holder.replaceWith(holder.cloneNode(true));
            } else if (scenario === 'image') {
                holder.querySelector('img').replaceWith(holder.querySelector('img').cloneNode(true));
            } else if (scenario === 'newer') {
                await (await import(base + 'stage-controls.js')).changeOutfit('alex.png', 'Alex/outfit2');
            } else {
                ctx.extensionSettings.ImmersiveGroups.outfitCatalog['alex.png'].locked = true;
            }
            window.afterInterruption = {
                overrides: JSON.stringify(ctx.extensionSettings.expressionOverrides),
                src: document.getElementById('expression-alex.png').querySelector('img').getAttribute('src'),
            };
        }, { scenario, base });
        release();
        const result = await page.evaluate(async () => ({
            applied: await pendingOutfit,
            overridesUnchanged: JSON.stringify(ctx.extensionSettings.expressionOverrides) === afterInterruption.overrides,
            imageUnchanged: document.getElementById('expression-alex.png').querySelector('img').getAttribute('src') === afterInterruption.src,
            chatUnchanged: JSON.stringify(ctx.chat) === beforeChat,
        }));
        assert.deepEqual(result, { applied: false, overridesUnchanged: true, imageUnchanged: true, chatUnchanged: true }, scenario);
        assert.deepEqual(errors, [], scenario);
        console.log(`PASS: delayed outfit rejected after ${scenario} change.`);
    } finally {
        release();
    }
    await page.close();
}

async function interruptedImport(context, url, scenario) {
    const { page, errors } = await open(context, url);
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const completed = [];
    let attempts = 0;
    try {
        await page.route('**/api/sprites/get?*', route => {
            const folder = new URL(route.request().url()).searchParams.get('name');
            return route.fulfill({ json: folder === 'Alex/interrupted' ? completed.map(filename => ({ label: filename.split('.')[0], path: `/characters/${folder}/${filename}` })) : [] });
        });
        await page.route('**/api/sprites/upload', async route => {
            attempts++;
            if (attempts === 1) await gate;
            if (scenario === 'upload-failure' && attempts === 2) return route.fulfill({ status: 500, body: 'Simulated interrupted upload' });
            const filename = route.request().postDataBuffer().toString('latin1').match(/filename="([^"]+)"/)[1];
            completed.push(filename);
            await route.fulfill({ json: { ok: true } });
        });
        await page.evaluate(async ({ base, bytes }) => {
            const model = await import(base + 'character-transfer-model.js');
            const archive = await import(base + 'character-transfer-archive.js');
            const source = { outfitCatalog: { 'source.png': { outfits: [{ folder: 'Source/interrupted', label: 'Imported outfit' }], ignored: [] } } };
            const manifest = model.captureCharacterBundle(source, [{ avatar: 'source.png', name: 'Source' }], ['source.png'], { outfits: true }, 'Interrupted import');
            manifest.selection.spriteFiles = true;
            const assets = ['neutral.png', 'happy.png'].map((filename, index) => ({ metadata: { kind: 'sprite', avatar: 'source.png', folder: 'Source/interrupted', filename, path: `assets/${index}/${filename}` }, blob: new Blob([new Uint8Array(bytes)]) }));
            const pack = await archive.createTransferZip(manifest, assets);
            window.importPack = await ImmersiveGroupsTransfers.inspectBundle(new File([pack.blob], 'interrupted.zip'));
            window.importOptions = { mappingValues: { 'source.png': 'alex.png' }, roots: { 'source.png': 'Alex' }, categories: manifest.options };
            window.settingsBeforeImport = JSON.stringify(ctx.extensionSettings.ImmersiveGroups);
        }, { base, bytes: [...png] });
        const uploading = page.waitForRequest('**/api/sprites/upload');
        await page.evaluate(() => {
            window.pendingImport = ImmersiveGroupsTransfers.importBundle(importPack, importOptions).then(() => ({ succeeded: true }), error => ({ error: error.message }));
        });
        await uploading;
        const duplicate = await page.evaluate(() => ImmersiveGroupsTransfers.importBundle(importPack, importOptions).then(() => '', error => error.message));
        assert.match(duplicate, /Another transfer is already running/);
        if (scenario === 'generation') await page.evaluate(() => { window.fixtureGenerating = true; });
        release();
        const result = await page.evaluate(async () => ({
            outcome: await pendingImport,
            settingsBefore: JSON.parse(settingsBeforeImport),
            settingsAfter: structuredClone(ctx.extensionSettings.ImmersiveGroups),
            chatUnchanged: JSON.stringify(ctx.chat) === beforeChat,
        }));
        assert.match(result.outcome.error, scenario === 'generation' ? /Generation started during import/ : /Sprite upload was not confirmed/);
        assert.match(result.outcome.error, new RegExp(`${completed.length} completed uploads remain on the server`));
        assert.equal(completed.length, scenario === 'generation' ? 2 : 1);
        assert.deepEqual(result.settingsAfter, result.settingsBefore);
        assert.equal(result.chatUnchanged, true);
        // The failure releases the transfer lock; a metadata-only retry succeeds.
        const retry = await page.evaluate(async () => {
            window.fixtureGenerating = false;
            const report = await ImmersiveGroupsTransfers.importBundle(importPack, { ...importOptions, media: false });
            return { uploaded: report.uploaded, imported: ctx.extensionSettings.ImmersiveGroups.outfitCatalog['alex.png'].outfits.some(outfit => outfit.folder === 'Alex/interrupted') };
        });
        assert.deepEqual(retry, { uploaded: 0, imported: true });
        assert.deepEqual(errors, [], scenario);
        console.log(`PASS: ${scenario} leaves metadata unchanged, reports partial uploads, and allows retry.`);
    } finally {
        release();
    }
    await page.close();
}

module.exports = async (context, url) => {
    for (const scenario of ['chat', 'holder', 'image', 'newer', 'lock']) await delayedOutfit(context, url, scenario);
    for (const scenario of ['generation', 'upload-failure']) await interruptedImport(context, url, scenario);
};
