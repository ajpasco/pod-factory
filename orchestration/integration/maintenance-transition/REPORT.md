# Maintenance / plan transition candidate — NOT ADOPTED

Pinned source: `a82a857346ce07b55faaa80fce4626c5406bd9d9` (`origin/main` as observed in this session). Implementation exists only in disposable export `/private/tmp/maintenance-transition-a82a857`. Shared deliverables are this report, `candidate.patch`, `HASHES.json`, and test evidence in this folder. No shared source, installed CLI, refs, records, lock, workflow, settings, preparation or application was changed. All record-writing and simulated merges in tests use the existing shipped disposable unit-fixture machinery, never the live repository.

## Single mechanism

Extend the existing amendment approval with optional `approval.maintenance: true` and an explicit opt-in CLI flag. This is not a new record type, store or engine. An ordinary amendment remains locked-path permission only, even if it happens to cover a whole PR. No preexisting human act gains merge authority.

The explicit maintenance statement authorizes merging only the named reviewed PR at its exact tree, against one lock, with the complete named changed-file set. It also states that gate 3 is separate. The confirmed SHA-256 input binds the statement, tree, before/after file map, lock reference, maintenance marker, and PR number. The validator recomputes this maintenance hash; adding the marker or changing the PR on an old record fails. The marker is allowed only as literal true on amendments binding a PR, a tree, a nonempty file set and exactly one reference.

Default schema-1 record bytes and shown-hash input remain unchanged when the marker is absent. Older enforcing copies reject marked records as unknown fields; deployment of a reader/enforcer that understands this extension is a rollout dependency, not permission to ignore their refusal.

## Enforcement

- The human ceremony requires every changed path exactly once, no extras, in a nonempty diff from the merge base with fetched main. Locked before hashes come from the effective lock; unlocked before hashes come from that merge base. After hashes come from the reviewed PR tree. Additions/deletions use null for absence. PR movement during confirmation refuses the write.
- Gate-check independently rederives the current diff and hashes. One complete active marked record must cover exactly that nonempty diff at the same PR/tree and reference the currently effective lock. No partial unions or standing grants exist.
- The existing locked-path rule still checks changed and untouched protected paths. A mixed maintenance record atomically checks/applies its locked subset against effective locked before hashes. Unlocked bindings never enter the lock's hashes or held history. Unmarked historical amendments retain their original whole-record interpretation, including records naming out-of-pattern paths.
- Existing unrevoked passing verification for the same PR/tree remains required. The lock's pattern and command lists are unchanged. Existing record rereading/revocation handling remains in force. Revoked, replaced or stale lock references cannot grant maintenance authority.
- The story approval/scope route is preserved. Landing a shared build plan or story does not approve its execution: an actual fixture story-start after simulated maintenance landing refuses without gate 3. There is no equipment builder authority in this candidate.
- Repeating a mixed approval after its locked after-content is already effective gives the existing safe unchanged-path refusal, with no prompt or record write. Revoking that approval permits a fresh review. This preserves the shipped refusal for locked no-op amendments; the candidate does not add a second ceremony for the same mixed content.

## Changed files and protected bytes

The patch changes only five source files and adds one regression file:

| Path | Purpose |
| --- | --- |
| `packages/cli/src/commands/approve.ts` | Explicit maintenance opt-in, complete changed-file review, unlocked base hashes, explicit confirmed intent |
| `packages/cli/src/check-runner/gate-check.ts` | Exact-diff maintenance alternative to existing story scope; existing verify/lock checks still required |
| `packages/cli/src/lock-state.ts` | Filter unlocked bindings only for explicitly marked maintenance |
| `packages/cli/src/records/format.ts` | Optional marker canonicalization and maintenance-only hash fields |
| `packages/cli/src/records/validate.ts` | Narrow marker validation and confirmed-hash recomputation |
| `packages/cli/test/maintenance.test.ts` | New real regression cases using shipped fixture helpers |

`packages/cli/test/maintenance.test.ts` is a **new locked path** under pinned `packages/*/test/**`; its before value is absent. Its exact after SHA-256, every source before/after SHA-256, pinned base and patch SHA-256 are in `HASHES.json`. No existing locked test, runner, dependency, workflow or policy constant was edited. The new protected test still requires lawful review/authorization during adoption; its presence in this candidate supplies none.

## Verification evidence

Executed in the disposable export. The shipped Vitest configuration uses `test/support/git-env.ts`: a temporary `GIT_CONFIG_GLOBAL` with Test Human / human@example.test and default branch main, plus `GIT_CONFIG_NOSYSTEM=1`. No global Git configuration was edited. Custom test configurations must retain that fixture setup.

Executed commands:

- `npm ci --offline --ignore-scripts`: dependency installation passed from local cache; no lockfile change.
- `npm run typecheck`: passed.
- ESLint and Prettier checks on all six changed files: passed.
- Existing relevant suites: 8 files / 117 tests passed in the initial bounded run, including approval, lock, lock-state, CI jobs, revocation chains and drift recovery, story scope and record validation.
- Final frozen candidate: `npm test` passed **19 files / 204 tests**, including **23 new maintenance regressions** and all existing CLI suites. Exact summary and complete log are in `RESULTS.json` and `full-cli-tests.log`.

Regressions cover mixed/new plan/story/unlocked policy/protected config content; unlocked-only approval; ordinary complete amendment lacking authority; marker/PR hash tampering; partial/empty/extra sets; incorrect before/after; wrong PR/tree/lock; stale protected before; missing/failing/revoked verification; moved PR; maintenance revocation during reread; revoked/replacement lock; actual empty diff; unlocked edits/deletions; invalid marker/target; existing agent refusal; historical unmarked out-of-pattern lock-state semantics; repeated mixed approval without another write; and fresh approval after revocation.

The first full CLI attempt exposed a new test fixture using an unsupported agent marker. The fixture was corrected to the already shipped `CLAUDECODE` marker. Identity detection was not changed. The report of final results is limited to the reruns shown in the evidence files.

**Meeting-reminder protected application runner: NOT RUN.** Pinned `docs/projects/meeting-reminder/web/src/main.ts` contains only `import './style.css';`. CLI suite success is not proof of the separate protected browser acceptance runner, all `LOCKED_COMMANDS`, CI, merge readiness, a green transition PR, or equipment acceptance. No application acceptance/failure allowance was added. Completion of the separately authorized comparison and genuinely current verification may remain prerequisites independently of transition authorization.

## ADOPTION boundary

**Existing pinned main cannot admit this candidate under the observed active lock and approved story scopes.** A normal amendment supplies locked-path permission, not merge authority; the current stories do not authorize these enforcement-source changes; and the new protected regression also requires reviewed locked-path coverage. The PR-checks enforcing copy comes from main, so code in this candidate cannot judge or authorize its own adoption. Running candidate checks locally changes none of that.

Adoption therefore requires a separately reviewed, explicitly human-authorized factory transition whose legal route is established under the existing enforcing rules, plus genuinely passing current verification. That route has not been established or executed here. No bootstrap window is opened, no lock revocation or merge is requested, and no operator command sequence is proposed. Applying this patch or approving its design is not equipment onboarding/build authorization. After lawful adoption, exact equipment inputs, tests/runner/protection and a new bounded gate-3 approval remain separate prerequisites.

Draft `phase-1b-docs` ADR-018 was read as prior design context only. Its broader automatic execution, failing-test allowance, identity and concurrency proposals are neither adopted nor implemented.
