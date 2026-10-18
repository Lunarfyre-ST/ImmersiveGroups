## 0.3.6 — Optional scene animations

- Added **character entrances/exits**, with fade or slide-and-fade styles and adjustable distance/timing.
- Added **speaking emphasis** and **idle breathing**, with strength and timing controls. Breathing can follow the current speaker or all visible characters.
- Added **expression blending** within an outfit, independent of the existing outfit fades.
- Added manual **hop, nod, tilt and shake reactions**, with a character selector. Reactions pause breathing and leave saved height corrections unchanged.
- Added **background pan/zoom** with direction, travel and timing controls, plus an optional **scene fade through black** on background changes.
- Added **smooth speaker focus** controls for dimming strength and transition time, using the existing speaking-order dimming feature.
- Added miniature **Preview / Stop preview** controls in Animations and live Scene tuning. All new effects start disabled; Reset animation defaults turns them off again.
- Respected reduced-motion preferences and stopped effects when VN mode is disabled, the page is hidden, or the relevant scene/DOM is replaced. Looped motion uses browser animations without a JavaScript frame loop.
- Fixed height migration reinterpreting saved fine tuning when older/missing migration metadata is encountered. Existing explicit zero values, height defaults and independent PC/mobile corrections are retained.

Reactions are manual in this first version; there are no new model commands or automatic emotion rules. Scene fade is a visual effect after native background selection, not a delayed or transactional location change. Background motion does not rewrite the selected file. A disappearing character uses a temporary visual copy for the exit, without cloning native expression elements.

LunarCore remains optional. Existing animation diagnostic hooks and consumer failure isolation are retained; the current LunarDebug schema does not separately identify the new motion effects or record every new setting. No private identifiers are sent to the diagnostic sink.

### Try the effects

1. Open a solo/group chat with visible expressions and enable VN mode.
2. In **Animations**, expand one effect, try its miniature preview, then enable it for the live scene. Change strength and timing before combining effects.
3. For focus, enable sprite dimming. For reactions, enable Reaction motions and choose the current speaker or a visible character, then use **Play reaction in scene**.
4. Try different sprite framing and per-outfit heights, rapid expression/outfit changes, muted/new group members, desktop/mobile switching, background locks and reduced motion.
5. Turn VN mode off, switch chats during a transition, and verify that no overlay or motion remains. Check that heights/fine tuning, chat contents and native scene choices remain correct.

These are opt-in experiments for testing across actual packs and devices. Full-pack import/export testing from the [0.3.5 checklist](IMPORT_EXPORT_REVIEW_0.3.5.md) remains useful alongside the animation pass.
