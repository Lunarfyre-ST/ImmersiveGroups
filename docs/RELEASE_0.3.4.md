## 0.3.4 — Outfit updates and import review

- Added **per-outfit height overrides**, with a blank value inheriting the character’s normal height. Overrides work with relative scaling and retain individual fine tuning.
- Added **per-outfit import selection** and automatic **Update mode** when existing outfit entries or sprite folders are detected. Conflicting outfits start unchecked.
- Added the update warning, a list of conflicting sprite files and an **I understand what I am doing** acknowledgement before selected conflicts can be replaced.
- Rechecked destination mappings, metadata and sprite inventories before applying updates, with changed approvals invalidated and ambiguous case-only replacements blocked.
- Reviewed transfer compatibility and validation, including duplicate archive/destination rejection, legacy card handling, partial-failure reporting and documented version 1/2 support. Existing sprite ZIP imports remain unchanged.
- Hid **Load more messages** in last-reply-only mode while restoring it for scrollable history, preserving chat data and native handlers.
- Updated About/footer version displays and added a shared release version with checks to prevent mismatches in future builds.
