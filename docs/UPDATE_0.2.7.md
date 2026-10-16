## 0.2.7 — Scene transitions and clearer controls

- Moved the chat-history toggle into **Layout**, with clear scrollable-history and latest-message-only behavior.
- Added an **Animations** tab with optional outfit and background fades, separate fade-in/fade-out durations, and paired sliders and number fields. Fades are off by default and respect reduced-motion preferences.
- Kept outfit transitions in place after preloading, with cancellation and stale-request checks for rapid changes, outfit locks and chat switches. Background crossfades preserve native selection and locking behavior.
- Added a compact, live settings summary for automation, Prompt/API mode, outfit scope, backgrounds and Gallery image instructions/placement.
- Made button background colors independent when controls are together, and added an **Inherit Speak button color when controls are separated** option to both character appearance editors.
- Renamed **Advanced / Prome** to **Legacy / Prome** and added a subtle accent for the Animations tab.

Update the matching extension files and reload SillyTavern. Existing preferences are preserved. To restore scrollable history, uncheck **Layout → Show only the latest message**. Animation settings apply to both PC and Mobile.

Validation: build/import checks, 54 unit tests and browser regressions covering existing features plus history visibility, live status, color inheritance, shared settings, animation cancellation, reduced motion and mobile wrapping. The test host simulates SillyTavern APIs; testing in a live installation remains useful for themes and other extensions.

The ZIP excludes the root README.md and contains no user chats, settings, galleries or credentials.
