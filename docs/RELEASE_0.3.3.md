## 0.3.3 — Transfer previews and UI polish

- Fixed unreadable bundle-name and character-search fields by applying matching theme text and background colors.
- Enabled **sprite images by default** in character exports, while keeping character cards, background files and gallery files separate options.
- Added counts beneath import/export options for outfits, sprites, backgrounds, gallery entries and other metadata. Description previews use SillyTavern’s tokenizer when available, with character counts as the fallback.
- Fixed a dialog race where quickly closing and reopening import/export could remove the newly opened window.
- Made scope previews update with character choices and background exclusions, with cached inventory requests and protection against outdated results.
- Changed the **Backgrounds / Send image** tabs to gray, with a light orange highlight for the selected tab.
- Added inner spacing to the **Scene tuning** header so its title no longer sits against the edge.

Existing sprite ZIP imports are unchanged. README.md is excluded from extension packages.
