# ImmersiveGroups 0.2.6 — Security and performance cleanup

- Hardened sprite ZIP imports with limits on actual decompressed bytes, stricter destination validation and safe numbering for unusually large filename suffixes.
- Queued overlapping imports into the same sprite folder within one extension instance to avoid duplicate-name races. Multipart uploads now copy request headers before changing them, and partial uploads refresh the outfit-image cache.
- Changed Gallery prompt cleanup to copy message objects and multimodal text parts, preserving references supplied by SillyTavern and other extensions.
- Tightened local image-path validation and made malformed image aliases harmless.
- Prevented late image uploads from reopening a closed or replaced gallery. Regular gallery file-list requests are cancelled when superseded or closed.
- Limited concurrent outfit-preview checks to three and reduced scene-command processing to changed message rows during streaming.
- Removed repeated history scans from ordinary library sorting. Activity/recent sorting now uses one pass and handles very long chats without argument-stack overflows.
- Removed continuous polling for the native sprite wrapper, reduced chat-history indexing work, handled missing chat-history characters and removed a verbose group-metadata console dump.

Validation: build/import checks, 54 unit tests, browser regressions and an npm dependency audit. The lockfile audit reported zero known advisories at review time. See [the review notes](AUDIT_0.2.6.md) for scope and limitations.

Replace the matching extension files and reload SillyTavern. Existing settings and metadata remain in place. The ZIP excludes the root README.md and contains no user chats, settings, galleries or credentials.
