# ImmersiveGroups 0.1.9 — Automatic API scene analysis

Copy the ZIP’s ImmersiveGroups contents over the existing extension files and reload SillyTavern. The root README.md is excluded.

## Enable automatic calls

1. Open ImmersiveGroups → Automation → Scene commands & context.
2. Enable model outfit / background commands, then select **API — separate scene analysis**.
3. Keep the main API, connection profile or custom URL/model that worked in your manual test.
4. Check **Automatically analyze new replies** under Separate API analysis.
5. Keep All active, unlocked characters selected if one planner call should be able to change everyone’s outfits. Enable background changes and bind shared backgrounds as needed.

Automatic calls are off by default, including for existing API trial configurations. The manual Analyze & apply last reply button remains available. Custom API keys remain page-session-only and must be re-entered after a reload if your server requires one.

## Trigger behavior

- A fresh completed RP reply arms automatic analysis. The extension waits until SillyTavern stops generating before making the planner call.
- A group round makes one call after all participating characters finish, using the last assistant reply and the current scene catalog. It does not send the entire round or chat history. Speaking-character-only scope therefore targets the final reply’s author; choose all-character scope when appropriate.
- The planner can return multiple outfit commands and a background command. Existing outfit locks, background locks, linked-only background filtering and in-place sprite changes still apply.
- Opening chats, selecting existing swipes, first messages, quiet/impersonation generations and dry prompt previews do not start calls. A newly generated swipe or continuation is eligible as a fresh generation; selecting a previously generated swipe is not.
- Duplicate render/end events cannot start another request for the same completion. The planner’s own quiet events do not recursively invoke or cancel its request.
- A new generation, chat/group change, message edit/deletion/swipe, disabling automation or Cancel API analysis cancels queued work and discards stale responses. Transport requests are aborted where supported. A main-API request can continue on the server after cancellation, but its result is discarded.
- Queued and running states are visible in the status line. API errors are shown there, and failed calls are not automatically retried.

Validation: 32 unit tests, syntax/import checks and full browser regression using mocked SillyTavern APIs. Automatic-flow tests cover group coalescing, streaming event order, duplicate events, the planner’s own lifecycle, main/profile/custom transports, cancellation and preserving native chat content. No real model/API requests were made during these tests.
