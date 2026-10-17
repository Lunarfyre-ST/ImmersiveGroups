# Historical transfer fixtures

`v033-settings.json` was generated with `captureCharacterBundle` from the actual
`v0.3.3` tag, commit `8ef13c283cee7023edf534ab564305f72c2bcf3b`, including its tagged
model dependencies. It is not a current-writer export with its version changed.

The input was entirely synthetic: character `fixture.png` / `Fixture`, outfit
`Fixture/winter` labelled `Winter` with description `A warm coat`, a desktop
height of 170 cm with fine tuning 2, and enabled source scene automation.
Selected categories were outfits, heights, colors, and settings. There are no
media files, credentials, real character cards, or user data. The creation
timestamp was normalized to `2026-10-17T00:00:00.000Z` after generation.

Keep this fixture fixed. Regenerating it with current code would defeat its
purpose. The regression checks character/folder remapping, preservation of
newer outfit heights absent from the old format, unrelated data, disabled
imported automation, and unchanged source objects.

This fixture covers a historical version 2 metadata writer. It does not replace
historical version 1 ZIP/media fixtures or real-server import testing.
