# Build plan: one protected application trial, built twice as a model comparison

Proposed; gate 3 must bind this plan and the three story files it names on main.

| Order | Story | File | State/source |
| --- | --- | --- | --- |
| 1 | Factory status | `.factory/work/story-1/story.md` | Existing completed story; records remain authoritative. Do not dispatch again. |
| 2 | Meetings list and modal, candidate A | `.factory/work/story-2/story.md` | New one-file implementation, after application contract and harness are approved and locked. |
| 3 | Meetings list and modal, candidate B | `.factory/work/story-3/story.md` | The same brief, inputs, locked tests and implementation scope as story 2, built independently. |

Stories 2 and 3 are one controlled comparison of two builder models against one contract, not two product features. `.factory/work/story-2/story.md` and `.factory/work/story-3/story.md` differ only in their own story id and handoff path; their authority, listed inputs, locked tests and single-file scope are identical. Each is dispatched to a different builder model, named in its own story record's holder. Authority for both is `docs/spec/meeting-reminder-contract.md`, incorporating the already accepted modal application.

Both candidates are built from the same main revision, and main does not move between them: no application implementation merges until both candidates have been independently verified and reviewed. Each builder is given only the frozen scaffold and the inputs its story lists. It is not given the historical reference implementation at workspace commit `30c903e`, the other candidate's branch, worktree or pull request, or the other candidate's review. One builder runs at a time; there is no parallel product work.

At most one candidate may be selected. Its final tree takes a human story approval bound to that tree and merges only on passing required checks. The other candidate's pull request is closed unmerged. The factory has no transition that abandons a story, so the unselected story stays at the stage its last transition record names, as history; only a human may revoke those records. The comparison result is a review artifact and is merge authority for neither candidate.

Order: finish preparation and independent review; genuine gate 2 and lock; genuine gate 3; orchestrator starts candidate A and dispatches its builder; independent verification and review of candidate A; orchestrator starts candidate B and dispatches its builder; independent verification and review of candidate B; then selection, human story approval bound to the selected final tree, merge, and story finish. All locked commands must pass at candidate acceptance. Human story approval remains mandatory; no automatic merging.

A scope violation or a protected-input change fails a candidate even when its tests pass. Main may be red only for missing application behavior during this interval. No unrelated pull request merges in it. Factory preparation and its human transition are not stories authorized by this plan.
