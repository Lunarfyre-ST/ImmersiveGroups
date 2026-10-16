# CodeQL repair for ImmersiveGroups 0.2.8

The CodeQL scan of commit `75238c41dd0c7063fd69de03e8eaa8e1a7264ea4` reported 15 JavaScript parse failures. The repository contained unresolved merge-conflict blocks in 26 files, including package metadata, styles, HTML and the generated Gallery bundle. The conflicts included an older 0.2.5 version and the current 0.2.8 version.

The files affected by the merge conflicts are restored from the verified 0.2.8 release archive, with the additional command-recognition fixes described below. Unaffected repository files and the README are excluded. The validation script now rejects merge markers in source, generated assets and metadata, validates JSON and checks browser-test syntax. The included CI workflow runs validation before building.

Copy the contents of the ZIP's `ImmersiveGroups` folder into your local repository, replacing matching files. Commit and push the repaired files in GitHub Desktop, then review the new CodeQL scan. This repair does not exclude affected source files from scanning or change user data.

## HTML command-recognition repairs

The HTML-removal expression in `gallery/src/gallery-model.js` matched the patterns described by CodeQL's `js/bad-tag-filter` and `js/incomplete-multi-character-sanitization` rules. It is replaced by `image-command-text.js`, using the parse5 HTML parser. Excluded HTML regions, attributes and comments are not scanned for commands. Nonstandard closing tags and nested or unclosed examples follow the parser's HTML handling.

Excluded Markdown examples become barriers rather than deleted text, preventing the surrounding fragments from joining into a new command. The parser reads original source slices, so entity decoding does not invent commands. Parsing creates only a data tree; it does not inject HTML, execute scripts or load image/iframe resources. Cached recognition results follow message edits without changing chat data.

The rebuilt Gallery bundle contains parse5 and its entities decoder. Both licenses, dependency declarations and the updated lockfile are included. No npm installation is needed to use the repaired extension.

Validation: local build/import checks, all 64 unit tests, deliberate conflict/syntax fixtures that must fail validation, and browser regressions for malformed HTML, fragment joining, inert parsing, image limits and formatting. GitHub's plugin does not expose the linked security-alert pages; the fix addresses the matching source patterns, and a new hosted CodeQL scan is required after pushing to confirm alert closure.

## Restored files

- `CREDITS.md`
- `gallery/dist/gallery.js`
- `gallery/src/UnifiedLibrary.js`
- `gallery/src/library-model.js`
- `html/settings.html`
- `index.js`
- `manifest.json`
- `modules/live-tuning.js`
- `modules/outfit-catalog.js`
- `modules/outfit-editor.js`
- `modules/outfit-files-model.js`
- `modules/outfit-files.js`
- `modules/scene-automation.js`
- `modules/scene-library.js`
- `modules/settings-shell.js`
- `modules/stage-controls.js`
- `package-lock.json`
- `package.json`
- `styles/library.css`
- `styles/scene.css`
- `styles/settings-accents.css`
- `tests/browser/combined.cjs`
- `tests/browser/v015.cjs`
- `tests/browser/v024.cjs`
- `tests/library.test.mjs`
- `tests/outfit-files.test.mjs`
