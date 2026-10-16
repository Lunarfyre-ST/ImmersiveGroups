## 0.2.8 — Crossfades and outfit isolation

- Added **Crossfade** for outfit changes, blending the old sprite into the new outfit in place while other characters remain untouched.
- Added separate **Crossfade** and **Fade out, then fade in** choices for outfits and backgrounds. Crossfade is the default.
- Added **Link fade-in and fade-out timings**, enabled by default. Editing either duration updates both; unlink them for independent values.
- Added **Reset animation defaults** in both settings views. Defaults are Crossfade with linked timings, 200 ms for outfits and 350 ms for backgrounds; fades are off until enabled.
- Added shared animation controls to **Scene tuning**, between **Position & outfit menus** and **Presets & reset**, synchronized with the Animations tab.
- Preserved preloading, reduced-motion support, cancellation and chat-switch safeguards. Temporary old-sprite layers do not enter native expression-image queries.
- Fixed automatic outfit memory accepting folders from a different character when sprite holders are reused during chat changes. Discovery, selectors, current-outfit detection and automation now check character ownership.
- Set aside previously saved mismatched assignments without deleting images or descriptions. **Gallery → Tools → Review mismatched outfits** can explicitly restore intentional shared outfits. Custom folders and native avatar-bound overrides remain supported.

Update the matching extension files and reload SillyTavern. Existing fade on/off choices remain unchanged. The new default links each pair of durations to its saved fade-in value. Saved sequential or unlinked preferences in this version are preserved.

Validation: build/import checks, 57 unit tests and browser regressions for simultaneous outfit/background fades, old sequential behavior, linked and independent timing, reset defaults, synchronized live controls, interruption cleanup, history integrity, phone-width layout, reused single-character sprites, cross-character ownership, preserved mismatch metadata and explicit sharing. Browser checks use a simulated SillyTavern host; themes and other extensions can affect presentation in a live installation.

The ZIP excludes the root README.md and contains no user chats, settings, galleries or credentials.
