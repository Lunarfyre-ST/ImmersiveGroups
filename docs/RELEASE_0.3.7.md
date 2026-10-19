# v0.3.7 — Animation controls and entrance fixes

- Character entrances wait for a ready image and native expression transitions.
  Group updates no longer cancel every character's motion. Native image-node
  replacement within the same holder does not replay an entrance or create a
  false exit. Speaking emphasis waits while an entrance is active.
- Idle breathing and idle background movement are first in Animations. The
  other optional effects are under Experimental; existing outfit/background
  fades remain in the main section. Main/live controls share the same settings.
- Breathing can cover all visible characters, with waiting-character intensity
  relative to the speaker (0–100%). Its default is 100%, preserving prior motion.
- Animation sliders display seconds in 0.1-second steps. Exact inputs accept
  fractions; existing settings and transfers still store milliseconds.
- Updated optional LunarDebug coverage reports native transition waits, node
  replacement, explicit motion hook availability and sprite inventory counts.
  Needs review and Sprite loading / entrances filters help inspect interruptions
  without treating normal cancellations as errors. Update both extension copies
  for the new producer hooks and recorder fields; IG still works by itself.

New effects remain off by default. Reduced motion, cancellation, saved heights,
native expression behavior and transfer schemas retain their existing contracts.
These fixes cover the tested interruption/replacement paths; they are not a claim
that every device-specific animation issue has been eliminated.

If something glitches, enable LunarDebug recording and optional local auto-save,
reproduce it, wait a second, then export. Include the effect and whether the
character was being unmuted or changing expression. No private sprite/name data
is required in the recording.
