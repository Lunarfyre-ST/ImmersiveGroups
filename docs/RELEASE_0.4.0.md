# v0.4.0 — A more useful character library

- **Manage expressions** on outfit cards shows image thumbnails and variants,
  with previews, reviewed replacement and permanent removal. Cancel performs no
  write. Edits reject stale content and ambiguous filename stems. Download the
  original before replacing/removing it if you want a backup.
- **Rescan sprite folder** detects images copied directly onto the server and
  refreshes SillyTavern's expression choices without a browser reload. During
  generation it refreshes the library only; rescan after generation for native
  choices. Opening/refreshing the library also discards stale outfit inventories.
- **Outfit groups** organizes existing shared outfit names across characters.
  Assign swimsuits and bikinis to Swimwear once, then link backgrounds to that
  group. Choose a preferred outfit when a character has several matches. Locks,
  hidden outfits, explicit scene commands and async cancellation retain priority.
- Background cards show **Linked outfit readiness**, including disabled linking,
  locked characters, missing matches, ambiguity and already-selected outfits.
- **Character appearance** in the library also edits shared height, independent
  PC/mobile fine tuning and vertical offsets, and the automatic outfit lock.
  These are the same settings used by the main character editor.
- Idle background movement has a **Mobile scrolling** dropdown: Horizontal
  (default) or Vertical. Both traverse the available crop; saved vertical choices
  are preserved and desktop movement is unchanged.
- Background switches keep the idle-motion layer in place during fades, avoiding
  removal/reinsertion of the native background while opacity is animated.
- Mobile idle movement pans and zooms the background image directly, keeping
  SillyTavern's native background outside the new clipping wrapper associated
  with black backgrounds in Samsung Internet. Direction and duration controls
  remain available; desktop movement and character exit containment are unchanged.
- Idle backgrounds and character exit effects stay inside the viewport, avoiding
  unwanted downward/rightward page scrolling on mobile browsers.
- **Recent speakers displayed** and **Height reference** are near the top of
  Scene tuning, below calibration/offset controls. Existing locations remain.
- Fitted character rows avoid centering margins that reduce available grid width.
  Sizing refreshes after page/font readiness and observes bottom rows too. Saved
  five-character reload geometry is covered; the reported live squishing still
  needs confirmation with the user's exact setup.
- Automation diagnostics distinguish locks, scope, availability, unchanged scenes,
  cancellation and failure without private scene content. Companion LunarDebug
  changes summarize retained per-command outcomes; LunarCore remains optional.

The transfer writer remains schema 2, with schemas 1 and 2 readable. The optional
preferred-outfit boolean follows existing selection, review and update rules.
No dependency upgrades or automation-default changes.

See [validation and remaining checks](VALIDATION_0.4.0.md).
