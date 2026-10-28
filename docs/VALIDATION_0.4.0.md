# 0.4.0 validation

## Automated coverage

- Node 24.19.0: lint, syntax/import/metadata checks and 162 unit tests pass.
- Complete Playwright Chromium 151.0.7922.34 and Firefox 153.0 suites pass;
  focused 0.4.0 cases run again after final UI/lifecycle refinements.
- Saved auto-fit geometry is compared before/after an actual reload with five
  characters, explicit widths, centering and bottom controls. PC/mobile recent
  speaker settings remain independent and the live height reference is editable.
- Library character edits preserve shared centimeters, independent fine tuning,
  exact fractions and explicit mobile zero. Existing main-editor regressions run.
- Shared preferences resolve one explicit preferred match, skip duplicate
  preferences and respect locks. Actual common-outfit execution chooses the
  preferred folder. Changing preference during a delayed request rejects the old
  target before commit. Existing background-link and explicit-command precedence
  regressions remain in the full suite.
- Transfer tests cover typed/absent preference metadata, keep/update policies,
  metadata comparisons and rejection of stale destination review. Writer schema
  remains 2 and readers remain 1/2.
- Expression tests cover server-side additions, rescanning, preview/filter UI,
  cancellation without writes, actual removal/replacement, content changes after
  review, ambiguous filename stems and cross-folder/external-path rejection.
  Image checksums are local review evidence and are never diagnostic fields.
- Mobile idle background coverage checks horizontal/vertical crop frames, reversal,
  dropdown persistence and switching back to unchanged desktop movement.
- Background-switch regressions check painted pixels after cross/sequential fades
  with idle pan and scene fade enabled. Mobile keeps the native node under the
  body and animates only background size/position, without element transforms or
  a paint-containment wrapper. Reduced motion restores native painting. Pure
  tests cover cover/contain, stretched, auto/fixed sizes and unloaded fallbacks.
  The user reports Samsung Internet backgrounds recover with idle movement off;
  avoiding reparenting only on background switches did not resolve it. Mobile
  now avoids the wrapper entirely. Persistent black was not reproduced in desktop
  Chromium/Firefox; physical Samsung Internet confirmation remains required.
  No physical mobile/WebKit validation was performed.
- Viewport regressions simulate native transformed-root/mobile page geometry:
  maximum-strength horizontal/vertical background movement and oversized character
  exits cannot scroll the document. Internal chat scrolling and motion cleanup
  remain available. Physical phone confirmation is still needed.
- Phone checks cover panel overflow and thumbnail/text separation. The final
  phone expression-manager screenshot was visually inspected.
- Native-refresh guards cover changed chat, generation in progress, missing
  controls and the unchanged-value native selector action.

## Native SillyTavern

- Disposable loopback SillyTavern 1.18.0 with a fresh `validation-040` profile;
  Chromium and Firefox smoke tests pass. No live user profile/library used.
- Reviewed native expression listing, individual sprite upload/delete and API
  selection handler behavior. Native replacement removes matching stems before
  writing; the UI describes this actual partial-failure boundary.
- Native tests review/delete one image and replace one variant, keeping other
  files intact. A server write outside the library adds a new expression; rescan
  refreshes both library inventory and the real native expression list without
  reloading the page. No synthetic chat-change event is used.
- Existing native transfer/card/remapping, duplicate/update import, chat/state
  preservation and mobile-library checks also pass. Synthetic PNG fixtures have
  valid chunk checksums for Firefox's strict decoder.

## Optional LunarDebug

- Companion LunarCore 0.0.8 working tree: 34 unit tests, syntax/metadata checks
  and LunarDebug Chromium integration tests pass. This includes the new retained
  automation outcome summary, fixed reasons and no aggregate/detail duplication.
- ImmersiveGroups behavior agrees with absent, disabled, incompatible, throwing
  and enabled sinks. Enabled per-command evidence records the fixed lock reason
  without character/avatar/outfit identifiers. Existing recorder Stop/Clear,
  late loading, cancellation, archive and privacy regressions remain passing.
- Changes are in both checkouts; LunarCore is still optional. Its release version
  was not changed. Older compatible sinks can omit unfamiliar reason enums.

## Remaining checks and limits

- The exact reported live auto-fit squishing was not reproduced in the fixture.
  Initial sizing now refreshes after font/page readiness, observes bottom rows
  and avoids fitted-grid centering margins. Confirm reload behavior with the
  user's saved settings, theme and device before treating that report as closed.
- Rescan is an explicit action, not a background filesystem watcher. During
  generation it updates library inventory but defers native refresh to a later
  rescan. Missing native controls leave the library usable; other SillyTavern
  versions and physical phones have not been claimed as tested.
- Expression edits are reviewed but native writes are not transactional and
  cannot exclude a concurrent write after the final preflight. Keep the offered
  backup before destructive edits. A failed native replacement can leave the
  original removed; the UI reports that possibility and refreshes inventory.
- Real artwork/model generation, user-specific theme combinations and larger
  collections still benefit from manual testing. Companion integration tests
  use simulated host APIs; no installed hook coverage is inferred from versions.
