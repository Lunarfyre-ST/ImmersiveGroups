// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { extension_settings } from "../../../../extensions.js";
import { extensionName } from "../constants.js";
import { saveSettingsDebounced } from "../../../../../script.js";


/* Sheld Functions */
export function applySheldVisibility() {
	if (extension_settings[extensionName].hideSheld === (null || undefined)) {
		console.debug(`[${extensionName}] hideSheld returned null or undefined.`);
	}

	console.debug(
		`[${extensionName}] Hide Sheld?: ${extension_settings[extensionName].hideSheld}`,
	);

	$("#sheld").toggleClass(
		"displayNone",
		extension_settings[extensionName].hideSheld,
	);
}

// Only touch Prome's own visibility marker. Never change chat data or mesid.
let migratedLegacyVisibility = false;
export function applySheldMode() {
    const settings = extension_settings[extensionName];
    const rows = [...document.querySelectorAll("#chat > .mes")];
    if (!migratedLegacyVisibility && rows.length) {
        // Older Prome used SillyTavern's shared class for single-message mode.
        if (settings.showOnlyLastMessage) {
            for (const row of rows) row.classList.remove("displayNone");
        }
        migratedLegacyVisibility = true;
    }
    // Pagination is useful only when history is visible. Keep native markup and
    // handlers intact, including pagination inserted after a chat switch.
    document.getElementById('chat')?.classList.toggle('ig-last-reply-only',Boolean(settings.enableVN_UI&&settings.showOnlyLastMessage));
    document.querySelectorAll("#chat #show_more_messages").forEach(node => node.classList.remove("displayNone"));
    const latest = rows.at(-1);
    for (const row of rows) {
        row.classList.toggle("prome-hidden-message", Boolean(settings.enableVN_UI && settings.showOnlyLastMessage && row !== latest));
    }
}

/* Event Handlers */
export function onSheld_Click(event) {
	const value = Boolean($(event.target).prop("checked"));
	extension_settings[extensionName].hideSheld = value;
	saveSettingsDebounced();
	applySheldVisibility();
}

export function onSheldMode_Click(event) {
	const value = Boolean($(event.target).prop("checked"));
	extension_settings[extensionName].showOnlyLastMessage = value;
	saveSettingsDebounced();
	applySheldMode();
}
