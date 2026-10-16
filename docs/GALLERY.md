# Gallery behavior

The Gallery subsystem is integrated into ImmersiveGroups. Its settings are under `extension_settings.ImmersiveGroups.gallery`. Installation/migration instructions are in the root README. The image features below share the unified asset library introduced in 0.2.1.

```text
MODEL PROMPT
Enable image instructions and the available-image list in the Gallery tab. It is OFF by default. The editable default gives short, direct instructions: use an image only when it fits, choose at most one, copy a complete supplied command exactly, use the configured Before / After / Automatic placement on a separate line, and never invent names/URLs. The list includes actual commands, image scene descriptions, optional gallery descriptions, and bound character names.

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

ASSET LIBRARY
Open asset library from the Gallery tab or a gallery shortcut. Manage outfits and Manage backgrounds open the same window filtered to that asset type. All shows outfits, backgrounds and images together.

Search matches names, descriptions, folders, galleries and character/group bindings. Use the type tabs, Character / binding, Current chat only, and sorting to narrow the list. More filters & tools adds missing/filled descriptions, outfit visibility, shared linked or starred backgrounds, and image galleries. Type-specific filters affect only that asset type in the All view. Character filtering shows assets owned by or explicitly linked to that character; unbound entries remain under All characters.

Every asset has an open scene-description field. Edits save when you leave the field or close the library. Outfit names are editable alongside their descriptions. Outfit tools include folder discovery, folder-name import, manual additions and character-button colors. Import folder names reads local directory names only; it does not upload sprite files. Outfit controls retain hiding, ordering, font color and removal from the catalog without deleting files.

Sorting includes name A–Z/Z–A, character/gallery, asset type, description length (characters), character activity, recent characters, missing descriptions first and library order. Character activity uses native chat-size metadata or current-chat message counts; recent uses last-chat date or current-chat speaking order. Sort and Current chat only preferences persist; search text, the selected character and detailed filters reset when reopening. Descriptions, names and bindings use the existing catalogs, so prompt and API context see the same metadata.

Details & bindings edits an image's command name, scene description, availability and bindings. Renaming retains the old name as an alias so existing chat commands still work. General filenames without assignments become explicit assignments when you save their details. No physical files are renamed or copied by metadata edits.

Availability modes:
- Original gallery's chats: General is available everywhere; character galleries follow the character into groups; persona/group galleries use their existing context.
- All chats: list the image in every chat.
- Bound characters/groups: select one or more character avatar IDs, optional specific group IDs, and optionally Require all selected characters to be present. Otherwise any selected character is sufficient. An explicitly bound group also qualifies. An empty binding list qualifies nowhere until you add bindings.

Character bindings work automatically in any group that contains the character; you do not need to bind each group separately. Characters with the same display name remain distinguishable by avatar ID. Missing character/group bindings stay visible for removal in the editor. Descriptions and bindings filter model context, quick send and Current chat only; they do not remove historical images or prevent a manual command from rendering.

Select a gallery to edit its gallery description. Scene descriptions are saved per image. Both are available to current prompt injection and future scene planners. Upload / manage image files opens the existing file tools. Folder galleries also offer newest/oldest and filename sorting. Uploads use the filename/path returned by SillyTavern's server, including group uploads.

FUTURE SCENE INTEGRATION
window.ImmersiveGroupsGallery.getSceneContext() returns a detached data snapshot with chat/group IDs, current round, gallery descriptions, eligible image commands, descriptions, character/group bindings, and availableNow status. openLibrary() opens the library. No automatic image insertion, outfit change, background change or extra model call runs from this interface. Image commands still render through the working LocalImage DOM renderer.

RENDERING AND SHORTCUTS
The tested v15 formatting behavior, General resolution, eager loading and simple max-height setting remain available. Floating/character/persona shortcut visibility, size and position are retained. A popup named Shortcut settings retains fast access to those controls; the full prompt/library controls are in the Gallery settings tab. Changing a gallery or closing the library cancels stale background refreshes so an old request cannot reopen the modal.


```

Quick Image Send now shares the scene’s Backgrounds / images button. Gallery shortcuts can use that menu, the floating icon, both or neither. The scene-menu default falls back to the floating icon when scene controls are disabled. In the asset library, open Details & bindings: character and group controls are always visible, and selecting one switches availability to Bound characters / groups.

Scan outfit folders is directly on the library toolbar in All/Outfits: select a local characters folder to discover matching subfolders containing images, then verify and import them against the server. Hide Basic outfits and Outfit images filters are also directly visible. Image checks use a session cache; Check outfit images retries failed or stale results. Open folder was removed in 0.2.3. Duplicate-safe Upload sprite ZIP remains on each outfit.
