# Development workflow validation — 2026-10-17

This validation covers the working changes based on commit `6ed3632`
(`v0.3.4.5`). The extension's runtime/package metadata remains 0.3.4.
No release-version change is implied by these checks.

## Environment and results

- Windows host, Node.js 24.19.0, locked project dependencies.
- Chromium 151.0.7922.34 and Playwright Firefox 153.0, using Playwright 1.62.1.
- Full mocked browser regression suite passed in both engines, including five
  new delayed-planner cases and seven delayed-sprite/interrupted-import cases.
- 129 Node unit tests passed, including frozen 0.3.3 media ZIP and synthetic
  version 1 compatibility checks. Lint and source checks passed.
- A disposable clone of SillyTavern 1.18.0 at commit
  `51ad27fb86d39a3daca3adaa970375c9670c12df` was tested with fresh, separate data.
  Native smoke checks passed in Chromium and Firefox: startup, real sprite,
  background and gallery uploads, export/inspect/import, repeat imports,
  acknowledged sprite replacement, preservation of unrelated sprites,
  PNG/JSON card creation, character/group/background/gallery remapping,
  unchanged chat/current outfit/background choices, and interactive library
  controls at a 390×844 viewport.
- The real-server smoke test completes native onboarding and stubs external
  model-provider discovery. It makes no inference calls. Its reports include
  the server's `/version` response and the browser version.

Firefox uncovered insufficient library result space at a 320×600 viewport.
Reducing library-header padding only for short viewports fixed the existing
layout regression in both browser suites. No extension JavaScript behavior or
transfer schema was changed.

## Automation added

Normal CI now defines Linux/Windows source/build/unit checks and separate
Chromium/Firefox browser jobs. The optional **Native SillyTavern compatibility**
workflow defines a disposable native-server smoke run in both engines.
The new workflow definitions were inspected and parsed locally; their hosted
Linux execution still needs verification after these changes are pushed.
Local Windows results are not a substitute for that hosted result.

Failure diagnostics, screenshots, and native reports are ignored artifacts,
not user data or committed test results. Frozen ZIP fixtures contain only
synthetic assets; their provenance and hashes are documented/tested separately.

## Remaining release checks

- Physical phones, including mobile Safari and actual touch/keyboard behavior.
- Full real-server solo/group generation and streaming/stop/swipe scenarios with
  representative setups. These paths currently have mocked regression coverage;
  native smoke testing does not simulate model generation.
- Other SillyTavern versions, operating systems, native filesystem failures,
  and simultaneous edits from another browser/device.
- A genuine version 1 export or the original 0.3.1 writer. Neither was present
  in the available repository history or published release assets. The synthetic
  version 1 ZIP tests reader semantics; it does not prove old-writer compatibility.

These are explicit release-validation limits, not claims of failures. Keep the
manual checklist in DEVELOPMENT.md for release sign-off.
