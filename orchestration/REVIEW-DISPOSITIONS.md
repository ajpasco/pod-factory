# Review dispositions

Jay's rule for this slice: collaborate, require proof, fix what blocks the agreed business flow, and defer optional complexity. The single independent [Claude review](CLAUDE-REVIEW.md) reproduced two defects. No redesign or second general review was requested.

| Finding | Decision and sufficient correction | Evidence |
| --- | --- | --- |
| Timeout leaves no accepted next action | Fixed. An interrupted preparation may be replaced by an explicitly requested separate preparation. The interface exposes that action and preserves the previous files. It never silently retries the unknown task. | HTTP regression checks original state remains intact and model-call count does not increase; browser regression clicks the actual recovery form. |
| Concurrent starts can hide the first successful idea | Fixed. Claim the existing in-process creation guard before the first await. Exactly one request wins; the other receives an explicit conflict. | Concurrent HTTP regression requires one 201, one 409, one saved preparation and an active pointer matching the winner. |
| Browser does not send a stable operation ID | Deferred. Revision checks already prevent double application. A more convenient retry receipt is not needed to complete the demonstrated flow. |
| Different wording for unresolved-task errors | Deferred. Useful wording cleanup; no remaining unreachable action after the fix. |
| Repeating feedback after a known failure can duplicate scope text | Deferred. No extra behavior or lost data results; normalize later if it causes a real usability problem. |
| `localhost` alias refused | Deferred. Use the displayed `127.0.0.1` address; the error names it. |
| Older-preparation chooser | Deferred. First slice has one active preparation. Interrupted originals remain on disk; a project manager is not required for the demonstrated journey. |
| Smaller inherited environment for installed CLI | Deferred. No credential exposure was demonstrated. CLI tools/MCP are disabled; this is not claimed as OS credential isolation. |

Rejected for this milestone: approval-like buttons without a trusted channel, new gate machinery, project management, an event bus, database, auth system or UI framework, and automatic retry of unresolved model execution. These either expand the task or blur authority.

One reporting correction: sandbox/CSP inspection does not establish complete network isolation. The review's wording now states the narrower supported claim. No extra security lab was added.

The Astra session-communication investigation is separate research. Its smallest recommendation is existing Orca direct prompts; a new bridge service is unnecessary. No messaging implementation is included in this slice.
