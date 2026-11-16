// SPDX-License-Identifier: AGPL-3.0-only
// Scene subsystem derived from Prome by Bronya-Rand / Prometheus; modified for ImmersiveGroups, 2026-10-15. See CREDITS.md.
import { extensionName } from "../constants.js";
import { extension_settings } from "../../../../extensions.js";
import { getContext } from "../../../../extensions.js";
import {
	saveSettingsDebounced,
	eventSource,
	event_types,
} from "../../../../../script.js";
import { getGroupIndex, getSpriteList, spritePackExists } from "../utils.js";
import { loadMovingUIState } from "../../../../power-user.js";
import { dragElement } from "../../../../RossAscends-mods.js";
import { sendExpressionCall } from "../../../expressions/index.js";
import { emulateSpritesDebounce } from "../listeners.js";

function setSpritePack(spritePack) {
	if (spritePack.length === 0) return;
	// Native Expressions creates this list lazily; it may not exist on a fresh install.
	if (!Array.isArray(extension_settings.expressionOverrides)) extension_settings.expressionOverrides = [];

	const existingOverrideIndex =
		extension_settings.expressionOverrides.findIndex(
			(e) => e.name === "prome-user",
		);
	if (existingOverrideIndex === -1) {
		extension_settings.expressionOverrides.push({
			name: "prome-user",
			path: spritePack,
		});
	} else {
		extension_settings.expressionOverrides[existingOverrideIndex].path =
			spritePack;
	}
}

export function applyUserSprite() {
	if (extension_settings[extensionName].enableUserSprite == null) {
		console.debug(
			`[${extensionName}] enableUserSprite returned null or undefined.`,
		);
	}

	console.debug(
		`[${extensionName}] Enable User Sprite?: ${extension_settings[extensionName].enableUserSprite}`,
	);

	$("body").toggleClass(
		"userSprite",
		extension_settings[extensionName].enableUserSprite,
	);
}

/*
 *
 */
export async function handleUserSprite() {
	if (!extension_settings[extensionName].enableUserSprite) {
		// Disabling must also drop the placeholder member it added earlier.
		const groupIndex = getGroupIndex();
		const group = groupIndex !== -1 ? getContext().groups[groupIndex] : null;
		if (group?.members?.includes("prome-user")) group.members = group.members.filter((x) => x !== "prome-user");
		$("#expression-prome-user").addClass("displayNone");
		return;
	}

	const exists = await spritePackExists(
		extension_settings[extensionName].userSprite,
	);
	if (!exists) return;

	const context = getContext();
	const groupIndex = getGroupIndex();

	if (groupIndex !== -1) {
		// Group Chat
		const group = context.groups[groupIndex];
		if (group.disabled_members.includes("prome-user")) {
			group.disabled_members = group.disabled_members.filter(
				(x) => x !== "prome-user",
			);
		}

		if (!context.characters.find((x) => x.avatar === "prome-user")) {
			context.characters.push({
				name: "Prome User Sprite (Do Not Click)",
				avatar: "prome-user",
				data: {
					creator_notes:
						"This is a dummy card made for Prome. Don't click this entry.",
				},
			});
		}

		if (extension_settings[extensionName].enableUserSprite) {
			if (!group.members.includes("prome-user"))
				group.members.push("prome-user");
		} else {
			if (group.members.includes("prome-user"))
				group.members = group.members.filter((x) => x !== "prome-user");
		}
	} else {
		// One-on-One Chat
		if (context.characterId === undefined) return;

		// Check if Prome's Expression Image IMG is in the Expression Holder Div
		const expressionHolder = $("#expression-wrapper");
		let promeExpression = expressionHolder.children("#expression-prome-user");
		if (promeExpression.length === 0) {
			const html = `<div id="expression-prome-user" class="expression-holder displayNone">
					<div id="expression-prome-userheader" class="fa-solid fa-grip drag-grabber"></div>
					<img id="expression-prome-user-image" class="" src=""/>
				</div>`;

			expressionHolder.append(html);

			promeExpression = $("#expression-prome-user");
			loadMovingUIState();
			dragElement(promeExpression);
		}
		if (extension_settings[extensionName].enableUserSprite) {
			$("#expression-prome-user").removeClass("displayNone");
		} else {
			$("#expression-prome-user").addClass("displayNone");
		}
	}
}

export async function applyUserSpriteAttributes() {
	if (!extension_settings[extensionName].enableUserSprite) return;

	const userSprite = extension_settings[extensionName].userSprite;
	if (!userSprite) return;
	const { sprites, err } = await getSpriteList(userSprite);
	if (err || !Array.isArray(sprites) || !sprites.length) return;

	const groupIndex = getGroupIndex();

	// Keep the displayed label, using the server's real file (any extension or
	// "-2"/".alt" variant suffix) instead of guessing "<label>.png".
	const image = $("#expression-prome-user").children("img");
	const fileName = decodeURIComponent(String(image.attr("src") || "").split("?")[0].split("/").pop() || "");
	const stem = fileName.replace(/\.[^.]+$/, "").toLowerCase();
	const shown = stem.match(/^(.+?)(?:[-.].*?)?$/)?.[1] || "";
	const sprite = sprites.find((s) => s.label === shown) || sprites.find((s) => s.label === "neutral") || sprites[0];
	const originalExpression = sprite?.label || "neutral";
	if (sprite?.path && image.attr("src") !== sprite.path) image.attr("src", sprite.path);

	if (groupIndex !== -1) {
		// Group Chat
		await sendExpressionCall(
			extension_settings[extensionName].userSprite,
			originalExpression,
		);
	}
}

export function onUserSprite_Click(event) {
	const value = Boolean($(event.target).prop("checked"));
	if (!value) {
		// Turning the feature off needs no sprite-pack check.
		updateUserSpriteSetting(false);
		return;
	}
	spritePackExists(
		extension_settings[extensionName].userSprite,
	).then((exists) => {
		if (!exists) {
			toastr.error(
				`Sprite Pack "${extension_settings[extensionName].userSprite}" could not be found.`,
				`User Sprite Pack Not Found`,
			);
			$(event.target).prop("checked", false);
			return;
		}
		updateUserSpriteSetting(value);
	});

	function updateUserSpriteSetting(isEnabled) {
		extension_settings[extensionName].enableUserSprite = isEnabled;
		saveSettingsDebounced();
		applyUserSprite();
		handleUserSprite();
		applyUserSpriteAttributes();

		if (isEnabled && extension_settings[extensionName].emulateSprites) {
			emulateSpritesDebounce();
		}
	}
}

export async function onUserSprite_Input() {
	const exists = await spritePackExists(this.value);
	if (!exists) return false;
	const value = this.value;
	console.debug(`[${extensionName}] User Sprite: ${value}`);
	extension_settings[extensionName].userSprite = value;
	setSpritePack(value);
	saveSettingsDebounced();
	eventSource.emit(event_types.GROUP_UPDATED);
}
