## 0.2.9 — Group presets and scene reference

- Added reusable named groups in Library → Groups. Copy current-chat members or a SillyTavern group, then edit the name, members and description.
- Bind backgrounds and gallery images to presets. Every saved member must be present; extra chat members are allowed. Matching follows members across chats, independently of SillyTavern group IDs. Outfits retain their individual character ownership.
- Added a named-group library filter and group-aware search, linked-background navigation and automation eligibility checks.
- Character binding lists now default to the current chat, with search and an All characters option. Existing links outside the displayed list are preserved.
- Added missing-background filters, a Tools shortcut, Discard missing entry and relinking to renamed files. Relinking merges saved descriptions and bindings and moves stars/defaults. Discarding removes the stale metadata and saved references; neither action deletes image files or edits chat history.
- Added Descriptions only under Context Injection in Prompt mode. It shares current worn outfit descriptions, the current background and matching group descriptions, using the selected outfit/background switches and character scope. Locked characters remain described. It offers no scene commands and blocks outfit/background command execution. Separate Gallery image instructions keep their own switch.
- Preserved the 0.2.8 animation, outfit-ownership and CodeQL repairs. Added unit and browser regressions covering the new catalog and prompt behavior.

Replace matching files from the ZIP’s ImmersiveGroups folder and refresh SillyTavern. No npm installation is required. Existing extension settings are retained; group presets are stored with ImmersiveGroups settings. README is intentionally excluded.
