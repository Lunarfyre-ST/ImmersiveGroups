// SPDX-License-Identifier: AGPL-3.0-only
/** The largest shared factor (at most 1) that keeps every sprite's top on screen; relative heights are kept. */
export function mobileFitFactor(sprites, available) {
	let factor = 1;
	for (const { height, scale, offsetY } of sprites) {
		if (!(height > 0 && scale > 0 && available > 0)) continue;
		factor = Math.min(factor, (available + offsetY) / (height * scale));
	}
	return Math.max(0.1, Math.min(1, factor));
}
