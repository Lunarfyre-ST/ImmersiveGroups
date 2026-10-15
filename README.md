# ImmersiveGroups

A combined SillyTavern extension for character scenes, sprites, outfits and local image galleries.

Built on **[Prome Visual Novel Extension](https://github.com/Bronya-Rand/Prome-VN-Extension)** by **Bronya-Rand** (whose original UI also credits **Prometheus**) and **[SillyTavern-LocalImage](https://github.com/mechamarmot/SillyTavern-LocalImage)** by **mechamarmot**. This is a modified independent project. See [CREDITS.md](CREDITS.md) and [LICENSE](LICENSE).

## Install or migrate

1. **Disable the old standalone Prome and LocalImage extensions** in SillyTavern, including their separately named forks. Keep their saved settings. Do not enable both old copies alongside this combined extension.
2. Put this repository's contents in `SillyTavern/public/scripts/extensions/third-party/ImmersiveGroups/`. The file `manifest.json` must be directly inside `ImmersiveGroups`, not another nested folder.
3. Reload SillyTavern. Open **Extensions → ImmersiveGroups**.

When the new GitHub repository is ready, its URL can be installed using SillyTavern's extension installer instead of copying files manually. The repository should be named **ImmersiveGroups**.

One manifest starts both subsystems. No separate Gallery extension is required. The committed Gallery bundle is ready to use; **Node/npm is needed only for development**.

On first startup, existing preferences are copied into `extension_settings.ImmersiveGroups`; scene preferences stay at that root and Gallery preferences are under `gallery`. The old `Prome-VN-Extension` and `SillyTavern-LocalImage` settings are retained as unchanged backups. A repeat startup does not import those backups over newer combined settings. Existing image folders, names, outfit data, locks and scaling preferences remain available. Chat files are not part of the settings migration.

If an old standalone or another combined copy remains enabled, startup displays a conflict message and avoids starting duplicate handlers. Disable the conflicting copies and reload.

## Features

- **Characters & controls:** per-character Speak/outfit controls, automatic-change locks, names above selectors, independent placement above chat or below the textbox, colors, sizing and fading.
- **Outfits & colors:** outfit discovery and a manual library with labels, descriptions, order, visibility, per-character button colors and per-outfit text colors.
- **Sprites & dimming:** stable outfit swaps, spacing, centimeter-based heights and simple fine tuning, separate PC/mobile fit profiles, multiple mobile sprites, ranked dimming and silhouettes.
- **Chat layout:** Sheld sizing and Quick Reply row limits, including zero rows.
- **Backgrounds:** a compact icon opening favorite-background controls, plus a browser with character bindings and saved scene descriptions.
- **Gallery:** image libraries, descriptions, character/group bindings, exact-command prompt guidance and optional image loading limits.
- **Prome original:** original scene/tint/letterbox options grouped together.
- **Context Injection:** a roadmap for Prompt / API modes and all-character / active-character prompt scopes. These automation modes are not implemented yet.
- **About:** upstream credits, source documentation and licenses.

### Layout profiles and preview

**Use layout** selects **Automatic**, **PC (forced)** or **Mobile (forced)**. Automatic uses the existing **visible viewport height** threshold (default: 1000 px or less selects Mobile). A short PC window can therefore use Mobile. The force setting applies to ImmersiveGroups controls, scaling, spacing, Quick Reply limits and mobile group sprites; it does not change SillyTavern's own responsive interface.

**Edit profile** independently selects which saved PC/mobile preferences you change. Profile-specific fields have a PC/Mobile badge; unmarked preferences apply to both. Editing an inactive profile saves its values without changing the live scene. Force that layout to preview it. The status text shows the live profile and warns when you are editing the other one. Reset appearance affects only the edited profile.

Feature tabs wrap into rows and can be centered. Common controls stay visible, while detailed size/fading and dimming options use expandable sections. Background scene descriptions are available in the scene-context snapshot; the planned outfit/background automation does not inject them into prompts yet.

### Tune while viewing the chat

Use the **sliders icon beside the character controls** to open the small, non-modal Scene tuning panel. It contains Automatic/PC/Mobile layout, chat-window height, sprite spacing, fit calibration, centering and **Manage outfits**. Changes target the **live** profile even when the main settings editor is showing the other profile. Window height is shared. The background selector now occupies one image icon; its character filter and favorite list open only when needed.

Outfit choices use a custom popup with separate hover/focus outlines and a checkmark on the committed selection. Mouse clicks, touch taps and keyboard navigation select a stable folder entry; background discovery cannot replace the row under your pointer. Escape and outside clicks dismiss panels. Changing chats also closes them. Outfit swaps still preload the chosen image and update that character in place. Existing Quick Replies can still trigger SillyTavern's native reload behavior.

### Character heights

In **Sprites & dimming → Character heights**, enter a height in centimeters and use the one fine-tune slider below it to compensate for inconsistent sprite framing. Heights persist by character and are shared between PC and mobile; fine tuning is stored per layout. The tallest active member supplies the reference height. Use **Fit calibration** in the main settings or live panel to fit that sprite on screen, then adjust individual fine tuning as needed. With equal fine tuning, a 150 cm character is 75% of a 200 cm character's sprite height.

Old manual/relative/calibration fields are consolidated once. Their original values, including outfit calibrations, are retained in `heightProfilesV1Backup`. Conversion carries over existing visual adjustments for the current group and displayed outfits; calibration of other old outfits is retained in the backup rather than continuing as a hidden multiplier. Reset fine tuning to 100% to return a character to their centimeter-based ratio. This adjusts image frames, so transparent padding or different artwork framing may still need fine tuning.

Sprite overlap follows brightness first when speaking-order dimming is enabled, then current/recent distinct speakers, with silent members behind them. Native and mobile sprites use the same ranking; native layer updates cannot put a dimmed sprite over a brighter speaker.

### Gallery quick start

Upload or assign images through **Gallery → Open image library → Upload / manage files**. The General command is `::img general image-name::`. Image names contain no spaces or colons. Details & bindings stores scene descriptions and optional character avatar/group IDs. Bound characters automatically make images eligible in groups containing them; an option can require all bound characters.

**Model prompt and loading limits start off.** Enable them separately in the Gallery tab. The model receives actual commands and eligible scene descriptions; no additional API call is made. Quiet helper generations and impersonation omit Gallery instructions.

A round is one user message plus all following character replies. With a cooldown of 3, an image shown in round 1 may return in round 5. Suppressed commands become blank local spans without requesting an image; they do not restart the timer. Message/round caps can also be enabled. Limits are derived from history and the active swipe, so refreshing remains consistent. Image renames retain previous names as aliases.

See [docs/GALLERY.md](docs/GALLERY.md) for detailed behavior.

## Develop

```sh
npm ci
npm run build
npm run check
npm test
```

`npm run build` rebuilds `gallery/dist/gallery.js` from the included React source. Commit both the source and generated bundle/notices. The scene subsystem uses native ES modules. `style.css` imports the scene and Gallery stylesheets.

Optional integration check (uses simulated SillyTavern APIs and synthetic chat data):

```sh
npx playwright install chromium
npm run test:browser
```

The integration test loads the actual combined entry point and both subsystems. It covers migration, one settings window, fresh install, duplicate-copy blocking, rendering, sprite controls, prompt namespaces, independent profile editing/scaling, forced layouts, live checkboxes, tab wrapping, zero Quick Reply rows, background descriptions, click/touch/keyboard outfit selection, accurate control centering, live tuning and speaker layering. Height tests cover centimeter ratios and preference migration. It writes local screenshots under `tests/artifacts/`, which are ignored by git.

## New GitHub repository

See [docs/REPOSITORY_SETUP.md](docs/REPOSITORY_SETUP.md). Upload the files **inside** the `ImmersiveGroups` folder to the repository root. Keep the license, credits, source, package lock and committed bundle. Do not upload `node_modules`, test artifacts, chat data or `.git` through the website.

The manifest intentionally has no guessed repository URL, and automatic updates start disabled. Set your actual repository URL after creation. The original upstream projects are credited without presenting this repository as their official release.

## License and credits

The combined project is distributed under **GNU AGPL version 3**. Both upstream license files are preserved in `licenses/`; the original license texts are identical. React, ReactDOM and Scheduler notices/licenses are included separately. See [CREDITS.md](CREDITS.md). This software is provided without warranty.
