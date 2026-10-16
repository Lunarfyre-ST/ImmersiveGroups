# ImmersiveGroups 0.2.3

- Linked-background previous/next arrows now sit beside the Scene tuning button. The separate row, background filename and sequence counter are removed. The arrows still cycle only through backgrounds linked to every active character.
- The Scene tuning checkbox uses a proper text span and a shorter label: **Background arrows beside Scene tuning**. PC/mobile preferences are preserved.
- **Hide Basic outfits** is directly visible in the asset library. It identifies the character's root sprite folder, including renamed Basic entries, and remembers the preference. It hides library cards without changing outfit selector or model-context settings.
- **Outfit images → With images / Without images** checks the server's sprite lists. Unknown or failed checks are excluded from both filtered results; unavailable folders are not assumed to be empty. The library reports pending/failed checks. **Check outfit images** clears the session cache and retries. Uploading a sprite ZIP refreshes that outfit's result.
- **Scan outfit folders** is now on the library toolbar in All/Outfits, outside More filters & tools. Choose the local SillyTavern `characters` folder or one character's folder; matching folders containing image files are verified against the server and imported. The directory picker supplies arbitrary folder names because the native sprite API cannot enumerate subfolders. The scan does not upload files.
- Removed the per-outfit **Open folder** button and its path/import dialog. **Upload sprite ZIP** remains available.

Copy the ZIP's ImmersiveGroups contents over the existing files and reload SillyTavern. The root README.md is excluded. Existing settings, metadata and custom prompts are retained; no chats, user images or API credentials are included.

Validation: 46 unit tests, build/syntax/import checks and browser regressions covering compact navigation, checkbox labels, persistent Basic filtering, verified image/empty-folder filtering, failed requests, visible scanning, ZIP uploads, mobile layout and unchanged chat messages. API behavior remains covered by simulated transports.
