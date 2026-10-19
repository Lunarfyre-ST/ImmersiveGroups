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
- `modules/motion-model.js`, `scene-motion.js`, `motion-controls.js`: opt-in
  scene movement, expression blends, previews and manual reactions. Preserve
  additive transforms, cancellation, reduced motion and saved height values.
- `modules/scene-backgrounds.js`, `background-*`, `binding-groups-model.js`:
  backgrounds, defaults, eligibility, and linked outfit changes.
- `modules/scene-library.js`: bridge from scene services to gallery UI.
- `modules/scene-automation*.js`, `scene-api.js`, `scene-command-view.js`:
  prompts, command validation, generation lifecycle, and API analysis.
- `modules/diagnostics.js`: optional metadata-only LunarDebug producer bridge;
  scene modules report through this helper without depending on LunarCore.
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
- Animation duration controls display seconds; stored settings and transfers use
  milliseconds. Preserve exact typed fractions and existing values. Treat native
  expression image replacement within a holder as one character lifecycle, and
  avoid interrupting unrelated entrances on group/settings notifications.
- Retain window APIs, events, DOM IDs, and native jQuery data contracts unless
  the task requires changing them.
- Check native SillyTavern behavior before changing internal imports, sprite
  uploads, expression overrides, or background selection. Record versions
  actually tested rather than assuming minimum-version compatibility.

## Optional LunarCore / LunarDebug compatibility

[LunarCore](https://github.com/Lunarfyre-ST/LunarCore) includes LunarDebug, an
optional diagnostic recorder for ImmersiveGroups. Keep the integration useful
while preserving full standalone functionality. LunarCore must never become
a required installation, import, startup dependency, or source of scene state.

Before changing diagnostic hooks, consult LunarCore's
[protocol](https://github.com/Lunarfyre-ST/LunarCore/blob/main/docs/diagnostics.md),
`core/diagnostics.js`, `core/settings-schema.js`, and
`integrations/immersivegroups.js`. Protocol 1 was reviewed against LunarCore
0.0.3, commit `71179864e1c8df7ff44e4b9a135043a288fb0c29`; this records the source
review, not a claim that every combination has been tested. Recheck the current
contract when implementing integration changes.

- Use `modules/diagnostics.js` rather than direct recorder calls throughout
  the extension. The optional sink is
  `globalThis[Symbol.for('LunarDebug.sink')]`; require `protocol === 1` and
  `enabled` before emitting or beginning an operation. Missing, disabled,
  incompatible, late-loaded, or throwing consumers must be harmless no-ops.
  Do not wait for the recorder, add network calls, or change product behavior
  because diagnostics fail. Keep the disabled path inexpensive.
- Preserve `ImmersiveGroups.diagnosticsProtocol`, `getStatus()`, the document
  `immersivegroups:ready` event, and existing window `ig-*` notifications used
  by LunarCore. Advertise only supported protocols. Keep event targets and
  lifecycle semantics stable; do not add duplicate notifications just to log.
- Keep useful execution boundaries observable when modifying outfit changes,
  backgrounds, animations, automation/API requests and context cleanup.
  Report actual outcomes: a request is not proof of application, sprite commit
  is separate from animation completion, and cancellation is not failure.
  Use guarded `emit`/`begin`/`step`/`finish` helpers; null operations are normal.
  Do not resume old traces into later recording sessions after Stop or Clear.
- Send only fixed allowlisted events/enums, bounded numbers and booleans.
  Never pass chat/prompt bodies, character/user names, avatar IDs, asset names,
  paths, URLs, credentials, Error objects/messages/stacks, raw settings, DOM
  content, deterministic hashes, absolute timestamps, or browser identifiers.
  Build safe fields at the producer; consumer filtering is not permission to
  hand private data to an optional sink. Extend the documented schema explicitly
  when needed rather than encoding free-form detail in existing fields.
- Diagnostics must remain observational: no replay, automatic uploads, settings
  dumps, changes to recording preferences, or dependence on recorder results.
  Avoid extra polling and unbounded/high-volume traces. Counts, summaries and
  relative timings must describe their actual boundary, not imply causation,
  rendering cost, or complete coverage of all failures.
- For hook/integration changes, test absent/disabled LunarCore and enabled
  protocol-1 recording, plus incompatible/throwing sinks and relevant late-load,
  Stop/Clear and cancellation paths. Check that behavior and saved data agree
  with recording off and on. Run companion LunarCore integration regressions
  when its checkout is available; report the exact versions/results and any
  untested combinations. Normal ImmersiveGroups tests must run without it.

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
