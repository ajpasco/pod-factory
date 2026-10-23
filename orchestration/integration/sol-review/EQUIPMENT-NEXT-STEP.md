# Equipment onboarding: mechanics and next prerequisite

**BLOCKED: no supported merge route for the equipment harness/policy/new plan is established under the lock and authorized stories rechecked against the fresh isolated refs below.** An amendment alone does not supply merge authority. The single prerequisite is an explicitly authorized factory maintenance/plan transition that the enforcing rules can admit for those exact paths. Its legal route must be established before an onboarding patch or user approval sequence; this review supplies neither a bootstrap window nor new authority.

## Cached evidence and isolated freshness check

Read locally only: `origin/main` = `a82a857346ce07b55faaa80fce4626c5406bd9d9`; `origin/pod-factory/records` = `3d9c61cbbc476ec559e6b5bbe7c49c286249c36b`. This was the initial cache-only review; shared refs were not refreshed.

The installed `pod-factory@0.0.0-m0` **read-only** `readRecords` reader accepted 66 records with zero flagged records at that cached records commit. Its existing `effectiveLock` selected lock `0b0bc6b73309`, with no effective amendments; `gate3Approval` selected `457d804ac529`, binding tree `6f298f9281269140fae46a0b6e8fcdd2b7c7551c`. The plan and all three story hashes were independently recomputed from that bound tree and matched the record. This validates the cached mechanics used below; it does not authorize the exported equipment package.

Parent subsequently observed remote main unchanged and remote records at `4ebbf1b6e59c38f55d206eda04b61368607b8ab8`. At **2026-10-19 03:29:45 UTC**, an authorized fetch of public main and records into disposable `/private/tmp/d7-records-freshness-2wm93btt` independently confirmed those exact tips. Shared repository refs were not updated.

The same existing read-only reader accepted **67 records, zero flagged** in that isolated snapshot. The only addition since the original cached records commit is `records/20261018T195027Z-check-result-verify-pr-24-ab405d4861b2.json`: a passing verify result for **PR 24**, bound to tree `f4fcb8584018509523a73e31537a708d4506c302` ([CI run](https://github.com/ajpasco/pod-factory/actions/runs/39160415871)). It supplies no story/merge approval, amendment, lock or new plan. Effective lock `0b0bc6b73309`, zero effective amendments, gate-3 approval `457d804ac529`, its tree and all four bound hashes remain unchanged. The existing scope checker again refused all five onboarding paths for all three stories. **The freshness check preserves the blocked conclusion.** This is an observation of fetched tips at that time, not continuing freshness or equipment authorization.

Code locations below refer to the pinned `origin/main` source, not potentially different workspace files:

| Rule | Concrete code evidence |
| --- | --- |
| With a lock, only a story approval supplies merge approval; bootstrap stops counting. The exact PR/tree must also have a passing verify result. | `packages/cli/src/check-runner/gate-check.ts:22–43`, `:81–89` |
| Amendments approve exact locked-path before/after content for a PR/tree, against an effective lock. They are checked separately from merge approval and scope. | `packages/cli/src/commands/approve.ts:203–242`; `packages/cli/src/check-runner/lock-guard.ts:130–146`; `gate-check.ts:69–89` |
| Scope comes from the gate-3-bound story bytes, not a widened PR copy. | `gate-check.ts:94–126`; `packages/cli/src/story.ts:81–111` |
| A story may change its own work folder; every other `.factory/` path is refused even if a Scope glob would match it. | `packages/cli/src/story.ts:114–125` |
| Gate 3 reads the plan and named stories **already on main**. It does not land them. | `packages/cli/src/commands/approve.ts:142–175` |
| A PR cannot modify the enforcing copy that judges its own merge. | `.github/workflows/pr-checks.yml:2–6`, `:125–139` |

## No current story covers the transition

| Bound story | Permitted product/source scope |
| --- | --- |
| story-1 | `packages/cli/src/commands/status.ts`, `packages/cli/src/status.ts`, `packages/cli/src/status/**`, `packages/cli/src/run.ts`, `packages/cli/src/index.ts` |
| story-2 | `docs/projects/meeting-reminder/web/src/main.ts` |
| story-3 | The same Meetings source file |

The existing `outsideScope` function refused **all five** representative onboarding paths for **each** bound story: `packages/cli/src/lock-policy.ts`, `docs/eval-plan.md`, `docs/projects/equipment-checkout/qa/harness/prep-journey.mjs`, `.factory/work/plan/build-plan.md`, and `.factory/work/story-4/story.md`. Merely approving a story PR cannot satisfy this check. The bound plan itself calls story-1 completed, limits stories 2/3 to the Meetings comparison, forbids unrelated PR merges during it, and says factory preparation/transition is not authorized by that plan (`.factory/work/plan/build-plan.md:7–19`).

Consequently, “amend eval-plan, then merge a normal docs/policy PR, then approve the new plan” is not an established route. The first merge lacks an eligible scope; the shared plan path is explicitly outside every story's own folder. Reapproving gate 3 cannot import an unmerged replacement plan. Finishing the Meetings comparison also does not itself grant equipment onboarding scope.

## Work still required after that prerequisite

The one-application protection pattern exists, but equipment paths and its runner are absent from `LOCKED_PATTERNS`/`LOCKED_COMMANDS` (`packages/cli/src/lock-policy.ts:1–71`). A locked test couples these constants to eval-plan sections 4/5 and currently expects eight commands (`packages/cli/test/lock-constants.test.ts:36–50`). An amendment changes effective file hashes, not the lock's pattern/command lists (`packages/cli/src/lock-state.ts:30–62`); verification continues using the existing lock's exact commands (`packages/cli/src/check-runner/verify.ts:79–86`). No equipment files are present on cached main.

The workspace QA package has 50 case headings including N-00; the earlier 49-case count is historical. A concurrent Sol task has now authored `qa/harness/prep-journey.mjs` for the orchestration preparation journey, using synthetic providers. That is not the equipment application acceptance harness. Application runner/migration/seed/reset commands remain unresolved. Authoring and independent review of executable tests, runner and fixtures; baseline/classification evidence; protection of the exact harness/runner/dependency bytes; approved equipment contract and bounded stories; direct-user approvals; and genuine supported execution/result integration remain separate work. The preparation backend's passing tests establish none of those application results.

No new implementation or lab was created. The sole fetch wrote only to the disposable repository for the authorized freshness check. No shared ref, live record, lock, setting, service or preparation was changed; no approval, merge or builder launch was performed. No user command is proposed while the legal transition remains unresolved.
