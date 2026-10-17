## 0.3.0 — Shared outfits and library tools

- Added compact outfit reordering: switch to Library order and move name rows with arrows, keeping search and character filters available.
- Added expression preview arrows, total sprite counts and an emotion dropdown with per-emotion variant counts. Preview changes stay inside the library.
- Added text search to image file galleries, covering filenames, assigned command names, descriptions and group-member ownership. Library search also includes shared outfit names.
- Removed the redundant Character / gallery sort. Asset type sorting is available only in the All tab.
- Added a discard action for quarantined mismatched outfits, keeping sprite files and preventing rediscovery of the discarded assignment.
- Added an optional All characters outfit selector. It lists names shared by every active character and changes their outfits together. Color, visibility and PC/mobile settings are available under Controls and Scene tuning → Buttons.
- Added editable shared outfit names and optional background-to-outfit links. With linked changes enabled, a background selection or command applies matching outfits to unlocked active characters. Missing or ambiguous matches are skipped. Valid explicit outfit commands in the same reply take precedence.
- Opened character button colors by default and added an API-mode note about possible prompt-cache disruption and increased request costs.

### Setting up shared outfits

1. Open an outfit card in the library. Set **Shared outfit name** to the same value for matching outfits on different characters, such as `pyjama`, `winter` or `bathrobe`. Leaving it blank uses the display name. Pajama/pyjama spelling variants are normalized.
2. For a common manual selector, enable **All characters outfit selector** under Controls or Scene tuning → Buttons. It appears for group chats with at least two active characters. Like individual manual selectors, this explicit choice can change locked outfits.
3. For background-driven changes, choose **Linked outfit name** on a background card and enable **Apply outfits linked to backgrounds** under Backgrounds. This automatic follow-up respects outfit locks and descriptions-only mode. The selector and linked changes are both off by default.
4. To reduce model commands, leave background automation enabled and disable outfit commands. The background context explains its linked outfit name; selecting that background performs the configured follow-up without another model call.

Changing links does not replay chat history. Pending linked changes stop if the chat, background choice or relevant settings change. Background relinking transfers its outfit link; conflicting links must be resolved before merging.

Replace matching files from the ZIP’s ImmersiveGroups folder and refresh SillyTavern. The rebuilt Gallery bundle is included; no npm installation is required. Existing settings and previous security repairs are retained. README is intentionally excluded.
