# 0.3.9 validation

## Automated checks

- Node 24.19.0: lint, syntax/import/metadata checks and 155 unit tests pass.
- Complete Playwright Chromium 151.0.7922.34 and Firefox 153.0 suites pass.
  Focused 0.3.9 cases also run after the final upload lifecycle refinements.
- Prompt tests cover prompt/API modes, current-outfit context without its
  command, alternative commands, no available changes and unmodified inventories.
  Custom instructions, locks, command parsing, streaming and background behavior
  retain their existing regression coverage.
- Browser coverage includes Basic entries for characters never selected in a
  chat, editing, reordering, removal surviving automatic seeding, and explicit
  restoration. Expression uploads cover filename detection, required assignment
  for unknown names, collision numbering, preview refresh, phone-width forms,
  HTTP failure/retry, unsafe-label rejection and leaving an upload panel while
  its request is pending without dismissing a subsequently opened panel.
- Rebuilt the committed gallery bundle and dependency notices. No dependency
  or transfer schema changes.

## Native compatibility

- Disposable loopback SillyTavern 1.18.0, separate `validation-039` profile;
  native smoke tests pass in Chromium and Firefox. No live user library used.
- Reviewed native `getExpressionsList`, sprite listing and individual-upload
  implementations. Native labels are derived from filenames; changing only a
  multipart label would not correctly assign an unknown filename's expression.
- Native tests upload an existing neutral image, then another neutral and an
  unknown filename assigned to joy. Three images remain, with two neutral
  entries and one joy entry reported by the native sprite inventory.
- Existing native transfer/import, duplicate/update handling, card remapping,
  chat preservation and mobile library checks also pass.

## Remaining manual checks

- Test with actual roleplay models to judge whether repeated outfit commands
  decrease. Automated tests establish prompt structure, not model compliance.
- Try real artwork, custom expressions and a physical phone. Filename detection
  follows native dash/dot suffix conventions; unknown names require a choice.
  Upload choices include native labels that can be preserved safely in filenames.
- SillyTavern's internal sprite cache has no public invalidation export. The
  library refreshes its previews, but an already cached native outfit can require
  reopening the chat to recognize newly uploaded expression choices. Uploads do
  not synthesize chat-change events or rebuild unrelated characters.
- Native uploads are not transactional. Confirmed partial writes remain on disk;
  retrying adds numbered variants instead of overwriting existing images.
- Versions other than SillyTavern 1.18.0, live model generation and enabled
  LunarCore combinations were not specifically retested for this release. No
  diagnostic protocol or LunarCore integration hooks changed.
