# ImmersiveGroups 0.1.6 — Scene commands and context trial

Copy the ZIP's ImmersiveGroups contents over your existing extension files and reload SillyTavern. The root README.md is omitted. Scene automation starts disabled. Existing Gallery image prompts have their own independent toggle.

## Start with Prompt mode

1. Open ImmersiveGroups → Automation → Scene commands & context.
2. Enable model outfit/background commands. Keep Mode on Prompt.
3. Choose All active, unlocked characters or Speaking character only.
4. Set injection depth. Default 1; 0 puts the system instructions nearest the reply.
5. Open Preview context & token count to inspect the actual instructions, available commands and descriptions. Preview speaker affects this preview only. Real group generations use the member SillyTavern drafted.
6. Generate a normal reply. The model should append commands only when a change is appropriate. Outfit changes are on by default once automation is enabled; background changes are a separate opt-in.

This trial uses SillyTavern's extension-prompt injection hook with the name ImmersiveGroups.Scene. It does not add a movable item to the Chat Completions Prompt Manager. Automation provides its own prompt preview and current-tokenizer count. If token counting is unavailable, the preview explicitly labels its character-based estimate.

## Command format

Commands must occupy separate lines at the end of the assistant reply:

```text
::outfit "character-avatar.png" "Character/outfit2"::
::background "estate.jpg"::
```

Copy actual commands from the prompt preview; avatar filenames and folder names are exact IDs. The prompt supplies complete command lines without JSON escaping. No slash-command executor is used. Unknown targets, hidden or missing outfits and unavailable backgrounds are rejected. Multiple outfit changes are supported, with at most the last command for each character and the last background command applied.

The extension hides complete command text in displayed messages by default. It changes text nodes without rebuilding surrounding HTML, so action/dialogue formatting is preserved. The original native message content, including its generated commands, stays intact. Prior scene-command lines are removed from outgoing conversation copies while the current system instructions remain available.

Automatic execution is armed only for real, new assistant generations. Loading a chat, selecting an existing swipe, editing an old message or running a dry prompt inspection does not replay historical commands. The manual Apply commands from last reply button is available for testing and uses the same scope and lock checks.

## Scope, descriptions and locks

All-character mode includes the active group's unlocked outfit catalogs. Its default instructions prioritize the speaker and avoid changing others without a scene reason. The catalog appears before the current-speaker footer to keep a stable prefix when only the speaker changes; actual caching depends on the provider and chat prompt.

Speaker-only mode includes one outfit catalog and rejects commands for every other character, even if the model knows their folder names. API trials use the last assistant reply's author as the speaker. Ambiguous names are not guessed.

Outfit locks omit the character's outfit catalog from injected instructions and block execution again after image preloading. Manual outfit selectors still work while locked. Background commands respect native chat-background locks and a model-only lock in the background selector popup. The model-only background lock leaves manual selection and chat-load default rules available.

Scene descriptions come from the outfit and background libraries. Unbound backgrounds are available globally; a bound background is eligible only when every active chat member is included in its character bindings. Native background files must still exist. You can limit the number of outfits per character and backgrounds listed in the prompt.

Chat switches, stopped generations, changed replies and new generation requests invalidate pending work. A manual background choice also cancels a pending model background change. Scene changes save extension preferences, never reload or save the chat message array.

## Separate API trial

Choose API trial to omit scene instructions from the main RP request. Configure a destination, then use Analyze & apply last reply. This sends only the complete last assistant reply and the selected scene catalog, not the full conversation. Valid returned commands use the same executor and locks as Prompt mode.

Available destinations:

- Current main API, through SillyTavern's generateRaw interface.
- A connection profile, through ConnectionManagerRequestService, without switching the selected profile.
- A custom OpenAI-compatible full chat-completions URL and model name. This uses a browser request; the server must permit the browser origin. Optional bearer keys remain in page-session memory and are not saved in extension settings or preset exports.

The output-token limit defaults to 256. Duplicate requests are blocked while a trial is running. Cancelling or changing chats discards stale results; profile/custom requests also receive an abort signal. A native main-API request may continue on the server after cancellation, but its result cannot apply changes.

There is no automatic second API call after each reply in this release. This manual trial establishes the request/response path for later scheduling. Coordinated Gallery-image automation and a movable Prompt Manager entry remain planned.

## Validation

Unit tests cover command parsing, scope filtering, lock/availability checks, prompt-history separation, stable catalog prefixes and all three request transports. Browser integration uses the real combined extension modules against a synthetic SillyTavern fixture. It checks multiple outfit commands, speaker-only rejection, native/model background locks, a lock changed during loading, manual selection while locked, no history replay, dry-run suppression, formatting across em/q/b elements, unchanged native chat objects and manual main/profile/custom API trials. Model behavior and provider compatibility still require live testing.
