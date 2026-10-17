const assert = require('node:assert/strict');

async function verifyDelayedPlanner(context, url, scenario) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url + '/?clean');
    await page.waitForFunction(() => window.ImmersiveGroups?.getStatus().status === 'ready');
    await page.evaluate(() => {
        const settings = ctx.extensionSettings.ImmersiveGroups;
        settings.autoDiscoverOutfits = false;
        settings.outfitFadeEnabled = false;
        ImmersiveGroupsSceneLibrary.addOutfit('alex.png', 'Alex/outfit1', 'First');
        ImmersiveGroupsSceneLibrary.addOutfit('alex.png', 'Alex/outfit2', 'Second');
        Object.assign(settings.sceneAutomation, { enabled: true, mode: 'api', scope: 'all', apiTransport: 'main', apiAutoAfterReply: false, apiRecentMessages: 2 });
        window.plannerRequests = [];
        ctx.generateRaw = args => new Promise(resolve => plannerRequests.push({ args, resolve }));
        window.startAnalysis = () => ImmersiveGroups.automation.analyzeLastReply().then(report => ({ report }), error => ({ error: error.message }));
        window.firstAnalysis = startAnalysis();
    });
    await page.waitForFunction(() => plannerRequests.length === 1);
    const cancelsImmediately = ['chat', 'swipe', 'delete'].includes(scenario);
    await page.evaluate(({ scenario, cancelsImmediately }) => {
        if (scenario === 'chat') {
            ctx.getCurrentChatId = () => 'planner-next-chat';
            emit('CHAT_CHANGED');
        } else if (scenario === 'swipe') {
            ctx.chat.at(-1).swipe_id = 1;
            emit('MESSAGE_SWIPED', ctx.chat.length - 1);
        } else if (scenario === 'delete') {
            ctx.chat.pop();
            emit('MESSAGE_DELETED');
        } else if (scenario === 'text') {
            // Snapshot validation must also work without an event notification.
            ctx.chat.at(-1).mes += ' Edited while analysis was pending.';
        } else {
            ctx.chat.at(-2).mes += ' Earlier context edited while analysis was pending.';
        }
        window.expectedChat = JSON.stringify(ctx.chat);
        if (!cancelsImmediately) plannerRequests[0].resolve('::outfit "alex.png" "Alex/outfit1"::');
    }, { scenario, cancelsImmediately });
    const old = await page.evaluate(() => firstAnalysis);
    assert.match(old.error, /cancelled|changed/i, scenario);
    assert.equal(await page.evaluate(() => ImmersiveGroups.automation.getStatus().busy), false);
    const before = await page.evaluate(() => ({
        overrides: JSON.stringify(ctx.extensionSettings.expressionOverrides),
        src: document.getElementById('expression-alex.png').querySelector('img').getAttribute('src'),
    }));

    // Start a fresh request before the old, uncancellable main transport returns.
    await page.evaluate(() => { window.secondAnalysis = startAnalysis(); });
    await page.waitForFunction(() => plannerRequests.length === 2);
    if (cancelsImmediately) await page.evaluate(() => plannerRequests[0].resolve('::outfit "alex.png" "Alex/outfit1"::'));
    const stale = await page.evaluate(() => ({
        busy: ImmersiveGroups.automation.getStatus().busy,
        overrides: JSON.stringify(ctx.extensionSettings.expressionOverrides),
        src: document.getElementById('expression-alex.png').querySelector('img').getAttribute('src'),
        response: document.querySelector('[data-scene-api-response]').textContent,
    }));
    assert.deepEqual(stale, { busy: true, ...before, response: '' }, scenario);

    await page.evaluate(() => plannerRequests[1].resolve('::outfit "alex.png" "Alex/outfit2"::'));
    const fresh = await page.evaluate(() => secondAnalysis);
    assert.equal(fresh.error, undefined, scenario);
    assert.equal(fresh.report.results.filter(result => result.applied).length, 1, scenario);
    assert.equal(await page.evaluate(() => document.getElementById('expression-alex.png').querySelector('img').getAttribute('src')), '/characters/Alex/outfit2/neutral.png');
    assert.equal(await page.evaluate(() => ImmersiveGroups.automation.getStatus().busy), false);
    assert.equal(await page.evaluate(() => JSON.stringify(ctx.chat) === expectedChat), true);
    assert.equal(await page.evaluate(() => plannerRequests.length), 2);
    assert.deepEqual(errors, [], scenario);
    console.log(`PASS: planner rejects stale ${scenario} response and a fresh request still applies.`);
    // On failure keep the page open for the harness's diagnostic screenshots.
    await page.close();
}

module.exports = async (context, url) => {
    for (const scenario of ['chat', 'swipe', 'delete', 'text', 'history']) await verifyDelayedPlanner(context, url, scenario);
};
