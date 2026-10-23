# Build plan: the factory's own stories, then the first application story of equipment-checkout

Gate 3 binds this plan and every story file it names on main. Stories 1 to 3 are kept here as
history, not as work: their records remain the authoritative account of what happened and none of
them is dispatched again. Story 17 is the only story this plan authorises a builder to start.

| Order | Story | File | State/source |
| --- | --- | --- | --- |
| 1 | Factory status | `.factory/work/story-1/story.md` | Completed. History; records remain authoritative. Do not dispatch again. |
| 2 | Meetings list and modal, candidate A | `.factory/work/story-2/story.md` | Completed as a model comparison, not as product. History. Do not dispatch again. |
| 3 | Meetings list and modal, candidate B | `.factory/work/story-3/story.md` | The comparison's second candidate. Its last transition is in-progress with an expired lease, and only a human may revoke those records, so it stays at that stage as history. Do not dispatch again. |
| 17 | equipment-checkout S1: database, rules and seed | `.factory/work/story-17/story.md` | Ready. The first story of the first application this factory builds through a genuine gate 7. |

## Why the next story is numbered 17 and not 4

`STORY_FILE` in `packages/cli/src/lock-policy.ts` is a flat pattern, `.factory/work/story-<n>/story.md`,
with no project segment, and `BUILD_PLAN` names one build plan for the whole factory. So every
project on this factory draws story numbers from one pool.

`story-4` to `story-16` are already spent. They define thirteen parked factory-feature and
application stories on the `phase-1b-docs` branch, whose file contents are also on
`origin/backup-orchestration-and-stories`. Reusing `story-4` for an equipment story would put two
different stories under one number in two places that both still exist. Numbering equipment's first
story 17 leaves a gap and costs nothing; a collision would cost clarity permanently. The parked
numbering is therefore left standing rather than declared void.

This is a numbering decision only. It is not a decision to resume phase 1b, and nothing here
authorises work on `story-4` to `story-16`.

## Story 17: equipment-checkout S1

The authority for what S1 owns and what it must turn green is
`docs/projects/equipment-checkout/prep/eval-plan.md` section 8.1, with the blueprint
`docs/projects/equipment-checkout/prep/TECH-SPEC.md` and the PRD
`docs/projects/equipment-checkout/prep/PRD.md` behind it. The story file carries the three lists
`story start` and `gate-check` read, and they are copied from section 8.1 rather than restated.

- **Owns, and may write:** `api/pyproject.toml`, `api/requirements.txt`, `api/app/__init__.py`,
  `api/app/db.py`, `api/app/rules.py`, each under `projects/equipment-checkout/`.
- **Frozen and read-only to it, while gating its steps:** `harness/api/**`,
  `api/tests/conftest.py`, `api/tests/unit/**`, `api/tests/db/**`. These exist on main and are
  covered by the lock. The builder that owns a frozen file still cannot change it.
- **Depends on:** nothing. S1 is the first story of the four-story split; S2, S3 and S4 are not
  authorised by this plan and get their own gate 3 when their turn comes.
- **Done means:** the seventeen cases section 8.1 assigns to S1 pass under the locked command
  `node projects/equipment-checkout/harness/api/run-eval.mjs`, and every other locked command
  still passes. The builder's prose is not evidence; the verify run on its pull request is.

## What this plan does not authorise

- No application implementation beyond S1's five files. A change outside the story's Scope list
  fails `gate-check` even when every test passes.
- No change to any frozen test, harness file or test configuration. The correct response to a case
  a builder cannot pass is to report it in the handoff note.
- No second story in parallel. One builder at a time, and S2 waits for S1 to merge.
- Nothing under `.factory/` except story 17's own work folder, which is where its handoff note goes.
