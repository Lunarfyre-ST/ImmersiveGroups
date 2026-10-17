# ImmersiveGroups

A light novel style expression extension for SillyTavern, focused on group chats, multiple outfits and mobile usability. Based on Bronya Rand's **Prome-VN-Extension** and mechamarmot's **SillyTavern-LocalImage**, with an integrated asset library and optional LLM automation for outfit and background changes.

What began as a quick patch for multiple outfits in the PromeVN extension quickly became a larger overhaul, bringing group-chat improvements, outfit management, mobile layouts, backgrounds and a local image gallery together in one extension for SillyTavern.

The goal is a more cohesive light novel experience: keep a group of characters on screen, change their outfits, set the scene, and optionally let the model choose suitable outfits, backgrounds and premade gallery images.

**Current version: 0.3.4.** Includes per-outfit height overrides and selective outfit updates with conflict review, alongside character/settings ZIP transfers with independent choices and content previews, plus a searchable visual picker for backgrounds and gallery images. Outfit/background automation works through either the main roleplay prompt or a separate API call. Background-linked outfits can coordinate changes from a background command alone. Gallery images have their own optional prompt; the separate scene-analysis API currently handles outfits and backgrounds.

> [!WARNING]
> **Beta project with limited real-world testing.** Back up your SillyTavern `data` folder before installing or updating. Use at your own risk. Features, settings and migration behavior may change during development. Automated checks do not replace testing across actual SillyTavern setups, browsers and phones.

## Who is this for?

What ImmersiveGroups adds depends on the visual assets you use:

| Your setup | What the extension brings |
| --- | --- |
| **One character with one outfit** | Sprite and interface customization, VN mode, and optional background/image automation. |
| **One character with several outfits** | Smooth outfit switching, an outfit library, and optional outfit automation. |
| **Several characters with one outfit each** | Group-chat controls, relative character heights, sprite spacing, and multiple sprites on mobile. |
| **Several characters with several outfits** | Group outfit management and automation that can change outfits for several characters when the scene calls for it. |

### You will likely not benefit from this extension if:

- You do not have character sprites, backgrounds or images to manage or automate.
- You want a drag-and-drop experience. ImmersiveGroups is designed for customization: most features are toggleable and adjustable, so the settings menu is quite large and some initial setup is expected.

**Do I need to use every feature?** No. Use the parts that suit your setup; outfit/background automation and Gallery image instructions are optional and start disabled on a fresh setup.

> [!WARNING]
> **Test API mode yourself before relying on it.** It is highly recommended to start with a local, free or low-cost option. Do not assume API calls or caching will work perfectly. Check the requests, returned commands and any usage charges before enabling automatic analysis.

## Preview

### PC view

![ImmersiveGroups PC preview](docs/Preview-PC.jpg)

### Mobile view

<img src="docs/Preview-Mobile.gif" alt="ImmersiveGroups mobile preview" width="350">

## Installation

1. Back up your SillyTavern `data` folder.
2. **Disable the standalone Prome and LocalImage extensions**, including separate forks of them. Keep their saved settings; do not run them alongside ImmersiveGroups.
3. Use SillyTavern's extension installer with this repository URL:

   ```text
   https://github.com/Lunarfyre-ST/ImmersiveGroups
   ```

4. Reload SillyTavern, then open **Extensions → ImmersiveGroups**.
5. Enable the character scene / VN mode. For sprite features, enable Character Expressions and set up your characters' sprite folders. Gallery rendering has its own enable setting.

For manual installation, place the extension files inside:

```text
SillyTavern/public/scripts/extensions/third-party/ImmersiveGroups/
```

`manifest.json` must be directly inside that folder, without another nested `ImmersiveGroups` folder. No separate Gallery extension or Node/npm installation is needed to use the extension.

When updating manually, replace the matching extension files and reload SillyTavern. Check [Releases](https://github.com/Lunarfyre-ST/ImmersiveGroups/releases) for version notes and available checkpoints.

### Migrating existing settings

On first startup, settings from `Prome-VN-Extension` and `SillyTavern-LocalImage` are copied into ImmersiveGroups. The original settings are retained as backups, and subsequent startups do not overwrite your newer ImmersiveGroups preferences with them. Existing image assignments, outfit data and supported preferences are carried over.

If an old extension copy remains enabled, a conflict message blocks startup to prevent duplicate handlers. Disable the conflicting copy and reload. Chat files are not part of the settings migration.

## Features

Built on Prome-VN's visual novel foundation, ImmersiveGroups adds the following fixes and controls, with a focus on group chats, multiple outfits and mobile usability.

### Outfits and group chats

- **Multiple-outfit fixes:** addresses outfit handling issues while Prome's visual novel interface is active, including in group chats.
- **Group-chat message controls:** per-character Speak buttons request the next reply from a particular character. These can submit your current draft text when triggering a reply.
- **Outfit selection:** change clothes through each character's outfit selector, with distinct hover/focus outlines, a selected checkmark and mouse, touch and keyboard support. Hover and scroll to cycle through outfits.

  <img src="docs/Preview-OutfitSelector.jpg" alt="Outfit selector with available outfits and the selected outfit highlighted" width="260">

- **Smooth outfit changes:** selector-based changes preload the image and update that character in place. Existing Quick Reply outfit changes can still trigger native sprite reloads.
- **Outfit management:** visible Add outfit and Scan outfit folders actions, a dedicated form with its own character selector and optional ZIP upload, and memory for outfits used through Quick Replies. Rename, hide, reorder and describe outfits without renaming their files. Common-folder discovery is available manually or as an opt-in.
- **Shared outfit names and All selector:** give matching outfits the same shared name, then optionally change every active character from one selector. Only unambiguous names shared by the whole active group appear. Visibility and color are configurable in **Controls** or **Scene tuning → Buttons**, with separate PC/mobile profiles.
- **Expression browsing:** preview an outfit’s expressions with arrows or an emotion dropdown, including total sprite and per-emotion variant counts. Previewing does not change the chat’s sprites.
- **Sprite ZIP uploads:** import images directly into an outfit folder. Existing filenames are preserved by numbering duplicates, such as `neutral-1` becoming `neutral-2`.
- **Character styling:** customize character button backgrounds, Speak button colors and text colors, plus per-outfit text colors. Button backgrounds stay independent when controls are together; optionally inherit the Speak button color when selectors and Speak buttons are separated.

  <img src="docs/Preview-Colors.jpg" alt="Per-character button background, Speak button and text color controls" width="320">

- **Outfit ownership safeguards:** automatically learned folders that clearly belong to another known character are rejected. Previously saved mismatches are set aside with their descriptions preserved, keeping them out of selectors and automation. Intentional shared outfits can be restored explicitly in the library’s Tools panel, or mismatched entries can be discarded without deleting their sprite files.
- **Working automation locks:** locked characters are omitted from outfit-command context and automatic changes are rejected, including background-linked outfit changes. Manual selection, including the All selector, remains available. Descriptions-only context can still describe their current outfits. Lock buttons are hidden by default; highlighted status notes distinguish disabled automation, Prompt mode and manual/automatic API analysis.
- **Muted-member handling:** muted group members disappear on desktop and mobile, and the remaining sprites readjust.

### Sprite customization

- **Character heights in centimeters:** scale characters relative to the tallest active member, with individual fine tuning to compensate for inconsistent sprite framing. Unset heights default to 165 cm; saved heights are retained.

  ![Characters displayed at different relative heights](docs/Preview-Height.jpg)

  <img src="docs/Preview-HeightSettings.jpg" alt="Character height in centimeters, fine tuning and vertical offset settings" width="320">

- **Fit calibration:** adjust the overall sprite scale until the tallest character fits comfortably on screen.
- **Persistent profiles:** heights are remembered across chats and groups. Heights are shared between PC and mobile; fine tuning, fit calibration and visual offsets have separate profiles.
- **Sprite shadows:** adjust opacity, X/Y offsets and blur under **Sprites → Sprite shadows**, with slider/number pairs and Reset buttons.
- **Speaking-order dimming:** configure darkness for the current, previous and older speakers, including completely black silhouettes.

  <img src="docs/Preview-Dimming.jpg" alt="Speaking-order sprite dimming controls" width="320">

- **Sprite overlap:** prioritize brighter characters, then recent speakers, so dimmed sprites stay behind highlighted ones.
- **Sprite spacing and offsets:** bring characters closer together or spread them out, with global and per-character vertical positioning.

### Scene animations

- **Outfit and background transitions:** optionally blend the old outfit or background into the new one with **Crossfade**, or choose **Fade out, then fade in**. Outfit changes preload the new image and affect only the selected character in place.
- **Linked fade timings:** enabled by default. Adjust either the fade-in or fade-out slider/number field to change both; unlink them for separate durations. Crossfade is the default style, with 200 ms for outfits and 350 ms for backgrounds.
- **Live animation controls:** use the **Animations** settings tab or **Scene tuning → Animations**, between Position & outfit menus and Presets & reset. Both views edit the same shared PC/mobile settings and include **Reset animation defaults**.
- **Optional and motion-aware:** fades start off on a fresh setup; existing on/off choices are retained. Reduced-motion preferences are respected, and interrupted transitions clean up their temporary layers. Background transitions preserve native background selection and locks.

### Mobile and interface controls

- **Multiple sprites on mobile:** display several active group members together on smaller screens.
- **Separate PC/mobile profiles:** independently tune control sizes, placement, sprite spacing and visual scaling.
- **Automatic or forced layout:** use viewport-width detection or force PC/Mobile to preview either layout.
- **Live Scene tuning:** adjust layout, Sheld height, spacing, fit, controls, offsets and animations while viewing the chat. The tuning panel stays in place while the scene moves.
- **Adjustable Sheld size:** resize the chat window to balance text and sprite visibility. Under **Layout**, leave **Show only the latest message** off for scrollable history, or enable it for a single-message VN presentation.
- **Limitable, scrollable Quick Reply rows:** cap inline Quick Replies and scroll additional rows. Set rows to zero to hide the inline bar; the popup remains available.
- **Flexible character controls:** show or hide buttons, place controls above chat or below the textbox, put names above selectors, center controls, and adjust sizes and idle opacity. Speak/outfit controls stay paired when both are below the textbox.
- **Automatic row fitting:** distribute available width across 1–8 character boxes per row, including compact mobile rows.
- **Name/Speak customization:** separate width, height and text size, plus optional name abbreviations.
- **Visual presets:** save named layouts and import/export PC/mobile visual settings and character corrections.
- **Organized settings:** centered, wrapping tabs with subtle accent colors and expandable advanced options. Original Prome settings remain in **Legacy / Prome**, including Hide chat window with its **Ctrl + F1** shortcut.

### Unified asset library

- **One library:** browse outfits, backgrounds and gallery images together or use their individual tabs, with a **Groups** tab for reusable character presets and one scrolling gallery area. Forms and tools open in desktop side panels or mobile sheets.

  ![Unified asset library with outfit, background and image tabs](docs/Preview-Library.jpg)

- **Shared search:** search names, descriptions, folders, shared outfit names, galleries and character/group bindings.
- **Filtering:** narrow results by character, named group, current chat, descriptions, outfit visibility, linked/starred backgrounds, missing background files or image gallery. The Filters panel shows options relevant to the selected asset type and reports the active filter count. Hide Basic outfits or filter outfits with or without images.
- **Sorting:** sort by name, missing descriptions or description length, with asset-type sorting available in **All** only. Character activity/recent sorting uses available SillyTavern metadata, with current-chat fallbacks; activity is not an exact global message count.
- **Compact outfit reordering:** **Reorder outfits** switches to Library order and replaces large preview cards with compact name rows and up/down arrows. Search and character filters remain available.
- **Visible descriptions:** edit scene descriptions directly under each entry. Edits save when leaving the field or closing the library.
- **Reusable group presets:** name a set of characters in **Groups**, optionally add a description, then bind backgrounds or images to that preset. Every saved member must be present; extra chat members are allowed. Presets follow members across chats and are independent of SillyTavern group IDs.
- **Scoped bindings:** character lists default to the current chat, with search and an **All characters** option. Existing links outside the displayed list are preserved. Individual image bindings and specific SillyTavern-group bindings remain available.
- **Existing-image aliases:** renaming an image command retains the previous name as an alias for older messages.

### Character and settings transfers

- **Named ZIP bundles:** open **Import / export** from the Library toolbar or **Character & settings transfers** in extension settings. Select the current chat’s characters, choose characters individually, or use the all-library settings preset.
- **Independent choices:** select entries, descriptions, library order, locks, height profiles, UI colors, cards, linked backgrounds, group presets, gallery assignments and preferences under **Outfits, Character, Extra, Gallery and Settings**. Exclude individual backgrounds and their associated data with the background checklist.
- **Optional character cards:** choose **PNG** for the portrait and character data, or **JSON** for character data only. Cards are separate from sprite files and start unchecked.
- **Media and content previews:** sprite images are enabled by default; background and gallery files have separate toggles. Counts beneath the options show available outfits, sprites and other data. Description counts use SillyTavern’s tokenizer when available, otherwise characters. Counts describe the available scope, including unchecked options; sprite inventories are inspected without downloading images.
- **Reviewed imports:** verify the bundle, choose its categories, map characters to installed cards or create new cards from included ones, and adjust destination sprite roots. Keep existing metadata or use imported values for matching entries. Existing 0.3.1 bundles remain supported.
- **Preserved files and relationships:** existing cards are never replaced, matching sprite/background files are kept, and gallery uploads receive new filenames. Selected metadata is merged without removing unrelated entries. Group membership and bindings are remapped together; unresolved relationships are reported and skipped. Chat history and API connection details are excluded, and imported automation preferences start off.

Character/settings bundles use a separate importer. Existing **Upload sprite ZIP** imports continue to work as before, including numbered variants for duplicate filenames. See the [transfer guide](docs/TRANSFERS.md) for scope, archive limits and recovery details.

### Images and backgrounds

- **Integrated Gallery:** local image handling based on SillyTavern-LocalImage, including a shared General gallery.
- **File-gallery search:** search filenames, assigned image names and descriptions in the image-management galleries, including member images in group galleries.
- **Optional image prompt:** give the roleplay model exact image commands, descriptions and availability rules without making a separate API call.
- **Optional loading limits:** image cooldowns and per-message/per-round caps. Suppressed commands leave a blank instead of visible command text.
- **Image sizing and formatting:** adjustable maximum image height, proportional width fitting and formatting-preserving rendering, including images between paragraphs and across swipes.
- **Visual background/image picker:** switch between **Backgrounds** and **Send image**, with thumbnail grids or compact lists, search, current-selection highlights and keyboard navigation. The selected tab is light orange; inactive tabs are gray. The header and actions remain visible while the asset list scrolls on PC and mobile.
- **Quick Image Send:** filter by gallery, search command names, galleries and descriptions, then preview and select an image. Send an image-only message when the draft is empty, or insert a command into your draft. Open the full library from the same picker to manage files and assignments.
- **Background organization:** star favorites, bind locations to characters and save scene descriptions. The compact picker has **Linked, Starred and All** pools, character/group filters and a model-change lock.
- **Linked-background arrows:** optional previous/next buttons beside Scene tuning cycle through backgrounds whose individual links cover every active character, or whose named group is fully present, without a filename bar.
- **Missing-background cleanup:** discard stale catalog entries or relink them to renamed files, preserving descriptions, stars, bindings and saved defaults. **Tools → Review missing backgrounds** refreshes the list and reveals missing entries.
- **Background-linked outfits:** optionally associate a background with a shared outfit name, such as bedroom → pyjama or outside → winter. Selecting that background manually, on chat load or through a command changes matching unlocked characters in place, without another model call. Missing/ambiguous matches are skipped, and valid explicit outfit commands take precedence.
- **Optional chat-load backgrounds:** restore a remembered choice or apply character/group defaults, with adjustable delay, ordered rules and respect for native background locks.

### Scene automation and context

- **At-a-glance status:** a compact summary below the live layout indicator shows scene automation on/off, Prompt/API mode, outfit scope, background automation and Gallery image instructions/placement. Gallery image prompting has its own switch.
- **Prompt mode:** inject outfit/background catalogs and descriptions into the main roleplay request. The model writes applicable scene commands with its reply, avoiding a separate analysis call.
- **Descriptions-only Prompt mode:** include current outfit, background and matching group descriptions as scene reference without offering or executing outfit/background commands. Select which scene details to include; locked characters can remain described. Gallery image instructions keep their own switch.
- **API mode:** analyze the latest reply through the current main API, another connection profile or a custom/local OpenAI-compatible endpoint. Manual testing and optional automatic analysis are available. Depending on the provider and request setup, separate analysis calls can disrupt prompt caching and substantially increase request costs.
- **Character scope:** include all active, unlocked characters for group-wide outfit changes, or only the speaking character to reduce outfit context and restrict its targets.
- **Shared background context:** by default, offer backgrounds whose individual links cover every active character, or whose named group’s saved members are all present. This stays group-wide even when outfit context is speaker-only, with no fallback to unlinked backgrounds.
- **Prompt controls:** configurable injection depth, editable instructions, catalog limits, preview and token count. A character estimate is shown if tokenizer counting is unavailable.
- **Command placement:** independent Before, After or Automatic placement choices for scene commands and Gallery image commands.
- **API history:** choose how many recent user/assistant messages to send. The default is one; the slider covers 1–5, with larger typed values supported.
- **Validation and cancellation:** check targets, availability and locks before applying changes. Changed chats/messages invalidate pending results; reported truncated responses do not apply changes.

Automation is optional and depends on the model following the supplied instructions. Gallery image prompting is independent of outfit/background automation. The separate scene-analysis API currently handles outfits and backgrounds only.

## Quick start

### Tune while viewing the chat

Click the **sliders icon beside the character controls** to open **Scene tuning**. These controls adjust the **live profile**, even if the main settings editor is showing the other profile. Sheld height applies to both layouts.

In the main settings, **Preview layout** chooses the live layout; **Settings profile** chooses which saved profile you edit. **Follow active layout** follows the current PC/mobile mode. PC/Mobile badges mark profile-specific fields; Shared settings apply to both.

**Automatic uses viewport width**, selecting Mobile at **1000 CSS pixels or less** by default. Change the threshold under **Layout → Mobile layout**. Opening the phone keyboard does not switch profiles based on height. Forcing a layout changes ImmersiveGroups behavior, not SillyTavern's entire responsive interface.

For compact rows, try **Scene tuning → Buttons → Fit character boxes to row**, choose the number of boxes, and enable names above selectors. The main settings expose these controls under **Controls → Fit & name sizes**.

### Tune transitions

Open **Animations**, or expand **Scene tuning → Animations** while viewing the chat. Enable outfit and/or background fades, choose a transition style, then adjust the durations in milliseconds. **Crossfade** blends the old and new images together; **Fade out, then fade in** runs the two parts in sequence.

**Link fade-in and fade-out timings** starts enabled. Changing either value updates both; turning linking back on uses the current fade-in value. Unlink it for independent timing. A value of **0 ms** skips that part of the fade. **Reset animation defaults** restores Crossfade, linked timings, 200 ms for outfits and 350 ms for backgrounds, and turns fades off. These settings apply to both PC and mobile.

### Set character heights

In **Characters**, select a character and enable height scaling, then enter their height in centimeters. The default for an unset height is **165 cm**; existing saved values are kept. In **Sprites**, adjust **Fit calibration** until the tallest active character fits, then use individual **Fine tune** sliders as needed. With equal fine tuning, a 150 cm character uses 75% of a 200 cm character's sprite height. Different transparent padding or artwork framing may still need adjustment.

Fine tuning and Fit calibration use signed adjustments: **0% means unchanged**, +10% means a 110% multiplier. Their sliders cover −20% to +20%; number fields accept larger adjustments. Earlier values are retained through migrations. Visual correction resets keep the character's height in centimeters.

### Manage outfits and assets

Open **Gallery → Open asset library**, or use **Manage outfits / Manage backgrounds** to open the same window on the relevant tab. Descriptions are directly editable under each entry.

In **All / Outfits**, **Add outfit** opens a form with its own character selector, display name, folder path and optional sprite ZIP. You do not need to select a character in the library filter first.

Use **Scan outfit folders** to choose your local `SillyTavern/data/default-user/characters` folder, or one character’s sprite folder. Other accounts and custom data directories have their own `characters` folder. **Import help** beside the scan button explains the paths. Matching folders containing images are verified against the server and imported. Scanning reads names only; it does not upload files. If SillyTavern runs on another device, the folders must also exist on that server, or you can upload a sprite ZIP instead.

Open **Filters** for **Hide Basic outfits**, **Outfit images** and other category-specific options. The image filter checks sprite lists; failed checks are not treated as empty folders. **Tools → Check outfit images** retries stale or failed results. These library filters do not change which outfits are available in character selectors or model context.

**Tools** also contains **Find common outfit folders** and **Import folder names**. Automatic common-folder discovery and automatic Basic hiding are **off by default** on fresh installs; existing preferences remain in effect. **Character appearance** opens the character-button color controls. Use **Reorder outfits** for compact name rows and arrow controls; **Done reordering** returns to preview cards. Each outfit’s **More** menu also contains ordering, font color and catalog removal; removal keeps the files.

If an outfit appears under the wrong character, check **Tools → Mismatched outfits set aside** or the **Review mismatched outfits** button. The extension preserves mismatched entries and their descriptions without changing the image files. Use **Restore as shared outfit** only when sharing that folder is intentional, or **Discard mismatched entry (keeps files)** to remove the saved mismatch. You can also assign a shared folder explicitly through **Add outfit**.

Each outfit has an **Upload sprite ZIP** button, and the Add outfit form can upload one when creating an entry. Supported ZIP images include PNG, JPG/JPEG, GIF, WebP, AVIF and BMP. Imports preserve existing filenames by adding numbered variants. SillyTavern's native expression cache may need a page reload to discover newly added expressions in an already-cached folder.

### Transfer characters and settings

1. Open **Library → Import / export → Export**, choose characters and give the bundle a name.
2. Select the individual items to include. **Sprite images start enabled**; turn them off for a smaller settings/path-only export. Character cards, background images and gallery files are separate choices. Review the counts and uncheck any unwanted backgrounds.
3. Select **Download named ZIP**. On the destination setup, open **Import**, choose the bundle and review its available options.
4. Map each source character to an installed character. To create a new character, enable **Character card** and select **Create a new character from included card**. Check sprite roots and the metadata conflict policy, then review the application preview and apply.

**Current chat** exports related data for selected characters. **All extension settings** also covers unbound backgrounds, all group presets and gallery entries in enabled categories. Only selected characters’ full settings/cards are included; other group members may appear as references that need mapping.

Cards can contain embedded lore and creator notes; selected descriptions and custom prompt text are also portable. Chats, credentials, custom API URLs and connection-profile references are excluded. Reload after importing preferences to refresh the settings fields, then re-enable automation if wanted. [Full transfer guide](docs/TRANSFERS.md).

### Reuse character groups

Open **Library → Groups → Add group**. Enter a name, choose members or copy them from the current chat / a SillyTavern group, then save. Select that preset in a background or image’s **Named groups** bindings. Every saved member must be present for it to match; extra characters are allowed.

Character binding lists start with **Current chat**. Switch to **All characters** to review other links or use the search box to find someone.

### Coordinate outfits with backgrounds

1. On each outfit card, set the same **Shared outfit name** for matching clothes, such as `pyjama`, `winter` or `bathrobe`. Leave it blank to use the display name.
2. For manual group changes, enable **All characters outfit selector** in **Controls** or **Scene tuning → Buttons**. It appears with at least two active characters and offers only names they all share.
3. On a background card, choose **Linked outfit name**, then enable **Backgrounds → Apply outfits linked to backgrounds**.
4. To automate using fewer commands, enable background commands and leave outfit commands off. One background command can apply the linked outfits without including an outfit catalog or making an additional model call.

The All selector and background-linked outfit changes start **off**. Automatic linked changes respect outfit locks and descriptions-only mode; manual All selections work like individual manual selections. Duplicate matches for the same character are skipped rather than guessed.

For missing or renamed backgrounds, open **Library → Tools → Review missing backgrounds**. **Discard missing entry** removes stale metadata and saved references; **Relink renamed background** transfers details to an available file. Neither deletes image files.

### Use gallery images

Use **Upload / manage image files** in the asset library to upload or assign images. A General gallery command looks like:

```text
::img general image-name::
```

Image names contain no spaces or colons. Add descriptions and bindings, then optionally enable **Automation → Enable image instructions and the available-image list**. Its placement selector controls whether the model puts images before, after or within the narration.

**Image prompts and loading limits are off by default on a fresh setup.** Migrated preferences retain their saved values. A round means one user message plus all following character replies. With a cooldown of three rounds, an image shown in round 1 can return in round 5.

See [Gallery documentation](docs/GALLERY.md) for more detail.

### Share scene descriptions without automation

In **Automation**, enable **scene context / automation**, choose **Prompt mode**, then check **Descriptions only — no automation commands**. Select current outfit and/or background descriptions to include, and inspect **Preview context & token count**. Matching group descriptions are included as scene reference too.

This mode does not offer or execute outfit/background commands, including background-linked outfit changes. It can describe locked characters. Turn off Gallery image instructions separately if you also want no image commands.

### Enable outfit and background automation

1. Add useful outfit and background descriptions in the asset library. Link shared backgrounds to **every active character**, or bind them to a named preset whose members are all present.
2. Open **Automation**, enable **scene context / automation**, leave **Descriptions only** unchecked and choose which changes are allowed. Background changes have their own switch.
3. Choose **All active, unlocked characters** or **Speaking character only** for outfit context.
4. Start with **Prompt mode** and inspect **Preview context & token count**. Injection depth defaults to 1; depth 0 is nearest the reply.
5. Generate a new reply. For API mode, configure a destination and use **Analyze & apply last reply** to test it; enable **Automatically analyze new replies** when ready.

Scene commands use exact IDs and folder names from the supplied catalog:

```text
::outfit "character-avatar.png" "Character/swimsuit"::
::background "estate-bath.png"::
```

Scene commands must be on separate lines. They can appear before, between paragraphs or after the roleplay, following the placement setting. Displayed command text is hidden by default, with command-only paragraphs and leftover line breaks collapsed to avoid gaps. The original message retains the commands, and native narration formatting is preserved.

Automatic API analysis runs once after a solo reply or a completed group round, once roleplay generation is idle. It uses the final assistant reply and your chosen recent-message window, not the entire chat by default. API keys for custom endpoints stay in page-session memory. Custom endpoints must be reachable from the browser and allow its origin.

Outfit locks and model background locks block automatic changes while leaving manual selection available. Loading a chat or choosing an existing swipe does not replay historical scene commands. A new generated swipe is a fresh reply and can trigger automation.

## Development

See [Development and validation](docs/DEVELOPMENT.md) for Node setup, local checks,
browser regressions, CI coverage, and the real SillyTavern release checklist.
Repository guidance for coding agents is in [AGENTS.md](AGENTS.md).

## Planned features

- **Clearer documentation:** improve the README and setup guides with shorter instructions and more images placed beside the features they explain.
- **Better settings and menus:** simplify navigation and make common controls easier to find and adjust, especially on mobile.
- **More animations and interaction:** expand visual transitions and interactive scene controls.
- **Token-friendly approaches:** build on 0.3.0’s first iteration of background-linked outfit changes, which can remove the need for separate outfit prompts in suitable workflows. Continue reducing unnecessary context and commands.
- **Wider testing and bug fixes:** as my own workflow becomes smoother and issues become rarer, broader testing will increasingly depend on more users trying different setups. Reports from other browsers, phones, models and group-chat workflows will help find issues I no longer encounter.

## Credits and origins

ImmersiveGroups is maintained by **[Lunarfyre-ST](https://github.com/Lunarfyre-ST)**. Project repository: **[Lunarfyre-ST/ImmersiveGroups](https://github.com/Lunarfyre-ST/ImmersiveGroups)**.

It is a modified project built on the work of:

- **[Bronya Rand — Prome-VN-Extension](https://github.com/Bronya-Rand/Prome-VN-Extension):** the foundation for the visual novel interface, sprite presentation and visual customization. The original UI also credits **Prometheus**.
- **[mechamarmot — SillyTavern-LocalImage](https://github.com/mechamarmot/SillyTavern-LocalImage):** the foundation for local image handling and gallery functionality.

Much of the underlying functionality comes from these original extensions. Credit for that work belongs to their authors and contributors; ImmersiveGroups adds the integration, modifications and new features described above. This project is independently maintained and is not an official release of either original extension.

Thanks also to the [SillyTavern](https://github.com/SillyTavern/SillyTavern) project and its contributors. Sprite ZIP imports use JSZip by Stuart Knightley and contributors. See [CREDITS.md](CREDITS.md) for additional attribution and dependency notices.

## License

ImmersiveGroups is distributed under the GNU Affero General Public License v3.0; see [LICENSE](LICENSE). Original copyright notices, attribution and applicable upstream license notices are retained with the corresponding source code. Upstream and dependency license files are included in [licenses/](licenses/).
