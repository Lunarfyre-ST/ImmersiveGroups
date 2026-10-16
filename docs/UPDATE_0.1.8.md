# ImmersiveGroups 0.1.8 — Linked background context

Copy the ZIP’s ImmersiveGroups contents over the existing extension files and reload SillyTavern. The root README.md is excluded.

- Automation → Scene commands & context now has **Linked backgrounds only**, enabled by default. When background automation is enabled, its catalog includes only backgrounds linked to every active character in the chat. This matches the background selector’s All characters linked list.
- The rule applies to both Prompt mode and separate API trials. Speaking-character-only mode restricts outfit context; background context still considers the whole active group.
- Filtering happens before the background count limit. Stars affect sorting but cannot bypass the filter. If no shared backgrounds exist, no background commands are offered; the extension does not fall back to unlinked images.
- Uncheck Linked backgrounds only to also include unlinked backgrounds. Backgrounds linked exclusively to other characters remain excluded.
- Model commands recheck the current filter and bindings before execution and after preloading. Native and model background locks still apply. Manual background selectors and the background library keep their full selection.
- The Automation tab shows the number of backgrounds in context and a shortcut to Manage background links & descriptions. Editing links, descriptions or stars updates the scene prompt and open preview without reloading the chat.

To set up a group, open Manage background links & descriptions and select every active group member for each shared location. Add a scene description so the model can choose by location and atmosphere. You do not need to star a linked background.

Outfit prompts and scope behavior are unchanged. The reported tests showed successful multi-character swimsuit changes with a larger model; this release focuses on narrowing the background choices.

Validation: 32 unit tests, syntax/import checks and browser regression against mocked SillyTavern APIs, including linked-only defaults, no-fallback behavior, live description/binding edits, group-wide background filtering, locks, manual selection and persistence across a fresh runtime. No real model/API requests were made.
