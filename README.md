# ImmersiveGroups
A light novel style expression extension for SillyTavern which focuses on compatibility with group chats, multiple outfits and mobile UI. Based on Bronya Rand's "Prome-VN-Extension" and mechamarmot's "SillyTavern-LocalImage" with planned LLM/automation for outfit/background changes as well as loading pre-made images from a gallery.

What began as a quick patch for multiple outfits in the PromeVN extension quickly became a larger overhaul, bringing group-chat improvements, outfit management, mobile layouts, and a local image gallery together in one extension for SillyTavern.
The goal is a more cohesive light novel experience: keep a group of characters on screen, change their outfits, set the scene, and eventually let optional automation handle outfits, backgrounds, and premade images from the gallery.

> [!WARNING]
> **Beta project with very little testing so far.** For now, it is recommended to back up your SillyTavern `data` folder before installing or updating. Use at your own risk. Features, settings, and migration behavior may change during development.

## Features

Built on Prome-VN's visual novel foundation, ImmersiveGroups adds the following fixes and controls, with a focus on group chats, multiple outfits, and mobile usability.

### Outfits and group chats

- **Multiple-outfit fixes:** resolves issues with outfit switching while Prome is active, including in group chats.
- **Group-chat message controls:** convenient controls for managing who speaks next.
- **Outfit selection:** change character outfits directly through the outfit selector.
- **Smooth outfit changes:** switching through the outfit selector avoids a full sprite reload. Outfit changes triggered through Quick Replies still cause reloads.

### Sprite customization

- **Character height scaling:** adjust individual characters' heights relative to one another.
- **Shadow opacity:** control how strong sprite shadows appear.
- **Adjustable sprite dimming:** tune how much inactive sprites are darkened.
- **Sprite spacing:** adjust the distance between characters.

### Mobile and interface controls

- **Multiple sprites on mobile:** display several characters together on smaller screens.
- **Mobile controls:** access group-chat and outfit controls from the mobile interface.
- **Adjustable Sheld size:** resize the message box to balance text and sprite visibility.
- **Limitable, scrollable Quick Reply rows:** cap the space used by Quick Replies and scroll through additional rows.

### Images and backgrounds

- An integrated gallery based on SillyTavern-LocalImage.
- Image sorting, descriptions, and aliases to make assets easier to organize and identify.
- Bind gallery images to multiple characters.
- Gallery prompt settings, cooldown controls, and suppression of blank image results.


## Preview

### PC view

*PC example image coming soon.*

<!-- Add your screenshot at docs/images/pc-view.png, then uncomment:
![ImmersiveGroups PC view](docs/images/pc-view.png)
-->

### Mobile view

*Mobile example image coming soon.*

<!-- Add your screenshot at docs/images/mobile-view.png, then uncomment:
![ImmersiveGroups mobile view](docs/images/mobile-view.png)
-->

  

## Planned features

These are development goals, not a list of working features. Scope and implementation may change.

- **Automatic outfit changes** based on the scene and character context.
- **Automatic background changes** using descriptions of available locations.
- **Context-aware gallery images** so the model can select suitable pre-made images during a conversation.
- **Scene descriptions and context injection** to explain when backgrounds, outfits, and gallery images should be used instead of relying on filenames alone.
- **Prompt Mode:** ask the main roleplay model to append automation commands to its reply. Intended to provide strong conversation context with fewer additional calls, but command reliability will depend on the model.
- **API Mode:** make a separate call dedicated to automation, with support planned for a local model or another API endpoint.
- Continued improvements to mobile usability, settings organization, and group-chat compatibility.

## Credits and origins

ImmersiveGroups is a modified project built on the work of:

- **[Bronya Rand — Prome-VN-Extension](https://github.com/Bronya-Rand/Prome-VN-Extension):** the foundation for the visual novel interface, sprite presentation, and visual customization.
- **[mechamarmot — SillyTavern-LocalImage](https://github.com/mechamarmot/SillyTavern-LocalImage):** the foundation for local image handling and gallery functionality.

Much of the underlying functionality comes from these original extensions. Credit for that work belongs to their authors and contributors; ImmersiveGroups adds the integration, modifications, and new features described above. This project is independently maintained and is not an official release of either original extension.

Thanks also to the [SillyTavern](https://github.com/SillyTavern/SillyTavern) project and its contributors.

## License

ImmersiveGroups is distributed under the GNU Affero General Public License v3.0; see [LICENSE](LICENSE). Original copyright notices, attribution, and applicable upstream license notices are retained with the corresponding source code.

