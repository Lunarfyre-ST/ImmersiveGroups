# ImmersiveGroups

A light novel style expression extension for SillyTavern, focused on group chats, multiple outfits and mobile usability. Based on Bronya Rand's **Prome-VN-Extension** and mechamarmot's **SillyTavern-LocalImage**, with an integrated image gallery and planned LLM automation for outfit and background changes.

What began as a quick patch for issues with multiple outfits in the PromeVN extension quickly became a larger overhaul, bringing group-chat improvements, outfit management, mobile layouts, and a local image gallery together in one extension for SillyTavern.

The goal is a more cohesive light novel experience: keep a group of characters on screen, change their outfits, set the scene, and eventually let optional automation handle outfits, backgrounds, and premade images from the gallery.

> [!WARNING]
> **Beta project with very little real-world testing so far.** Back up your SillyTavern `data` folder before installing or updating. Use at your own risk. Features, settings, and migration behavior may change during development. Automated checks do not replace testing across actual SillyTavern setups, browsers and phones.

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

### Migrating existing settings

On first startup, settings from `Prome-VN-Extension` and `SillyTavern-LocalImage` are copied into ImmersiveGroups. The original settings are retained as backups, and subsequent startups do not overwrite your newer ImmersiveGroups preferences with them. Existing image assignments, outfit data and supported preferences are carried over.

If an old extension copy remains enabled, a conflict message blocks startup to prevent duplicate handlers. Disable the conflicting copy and reload. Chat files are not part of the settings migration.

## Features

Built on Prome-VN's visual novel foundation, ImmersiveGroups adds the following fixes and controls, with a focus on group chats, multiple outfits, and mobile usability.

### Outfits and group chats

- **Multiple-outfit fixes:** addresses outfit handling issues while Prome's visual novel interface is active, including in group chats.
- **Group-chat message controls:** per-character Speak buttons let you request the next reply from a particular character. These can submit your current draft text when triggering a reply.
- **Outfit selection:** change clothes directly through each character's outfit selector, with separate hover/focus outlines and a checkmark on the selected outfit.
- **Smooth outfit changes:** switching through the outfit selector preloads the new image and updates that character in place. Existing Quick Reply outfit changes can still trigger native sprite reloads.
- **Outfit library:** discover common folders, remember outfits used through Quick Replies, or add folders manually. Rename, hide, reorder and describe outfits without changing their files on disk.
- **Character styling:** customize character button backgrounds, Speak button colors and text colors, plus per-outfit text colors.
- **Automation locks:** save a per-character lock for future automatic outfit changes; manual outfit selection remains available.

### Sprite customization

- **Character heights in centimeters:** scale characters relative to the tallest active member, with one fine-tune slider per character to compensate for inconsistent sprite framing.
- **Fit calibration:** adjust the overall sprite scale until the tallest character fits comfortably on screen.
- **Persistent profiles:** character heights are remembered across chats and groups. Heights are shared between PC and mobile; fine tuning and fit calibration are saved separately for each layout.
- **Shadow opacity:** control how strong sprite shadows appear.
- **Speaking-order dimming:** configure darkness for the current, previous and older speakers, including completely black silhouettes.
- **Sprite overlap:** prioritize brighter characters, then recent speakers, so dimmed sprites stay behind highlighted ones.
- **Sprite spacing:** bring characters closer together or spread them out while keeping stable positions during selector-based outfit changes.

### Mobile and interface controls

- **Multiple sprites on mobile:** display several active group members together on smaller screens.
- **Separate PC/mobile profiles:** independently tune control sizes, placement, sprite spacing and visual scaling.
- **Automatic or forced layout:** switch between Automatic, PC and Mobile to use or preview either layout.
- **Live scene tuning:** open a small panel beside the character controls to adjust layout, Sheld height, sprite spacing, fit calibration and centering while viewing the chat.
- **Adjustable Sheld size:** resize the message box to balance text and sprite visibility.
- **Limitable, scrollable Quick Reply rows:** cap the space used by inline Quick Replies and scroll through additional rows. Set rows to zero to hide the inline bar; the Quick Reply popup remains available.
- **Flexible character controls:** show or hide buttons, place controls above chat or below the textbox, put names above selectors, center controls, and adjust sizes and idle opacity.
- **Organized settings:** wrapping feature tabs, with the original Prome settings available in their own tab.

### Images and backgrounds

- **Integrated gallery:** local image handling based on SillyTavern-LocalImage, including a shared General gallery.
- **Image organization:** sorting, scene descriptions and aliases, with bindings to one or more characters that also apply in groups containing those characters.
- **Optional image prompt:** give the roleplay model exact commands and descriptions for the images currently available in the chat. This feature already works without a separate API call; command reliability still depends on the model.
- **Optional loading limits:** image cooldowns and per-message/per-round caps. Suppressed commands display as blank instead of leaving command text in the message.
- **Image sizing:** an adjustable maximum image height, with images fitting the message width and retaining their proportions.
- **Background library:** browse backgrounds, star favorites, bind them to characters and save scene descriptions. Favorite-background controls open from a compact image icon.

## Quick start

### Tune while viewing the chat

Click the **sliders icon beside the character controls** to open **Scene tuning**. It includes layout mode, Sheld height, sprite spacing, fit calibration, centering and a **Manage outfits** button. These controls adjust the **live profile**, even if the main settings editor is showing the other profile. Sheld height applies to both layouts.

In the main settings, **Use layout** selects the live layout; **Edit profile** selects which saved profile you are editing. Profile-specific fields have a PC/Mobile badge. Unmarked settings apply to both.

**Automatic currently uses visible window height**, with Mobile selected at **1000 px or less** by default. A short PC window can therefore use the Mobile profile. The threshold is adjustable in Chat layout. Forcing a layout changes ImmersiveGroups behavior, not SillyTavern's entire responsive interface.

### Set character heights

In **Sprites & dimming → Character heights**, enter each character's height in centimeters. Adjust **Fit calibration** until the tallest active character fits, then use individual **Fine tune** sliders as needed. With equal fine tuning, a 150 cm character uses 75% of a 200 cm character's sprite height. Different transparent padding or artwork framing may still need adjustment.

Earlier height options are consolidated into the simpler controls, with the original values kept in a migration backup. Reset a character's fine tuning to 100% to use their centimeter-based ratio without the previous visual adjustments.

### Use gallery images

Open **Gallery → Open image library** to upload or assign images. A General gallery command looks like:

```text
::img general image-name::
```

Image names contain no spaces or colons. Add descriptions and character bindings in the library, then optionally enable the image prompt in Gallery settings.

**Image prompts and loading limits are off by default on a fresh setup.** Migrated preferences retain their saved values. A round means one user message plus all following character replies. With a cooldown of three rounds, an image shown in round 1 can return in round 5.

See [Gallery documentation](docs/GALLERY.md) for more detail.

## Planned features

These are development goals, not a list of working features. Scope and implementation may change. The **Context Injection** settings tab currently contains a roadmap for these automation modes.

- **Automatic outfit changes** based on the scene and character context.
- **Automatic background changes** using descriptions of available locations.
- **Unified scene context:** use outfit, background and image descriptions together instead of relying on filenames alone. Descriptions can already be saved; outfit/background prompt injection and automation remain planned. Gallery has its own working optional image prompt.
- **Prompt Mode:** ask the main roleplay model to append automation commands to its reply. Intended to offer strong conversation context and avoid a separate automation call, with the highest risk of incorrect or malformed commands.
- **API Mode:** make a separate call dedicated to automation, using the main API, another connection profile, or a local/OpenAI-compatible server.
- Continued improvements to mobile usability, settings organization, and group-chat compatibility.

Planned prompt scopes include **all active characters**, supporting multiple outfit changes and potentially better cache reuse, or **only the active character**, reducing prompt size and potentially reducing character confusion. Speed, cost, caching and reliability will depend on the model, provider and implementation.

## Development

<details>
<summary>Build and validation commands</summary>

Node/npm is only required for development. The repository includes the ready-to-use Gallery bundle.

```sh
npm ci
npm run build
npm run check
npm test
```

When editing Gallery source, rebuild and commit the generated bundle and dependency notices as well.

Optional browser integration checks:

```sh
npx playwright install chromium
npm run test:browser
```

The automated checks cover settings migration, height calculations, gallery rules and simulated browser interactions. Browser checks use synthetic chat data and simulated SillyTavern APIs; real-device compatibility still needs testing.

</details>

## Credits and origins

ImmersiveGroups is a modified project built on the work of:

- **[Bronya Rand — Prome-VN-Extension](https://github.com/Bronya-Rand/Prome-VN-Extension):** the foundation for the visual novel interface, sprite presentation, and visual customization. The original UI also credits **Prometheus**.
- **[mechamarmot — SillyTavern-LocalImage](https://github.com/mechamarmot/SillyTavern-LocalImage):** the foundation for local image handling and gallery functionality.

Much of the underlying functionality comes from these original extensions. Credit for that work belongs to their authors and contributors; ImmersiveGroups adds the integration, modifications, and new features described above. This project is independently maintained and is not an official release of either original extension.

Thanks also to the [SillyTavern](https://github.com/SillyTavern/SillyTavern) project and its contributors. See [CREDITS.md](CREDITS.md) for additional attribution and dependency notices.

## License

ImmersiveGroups is distributed under the GNU Affero General Public License v3.0; see [LICENSE](LICENSE). Original copyright notices, attribution, and applicable upstream license notices are retained with the corresponding source code. Upstream and dependency license files are included in [licenses/](licenses/).
