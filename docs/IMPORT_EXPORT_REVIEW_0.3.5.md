# Import/export review — 0.3.5

The framework remains a sensible base for incremental compatibility work. Schema 2 already separates selection, source identity, references and media declarations. Optional pack metadata fits that contract without a schema redesign. Future mandatory behaviors must still use an understood capability or a new schema; an extension release number must never silently change schema meaning.

## Reviewed boundaries

- Capture and validation remain pure; export outfit exclusions filter per-outfit metadata before sprite reads. Character-wide colors/heights/locks and background relationships retain independent controls.
- ZIP limits, path validation, declared media checksums, image/card validation, duplicate detection, portable preference allowlists, schema 1/2 readers and unknown-required-feature rejection remain covered by regressions.
- Pack identity/version are advisory author-supplied metadata. They neither authenticate a publisher nor authorize replacements. Same source avatar/folder and pack identity are required for revision comparisons.
- Local receipts record the last successfully **processed selection and metadata policy**, even if some values/files were kept. They do not assert the whole pack or outfit matches that revision. Export drafts and import receipts remain local and are excluded from portable preferences.
- Each outfit reports existing metadata/folders and matching sprite files. Metadata differences describe selected outfit fields; file comparisons show filenames, byte counts and SHA-256. These are content comparisons, not a visual image diff or a complete diff of all transfer categories.
- Review proofs bind mappings, selection, destination, saved outfit metadata, relevant colors/order/locks, origin receipts and inventory/content fingerprints. Metadata is snapshotted before async reads. Changes invalidate acknowledgement rather than silently broadening it.
- Conflict content reads are limited to three active downloads, with 20 MiB per image and a 500 MiB review budget; queued reads stop once the budget is exceeded. Incoming ZIP checks remain separate. Unreadable files do not become empty destinations.
- Exact filename plus identical bytes avoids another sprite upload. Extension/name changes still need replacement. Per-file content/inventory checks run again before acknowledged replacements.
- Metadata commits after media succeeds. Partial-write errors, new-card isolation, unique gallery filenames, kept native backgrounds, imported automation-off defaults, and unchanged chat/current scene state remain covered.

## Automated validation

Windows, Node 24.19.0, locked dependencies, Playwright 1.62.1:

- Lint and syntax/import/release metadata checks.
- 138 unit tests, including pack version ordering/validation, exclusions, local receipt boundaries, changed-byte detection with unchanged timestamps, unreadable files, async metadata snapshots and comparison budget/concurrency.
- Full Chromium 151.0.7922.34 and Firefox 153.0 browser suites, including new count-dropdown selection, ZIP contents, stable export pack identity, per-outfit notices/comparisons, acknowledgement, identical-file skipping and stale-proof rejection.
- Native smoke tests in both browsers against disposable SillyTavern 1.18.0 (`51ad27fb86d39a3daca3adaa970375c9670c12df`): real uploads/replacements, repeated/identical imports, unrelated sprite preservation, PNG/JSON cards, remapping and unchanged chat/current outfit/background state. External model-provider discovery is stubbed; no inference calls are made.

Ignored artifacts are under `tests/artifacts/`, including native per-browser reports and the new mobile transfer-review screenshot. These are automated tests and visual artifact inspection, not a completed manual test of the user's actual pack. Hosted CI will validate the eventual pushed revision separately.

An additional interactive UI smoke check used the in-app browser against the same disposable server: created a synthetic winter outfit through the library, expanded the export count, excluded Basic, downloaded a versioned ZIP, reopened it through the file chooser, confirmed default exclusion/per-outfit conflict notice, expanded the identical-file comparison, checked the acknowledgement and applied. The native result reported zero uploads/replacements and one byte-identical file kept; the refreshed review showed the same processed revision. Screenshot: `tests/artifacts/v035-native-ui-review.png`. This small synthetic UI check does not replace the real-pack checklist below.

## Remaining practical limits

Native uploads provide no multi-file transaction, automatic rollback, atomic conditional write or cross-device lock. Content checks reduce stale replacements but cannot eliminate a write occurring between the final check and upload. A native inventory endpoint that returns an erroneous empty successful list is still indistinguishable from an empty folder. Backups and avoiding concurrent edits remain necessary.

Only colliding sprite contents are compared. Backgrounds remain filename-based keep-only imports; gallery copies receive unique names; existing cards are not replaced. Large packs still need real filesystem/browser stress testing. No minimum SillyTavern version beyond the tested version is asserted. An older reader may discard optional pack metadata on a later re-export.

## Pending manual 0.3.5 pass

Use a separate clean installation/data profile and a copy of the intended pack. Keep the original pack, installation backup and results outside disposable test outputs. Record server/browser versions, pack size, character/outfit/file counts and failures.

1. Export a small multi-character pack as revision `1.0.0`. Toggle outfits in the count dropdown; inspect the ZIP and confirm excluded outfit metadata/files are absent. Include representative linked backgrounds, groups, gallery entries and PNG/JSON cards in separate trials.
2. Import into the clean profile. Confirm mappings and all relationships, outfits, heights, descriptions and images. Check desktop and phone layouts. Keep chat/current scene choices unchanged.
3. Repeat the import. Existing outfits should start unchecked. Select one, review differences and acknowledge; identical sprites should be reported as kept with zero replacements.
4. Change one sprite and description; export revision `1.1.0` under the same bundle name. Confirm the same pack identity, newer-version context, accurate differences and replacement of only checked outfits. Try the older revision afterward; it must remain explicitly reviewed and visibly older.
5. Introduce unrelated destination files, a different-extension collision, a case-only collision and duplicate destination overrides. Confirm unrelated files remain and unsafe ambiguity blocks the import. A first-import conflict must be investigated rather than treated as a pack update automatically.
6. Test descriptions/heights/colors-only selections, excluded outfits, renamed destination characters, custom roots and folder overrides. Check that unrelated metadata and character-wide choices retain their documented boundaries.
7. On this disposable profile only, interrupt an upload and retry. Inspect the reported partial writes and confirm settings did not commit on failure. Change a destination after review and require a recheck.
8. Try the full intended collection, then split bundles near practical limits. Record timings, memory/UI responsiveness and unavailable-file behavior. Confirm automation stays off and credentials/chat state stay local.

Treat failures found here as focused 0.3.5 fixes or tracked 0.3.6 work before broader recruitment. Expand testing to a small opt-in group once this checklist passes; collect reproducible fixtures with permission rather than real chats or credentials.
