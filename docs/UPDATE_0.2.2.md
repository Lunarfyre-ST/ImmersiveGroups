# ImmersiveGroups 0.2.2

## Fixes

- Speak/name controls and outfit selectors stay paired by character when both are below the textbox, just as they do above chat. Split controls keep their character colors, including setups with only a custom Speak color.
- Muted group members disappear on desktop as well as mobile. Remaining sprites use the active roster for spacing.
- Standalone scene commands execute before, between paragraphs or after the roleplay. Fenced examples, inline code and reasoning blocks remain excluded. Commands still execute only for fresh replies or an explicit manual test; loading chats and choosing existing swipes do not replay them.

## Controls and prompts

- Separate **Always before**, **Always after** and **Automatic — let the LLM decide** placement choices for scene commands and Gallery image commands. After remains the default. Automatic permits commands between paragraphs; scene commands must remain on their own lines.
- Image instructions now sit immediately below **Allow outfit changes / Allow background changes** in Automation. Their instructions and preview remain expandable, and their enable switch stays independent of scene automation.
- **Fit character boxes to row** distributes available width across 1–8 boxes per row. It stretches small desktop rosters and can fit three compact boxes on mobile. This overrides fixed widths while enabled. More characters wrap into additional rows.
- Separate Name / Speak width, height and text size. A value of zero inherits the normal size (or uses automatic width). Optional name abbreviations have a 1–5-letter slider and a typed value up to 40; full names remain in tooltips and accessible labels.
- These visual controls are separate for PC and mobile and are included in visual presets. Find them in **Controls → Fit & name sizes** or **Scene tuning → Buttons**.

## Asset library

- Description length sorting, longest or shortest first, uses character counts shown on each entry.
- Character activity sorting uses SillyTavern's available chat-size metadata, falling back to current-chat message counts. Recent-character sorting uses last-chat metadata, falling back to current-chat speaking order. These group outfits by their owner's activity; chat size is not presented as an exact message count.
- **More filters & tools → Scan outfit folders** opens a directory picker. Choose your local `characters` folder or a character folder. Matching character/outfit folders containing supported images are verified against this server's sprite list and imported automatically. This reads names only. Existing catalog removals remain respected.
- **Open folder** on each outfit shows a copyable path relative to the server's user-data directory and offers local-folder image import. Browsers cannot directly open a server directory in the operating system's file explorer. No local absolute path is stored.
- **Upload sprite ZIP** imports supported image files into that outfit folder using SillyTavern's native individual-sprite upload endpoint. Existing stems are preserved: another `neutral-1.png` becomes `neutral-2.png`, or the next available number, including collisions between ZIP entries. Native ZIP upload is avoided because it replaces matching sprites.
- Supported files: PNG, JPG/JPEG, GIF, WebP, AVIF and BMP. ZIP limit: 50 MiB compressed, 200 imported images, 20 MiB per image and 250 MiB total uncompressed. Non-image metadata is skipped. Interrupted imports retain completed uploads; retrying creates numbered variants. Avoid concurrent uploads to the same folder from another client.
- The library and manual outfit changes read fresh sprite lists. SillyTavern's own expression cache may require a page reload to discover new expressions in an already-cached folder. Uploads do not reload chats or rebuild every sprite.

## API analysis

- **Recent messages sent to API** defaults to 1. The slider covers 1–5; the number field accepts up to 1000. User and assistant messages are included chronologically through the last assistant reply; system messages are omitted. Earlier messages provide context for the final scene.
- Replies are discarded if an included message changes during analysis, as well as on existing chat/settings cancellation paths.
- Output-token settings are validated and sent as integers across main, profile and custom transports. Reported truncated or filtered responses do not apply changes. Custom API error details surface context-window failures instead of a generic HTTP error alone.
- Context capacity still depends on the selected model and provider. A larger history window uses more input tokens; an API that returns only a text string cannot expose its finish reason.

## Installation and validation

Copy the ZIP's `ImmersiveGroups` contents over the existing extension files, then reload SillyTavern. Existing settings and custom instructions are retained. The root README.md is deliberately excluded. No chats, image assets, account settings or API credentials are packaged.

45 unit tests, build/syntax/import checks and the complete mocked-browser regression suite cover previous behavior plus bottom grouping, inherited colors, muted sprites, mobile fitting, leading/middle/trailing commands, image formatting, independent prompt placements, API history and stale results, output-token errors, folder scanning and duplicate-safe ZIP uploads. No real model/API calls are made by validation.

Based on Prome Visual Novel Extension 1.2.4 by Bronya-Rand / Prometheus and SillyTavern-LocalImage 1.6.0 by mechamarmot. Credits and licenses, including the vendored JSZip reader and dependency notices, remain included.
