# 0.3.8 validation

## Checks run

- Node 24.19.0: lint, syntax/import/metadata checks and 153 unit tests pass.
- Complete Playwright Chromium 151.0.7922.34 and Firefox 153.0 suites pass.
  Focused 0.3.8 cases were rerun in both after final streaming refinements.
- Coverage includes whole-library scrolling at phone size, 320px overflow,
  both height references, muted tallest members, recent-speaker visibility,
  independent PC/mobile preferences, vertical background crop movement,
  generation-time manual outfits and complete streaming command lines.
- Streaming regressions cover partial tokens, normal appends during a delayed
  image fetch, chat-switch rejection, and completion preserving a later manual
  outfit choice. Final-only/API paths and existing automation remain in the full
  suite. New scene changes are never replayed merely by loading a chat.
- Reset-all clears PC/mobile fine tuning while keeping heights and offsets.
  It remains zero after a group/chat change and actual page/settings reload with
  a missing migration marker. Unit tests retain genuine old calibration behavior.
- Height exports use shared centimeters without changing source settings; visual
  corrections remain independent. Transfer schemas stay writer 2 / readers 1, 2.
- LunarCore 0.0.7 working checkout: 31 unit tests, syntax checks and isolated
  Chromium debug integration pass, including the new typed per-layout preferences
  and safe streaming/reset metadata. Concurrent LunarUI work was preserved.
- Native smoke passes in Chromium and Firefox on disposable SillyTavern 1.18.0,
  commit `51ad27fb86d39a3daca3adaa970375c9670c12df`, fresh `validation-038`
  profile: startup, real uploads/imports, remapping, chat preservation, mobile
  library and its scroll surface. The server was stopped after testing.
- Native 1.18.0 source confirms STREAM_TOKEN_RECEIVED occurs before progress
  updates; processing is scheduled after native updates, with a DOM-change
  fallback. No external model requests were made by these tests.

## Scaling finding and limits

A saved mobile height of 180 cm with a shared height of 155 cm produces roughly
116% when 155 cm is the reference, even with fine tuning at zero. Runtime scaling
now uses shared centimeters. Existing 9.09% offsets are still saved values, and
are not assumed to be erroneous user edits. Reset all on upgrade clears both
device maps, removes old multiplier fields, and retains the height schema marker.
Modern height-only entries no longer receive invented compensation when repairing
a missing marker; real legacy per-device calibration remains supported/backed up.

The user's live settings were not used as a fixture, so this is not a claim that
every reported value has one confirmed cause. Presets or explicit imports can
still intentionally restore saved corrections; cross-device settings overwrites
are outside these synthetic persistence checks.

## Remaining real-use pass

On a physical phone, try a large library and keyboard, use reset-all once, then
enter/create a group chat and reload. Check a 2–3 speaker limit while characters
enter/exit. Compare visible-reference and whole-group-reference calibration with
the tallest member muted. Check both portrait and landscape art with the vertical
pan and reduced motion. Try a real streaming reply with commands at the start,
middle and end, including Stop/swipe/edit. Already-applied changes remain after
Stop/revision; only pending work is cancelled. Export a LunarDebug recording for
anything unexpected, and append analysis to the shared debug notes.

No gallery source/dependency change was required; the library fix is in the
extension stylesheet and the committed gallery bundle is unchanged.
