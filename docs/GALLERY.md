# Gallery behavior

The Gallery subsystem is integrated into ImmersiveGroups. Its settings are under `extension_settings.ImmersiveGroups.gallery`. Installation/migration instructions are in the root README. The behavior below comes from the Gallery v16 feature set.

```text
MODEL PROMPT
Enable image instructions and the available-image list in the Gallery tab. It is OFF by default. The editable default gives short, direct instructions: use an image only when it fits, choose at most one, copy a complete supplied command exactly, place it on a separate line, and never invent names/URLs. The list includes actual commands, image scene descriptions, optional gallery descriptions, and bound character names.

Only images eligible for the current chat and current cooldown/round limits are listed. The maximum list length is adjustable (default 80). Preview current prompt shows what the current chat would receive. Restore default instructions resets only the instruction text. No available images means no injected gallery prompt.

The prompt uses native system-context injection before generation on chat-completion and text-completion paths. Quiet helper generations and impersonation omit it. Switching chats or disabling the feature clears stale instructions. It makes no separate model/API call. The default is designed to be simple for smaller models; a model can still choose to omit an image or make an error.

IMAGE LOADING LIMITS
All limits are OFF by default. Enable any combination:
- Suppress recently shown images: default cooldown 3 rounds, adjustable 0–1000.
- Images per message: default 1, adjustable 1–20.
- Images per round: default 1, adjustable 1–100 across group replies.

One round starts with a user message and includes all following assistant/system replies until the next user message. Messages before the first user message are round 0. All characters in an automatic group reply therefore share a round. With cooldown 3, an image shown in round 1 is blocked in rounds 1–4 and can return in round 5. Cooldown 0 only blocks repeats within the same round.

Suppressed commands become empty local spans: no command text and no image element/network request. Paragraphs, emphasis and quotation markup are preserved. Suppressed occurrences do not restart the cooldown. Limits use the canonical local file path, so aliases cannot bypass a repeat limit. Fenced code and prose code examples do not consume limits.

The result is derived from stored chat history and the active swipe, not a persistent browser counter. Refreshing or loading older message pages therefore stays consistent. Editing/deleting messages or changing swipes recalculates the result. Turning a limit off restores eligible images without rewriting any chat message. Unresolved commands still retain the existing diagnostic behavior; only valid commands suppressed by limits become blank.

IMAGE LIBRARY
Open image library from the Gallery tab or the floating panel. It combines registered General, character, persona and group assignments, plus unambiguous General filenames. Filters include search, gallery and Current chat only. Sorting includes name A–Z/Z–A, gallery, described first and bound first; sort and current-chat preference persist.

Details & bindings edits an image's command name, scene description, availability and bindings. Renaming retains the old name as an alias so existing chat commands still work. General filenames without assignments become explicit assignments when you save their details. No physical files are renamed or copied by metadata edits.

Availability modes:
- Original gallery's chats: General is available everywhere; character galleries follow the character into groups; persona/group galleries use their existing context.
- All chats: list the image in every chat.
- Bound characters/groups: select one or more character avatar IDs, optional specific group IDs, and optionally Require all selected characters to be present. Otherwise any selected character is sufficient. An explicitly bound group also qualifies. An empty binding list qualifies nowhere until you add bindings.

Character bindings work automatically in any group that contains the character; you do not need to bind each group separately. Characters with the same display name remain distinguishable by avatar ID. Missing character/group bindings stay visible for removal in the editor. Descriptions and bindings filter model context, quick send and Current chat only; they do not remove historical images or prevent a manual command from rendering.

Select a gallery to edit its gallery description. Scene descriptions are saved per image. Both are available to current prompt injection and future scene planners. Upload / manage files opens the existing file tools. Folder galleries also offer newest/oldest and filename sorting. Uploads use the filename/path returned by SillyTavern's server, including group uploads.

FUTURE SCENE INTEGRATION
window.ImmersiveGroupsGallery.getSceneContext() returns a detached data snapshot with chat/group IDs, current round, gallery descriptions, eligible image commands, descriptions, character/group bindings, and availableNow status. openLibrary() opens the library. No automatic image insertion, outfit change, background change or extra model call runs from this interface. Image commands still render through the working LocalImage DOM renderer.

RENDERING AND SHORTCUTS
The tested v15 formatting behavior, General resolution, eager loading and simple max-height setting remain available. Floating/character/persona shortcut visibility, size and position are retained. A popup named Shortcut settings retains fast access to those controls; the full prompt/library controls are in the Gallery settings tab. Changing a gallery or closing the library cancels stale background refreshes so an old request cannot reopen the modal.


```
