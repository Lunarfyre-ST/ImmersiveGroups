# 0.3.7 validation

## Automated checks

- Node 24.19.0: lint, syntax/import/metadata checks and 147 unit tests pass.
- Full Playwright Chromium and Firefox suites pass, including existing transfers,
  gallery, scene automation, mobile layouts and legacy setting migrations.
- New browser regressions cover unmute entrances surviving group/layout events,
  native expression image replacement without false exits/entrances, overlapping
  slow loads, exact fractional seconds, idle/experimental controls, waiting-character
  breathing intensity, privacy and unchanged chat/height/override data.
- Existing motion coverage still passes with optional diagnostic sinks absent,
  enabled, disabled, incompatible and throwing, plus reduced-motion and renderer
  changes. New effects remain opt-in.
- LunarCore 0.0.7 working checkout: 29 unit tests and syntax checks pass. Its
  isolated Chromium debug suite passes: explicit hook coverage, sprite inventory,
  lifecycle/error observations, review/loading filters and local archive recovery.
  Concurrent LunarUI changes were preserved; its full visual suite is outside
  this task. Recorder schema remains 4 and producer protocol remains 1.
  Repeated hidden-sprite errors retain counts/timing in one summary until a
  source, visibility, native-state or recording lifecycle boundary changes.
- Disposable SillyTavern 1.18.0, commit
  `51ad27fb86d39a3daca3adaa970375c9670c12df`, fresh `validation-037` profile:
  native Chromium and Firefox smoke passes for startup, uploads, repeated imports, card
  handling, remapping, chat preservation and mobile library controls.

Native expression `setImage` was inspected: it temporarily keeps two
`expression-animating` images, removes the old image, and promotes the new one.
That lifecycle is reproduced in the focused browser test. It is distinct from
the native API smoke test, which does not validate visual entrance quality.

## Compatibility

UI seconds convert at the controls boundary. Stored values, exports and the
programmatic writer remain milliseconds. Slider steps do not round untouched
stored values or exact number input. Waiting intensity defaults to 100%; readers
of older transfers retain absent-field semantics. Transfer writer/readers remain
schema 2 / schemas 1 and 2. No gallery source/dependency/build changes are needed.

## Remaining real-use checks

Try these on desktop and a physical phone with representative sprite artwork:

1. Enable entrances, repeatedly mute/unmute different characters, and change
   expressions during an entrance. Watch that unrelated characters stay stable.
2. Repeat on slow connections, cached images, failed images and rapid chat/group
   switches. Confirm no obsolete entrance appears later.
3. Try all-character breathing at 100%, 50% and 0% waiting intensity; switch the
   speaker and confirm saved heights remain unchanged.
4. Check native mute-display preferences, solo/group scenes, layout changes,
   reduced motion, and return from a hidden browser tab.
5. Enable LunarDebug recording and local auto-save before reproducing issues.
   Check hook coverage, Sprite loading / entrances and Needs review, then export.
   Expected cancellations are not bugs; anonymous timing does not identify a
   character or prove causation. Confirm reload recovery on the phone itself.

No claim is made that every reported device-specific glitch has been fixed or
that mock browser coverage replaces a real-art visual pass.
