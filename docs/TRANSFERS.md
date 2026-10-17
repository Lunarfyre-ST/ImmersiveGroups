# Character and settings transfers

Open **Import / export** on the Library toolbar, or expand **Character & settings transfers** in ImmersiveGroups settings.

## Export

1. Choose **Current chat**, select characters individually, or choose **All extension settings**.
2. Give the bundle a name.
3. Select individual items under **Outfits, Character, Extra, Gallery and Settings**. Entries, descriptions, order, locks, colors and image files have separate toggles.
4. Sprite images are enabled by default. Choose any additional image-file options, or use the combined image-file shortcut. Under **Extra → Choose backgrounds**, uncheck any backgrounds to omit their files and metadata.
5. Select **Download named ZIP**.

Counts beneath each option describe the available data in the current scope. Descriptions use SillyTavern’s current tokenizer when available, otherwise an exact character count. Sprite counts inspect folder inventories without downloading images; unavailable folders are shown explicitly. Import counts describe the bundle contents; the application preview below also accounts for destination mappings.

Character cards are a separate option with a **PNG / JSON** format selector. PNG contains the portrait and character data. JSON contains character data and receives SillyTavern’s default portrait when creating a new character. Both may contain embedded lore/creator notes; neither contains chat histories. Selecting image files is independent of selecting character cards.

**Character scope** includes the selected characters' settings, their related backgrounds, named presets containing them, and their gallery assignments / bound general-gallery entries. A preset's other members are included as references for mapping; their full settings and cards are included only if you select those characters too.

**All-library scope** also includes unbound backgrounds, all named presets and all gallery assignments in the chosen categories. "All extension settings" selects the portable data categories and all known characters; sprite images start enabled, while background/gallery files and cards remain separate options.

## Import

1. Choose the bundle ZIP on the **Import** tab. The archive and its image checksums are verified before the review appears.
2. Choose which included individual items to apply. Only items available in the bundle are offered. You can exclude individual backgrounds here too.
3. Map source characters to installed characters. Exact avatar filenames are suggested first, then unique character names. Review these suggestions.
4. Set each destination sprite root if it differs from the displayed character name. `Character/winter` is remapped to `Destination/winter`.
5. For a new character, enable **Character card** and choose **Create a new character from included card**. Existing cards are never replaced. New cards use a separate sprite root based on their new avatar filename.
6. In **Choose outfits**, select the entries you want. Existing saved outfits or nonempty sprite folders trigger **Update mode** and start unchecked. New outfits start checked. Changing destination mappings rechecks their conflicts. Use **Recheck outfit conflicts** after external file changes.
7. If you check a conflicting outfit, read the warning and file list, then check **I understand what I am doing** before applying. This permits matching sprite files to be replaced; unrelated files stay. If this is your first import of the pack, investigate why its paths already exist and back up the affected files first.
8. Choose **Keep existing values** or **Use imported values** for matching metadata, then review the preview and apply. This metadata policy is separate from the acknowledgement for sprite replacements.

Characters can be left unmapped. Incomplete group presets and assets with unresolved bindings are skipped rather than becoming available to the wrong characters. Existing native SillyTavern group chats are not created or modified; **Groups** means ImmersiveGroups named binding presets.

## Independent choices

- **Descriptions only** updates matching outfit/image entries without replacing their names, files, colors or bindings. Missing matching entries are reported and skipped. Background scene descriptions can be copied without changing existing relationships.
- **Outfit height overrides** copies optional per-outfit heights independently of character height profiles. Blank means normal character height; older bundles without the field do not clear an existing override.
- **Library order** restores the order of matching outfits when using the imported-values policy. Other outfits remain present.
- **Outfit entries** includes names, shared outfit names and visibility. Descriptions, locks, library order and UI colors have their own choices.
- **Image files** can be included separately. Gallery files imported without assignments are stored in `ImmersiveGroups-Imports`; they do not create image commands automatically.
- **Relationships & load defaults** covers background character/group bindings, linked outfit names and default rules. Unchecked backgrounds do not overwrite those settings.
- Version 2 bundles record these independent choices. **Version 1 / 0.3.1 bundles are still supported** and their original grouped categories are offered as individual import choices.

## What is preserved

- Existing outfits are unchecked by default in Update mode. Checking one and acknowledging the warning permits replacement of matching sprite stems, including a different extension such as `neutral.jpg` → `neutral.png`. Missing files are uploaded under their original names; unrelated sprites remain. Case-only ambiguous conflicts are blocked. The result reports kept and replaced files. Programmatic imports without an acknowledged review keep existing sprites.
- Existing background files are kept when their names match. Background descriptions, bindings, favorites, shared outfit links and explicit load rules are portable.
- Included gallery images receive new unique filenames in `ImmersiveGroups-Imports`; their assignments are relinked to the uploaded files.
- Import merges selected entries; it does not remove unrelated outfits, presets, backgrounds or gallery assignments.
- Chat messages, chat files, current worn-outfit overrides and the current background are not changed by importing a bundle.
- Settings exports omit API credentials, custom API URLs, connection-profile references, old migration backups and per-chat background choices. These remain local. Custom prompt text and character/asset descriptions are included when their category is selected, so review them before sharing.
- Importing preferences restores scene automation, automatic API execution and gallery image instructions **off**. Re-enable them when ready. Reload afterward to refresh every settings field.

## Limits and recovery

Bundles are limited to **250 MiB compressed**, **500 MiB expanded**, **20 MiB per image/card**, **5 MiB for settings**, and **10,000 ZIP entries**. Split large collections into smaller bundles.

If a requested asset cannot be exported, the export reports the failure instead of claiming to create a complete portable bundle. Export without image files if you only need settings/path references, or repair the missing files first. Missing-background metadata can still be exported without its unavailable image.

If an import upload fails, extension settings are not committed. New cards/files already uploaded remain on the server; the error reports the completed counts. During an acknowledged update, existing sprite files may already have been replaced or removed by the native endpoint; affected attempted paths are reported. Restore from backup if needed, or inspect the files before retrying. Imports are not a multi-file transaction, and simultaneous imports from another device are not locked.

The existing **Upload sprite ZIP**, **Add outfit → Sprite ZIP**, and folder-name imports work as before. They use their original importer; character/settings bundles use this separate transfer window.

See [Bundle format and compatibility](TRANSFER_FORMAT.md) and the [0.3.4 import/export review](IMPORT_EXPORT_REVIEW_0.3.4.md) for the maintained data contract and known limits.
