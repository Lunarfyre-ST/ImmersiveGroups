const fs = require('node:fs/promises');
const path = require('node:path');

// Fixture-only diagnostics. Keep logs bounded and capture the failing UI before
// the harness exits, including failures before its normal screenshots run.
function createBrowserDiagnostics(context, directory) {
    const messages = [];
    const record = entry => {
        messages.push(entry);
        if (messages.length > 200) messages.shift();
    };
    context.on('page', page => {
        page.on('pageerror', error => record({ type: 'pageerror', message: error.message, url: page.url() }));
        page.on('console', message => {
            if (['error', 'warning'].includes(message.type())) record({ type: message.type(), message: message.text(), url: page.url() });
        });
    });
    return async error => {
        await fs.mkdir(directory, { recursive: true });
        const pages = context.pages().filter(page => !page.isClosed()).slice(-5);
        const screenshots = [];
        for (const [index, page] of pages.entries()) {
            const filename = `failure-page-${index + 1}.png`;
            try {
                await page.screenshot({ path: path.join(directory, filename), timeout: 3000 });
                screenshots.push({ filename, url: page.url() });
            } catch (captureError) {
                record({ type: 'capture-error', message: captureError.message, url: page.url() });
            }
        }
        await fs.writeFile(path.join(directory, 'failure.json'), JSON.stringify({ error: error.stack || String(error), screenshots, messages }, null, 2) + '\n');
    };
}

module.exports = { createBrowserDiagnostics };
