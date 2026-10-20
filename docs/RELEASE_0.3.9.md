# v0.3.9 — Expression uploads and outfit library fixes

- Outfit prompts keep the current outfit as reference without offering its
  command as a change. Added instructions explain that continuing a scene or
  describing clothes does not require reapplying an outfit. Applies to prompt
  and API modes; custom instructions and automation preferences are retained.
- Outfit cards have **Add expression images** alongside the existing sprite ZIP
  importer. Select one or more images, review detected expressions, and assign
  an expression to unknown filenames before uploading. Uses SillyTavern's
  expression names, including supported custom names, and native sprite uploads.
- Expression uploads keep existing images, adding numbered filename variants
  for duplicates. Size limits, per-folder upload queues and partial-failure
  reporting also apply. Library expression previews refresh after uploads.
  SillyTavern may require reopening the chat to refresh its own cached list.
- New characters' Basic outfits appear in the library before their chat is
  opened. Edit, hide or remove them as usual. Removal keeps files and persists
  through automatic seeding; explicit addition restores the entry.

No transfer schema or dependency changes. Automation remains opt-in. Uploads do
not select outfits or rebuild the scene. See [validation](VALIDATION_0.3.9.md).
