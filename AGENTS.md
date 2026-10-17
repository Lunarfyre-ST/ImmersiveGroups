# ImmersiveGroups project guidance

## Purpose and scope

ImmersiveGroups is an AGPL-3.0-only SillyTavern extension combining
Prome-derived visual-novel scene controls and LocalImage-derived galleries.
It supports multiple outfits, linked backgrounds, optional automation,
mobile layouts, and character/settings transfers.

Preserve existing functionality and saved data. Make focused changes; avoid
unrelated refactoring, mass formatting, dependency upgrades, or default changes.
When the user requests one step at a time, complete one independently reviewable
step and stop. Do not start the next step automatically.

## Architecture

- `index.js`: bootstrap, legacy-extension conflicts, migration, runtime status.
- `prome.js`, `listeners.js`, `constants.js`, `utils.js`: scene initialization,
  native integration, defaults, and shared helpers.
- `modules/stage-controls.js`, `outfit-*`, `common-outfits-model.js`: character
  controls, outfit catalogs, ownership, sprite selection, and uploads.
- `modules/height-*`, `scale.js`, `responsive.js`, `mobile-sprites.js`,
  `scene-animations.js`: heights, layout profiles, and cancellable transitions.
- `modules/scene-backgrounds.js`, `background-*`, `binding-groups-model.js`:
  backgrounds, defaults, eligibility, and linked outfit changes.
- `modules/scene-library.js`: bridge from scene services to gallery UI.
- `modules/scene-automation*.js`, `scene-api.js`, `scene-command-view.js`:
  prompts, command validation, generation lifecycle, and API analysis.
- `modules/character-transfer-*`, `transfer-*`: bundle models, archives,
  conflict review, import/export, and controls.
- `gallery/src/`: React gallery/library source and pure models.
- `gallery/dist/`: committed generated bundle and legal notices.
- `html/`, `styles/`, `style.css`: templates and presentation.

Scene settings use `extension_settings.ImmersiveGroups`; gallery settings use
its `.gallery` property. Scene modules import native SillyTavern modules through
relative paths. Gallery integration also uses `SillyTavern.getContext()`, window
APIs, and custom `ig-*` events. Only the gallery is bundled; installation does
not require end users to run npm.

## Compatibility requirements

- Preserve stored chat data, native formatting, swipe/edit behavior, and handlers.
  Rendering must not rewrite chat files or stored messages.
- Keep migrations idempotent and retain legacy settings backups.
- Keep automation opt-in and imported automation disabled.
- Preserve locks, bindings, outfit ownership, and explicit sharing rules.
- Preserve async cancellation and stale-result checks after awaits, including
  chat/group, message/swipe, character, settings, request, and DOM identity.
- Keep desktop/mobile layout and height preferences independent.
- Retain window APIs, events, DOM IDs, and native jQuery data contracts unless
  the task requires changing them.
- Check native SillyTavern behavior before changing internal imports, sprite
  uploads, expression overrides, or background selection. Record versions
  actually tested rather than assuming minimum-version compatibility.

## Transfer contract

Read `docs/TRANSFER_FORMAT.md` before changing transfers. The current writer
emits schema 2; readers support schemas 1 and 2. Schema versions are independent
of extension releases.

Preserve explicit mapping, selection boundaries, absent-field semantics,
path/size/checksum validation, duplicate detection, and allowlists. Credentials,
connection settings, and transient chat state must remain local.

Replacement requires current-session review and explicit acknowledgement.
Changes to reviewed mappings, selections, metadata, or inventory invalidate
approval. Commit extension metadata only after requested uploads succeed.
Native uploads are not transactional: report partial writes accurately and
do not promise rollback. Keep the separate sprite ZIP importer compatible.
Pack identity/version are advisory optional metadata, never overwrite permission.
Local receipts describe processed selections, not fully installed revisions.
Keep collision content checks and exact-filename identical-file skips intact;
see `docs/IMPORT_EXPORT_REVIEW_0.3.5.md` for validation and remaining limits.

## Conventions and validation

Use existing ES modules and local formatting. Keep pure models independently
testable where practical. Treat avatar identities, display names, folders,
outfit labels, and binding IDs as distinct concepts. Render untrusted text
safely and validate media paths. Preserve SPDX headers, upstream attribution,
credits, and legal notices.

Use Node 24 to match CI and `npm ci` for locked dependencies.

- `npm run lint`: source lint, including gallery JSX and CommonJS browser tests.
- `npm run check`: syntax/import/metadata/settings-template checks.
- `npm test`: Node unit tests in `tests/*.test.mjs`.
- `npm run build`: regenerate the gallery bundle and legal notices.
- `npm run test:browser`: Playwright regression suite with simulated native APIs;
  defaults to Chromium; `IG_BROWSER=firefox` selects Firefox. Install matching
  browsers; artifacts are ignored under `tests/artifacts/`.
- `npm run test:native`: optional real-server smoke test. Requires a disposable
  loopback SillyTavern server and `IG_ST_DISPOSABLE=1`; never use a live profile.
  See `docs/DEVELOPMENT.md` for setup and the manual validation workflow.

Choose validation appropriate to the change. Add focused regressions for
meaningful behavior fixes. Run browser coverage for UI, lifecycle, integration,
or transfer changes. Test native API/file changes against a disposable real
SillyTavern installation; never use the user's live library as a fixture.

Edit `gallery/src/`, not the generated bundle. Rebuild when bundled source or
dependencies change, and include generated differences with source changes.
An unchanged build should leave `gallery/dist/` without a diff.

Report checks run, results, and environment limitations honestly. Investigate
unrelated failures separately rather than expanding a small task silently.

## Releases and references

`version.js` is the release source of truth. Use
`node scripts/set-version.mjs <version>` to synchronize release metadata;
update README and release notes separately.

Consult relevant release notes, `docs/TRANSFERS.md`, `docs/TRANSFER_FORMAT.md`,
`docs/IMPORT_EXPORT_REVIEW_0.3.4.md`, and `CREDITS.md` when their subject is affected.
CodeQL uses GitHub-managed default setup; a committed CodeQL workflow is not
required. Other workflow definitions are under `.github/workflows/`.
