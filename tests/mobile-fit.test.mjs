import test from 'node:test';
import assert from 'node:assert/strict';
import { mobileFitFactor } from '../modules/mobile-fit-model.js';

test('sprites that fit keep their scale', () => {
    assert.equal(mobileFitFactor([{ height: 576, scale: 1, offsetY: 0 }], 640), 1);
    assert.equal(mobileFitFactor([], 640), 1);
});

test('one shared factor keeps the tallest sprite on screen', () => {
    const factor = mobileFitFactor([{ height: 576, scale: 1.5, offsetY: 0 }, { height: 576, scale: 1.125, offsetY: 0 }], 640);
    assert.ok(Math.abs(576 * 1.5 * factor - 640) < 1e-9);
});

test('pixel offsets move the limit, and unloaded sprites are ignored', () => {
    // Lowered 120px, a 720px sprite still fits under a 640px screen top (640 + 120 >= 720).
    assert.equal(mobileFitFactor([{ height: 600, scale: 1.2, offsetY: 120 }], 640), 1);
    assert.ok(Math.abs(mobileFitFactor([{ height: 600, scale: 1.2, offsetY: -40 }], 640) - 600 / 720) < 1e-9);
    assert.equal(mobileFitFactor([{ height: 0, scale: 3, offsetY: 0 }], 640), 1);
    assert.equal(mobileFitFactor([{ height: 600, scale: 1, offsetY: -5000 }], 640), 0.1);
});
