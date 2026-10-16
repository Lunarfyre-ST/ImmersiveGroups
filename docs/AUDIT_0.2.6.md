# ImmersiveGroups 0.2.6 review notes

Reviewed on 2026-10-16. This is a source review and automated regression pass over the browser extension, not a penetration test of a deployed SillyTavern server.

## Confirmed issues fixed

| Area | Finding and resulting behavior | Evidence |
| --- | --- | --- |
| Sprite duplicate names | JavaScript Number increments can stop changing very large numeric suffixes. BigInt increments preserve numbering and allow the collision loop to finish. | Large-suffix regression test. |
| ZIP extraction | Declared archive sizes alone do not bound decompression. Streaming extraction now stops above the actual image-byte limit; total uploaded bytes are checked separately. | Forged-size ZIP regression test. |
| Upload destinations | Backslashes, deeper folders, empty segments and names sanitized differently by the host could produce ambiguous targets. Uploads normalize separators and reject unsupported destination shapes and reserved names. | Destination-validation tests. |
| Concurrent sprite imports | Two imports could read the same initial file list and pick the same new name. Imports targeting the same normalized folder now run sequentially in this extension instance. | Concurrent-import browser test. |
| Request headers | Removing Content-Type from a host-provided header object could affect other requests if that object was shared. Multipart requests now edit a copy. | Browser fixture with shared headers. |
| Prompt ownership | Gallery history cleanup edited caller-owned message objects and text parts. It now returns copied records while retaining image parts and system instructions. | Original-payload preservation browser test. |
| Local image paths | Encoded path separators and control characters were insufficiently restricted. Unsafe sources are rejected; normal local filenames remain supported. | Path-validation tests. |
| Gallery lifecycle | Completed uploads could reopen a closed or replaced modal. View tokens now guard redraws, and regular gallery-list requests are cancelled on replacement or close. | Delayed-upload browser test. |
| Metadata robustness | Non-string aliases could throw while resolving an image. Resolution now ignores them. Named group-member assignment records are created as own properties. | Malformed-alias rendering browser test; source review. |
| Preview traffic | Lazy thumbnails could bypass the bulk check's concurrency limit. Both now share a three-request queue. Partial imports also invalidate preview state. | Queue unit test and request-count browser test. |
| Scene rendering | Streaming mutations rescanned previous message rows. The observer now collects changed rows and disconnects while applying its own formatting markers. | Browser test recording the rows walked. |
| Library sorting | Every sort scanned chat history repeatedly for every character, and spreading long histories into Math.max could overflow the argument stack. Name/filter operations skip history; activity/recent metrics use one pass and explicit avatar attribution. | No-scan assertion and 150,000-message regression test. |
| Legacy scene helpers | The wrapper wait polled continuously when the wrapper was absent; chat-history formatting repeatedly searched for each message index and assumed a character existed. Wrapper attachment now follows DOM changes, history uses its loop index and missing characters fall back safely. | Source review plus combined initialization regressions. |

## Other boundaries reviewed

- Display text uses React escaping or text nodes. Existing static HTML templates were reviewed for dynamic data insertion.
- Scene commands retain exact catalog validation, character scope, outfit/background locks and checks that the chat/reply still matches the request.
- Custom API calls retain HTTP(S) validation, omitted browser credentials, blocked redirects, a session-only API key and cancellation handling. Main/profile API behavior remains covered by simulated transports.
- The review found no direct extension calls that truncate, delete, reload or save native chat history. Browser fixtures verify that their chat-message arrays remain unchanged by the tested extension operations.
- The settings import/export whitelist remains restricted to visual preferences and corrections.

## Dependencies

`npm audit --json` reported zero known advisories for the locked npm dependencies. This result is a database check at review time, not a guarantee that every dependency is free of defects.

The vendored JSZip 3.10.1 reader is outside the affected ranges of the reviewed [prototype-pollution advisory](https://github.com/advisories/GHSA-jg8v-48h5-wgxg) and [path-traversal advisory](https://github.com/advisories/GHSA-36fh-84j7-cv5h). Its existing version and license notices are retained. Decompression guards use its documented [streaming API](https://stuk.github.io/jszip/documentation/api_zipobject/internal_stream.html).

## Validation and limits

- Build, syntax/import and settings-ID checks.
- 54 unit tests, including archive limits, filenames, paths, metadata, long chats, API behavior and settings migration.
- Combined browser regressions with synthetic chats, simulated host APIs and controlled upload/network responses.

Actual server permissions, authentication, filesystem behavior, image decoding and provider billing belong to the host or provider and were not penetration-tested here. Import serialization coordinates one loaded extension instance; simultaneous imports from separate tabs or devices still require coordination. Main-API requests can continue on the provider after local cancellation; late results are discarded. Real-device and real-model testing remains necessary.
