# ImmersiveGroups 0.2.1 — Unified asset library

- Outfits, backgrounds and gallery images now share one asset library. Existing outfit/background management buttons open the appropriate tab.
- Search across names, descriptions, folders, galleries and bindings. Filter by asset type, character, current chat, missing descriptions, outfit visibility, linked/starred backgrounds or image gallery.
- Scene descriptions are always open under each entry. Edits save when leaving the field or closing the library, including Escape. Existing descriptions, bindings and custom colors remain in their original catalogs and continue feeding context.
- Outfit tools retain discovery, folder-name import, manual additions, renaming, hiding, ordering, colors and wearing. Image details retain command aliases and character/group availability. Metadata edits do not rename or delete physical files.
- Optional previous/next arrows above chat cycle through the shared **linked** background pool, wrapping at either end. A background must be linked to every active character; starred-only and partially linked backgrounds are excluded.

## Controls

Enable **Scene tuning → Buttons → Show linked background arrows above chat**. The same toggle is available in Backgrounds settings. It is off by default and can be configured separately for PC and mobile. An empty linked pool disables the arrows; a single already-selected background also disables them.

The library's **More filters & tools** section contains advanced filters and outfit tools. Select a character above to discover/import/add outfits or edit their button colors. **Upload / manage image files** opens the existing image file manager. Folder-name import only reads names; sprite files still belong in SillyTavern's sprite folders.

## Install

Copy the ZIP's ImmersiveGroups contents over the existing extension files and reload SillyTavern. The root README.md is excluded to preserve your custom README. Existing settings and custom prompts are retained. No chat data, images or API credentials are included.

Based on Prome Visual Novel Extension 1.2.4 by Bronya-Rand / Prometheus and SillyTavern-LocalImage 1.6.0 by mechamarmot. Original licenses and detailed credits remain in CREDITS.md and licenses/.

## Validation

38 unit tests, build/syntax/import checks and the complete mocked-browser regression suite passed. Coverage includes cross-asset search/filtering, visible description edits and Escape saving, preserved image bindings, linked-only arrow cycling, 320 px and 390 px phone layouts, unchanged native chat messages, image/swipe rendering and scene automation. Desktop and mobile layouts were visually reviewed. No real model/API calls were made by validation.
