// SPDX-License-Identifier: AGPL-3.0-only
// Optional metadata-only diagnostics. Never pass names, paths, prompts,
// messages, credentials, or Error objects. The consumer enforces its schema.
const noop = Object.freeze({ step() {}, finish() {} });
const sink = () => globalThis[Symbol.for('LunarDebug.sink')];
export function diagnostic(event, fields) {
    try { const api = sink(); if (api?.protocol === 1 && api.enabled) api.emit(event, fields); } catch { /* Diagnostics must never affect scene behavior. */ }
}
export function diagnosticOperation(event, fields) {
    let operation;
    try { const api = sink(); if (api?.protocol === 1 && api.enabled) operation = api.begin(event, fields); } catch { /* Optional consumer. */ }
    if (!operation) return noop;
    return {
        step(fields) { try { operation?.step(fields); } catch { /* Optional consumer. */ } },
        finish(fields) { try { operation?.finish(fields); } catch { /* Optional consumer. */ } },
    };
}
