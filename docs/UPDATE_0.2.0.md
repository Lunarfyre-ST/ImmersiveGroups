# ImmersiveGroups 0.2.0 — Context ready

This milestone brings together scene context, outfit/background commands and automatic API scene analysis, with clearer default model guidance and consistent settings accents.

## New in 0.2.0

- Stronger outfit instructions distinguish individual and group-wide changes. “We all go to the bath in swimsuits” prompts the model to check every listed character for an available swimsuit, including non-speakers. Bedtime/sleepwear provides a second example. Missing outfits are skipped; current outfits are not repeated.
- Speaking-character-only instructions explicitly keep their one-character restriction even when the scene says “everyone.”
- Reply formats remain separate: Prompt mode writes RP followed by applicable commands; API mode returns only commands or NONE.
- Untouched older default instructions upgrade automatically. Custom instructions are preserved. To replace a custom prompt with the new defaults, use Automation → Prompt instructions & catalog size → Restore scene instructions.
- All nine settings tabs have muted accent colors, echoed by section headers, focus indicators and related settings dialogs. Selected tabs remain gray. Gallery, outfit and background editors use the same visual cues, while saved character-button colors remain independent.

## Context features included

- Prompt mode injects scoped outfit/background catalogs, descriptions and exact commands at a configurable depth, with a context preview and token count.
- All-character context supports multiple outfit changes; speaker-only context restricts changes to the reply’s author. Outfit and background locks are checked again before changes apply.
- Linked-background-only context is enabled by default and requires links to every active character. It never falls back to the full library when there are no shared links. Background descriptions and bindings can be edited from the Automation tab’s library shortcut.
- Separate API analysis supports the current main API, a connection profile or a custom/local OpenAI-compatible endpoint. Automatic analysis is opt-in: one call after a solo reply or completed group round, using the last assistant reply and the current catalog. Manual analysis remains available.
- Gallery has its own optional image-command prompt, descriptions, character/group bindings and loading limits. Its image prompt is configured in Automation. Coordinated image selection through the separate scene planner is still planned.
- Chat loads and existing swipe selections do not replay scene automation. Duplicate completion events cannot create duplicate planner calls; context changes cancel queued work and discard stale results.

## Install

Copy the ZIP’s ImmersiveGroups contents over the existing extension files, then reload SillyTavern. The root README.md is excluded to preserve your custom README. Settings and custom prompts are retained; no account settings, chats, images or API keys are packaged.

For automatic API use, select Automation → API → Automatically analyze new replies and keep the destination that worked in your manual test. Custom API keys remain page-session-only. Use All active, unlocked characters when one scene change should be able to update the whole group.

Model decisions still depend on the chosen model and scene descriptions. Depth-based injection is available now; a movable Chat Completions Prompt Manager entry remains planned.

## Validation

34 unit tests, build/syntax/import checks and the complete mocked-browser regression suite. Coverage includes default-prompt upgrades, preserved custom instructions, both output formats, all three API transports, automatic group scheduling, locks, linked backgrounds, chat integrity and image/swipe rendering. Visual review covers all nine settings tabs, mobile widths and a light palette. No real model/API calls were made by the validation tools.

Based on Prome Visual Novel Extension 1.2.4 by Bronya-Rand / Prometheus and SillyTavern-LocalImage 1.6.0 by mechamarmot. Original licenses and detailed credits remain included in CREDITS.md and licenses/.
