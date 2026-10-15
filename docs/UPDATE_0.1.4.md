# ImmersiveGroups 0.1.4

Copy the contents of the ZIP's ImmersiveGroups folder into the existing extension folder, replacing matching files, then reload SillyTavern. The root README.md is deliberately omitted so your repository README stays intact. This update does not include chat data, image libraries or user settings.

## Outfit controls

Hover over a character's outfit selector and scroll vertically to change their outfit. Down selects the next visible outfit; up selects the previous one. It wraps at either end and uses the outfit library's saved order. Hidden outfits are skipped. Ctrl+wheel keeps the browser's zoom behavior. Only the selected sprite changes, using the existing in-place loader.

Long outfit menus scroll rather than moving above the button to fit the entire list. A search field appears for more than eight visible outfits. Keyboard selection keeps its active row visible. Menu positions remain within the screen.

Open Scene tuning with the sliders button on the Sheld. Position & outfit menus controls button-bar X/Y, outfit-menu X/Y, all-sprite Y and menu row count. PC and Mobile keep independent values. Per-character Y is under Sprites & dimming → Character heights. Positive Y moves down, positive X moves right.

## Height and layout

Height ratios again use the tallest active character. Fit calibration then adjusts the whole frame. Fit and character fine tuning use signed adjustments: 0% means unchanged, +9% means a 109% multiplier. The Fit slider covers −20% to +20%; its number field accepts −99% to +500%. Existing stored values are preserved. The height editor shows the height, fine-tuning, Fit and legacy multipliers and their combined result.

Scene tuning → Presets & reset offers a scaling-correction reset that keeps centimeter heights. Named presets apply visual settings and per-character corrections to the displayed profile. Export/import handles both visual profiles and presets, with validation before applying changes. It excludes messages, height values in centimeters, scene descriptions, image assignments, background rules and API settings. Character identifiers are included with visual corrections so they can be matched on import.

Automatic layout now checks CSS viewport width; default Mobile threshold is 1000 px. PC/Mobile forcing remains available. Soft keyboard height changes do not switch the layout.

## Backgrounds

“All characters” lists only linked backgrounds bound to every active chat member. Select a single character to see their individual links. Starred entries remain in their own section.

Backgrounds → On chat load is optional and off by default. Enable it to restore a saved chat choice or apply a matching default. The delay accepts 0–10000 milliseconds; default 1000. Background selection uses this order:

1. Last manually selected background for this chat, if restoration is enabled.
2. Exact-group rule: the active member set must match precisely.
3. Shared rule: the chat includes all selected characters.
4. Individual-character rule.
5. Global fallback.
6. First alphabetically sorted background bound to every active member.

Rules of the same kind use their displayed order; move them with the arrow buttons. Disabled members do not count as active. Native chat background locks take precedence. A manual background choice or chat change cancels pending work, including requests already fetching the background list. Automatic defaults do not change your saved manual choice.

The “forget saved background” button removes only the extension's remembered background choice for the current chat. This system writes preferences through SillyTavern's settings, not through chat-message saves or reloads.

## Verification

The source includes unit checks for migrations, height math, background rule priorities, gallery policies and visual export validation. Browser integration uses the real combined ES modules and built Gallery against a synthetic SillyTavern fixture. It covers PC/Mobile layouts, wheel/touch/keyboard selection, popup scrolling/search, offsets, presets, background restoration and cancellation, image rendering, stable neighboring sprites and an unchanged 60-message chat. Live installation and third-party theme combinations still need user testing.
