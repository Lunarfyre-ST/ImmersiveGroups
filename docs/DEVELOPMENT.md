# Development and validation

Use Node.js 24 (also recorded in `.nvmrc`) and npm. Node/npm are development
tools; installing the extension in SillyTavern does not require them.

## Setup and quick checks

From the repository root:

```sh
npm ci
npm run lint
npm run check
npm test
```

Use `npm ci` to reproduce `package-lock.json`. Update dependencies deliberately,
in a separate change from unrelated feature work. The source check supports
Windows and POSIX paths and validates syntax, imports, release metadata,
merge markers, and settings template IDs.

Scene modules are loaded directly by SillyTavern. React gallery source under
`gallery/src/` is bundled into committed files under `gallery/dist/`:

```sh
npm run build
git diff -- gallery/dist
```

Include regenerated bundle/legal notice changes with their source changes.
Do not hand-edit the bundle. A rebuild without source/dependency changes should
leave no diff. Keep attribution and license notices intact.

## Browser regression suite

Install the Chromium revision matching the locked Playwright dependency:

```sh
npx playwright install chromium firefox
npm run test:browser
```

On a Linux machine missing browser system libraries, use
`npx playwright install --with-deps chromium firefox` instead.

The suite runs sequentially against a local HTTP fixture with simulated
SillyTavern modules and endpoints. It uses the committed gallery bundle, so
rebuild first after editing bundled sources. Screenshots and failure diagnostics
are written to ignored `tests/artifacts/`. This is a custom Playwright library
harness, not a `playwright test` project.

For a focused current-release run in PowerShell:

```powershell
$env:IG_BROWSER_ONLY = 'v034'
try { npm run test:browser } finally { Remove-Item Env:IG_BROWSER_ONLY }
```

On POSIX shells:

```sh
IG_BROWSER_ONLY=v034 npm run test:browser
```

Other existing focused suites include `sanitization`, `ownership`, `automation`,
`auto-api`, `groups`, `async`, and `planner`. The `async` suite pauses requests to exercise
chat changes, replaced sprite holders/images, newer outfit selections, live
locks, generation during import, partial upload failures, and transfer retries.
The `planner` suite checks late API results after chat, swipe, deletion, text,
or recent-history changes, including an old request returning during a new one.
Run the full suite before merging integration changes.
Chromium is the default engine. Set `IG_BROWSER=firefox` to run the same suite
in Firefox (in PowerShell, use `$env:IG_BROWSER = 'firefox'`). Unset the variable
after a focused run when returning to the default engine.
Optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and JSON-array
`PLAYWRIGHT_CHROMIUM_ARGS` overrides exist for environments requiring them;
prefer Playwright's matching browser for reproducibility.

## CI coverage

- Source checks, build reproducibility, and unit tests run on Linux and Windows.
- The ESLint workflow uses locked dependencies and fails on lint errors.
- Chromium and Firefox integration run as separate Linux jobs; failure artifacts
  are retained independently for each engine.
- The manually dispatched **Native SillyTavern compatibility** workflow creates
  an isolated 1.18.0 installation and runs real API/file checks in both browsers.
- CodeQL is managed by GitHub default setup. OSV and Semgrep have separate
  workflows; Semgrep also depends on repository secrets/remote rules.

Local validation does not establish that hosted jobs passed. Record hosted
results after pushing, including which commit was tested.

## Real SillyTavern release checks

Use a disposable SillyTavern installation and copied test assets, not a live
library. Record the actual SillyTavern version, browser/version, operating system,
and relevant settings. The transfer review references SillyTavern 1.18.0's native
sprite endpoint; that is not a declaration of a fully tested support range.

Before a release, cover these cases and record outcomes:

- Fresh setup and upgrades from legacy settings: backups retained, automation
  opt-in, duplicate standalone extensions blocked.
- Solo/group replies, streaming, stop/abort, swipe/edit/delete, and rapid chat
  switches: no stale scene changes or duplicate analysis; chat data unchanged.
- Sprite holders replaced by native rendering, manual/shared outfit ownership,
  height overrides/inheritance, locks, and linked background changes.
- Desktop, Firefox, and a real phone: settings, scrolling, touch controls,
  mobile/desktop profile independence, and image formatting.
- Export/import into a fresh destination, repeat imports, PNG/JSON cards,
  character remapping, partial outfit selection, and background/gallery bindings.
- Existing-file conflicts, case/extension collisions, changed inventory after
  review, and interrupted uploads: approvals invalidated and partial writes
  reported accurately, without promising disk rollback.
- Historical version 1 and version 2 bundles produced by older releases.
  Keep sanitized historical fixtures when available; synthetic manifests alone
  do not prove compatibility with old writers.

Mocked endpoint tests cannot replace these server/filesystem checks. Do not use
real external API calls in CI; test transports and cancellation with fixtures.

## Native server smoke test

The optional workflow in `.github/workflows/native-compatibility.yml` is the
reproducible release check: run it from GitHub Actions with **Run workflow**.
It clones SillyTavern's `1.18.0` tag, installs its locked dependencies, copies the
extension's runtime files, starts a loopback-only server with separate data,
runs Chromium and Firefox checks, uploads reports, and stops the server.
It does not run on every push or pull request.

For local runs, use a disposable SillyTavern installation with a separate data
root. Install the current extension files there, then start that server:

```sh
node server.js --port=8179 --browserLaunchEnabled=false --autorun=false --listen=false --dataRoot=./ig-validation-data
```

From this extension's repository, with Playwright browsers installed:

```powershell
$env:IG_ST_DISPOSABLE = '1'
$env:IG_ST_URL = 'http://127.0.0.1:8179'
$env:IG_BROWSER = 'firefox' # or chromium
try { npm run test:native } finally {
    Remove-Item Env:IG_ST_DISPOSABLE, Env:IG_ST_URL, Env:IG_BROWSER
}
```

On POSIX shells:

```sh
IG_ST_DISPOSABLE=1 IG_ST_URL=http://127.0.0.1:8179 IG_BROWSER=firefox npm run test:native
```

This writes uniquely named synthetic cards/media and metadata. The explicit
disposable flag and loopback URL restriction are required; never use a live
profile. External model-provider discovery is stubbed, while the character,
sprite, background, gallery, and transfer operations use the real server.
Native first-run onboarding is completed through its UI. The test checks
repeat/update imports, PNG/JSON card creation, relationship remapping,
unchanged chat/current scene choices, and clickable mobile-viewport library
controls. Reports and screenshots are in `tests/artifacts/native/<browser>/`.
Stop the local server after testing; the disposable data is retained for review.

See [the validation record](VALIDATION_2026-10-17.md) for tested versions and
remaining manual checks. Mobile viewport checks do not establish physical-phone
or mobile Safari compatibility.

## Preparing a release

Use `node scripts/set-version.mjs <version>`, then update README and release
notes separately. Run lint, source checks, unit tests, the gallery build, and
browser regressions. Review generated diffs and the real-installation checklist.
See `TRANSFER_FORMAT.md` before changing bundle semantics and
`IMPORT_EXPORT_REVIEW_0.3.4.md` for current transfer guarantees and limits.
