# Import/export review — 0.3.4

The review retained the version 2 container and data model. No schema redesign was needed for this release. Version 1 / 0.3.1 bundles remain supported, and the separate sprite ZIP importer is unchanged.

## Changes made

- Added per-outfit import exclusions across entries, descriptions, ordering, height overrides, outfit colors and sprite files. Character-wide choices remain separate.
- Added inventory and saved-entry conflict detection, Update mode, default exclusion of existing outfits, the explicit warning and acknowledgement, and per-file replacement checks.
- Bound review approval to the bundle, selection flags, mappings and destination roots. Inventory revision or relevant metadata changes require another review. Unmapped or failed checks are not treated as empty folders.
- Added case-insensitive logical-destination checks and rejected duplicate sprite stems, duplicate cards/background assets and duplicate gallery sources. Case-only sprite replacements are blocked rather than guessed.
- Audited the ZIP directory before JSZip can collapse duplicate names; checked local/directory name agreement and decoding consistency. Existing size, path, allowlist, checksum and image/card validation remain in place.
- Removed embedded Risu sprite payloads from both modern and legacy JSON character-card shapes before native import, preserving the card’s other metadata.
- Added optional outfit heights with independent selection and absence semantics that preserve existing overrides when importing older bundles.
- Added required-capability rejection for future formats and documented source identities, selection defaults, supported readers and upgrade rules in [TRANSFER_FORMAT.md](TRANSFER_FORMAT.md).
- Corrected failure reporting for interrupted replacements. It reports attempted existing paths and no longer claims those files were preserved after an overwrite attempt.
- Made inventory and export image reads bypass the browser cache.

Validation passed 124 unit tests, the combined browser regression suite and a focused repeat-import/update run. Compatibility checks also generated real bundles with the 0.3.1 and 0.3.3 release code and verified them through the 0.3.4 reader, including checksums, remapping and height profiles.

## Preserved behavior

Existing character cards and background files are kept. New gallery uploads receive unique names. Groups require complete mapped relationships; unknown or ambiguous bindings are skipped. Import merges selected metadata without deleting unrelated entries, and does not write chat files or change current outfit/background choices. API credentials, URLs, profiles and transient chat choices remain local. Imported automation stays off.

## Remaining limits and manual validation

The native sprite behavior was checked against [SillyTavern 1.18.0’s endpoint implementation](https://github.com/SillyTavern/SillyTavern/blob/1.18.0/src/endpoints/sprites.js).

There is no cross-device lock, multi-file transaction, automatic disk rollback or author signature. Native upload failure can leave partial file changes; backups remain necessary for updates. Server inventory errors that SillyTavern reports as an empty successful list cannot always be distinguished from empty folders by a browser extension. Inventory checks also cannot detect every same-path external write within a native timestamp’s resolution.

Use the planned Overlord pack tests to check fresh install → export → import, repeat imports, deliberate filename/folder conflicts, renamed destination characters, PNG/JSON card creation, partial outfit selection, updates with changed extensions and interrupted uploads. Browser fixtures exercise these mechanics with simulated native endpoints; they do not replace testing on the actual server, filesystem and Firefox/phone setups.

## Release maintenance

Run `node scripts/set-version.mjs 0.3.4` (with the new release number), then build and check. The version module drives runtime APIs and the transfer producer version; the script also updates manifest/package metadata and About/footer fallback labels. `scripts/check.mjs` rejects mismatches. Update release notes and the README’s current-version line separately when preparing those documents.
