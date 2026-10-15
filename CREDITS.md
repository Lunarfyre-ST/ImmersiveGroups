# Credits and origins

ImmersiveGroups is an independent modified project combining two SillyTavern extensions. The original authors are credited for their work; their names do not imply endorsement or authorship of the later modifications.

| Original project | Author/credit | Baseline | Origin |
| --- | --- | --- | --- |
| Prome Visual Novel Extension | Bronya-Rand; the original UI also credits Prometheus | 1.2.4 | https://github.com/Bronya-Rand/Prome-VN-Extension |
| SillyTavern-LocalImage | mechamarmot | 1.6.0 | https://github.com/mechamarmot/SillyTavern-LocalImage |

## Scene subsystem

`prome.js` is based on Prome's original entry point. `constants.js`, `listeners.js`, `utils.js`, scene modules, `html/` and `styles/scene.css` retain or extend its behavior. Later modifications include chat presentation safeguards, Quick Reply limits, Sheld tuning, sprite height profiles, stable outfit swaps, outfit metadata/colors, responsive controls, ranked dimming and background favorites.

The combined release incorporates the previously developed ImmersiveGroups scene v7 modifications, then changes initialization, settings storage and project branding. Upstream author notices are preserved where present, and source headers identify the modified subsystem.

## Gallery subsystem

`gallery/src/` and `styles/gallery.css` are based on LocalImage. The combined release incorporates the previously developed Gallery v16 changes: formatting-safe rendering, General images, settings/shortcut controls, prompt injection, deterministic display limits, descriptions/bindings, sorting and the unified image library. Its compiled bundle is rebuilt from the included source rather than patched from an old minified file.

Original storage folders and command conventions are retained. The combined entry point explicitly starts Gallery after safe settings migration; it no longer loads as a second extension.

## Combination changes — 2026-10-15

- One extension entry point, manifest, installation folder and settings window.
- Explicit startup for both subsystems, isolated component errors and duplicate-copy detection.
- New combined settings root with one-time import and unchanged legacy backups.
- Shared About/credits UI and combined scene-context API.
- A reproducible source build, pinned package lock, migration/policy tests and browser fixture.
- New repository documentation and CI setup.

## 0.1.4 additions — 2026-10-15

Outfit wheel cycling and bounded searchable menus; separate PC/Mobile offsets and visual presets; tallest-character height reference with signed Fit adjustment and scale diagnostics; width-based mobile detection; shared background filtering and opt-in ordered chat-load defaults with manual-choice cancellation. These changes are authored for ImmersiveGroups; the upstream credits and license notices above remain unchanged.

## 0.1.5 additions — 2026-10-15

Settings grouped by task; shared main/live preset controls; profile following and clearer scope labels; common character selection for heights, colors and outfits; optional Gallery image prompting under Automation; dependent controls and expandable help. Existing settings IDs and keys remain in use. These interface changes are part of ImmersiveGroups.

These modifications are part of ImmersiveGroups, not claims about upstream functionality or upstream authorship.

## Licenses and dependency notices

The original projects each included the same GNU Affero General Public License version 3 text. The combined project keeps that text in `LICENSE` and preserves each copy in:

- `licenses/Prome-AGPL-3.0.txt`
- `licenses/LocalImage-AGPL-3.0.txt`

The Gallery build bundles React, ReactDOM and Scheduler. Their MIT licenses are included in `licenses/React-MIT.txt`, `licenses/ReactDOM-MIT.txt` and `licenses/Scheduler-MIT.txt`; extracted bundle notices are in `gallery/dist/gallery.js.LEGAL.txt`. SillyTavern and its own dependencies are supplied by the host application.

The source files, build script, dependency declarations and package lock are included with the release. See README for rebuilding. No warranty is provided.
