# Independent review: the preparation business flow

One review of `orchestration/` against `IMPLEMENTATION.md` and the plan's first milestone, on 2026-10-18. No source was edited, no live state touched: the demo on port 4318, factory records, comparison inputs, the meeting app and the calendar snapshot are unchanged. My probes ran against ephemeral ports and `mkdtemp` directories and are disposable.

## Verdict

**The agreed journey works, and two defects in it should be fixed before this slice is called done.** Both are reproduced below, both are in the journey rather than the architecture, and both have a small correction. Nothing here falsely grants approval: there is no approval or dispatch route, the packet carries `authority: draft-only`, `approvalStatus: approval-channel-not-implemented` and four `not-performed` reviews, and the interface says so on screen.

## What I verified

| Check | Result |
| --- | --- |
| `npm test` | 9/9 pass |
| `npm run test:browser` | pass — idea → answer → draft pair → clickable mockup → coordinated change → reload, fixture provider |
| Live-run evidence in `evidence/` | present and consistent: `live-initial-*` and `live-revised-*` differ in both artifacts, `live-review-packet.json` carries draft-only authority and the four unperformed reviews, `restart-result.json` records `answerPreserved: true`, `artifactDigestsPreserved: true`, `newModelCall: false` |
| Mutation surface | exactly four POST routes (`/api/preparation`, `/api/answer`, `/api/draft`, `/api/changes`); no approval, dispatch, records or settings route exists |
| Drafting provider | no tools, `--strict-mcp-config` with an empty server map, `--permission-mode manual`, `--permission-prompts none`, `--max-budget-usd 2`, schema-validated structured output, temporary cwd, output size caps. The model cannot choose an output path: `workflow.ts` writes the two allowed names itself |
| Generated mockup | served with `sandbox allow-scripts` and `connect-src 'none'` in a framed opaque origin. These restrict parent-origin access, fetch and subresources; they are not proof of comprehensive network isolation. Codex narrowed this claim after review; no additional security demonstration was performed. |

## Fix now

### 1. A timed-out draft leaves the user with no action the app will accept

**Reproduction** (probe against a hanging provider with a 150 ms limit, temp data dir):

```
stage: interrupted | task: interrupted
nextAction shown to the user: "Outcome unresolved. Recover matching evidence or start a separate preparation."
POST /api/draft       -> 409 "Refresh the saved preparation; it changed or has an unresolved task."
POST /api/changes     -> 409 "Refresh the saved preparation; it changed or has an unresolved task."
POST /api/answer      -> 409 "Draft execution is running or its outcome is unresolved. Reconcile saved task evidence before starting another task."
POST /api/preparation -> 409 "A saved preparation already exists. Resume it rather than replacing its answers."
```

**Source.** `workflow.ts:84` sets that `nextAction`; `workflow.ts:37` refuses every mutation while the task is `interrupted`; `server.ts:81` refuses a new preparation whenever `active.json` exists. So the one recovery the app names — *start a separate preparation* — is the one the server rejects.

**Business consequence.** The default execution limit is 180 s (`server.ts:17`) against a real CLI draft, so a slow draft ends the session permanently. The user keeps their idea, answer and any earlier artifacts on screen but cannot draft, revise, re-answer or start again; the only way forward is editing or deleting files under the data directory, which this interface never mentions. Refusing to auto-retry an unresolved task is right — stranding the user is not.

**Smallest sufficient correction.** Let `POST /api/preparation` succeed when the saved preparation's task status is `interrupted`: keep the existing directory untouched, write the new id into `active.json`, and leave the refusal in place for every other stage. That is a condition on the existing guard at `server.ts:81`, and it makes the message at `workflow.ts:84` executable. A way to list or reopen the earlier preparation is a separate improvement, deferred below, not part of this fix.

### 2. Two simultaneous "Start preparation" submissions silently orphan the first idea

**Reproduction** (two concurrent creates against one temp server):

```
status A 201 status B 201
idea the app now shows: "SECOND IDEA: a tool for tracking invoices"
preparations on disk: 2
RESULT: a preparation exists on disk that the app will never show again
```

**Source.** `server.ts:81` reads `if (creating || await currentId())` and only sets `creating = true` at line 82, after the `await`. Two requests that arrive in the same tick both observe `creating === false` and both see no pointer, so both create; the second `rename` wins `active.json` and the first preparation becomes unreachable through the interface.

**Business consequence.** The user's first idea, and only their first idea, disappears with a success response and no message. Sequential double submission is already handled correctly — the second attempt gets `ALREADY_EXISTS` — so this is specifically the two-tabs or double-click-with-slow-disk case. It is cheap to close and it silently destroys work when it happens.

**Smallest sufficient correction.** Set the flag before yielding: check `creating`, assign `creating = true`, then do the `await currentId()` check inside the existing `try`/`finally`. No new mechanism; the single-threaded event loop then makes the guard sound.

## Defer

- **The browser never sends `operationId`**, so `server.ts:79` mints a fresh one per request and the `DUPLICATE_OPERATION` protection in `workflow.ts:35` can never fire for interface actions. The `expectedRevision` check still prevents a double apply, which is why this is not a fix-now. Sending a per-submission id would make a retried request after a dropped response idempotent rather than merely rejected.
- **Two different messages for one condition.** With an unresolved task, `/api/draft` and `/api/changes` return the adapter's "Refresh the saved preparation…" while `/api/answer` returns the workflow's "Draft execution is running or its outcome is unresolved…". One wording would read better.
- **Repeated change requests after a failure duplicate scope lines.** `workflow.ts:111` appends the feedback to `confirmedScope` before the draft runs, and the failure path persists it, so retrying the same wording twice leaves two identical `Requested change:` entries. Harmless to state, untidy to read.
- **`http://localhost:PORT` is refused** by the host pin at `server.ts:46`. The 403 names the correct URL, so the user is not stuck, but typing the usual hostname looks like a failure.
- **One preparation per data directory.** Fine for this slice; a chooser is what would make finding 1's correction fully comfortable.
- **The provider inherits the whole environment** (`claude-provider.ts:55`). The CLI is the user's own, so this is not a demonstrated defect; a minimal environment would be tidier.

## Reject

- An approval or gate-review surface in this slice: the boundary says trusted approval is not implemented, and the packet and interface already say so plainly. Adding anything that looks like approval here is the one change that could do real harm.
- A project list, event bus, database, auth or framework. Nothing in the demonstrated journey needs them, and `IMPLEMENTATION.md` explicitly keeps them out.
- Automatic retry of an unresolved task. The current refusal is the correct behaviour and should stay; finding 1 asks only for a way forward, not an automatic rerun.

## What this review does not cover

One pass, reading the code and running the existing checks plus the two probes above. I did not review the four gate reviews (they remain unperformed by design), the CLI provider against a live model beyond reading the evidence already in `evidence/`, or anything outside `orchestration/`. No security testing beyond reading the request guards and confirming the sandboxed mockup origin; absence of a finding here is not a security clearance.
