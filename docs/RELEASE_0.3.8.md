# v0.3.8 — Mobile scenes and streaming commands

- The phone library scrolls its toolbar and results together. A long toolbar
  no longer squeezes outfits into a tiny scrolling strip at the bottom.
- Mobile height scaling uses the character's shared centimeter height rather
  than a stale mobile height. Fine tuning and Y offsets remain independent.
  Modern profiles missing a migration marker no longer synthesize compensation
  for height-only entries. Genuine legacy calibration and backups are retained.
- Characters → Character heights has **Reset all character fine tuning
  (PC + mobile)**. It clears every saved adjustment on both profiles, while
  keeping heights, Y offsets, outfit overrides and saved presets. Existing
  corrections are not silently erased on upgrade; use this once to clear
  unwanted values left by earlier versions.
- Choose **Recent speakers displayed** independently on PC/mobile. Zero keeps
  everyone; 2–3 is a useful starting point for phones. The current drafted speaker
  is included, with deterministic member-order fallback before anyone speaks.
  Controls and automation retain access to the rest of the active group.
- Choose a height reference: tallest currently displayed character, or tallest
  group member including muted members. The first follows the visible cast;
  the second keeps calibration consistent as recent speakers change.
- Manual individual/common outfit changes work during generation. Speak buttons
  still prevent overlapping generations.
- With prompt automation enabled, complete newline-terminated scene commands
  apply during streaming. Incomplete tokens, reasoning/code blocks and old chat
  history are not executed. Final-only commands apply when the reply completes.
  Commands are tracked by their position so completion does not replay them.
  API analysis retains its existing after-reply behavior.
- Idle background movement has an optional full-height vertical mode on mobile.
  It pans through the available crop and adds gentle zoom/drift so even a
  background with little vertical overflow can move. Duration sets its speed;
  regular desktop movement stays as configured.
- Optional LunarDebug records the new per-layout settings, mobile-pan choice,
  reset count and whether execution occurred during streaming.

Stopping or revising a stream cancels pending work; scene changes already applied
remain. This is not transactional rollback. Settings, chat/group, message/swipe,
locks and stale asynchronous results are still checked before committing.

Transfer writer remains schema 2; readers retain schemas 1 and 2. Height exports
use shared centimeters with separate visual corrections. Installation requires
no build step for end users and LunarCore remains optional.
