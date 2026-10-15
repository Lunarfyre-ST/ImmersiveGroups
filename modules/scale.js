// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { layoutSettings } from './responsive.js';
import { spriteProfileFactor } from './height-profiles.js';
import { extensionName, defaultSettings } from "../constants.js";
import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../../script.js";
import { isGroupChat } from "../utils.js";

/* Sprite Scale Functions */
export function applySpriteScale() {
	if (extension_settings[extensionName].scaleSprites === (null || undefined)) {
		console.debug(
			`[${extensionName}] scaleSprites returned null or undefined.`,
		);
	}

	console.debug(
		`[${extensionName}] Sprite Scale?: ${extension_settings[extensionName].scaleSprites}`,
	);

	$("body").toggleClass(
		"spriteScale",
		extension_settings[extensionName].scaleSprites || extension_settings[extensionName].enableHeightProfiles,
	);

	applyScale();
}

function resetSpriteScale() {
	extension_settings[extensionName].maxSpriteScale =
		defaultSettings.maxSpriteScale;
	$("#prome-sprite-scale-size").val(defaultSettings.maxSpriteScale);
	$("#prome-sprite-scale-size-counter").val(defaultSettings.maxSpriteScale);
	saveSettingsDebounced();
	applyScale();
}

export function onSpriteScale_Click(event) {
	const value = Boolean($(event.target).prop("checked"));
	extension_settings[extensionName].scaleSprites = value;
	saveSettingsDebounced();
	applySpriteScale();
}

export function onSpriteScale_Change() {
	const value = Number(this.value);
	if (value < 0.1 || value > 2) {
		console.error(`[${extensionName}] Invalid scale value: ${value}`);
		return;
	}
	extension_settings[extensionName].maxSpriteScale = value;
	$("#prome-sprite-scale-size").val(value);
	$("#prome-sprite-scale-size-counter").val(value);
	saveSettingsDebounced();
	applyScale();
}

export function applyScale(target = null) {
	// apply sprite scale to all sprites
	document.documentElement.style.setProperty(
		"--prome-sprite-scale",
		extension_settings[extensionName].maxSpriteScale,
	);

	let sprites;
    if (target) {
        sprites = [target];
    } else if (isGroupChat()) {
		sprites = document.querySelectorAll("#visual-novel-wrapper > .expression-holder, #ig-mobile-sprites > .expression-holder");
	} else {
		sprites = document.querySelectorAll("#expression-wrapper .expression-holder");
	}

    const layoutScale = Math.min(600, Math.max(1, Number(layoutSettings().layoutSpriteScale) || 100)) / 100;
    const enabled = Boolean(extension_settings[extensionName].enableVN_UI && (extension_settings[extensionName].scaleSprites || extension_settings[extensionName].enableHeightProfiles || layoutScale !== 1));
    document.body.classList.toggle('spriteScale', enabled);
	// loop through all divs
	for (const d of sprites) {
        const base = extension_settings[extensionName].scaleSprites ? extension_settings[extensionName].maxSpriteScale : 1;
        const value = String(base * layoutScale * spriteProfileFactor(d));
        if (d.style.getPropertyValue('--prome-sprite-scale') !== value) d.style.setProperty('--prome-sprite-scale', value);
		if (enabled) {
			// apply scale
			$(d).addClass("prome-sprite-scale");
		} else {
			// remove scale
			$(d).removeClass("prome-sprite-scale");
		}
	}
}

export function setupScaleHTML() {
	$("#prome-sprite-scale").prop(
		"checked",
		extension_settings[extensionName].scaleSprites,
	);
	$("#prome-sprite-scale-size").val(
		extension_settings[extensionName].maxSpriteScale,
	);
	$("#prome-sprite-scale-size-counter").val(
		extension_settings[extensionName].maxSpriteScale,
	);
}

export function setupScaleJQuery() {
	$("#prome-sprite-scale").on("click", onSpriteScale_Click);
	$("#prome-sprite-scale-size").on("input", onSpriteScale_Change);
	$("#prome-sprite-scale-size-counter").on("input", onSpriteScale_Change);
	$("#prome-sprite-scale-size-restore").on("click", resetSpriteScale);
}
