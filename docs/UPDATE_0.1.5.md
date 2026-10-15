# ImmersiveGroups 0.1.5

This update reorganizes the settings window. Copy the ZIP's ImmersiveGroups contents over your existing extension files and reload. The root README.md is omitted to preserve your custom README. Existing settings keys and stored PC/Mobile values are retained.

## Settings map

| Tab | Contents |
| --- | --- |
| Layout | Chat height, Quick Reply row limits, mobile width threshold, multiple mobile sprites and settings-tab alignment. |
| Controls | Visibility, individual/shared controls, placement, alignment, button sizes, idle appearance, control/menu offsets and outfit menu row count. |
| Characters | Shared character picker, centimeter height, fine tuning, character Y offset, scaling breakdown, button colors and outfit-library access. |
| Sprites | Overall Fit adjustment, global Y offset, sprite spacing, stable slots and speaker dimming. |
| Backgrounds | Selector placement, library, favorites, bindings, descriptions and optional chat-load defaults. |
| Gallery | Image library, image rendering/height, loading limits, shortcut visibility and floating icon positioning. |
| Automation | The existing optional Gallery image prompt, plus a separate roadmap for future outfit/background automation. |
| Advanced / Prome | Original chat presentation, letterboxing, sprite effects, legacy scaling, shadows and tint controls. |
| About | Version, original-project credits, licenses and documentation. |

## Profile editing

Preview layout chooses Automatic, forced PC or forced Mobile for the chat. Settings profile chooses the values you edit: PC, Mobile or Follow active layout. Following is the default; it updates visible profile values when the preview mode or viewport width changes. Explicitly choosing PC or Mobile lets you edit that profile while viewing the other. This editing preference is remembered.

PC/Mobile badges mark profile-specific fields. Shared badges mark common settings, including physical character heights, chat height and feature switches. Character fine tuning, vertical corrections and visual control offsets keep their existing independent profiles.

The main window's Visual presets & import/export panel is now available on the visual settings tabs. Its presets apply to the selected editing profile. Scene tuning keeps the same preset tools but applies them to the profile currently displayed in chat. Both use the same validation and save/reset behavior. Exports contain visual settings and character corrections, not messages, centimeter heights, scene descriptions or API settings.

## Characters and feature switches

The Characters picker selects the same member for height, colors and the outfit library. Changing the member in the library updates the main picker too. Scene tuning can still open the library for the most recently targeted member.

Quick Reply rows, speaker-dimming amounts, floating icon positioning, Gallery loading-limit values, prompt fields and automatic background-loading options are inactive when their corresponding feature is off. Their saved values are retained. Background default rules can still be prepared while automatic loading is off.

Long explanations, scaling calculations, prompt editing, refresh diagnostics and background-rule priorities are placed in expandable sections. Labels consistently use Speak, Scene tuning and Chat window where applicable. Gallery prompting remains opt-in and makes no extra API call. Planned scene automation is informational only.

Outfit menus also read the latest catalog order immediately when opened, avoiding a brief stale order after reordering. Rows remain stable while the popup is open.

## Verification

All existing HTML setting IDs and setting keys remain available. Unit checks cover migrations, gallery policies, height math, background matching and visual export validation. Browser integration checks both existing behavior and the new tab order, keyboard navigation, profile following, main/live presets, shared character selection/colors, dependent fields and all nine tabs at phone width. The synthetic 60-message chat remains unchanged. Live SillyTavern installations and custom themes still need user testing.
