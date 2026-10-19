# Character/settings bundle format

This is the compatibility contract for ImmersiveGroups transfers. The bundle format version is independent of the extension release version. **0.3.7 continues writing version 2 and reading versions 1 and 2.** Animation durations remain milliseconds in stored/exported settings, even though controls display seconds.

## Container and identity

- A UTF-8 ZIP contains `manifest.json`, optional `ABOUT.txt`, and exactly the files declared under `assets/`. No filesystem extraction is performed.
- Supported compression is STORE or DEFLATE. Split/encrypted/ZIP64 archives, duplicate entry names, conflicting local/directory names and unlisted files are rejected.
- Limits: 250 MiB compressed, 500 MiB expanded, 10,000 entries, 5 MiB for the manifest or a JSON card, and 20 MiB per image/PNG card.
- `format` is `ImmersiveGroups.character-bundle`. `version` identifies the schema; `extensionVersion` identifies its producer. `name` and `createdAt` are informational, not authorization or update identities.
- Character references use source avatar filenames. Import maps these explicitly to destination cards. Display names alone are not unique identifiers.
- An outfit is identified within a bundle by `[source avatar, source folder]`. Its label/shared name can change independently. A changed folder is a new source identity unless the user supplies an explicit destination override.
- Paths are relative and validated. Sprite folders have at most two components, matching SillyTavern’s API. Archive paths are never used as destination filesystem paths.

## Manifest sections

| Field | Purpose |
| --- | --- |
| `pack` | Optional `{id, version}` author-supplied revision context. Identity is a 1–100 character ASCII identifier; version is up to 80 characters, with 1–4 numeric components and an optional prerelease suffix (for example `1.2.0-beta.1`). No publisher authentication or overwrite permission. |
| `options` | Coarse availability flags retained for version 1 compatibility. |
| `selection` | Version 2’s explicit individual booleans and `cardFormat` (`png` or `json`). Missing newer toggles default off when reading older version 2 bundles. |
| `characters` | Selected character metadata: outfit entries, optional outfit colors, desktop/mobile height profiles and character UI colors. |
| `references` | Selected characters plus related group/binding members that require destination mapping. References do not silently export another character’s full card/settings. |
| `groups` | Named ImmersiveGroups binding presets, independent of native SillyTavern group chats. |
| `backgrounds`, `backgroundRules`, `backgroundGlobalDefault` | Background metadata and explicitly exported default rules. |
| `gallery` | Image assignments, descriptions and relationships, scoped by export selection. |
| `settings` | Allowlisted portable preferences. Connections, credentials, chats and current per-chat state are excluded. |
| `assets` | Declared media/card files with kind, source identity, archive path, filename, size and SHA-256. |
| `requiredFeatures` | Optional capability list. 0.3.4 rejects unknown mandatory capabilities before writes; its exports currently use an empty list. |

Outfit entries may contain `heightOverrideCm`: a number from 30 to 300, or `null` to inherit the character height. `outfitHeights` is an independent version 2 selection flag. Older bundles without this property do not clear existing overrides. Older extension readers may ignore this optional field and use normal character heights.

Assets must match their declared owner, outfit or assignment. Duplicate logical destinations are rejected, including sprite filename stems that collide across case or extensions. Checksums cover file bytes, not the authenticity of the bundle’s author.

## Compatibility policy

1. Keep readers for versions 1 and 2 separate from future writers. Version 1’s grouped choices are adapted to individual controls without rewriting the source bundle.
2. Add optional metadata with explicit inheritance/absence semantics. Do not reinterpret an existing flag or identifier.
3. Required changes must use an understood `requiredFeatures` capability or a new schema version. Unknown schema versions and required capabilities fail before importing.
4. Unknown optional fields may be ignored. A reader is not a lossless editor for fields it does not understand; do not promise a newer bundle can be imported and re-exported through an older extension without losing new metadata.
5. File selection, outfit exclusions, conflict acknowledgements and destination reviews are local import decisions. They are not trusted from the archive and are not carried into another user’s acknowledgement state.
6. Add compatibility fixtures/tests before retiring or changing a reader. Never infer schema semantics from `extensionVersion` alone.

## Import/update contract

Existing outfits/folders trigger Update mode and start unchecked in the UI. Checking one requires the warning acknowledgement. Selected outfits are reviewed against the current mapping, destination roots, metadata and inventory revisions; changes invalidate approval. Colliding sprite bytes are compared by SHA-256 and size during review and before acknowledged replacement, so unchanged native timestamps do not imply unchanged contents. Upload-time sprite checks reject newly appeared or case-ambiguous collisions.

Acknowledged updates may replace matching sprite stems, including an old extension such as `neutral.jpg` being replaced by `neutral.png`. Exact filenames with identical bytes are kept without uploading again; identical bytes under another filename still require replacement. Unrelated sprites remain. Cards are created as new copies; existing cards/backgrounds are not overwritten. Gallery uploads use unique filenames.

The programmatic importer retains its older safe behavior when no update approval is supplied: existing sprite files are kept. Replacements require a review object issued in the current page session and explicit acknowledgement. A file cannot grant this permission itself.

SillyTavern’s native endpoints do not provide a multi-file transaction or cross-browser lock. A sprite upload deletes matching stems before writing the replacement. Preflight and per-file checks reduce accidental conflicts, but cannot make writes atomic against another device editing the same files. Failed uploads leave completed uploads/new cards on disk; attempted replacement paths are reported. Extension metadata commits only after requested uploads succeed. Avoid simultaneous imports and keep a backup before updates.

Descriptions, lore and custom prompt text can influence model context. Review a community pack’s selected categories and content before enabling its automation. Imported automation switches remain off.

## Pack revision context

Pack identity is remembered locally after successful UI exports under the same bundle name; changing names or installations may create a new identity. Revisions compare numeric components (missing trailing components count as zero), then prerelease identifiers; releases sort after prereleases. This is a constrained pack-version format, not the extension version or a general SemVer implementation.

Successful imports may retain local per-destination outfit receipts containing source avatar/folder, pack identity/version, selection and metadata policy. A receipt describes the last processed selection, including kept values/files, rather than a fully installed revision. Unversioned bundles remain readable. Receipts and export drafts are local and excluded from portable settings; they never carry acknowledgements. Old readers may ignore the optional `pack` field.
