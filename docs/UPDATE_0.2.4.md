# ImmersiveGroups 0.2.4 — Clearer asset library

- Kept **Add outfit** and **Scan outfit folders** visible on the All/Outfits toolbar, with one scrolling gallery area.
- Added a dedicated outfit form with its own character selector, display name, folder path and optional sprite ZIP upload. Adding an outfit no longer requires changing the gallery's character filter first.
- Separated **Filters**, **Tools** and **Character appearance** into desktop side panels and mobile sheets. Filters show only options relevant to the selected asset type and report the active filter count.
- Preserved open scene descriptions; moved outfit ordering, font colors and catalog removal into each card's **More** menu.
- Improved button sizing across themes and mobile screens, with whole-button wrapping, keyboard focus handling and clearer empty states.

Copy the ZIP's ImmersiveGroups contents over the existing files and reload SillyTavern. For a clean install, place the ImmersiveGroups folder in SillyTavern's third-party extensions directory. The root README.md is excluded so an existing custom README is preserved.

Validation includes build/import checks, unit tests and browser regressions. Browser fixtures cover cleared extension settings, native VN mode disabled, no configured characters, mobile layouts, a narrow-button theme and adding an outfit with a ZIP. These checks simulate the host and uploads; a clean installation in SillyTavern remains the real-world integration check. Existing settings and chat messages are preserved.
