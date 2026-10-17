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

## ZIP/media fixtures

`v033-media.zip` was produced by both `captureCharacterBundle` and
`createTransferZip` from the same tagged 0.3.3 commit and its dependencies.
It contains a synthetic `fixture.png` character, `Fixture/winter` outfit,
170 cm height, `fixture-group` binding group, `fixture-room.png` background,
and `scene` gallery assignment at `user/images/Fixture/scene.png`. The background
and gallery are bound to the character/group. Outfit, height, background,
gallery, group, and settings categories were selected, including their media.
Each media asset is the same tiny synthetic PNG used by browser fixtures.
The manifest creation timestamp was normalized before packing; the ZIP itself
is frozen exactly as the old writer produced it.

`synthetic-v1-media.zip` is explicitly a **synthetic version 1 contract fixture**,
not an export from 0.3.1. It uses the same manifest data and image bytes, with
`version: 1`, no `selection`, producer `synthetic-v1`, and a descriptive name.
It was packed directly with JSZip, without using the current transfer writer.
ZIP entry dates are fixed to 2026-10-17 UTC. Available Git history and published
release assets did not contain a 0.3.1 writer or genuine version 1 export.

The ZIP tests pin archive hashes, read declared media, check their hashes/sizes,
exercise legacy grouped choices and remapped relationships, preserve absent
outfit-height fields, and reject corrupted/missing assets before import.
Only these two ZIP paths are exempted from the repository's ZIP ignore rule.
Do not replace them with regenerated current-writer output.

These fixtures do not replace a genuine historical version 1 export or
real-server import testing. Add such an export separately when one is available.
