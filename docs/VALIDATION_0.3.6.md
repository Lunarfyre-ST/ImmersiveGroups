# 0.3.6 animation validation — 2026-10-18

Validation used the local working sources, Windows, Node 24.19.0 and the locked
dependencies. No new runtime dependency is required for the motion effects.

- **146 unit tests passed**, including bounded motion settings, all-off defaults,
  neutral reaction endpoints, background zoom margins, portable preferences and
  the earlier height migration repair regressions.
- **Lint, build and source/release checks passed.** The gallery build leaves its
  committed output unchanged. Release metadata is synchronized at 0.3.6; transfer
  readers remain schemas 1/2 and the writer remains schema 2.
- **Full Chromium and Firefox regression suites passed.** The new motion suite
  exercises all eight controls, isolated previews, additive scale preservation,
  breathing/reaction arbitration, entrances/exits, expression blending, existing
  outfit crossfades, background motion, reduced motion, mobile renderer handoff,
  VN disable and unchanged chat/height/current-outfit data.
- Focused motion and existing crossfade suites passed again in both engines after
  tightening renderer selection and copying individual transforms into overlays.
  Unsupported additive animation is tested as a safe visual no-op, including
  cancellation of any partially created browser animations.
- Optional diagnostic consumers are exercised as absent, enabled, incompatible
  and throwing. Expression swaps retain only allowlisted metadata. The sibling
  **LunarCore 0.0.4 working copy's browser integration suite passed** against these
  sources, covering its recorder lifecycle, privacy and actual IG fade hooks.
  No LunarCore source changes were needed. Its schema currently does not expose
  separate names/settings for every new motion; compatibility is not a claim of
  complete diagnostic coverage.
- **Native smoke tests passed in Chromium and Firefox** on a separate data root
  in disposable SillyTavern **1.18.0**, commit
  `51ad27fb86d39a3daca3adaa970375c9670c12df`. These check real uploads, exports,
  repeated/updated imports, PNG/JSON cards, remapping, unchanged chat/current scene
  state and mobile library controls. Model-provider discovery is stubbed; no
  inference calls are made.
- An additional **interactive native UI check** opened Animations, confirmed all
  eight options, adjusted breathing to 2000 ms / 1.2%, and played/stopped its
  miniature preview while its live enable checkbox stayed off. This checks the
  real settings UI; it is not a full visual pass of every effect with real art.

Ignored reports/screenshots are under `tests/artifacts/`, including
`v036-native-animation-controls.png`, `v036-animations-mobile.png` and native
per-browser smoke reports. Hosted CI still needs to run on the pushed revision.

For hands-on testing, follow [the release checklist](RELEASE_0.3.6.md). Try one
effect at a time with the intended character art, then combine them. Crop/padding,
large sprites, phones and differently configured native expression extensions
still need real-use feedback. Reactions are manual; no emotion detection or new
model command format is included. All new effects remain opt-in.
