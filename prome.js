// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { setupSettingsShell } from './modules/settings-shell.js';
import { setupStageControls, updateSpriteLayers } from './modules/stage-controls.js';
import { setupHeightProfiles } from './modules/height-profiles.js';
/* ST Core Imports */
import {
	extension_settings,
	renderExtensionTemplateAsync,
	getContext,
} from "../../../extensions.js";
import {
	saveSettingsDebounced,
	eventSource,
	event_types,
} from "../../../../script.js";
import { power_user } from "../../../power-user.js";
import { POPUP_TYPE, callGenericPopup } from "../../../popup.js";

/* Prome Core Imports */
import {
	extensionName,
	extensionFolderPath,
    extensionDirectoryName,
	defaultSettings,
} from "./constants.js";
import {
	applyZoomDebounce,
	applyDefocusDebounce,
	emulateSpritesDebounce,
	applyShakeDebounce,
	stopShake,
	applyUserAttributesDebounce,
	applyScaleDebounce,
} from "./listeners.js";

/* Prome Feature Imports */
import { setupQuickReplyLayout } from "./modules/quick-replies.js";
import { prepareSlashCommands } from "./modules/slash-commands.js";
import {
	applyLetterboxMode,
	applyLetterboxColor,
	applyLetterboxSize,
	setupLetterboxModeJQuery,
	setupLetterboxModeHTML,
} from "./modules/letterbox.js";
import {
	applySheldMode,
	applySheldVisibility,
	onSheld_Click,
	onSheldMode_Click,
} from "./modules/sheld.js";
import {
	getGroupIndex,
	isSheldVisible,
	spritePackExists,
	isGroupChat,
} from "./utils.js";
import {
	applySpriteZoomTimer,
	applySpriteZoomAnimation,
	applySpriteZoom,
	applySpriteDefocusTint,
	onSpriteDefocusTint_Click,
	setupFocusModeJQuery,
	setupFocusModeHTML,
} from "./modules/focus.js";
import { applySpriteShake, onSpriteShake_Click } from "./modules/shake.js";
import { getChatHistory } from "./modules/chat-history.js";
import {
	applySpriteEmulation,
	onSpriteEmulation_Click,
} from "./modules/emulate.js";
import {
	applySpriteShadow,
	applySpriteShadowBlur,
	applySpriteShadowOffsetX,
	applySpriteShadowOffsetY,
	setupSpriteShadowHTML,
	setupSpriteShadowJQuery,
} from "./modules/shadows.js";
import { setupTintHTML, setupTintJQuery } from "./modules/tint.js";
import {
	applyUserSprite,
	handleUserSprite,
	onUserSprite_Click,
	onUserSprite_Input,
} from "./modules/user.js";
import {
	applyAutoHideSprites,
	handleAutoHideSprites,
	setupAutoHideHTML,
	setupAutoHideJQuery,
} from "./modules/auto-hide.js";
import {
	applySpriteScale,
    applyScale,
	setupScaleHTML,
	setupScaleJQuery,
} from "./modules/scale.js";


async function loadSettings() {
	extension_settings[extensionName] = extension_settings[extensionName] || {};
	if (extension_settings[extensionName].enableVN_UI === undefined) {
		Object.assign(extension_settings[extensionName], structuredClone(defaultSettings), { ...extension_settings[extensionName] });
		if (power_user.waifuMode) {
			extension_settings[extensionName].enableVN_UI = power_user.waifuMode;
		}
	}

    // Preserve the existing three-character dimming strength on upgrade.
    const prior = extension_settings[extensionName];
    if (prior.speakerDimThird === undefined && prior.speakerDimOthers !== undefined) {
        prior.speakerDimThird = prior.speakerDimOthers;
    }
	// Check if new settings are added to extension_settings
	for (const key in defaultSettings) {
		if (extension_settings[extensionName][key] === undefined) {
			console.debug(`[${extensionName}] New setting added: ${key}`);
			extension_settings[extensionName][key] = structuredClone(defaultSettings[key]);
		}
	}

	// Add a expression override for the user sprite
	if (extension_settings[extensionName].enableUserSprite && extension_settings[extensionName].userSprite.length > 0) {
		const userSpritePack = extension_settings[extensionName].userSprite;
		const exists = await spritePackExists(userSpritePack);

		if (exists) {
			// Ensure the override exists
			const overrideExists = extension_settings.expressionOverrides.find(
				(e) => e.name === "prome-user",
			);

			if (!overrideExists) {
				extension_settings.expressionOverrides.push({
					name: "prome-user",
					path: userSpritePack,
				});
				saveSettingsDebounced();
			}
		} else {
			toastr.error(
				`Sprite Pack "${userSpritePack}" could not be found. Resetting user sprite settings.`,
				`User Sprite Pack Not Found`,
			);

			// Remove the expression override and disable user sprites
			let updateSettings = false;

			const overrideIndex = extension_settings.expressionOverrides.findIndex(
				(e) => e.name === "prome-user",
			);

			if (overrideIndex !== -1) {
				extension_settings.expressionOverrides = extension_settings.expressionOverrides.filter(
					(e) => e.name !== "prome-user",
				);
				updateSettings = true;
			}

			if (extension_settings[extensionName].enableUserSprite) {
				extension_settings[extensionName].enableUserSprite = false;
				updateSettings = true;
			}

			if (updateSettings)
				saveSettingsDebounced();
		}
	}

	// Prome Updates
	$("#prome-enable-vn").prop(
		"checked",
		extension_settings[extensionName].enableVN_UI || power_user.waifuMode,
	);

	// Letterbox Updates
	setupLetterboxModeHTML();
	// Sheld Updates
	$("#prome-hide-sheld").prop(
		"checked",
		extension_settings[extensionName].hideSheld,
	);

	// Sprite Updates
	/// Focus Mode
	setupFocusModeHTML();
	/// Defocus Tint
	$("#prome-sprite-defocus-tint").prop(
		"checked",
		extension_settings[extensionName].spriteDefocusTint,
	);
	/// Shake
	$("#prome-sprite-shake").prop(
		"checked",
		extension_settings[extensionName].spriteShake,
	);
	/// Sprite Emulation
	$("#prome-emulate-sprites").prop(
		"checked",
		extension_settings[extensionName].emulateSprites,
	);
	/// Sprite Shadow
	setupSpriteShadowHTML();

	/// User Sprite Updates
	$("#prome-user-sprite").prop(
		"checked",
		extension_settings[extensionName].enableUserSprite,
	);
	$("#prome-user-sprite-input").val(
		extension_settings[extensionName].userSprite,
	);

	/// Auto Hide Sprites
	setupAutoHideHTML();

	/// Sprite Scale
	setupScaleHTML();

	// Traditional VN Mode Updates
	$("#prome-sheld-last_mes").prop(
		"checked",
		extension_settings[extensionName].showOnlyLastMessage,
	);

	// ST Main Updates
	// Synchronize presentation without firing native handlers during chat startup.
    power_user.waifuMode = Boolean(extension_settings[extensionName].enableVN_UI);
    $("#waifuMode").prop("checked", power_user.waifuMode);
    $("body").toggleClass("waifuMode", power_user.waifuMode);

	// Apply Tint Settings
	setupTintHTML();

	// Apply Letterbox Settings
	applyLetterboxMode();
	applyLetterboxColor();
	applyLetterboxSize();

	// Apply Sheld Settings
	applySheldVisibility();
	applySheldMode();

	// Apply Sprite Settings
	/// Sprite Emulation
	applySpriteEmulation();
	/// Focus Mode
	applySpriteZoomTimer();
	applySpriteZoomAnimation();
	applySpriteZoom();
	/// Defocus Tint
	applySpriteDefocusTint();
	/// Sprite Shake
	applySpriteShake();
	/// Sprite Shadow
	applySpriteShadow();
	applySpriteShadowOffsetX();
	applySpriteShadowOffsetY();
	applySpriteShadowBlur();
	/// User Sprite
	applyUserSprite();
	/// Auto Hide Sprites
	applyAutoHideSprites();
	/// Sprite Scale
	applySpriteScale();
}

/* Prome Core Listeners */
function onVNUI_Click(event) {
	const value = Boolean($(event.target).prop("checked"));
	extension_settings[extensionName].enableVN_UI = value;
	power_user.waifuMode = value;
	saveSettingsDebounced();

	// Hijack ST Main's Waifu Mode
	$("body").toggleClass("waifuMode", power_user.waifuMode);
	$("#waifuMode").prop("checked", power_user.waifuMode);
	applySheldMode();
}

async function onKeybindListClick() {
	const template = await renderExtensionTemplateAsync(
		`third-party/${extensionDirectoryName}/html`,
		"keybinds",
	);
	await callGenericPopup(template, POPUP_TYPE.TEXT, "", {});
}

async function onCommandsListClick() {
	const template = await renderExtensionTemplateAsync(
		`third-party/${extensionDirectoryName}/html`,
		"commands",
	);
	await callGenericPopup(template, POPUP_TYPE.TEXT, "", {});
}

async function onChatHistoryClick() {
	getChatHistory();
}

async function initializeSceneUI() {
	function addLetterbox() {
		const letterboxHtml = `
      <div id="visual-novel-letterbox-one"></div>
      <div id="visual-novel-letterbox-two"></div>
    `;

		$("body").append(letterboxHtml);
	}

	const settingsHtml = await $.get(`${extensionFolderPath}/html/settings.html`);
	$("#extensions_settings").append(settingsHtml);

	/* Prome Core Actions */
	$("#prome-enable-vn").on("click", onVNUI_Click);
	$("#prome-keybinds").on("click", onKeybindListClick);
	$("#prome-commands").on("click", onCommandsListClick);

	const wandButtonHtml = await renderExtensionTemplateAsync(
		`third-party/${extensionDirectoryName}/html`,
		"wand_buttons",
	);
	$("#extensionsMenu").append(wandButtonHtml);
	$("#prome-wand-chat-history").on("click", onChatHistoryClick);

	/* Prome Feature Actions */
	// Letterbox
	setupLetterboxModeJQuery();
	// Sheld
	$("#prome-hide-sheld").on("click", onSheld_Click);
	$("#prome-sheld-last_mes").on("click", onSheldMode_Click);

	// Sprite Emulation
	$("#prome-emulate-sprites").on("click", onSpriteEmulation_Click);
	// Focus
	setupFocusModeJQuery();
	// Sprite Defocus Tint
	$("#prome-sprite-defocus-tint").on("click", onSpriteDefocusTint_Click);
	// Sprite Shake
	$("#prome-sprite-shake").on("click", onSpriteShake_Click);
	// Sprite Shadow
	setupSpriteShadowJQuery();
	// Sprite Scale
	setupScaleJQuery();

	// User Sprite
	$("#prome-user-sprite").on("click", onUserSprite_Click);
	$("#prome-user-sprite-input").on("input", onUserSprite_Input);

	/* Prome Feature Initialization */
	const vnWrapper = $("#visual-novel-wrapper");

	addLetterbox();
	setupTintJQuery();
	setupAutoHideJQuery();
	await loadSettings();
    setupSettingsShell();
	setupQuickReplyLayout();
    setupHeightProfiles(applyScale);
    setupStageControls();
	prepareSlashCommands();

	eventSource.on(event_types.MESSAGE_SWIPED, applyShakeDebounce);
	eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, stopShake);
	eventSource.on(event_types.CHAT_CHANGED, async () => {
		await applyZoomDebounce();
		await applyDefocusDebounce();
		await applyScaleDebounce();
		await emulateSpritesDebounce();
		await handleUserSprite();
		await applyUserAttributesDebounce();
		handleAutoHideSprites();
	});
	eventSource.on(event_types.MESSAGE_DELETED, async () => {
		await applyZoomDebounce();
		await applyDefocusDebounce();
		handleAutoHideSprites();
	});
	eventSource.on(event_types.GROUP_UPDATED, async () => {
		await emulateSpritesDebounce();
		await applyUserAttributesDebounce();
		await applyScaleDebounce();
		handleAutoHideSprites();

		if (isGroupChat()) {
			await updateSpriteLayers(vnWrapper);
		}
	});

	// Prevents the User Sprite from Genning Content
	eventSource.on(event_types.GENERATION_AFTER_COMMANDS, () => {
		if (!extension_settings[extensionName].enableUserSprite) return;

		const context = getContext();
		const groupIndex = getGroupIndex();
		if (groupIndex !== -1) {
			const group = context.groups[groupIndex];
			if (group.members.includes("prome-user")) {
				group.members = group.members.filter((x) => x !== "prome-user");
			}
		}
	});
	eventSource.on(event_types.GENERATE_AFTER_COMBINE_PROMPTS, () => {
		if (!extension_settings[extensionName].enableUserSprite) return;

		const context = getContext();
		const groupIndex = getGroupIndex();
		if (groupIndex !== -1) {
			const group = context.groups[groupIndex];
			if (!group.members.includes("prome-user")) {
				group.members.push("prome-user");
			}
		}
	});

	$(window).on("resize", async () => {
		await emulateSpritesDebounce();
		await applyUserAttributesDebounce();
	});

	// Show info message if Sheld is hidden
	if (!isSheldVisible()) {
		toastr.info(
			"Head to Extensions > ImmersiveGroups > Prome original > Sheld Configuration and uncheck 'Hide Sheld (Message Box)' to show it again.",
			"Sheld is currently hidden by ImmersiveGroups.",
		);
	}
}

function observeSceneUI() {
	/* Mutation Observer for Chat and VN Wrapper */
	/* Listen for changes in the chat and image expressions */
	const promeChatObserver = new MutationObserver((mutations) => {
        if (mutations.some(mutation => mutation.target.id === "chat")) emulateSpritesDebounce();

		const handleNode = (node) => {
			if (node.classList) {
				if (node.classList.contains("mes")) {
					handleAutoHideSprites();
					applyZoomDebounce();
					applyDefocusDebounce();
					applyShakeDebounce();

					if (isGroupChat()) {
						updateSpriteLayers($("#visual-novel-wrapper"));
					}
				}
				if (
					node.tagName === "DIV" &&
					node.classList.contains("expression-holder")
				) {
					handleAutoHideSprites();
					applyZoomDebounce();
					applyDefocusDebounce();

					if (isGroupChat()) {
						updateSpriteLayers($("#visual-novel-wrapper"));
					}
				}
			}
		};

		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;

			for (const node of mutation.addedNodes) {
				handleNode(node);
			}

			for (const node of mutation.removedNodes) {
				handleNode(node);
			}
		}

		// Apply Sheld Mode on new messages
		applySheldMode();
	});

	const chatDiv = document.getElementById("chat");
	promeChatObserver.observe(chatDiv, { childList: true });

	// Attach when ST creates the wrapper; gallery-only setups need no polling.
	const attachWrapper = () => {
		const vnWrapperDiv = document.getElementById("visual-novel-wrapper");
		if (vnWrapperDiv) {
			promeChatObserver.observe(vnWrapperDiv, {
				childList: true,
				subtree: true,
			});
			return true;
		}
		return false;
	};
	if (!attachWrapper()) {
		const waiting = new MutationObserver(() => { if (attachWrapper()) waiting.disconnect(); });
		waiting.observe(document.body, { childList: true, subtree: true });
	}
}

/* Keybinds */
// Hide Sheld via Ctrl+F1
let sceneStarted = false;
export async function initScene() {
    if (sceneStarted) return;
    sceneStarted = true;
    await initializeSceneUI();
    observeSceneUI();
    $(document).keydown((event) => {
	if (event.which === 112 && event.ctrlKey) {
		event.preventDefault();
		$("#prome-hide-sheld").click();
	}
});

}
