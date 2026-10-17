## 0.3.5 — Selective transfers and safer pack updates

- Expand the outfit count on export or import to see **character / outfit** entries and toggle them individually. Excluding an outfit also excludes its sprite files, descriptions, height override, order entry and outfit colors; character-wide choices remain separate.
- Set an editable **Pack version**, independent of the extension and bundle schema versions. Successful exports remember the pack identity/version by bundle name on this installation.
- Review a conflict notice for each existing outfit, selected metadata differences, and matching file sizes/SHA-256 comparisons. Pack revisions indicate newer, older or same as the last processed revision when source identities match.
- Identical sprite bytes with the same filename are kept without uploading again. Different filenames/extensions still require replacement review, even when bytes match.
- Recheck actual destination contents before an acknowledged replacement, detecting changes even when native timestamps remain unchanged. Failed comparisons block affected outfits. Existing defaults, explicit acknowledgement and case-conflict protection remain.
- Keep schema 2 exports and schema 1/2 readers, including historical compatibility fixtures. The separate sprite ZIP importer is unchanged.

Automated validation and the pending clean-install manual test plan are recorded in [the 0.3.5 transfer review](IMPORT_EXPORT_REVIEW_0.3.5.md). This release prepares that manual testing; it does not claim community-pack compatibility has already been demonstrated.
