# ImmersiveGroups 0.2.5 — Fresh-install defaults and guidance

- Centered settings tabs by default. Automatic-change lock buttons, automatic common-folder discovery and automatic Basic-outfit hiding now start off.
- Added highlighted lock-status notices for disabled automation, Prompt mode, manual API analysis and automatic API analysis. Lock-button tooltips explain the active mode; showing/hiding the buttons does not change saved character locks.
- Changed the default for unset character heights to **165 cm**, while retaining saved centimeter values and the original conversion math for legacy height settings.
- Added visible **Import help** to the outfit library, including the usual `data/default-user/characters` path, custom-account guidance and the distinction between scanning names and uploading sprites.
- Moved all sprite-shadow controls to **Sprites → Sprite shadows**, with consistent slider/number pairs and labeled Reset buttons.
- Added the **Ctrl + F1** hint beside Hide chat window, plus Lunarfyre-ST and the project repository in About and credits. Upstream project credits remain included.

Existing saved preferences remain in effect. To evaluate the new defaults, use a fresh install/account. The ZIP excludes the root README.md and contains no user chats, settings or image libraries.

Validation covers height migration and saved values, fresh defaults, manual folder discovery with auto-discovery off, lock-status changes, relocated shadow handlers/resets, the keyboard shortcut, import guidance and phone layouts. Browser tests use a simulated SillyTavern host; clean-install testing in the application remains the integration check.
