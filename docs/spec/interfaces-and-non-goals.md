# pod-factory: Interfaces and non-goals

> Reference document (2026-10-13): `docs/TECH-SPEC.md` 1.0 is the current design and wins where this file differs. This file keeps the detail for phases 1b onward.

Tech spec sections 4 (Interfaces) and 5 (Non-goals for this design), 2026-10-12. Integrated into the spec; every OPEN item below is resolved in ADR-010 to ADR-014, and the resolution is listed at the end of this file. Where the body text says OPEN-n, read the resolution.

Authority, in order: `docs/PRD.md` 0.9.1 (records 0001 and 0002), then ADR-001 to ADR-009. Mechanisms taken from `docs/PRD-reference.md` are cited as "reference" and used only where they fit the PRD. Orca command names come from Orca's own docs and CLI specs (`orca/docs/site/content/docs/cli/orchestration.mdx`, `orca/src/cli/specs/`). Where the documents do not decide something, this draft writes OPEN-n and lists it at the end instead of deciding.

This file extends TECH-SPEC 4.1 and 4.3 to 4.6. The builder contract (TECH-SPEC 4.2) is unchanged. Where ADR-012 or ADR-013 states a merge rule, class or count differently from a passage below, the ADR wins; the resolutions table at the end maps each open item.

## 4. Interfaces

### Commands: `pod-factory <command>`

One installed CLI serves people, hooks, the check runner and the release executor (ADR-001). Packages map as ADR-002 says: `packages/cli` for commands, `packages/hooks` for `hook`, `packages/check-runner` for `ci`, `packages/release-executor` for `release`.

Conventions for every command:

- **Exit status.** 0 when done. 1 when a rule refused the action or a check failed. 2 for a usage error. `hook` follows Claude Code's hook protocol instead.
- **Failure messages.** A refusal says, in plain language, what happened and the approver's options (REQ-22). When it stops work, the same message goes to the independent notification channel (OPEN-22).
- **Machine output.** Read-only commands accept `--json`, for the Orca plugin and scripts.
- **Writing a record.** Validate it against its schema. Append it as one commit to the local `pod-factory/records` branch without touching the working tree, under a lock so concurrent writers serialize (reference: record writes are serialized and atomic). Push. If the push fails, the record stays local and pending, nothing relies on it, and the command exits 1 and says how to retry.
- **Orca.** Orca's factory commands run these same commands in a human-owned shell terminal, strip control characters from typed text, and confirm decision and hash before writing (REQ-12). There is no second write path.

#### The approval path (human only)

Each command shows a plain-language summary and the hashes it will bind, then asks the human to confirm. It re-hashes at confirmation and refuses if anything changed. Each refuses when no git identity is configured, because every record carries the actor's git identity (reference NFR-08). Hook 2 denies all thirteen human-only commands to agents, these nine plus `lock`, `revert`, `incident` and `secret set` (ADR-010 item 29b; ADR-012 item 8). CI rejects a human record type that a human did not write (ADR-004). How a command recognizes a human-owned terminal, and how CI recognizes a human writer, is OPEN-2.

| Command | Arguments | Writes | Refuses when |
|---|---|---|---|
| `approve` | `<gate>` (1 to 5, or `discovery`), plus the story ID at gate 4 or the release ID at gate 5 | approval | the gate's preconditions fail (next table) |
| `reject` | `<gate> [<subject>] --reason <text>` | rejection; at gate 4 the orchestrator turns the reasons into a fix task | no reason is given |
| `acknowledge` | `<item ID>`, as `status` lists it | acknowledgment bound to the item's hash | the item is unknown, already acknowledged, or changed |
| `answer` | `<question ID>` and an option, or `--text <answer>` | answer bound to the question's hash | the question is closed, or changed since it was asked |
| `amend` | `<locked path>... --reason <text>`, or `--upgrade <factory version>` (REQ-20) | amendment with before and after hashes; for a locked test, first the acknowledgment of the regenerated before-and-after renderings (REQ-06) | a path is not locked; renderings are unacknowledged; the policy's amendment count for the phase is used up (reference REQ-22) |
| `waive` | `<check or layer> --for <story or gate> --until <date> --reason <text>` | waiver | no expiry, target or reason |
| `revoke` | `<record ID> --reason <text>` | revocation; the gate reopens and later gates' records are suspended until it is re-approved (reference invalidation graph). Reverting a merged story is `pod-factory revert <story>`, which writes the revocation of its gate-4 record and opens the revert pull request (ADR-010 item 19) | the target is not an approval, or is already revoked |
| `delegate` | none; opens the current policy, or the default-deny template, in the human's editor | delegation policy | a grant names a gate other than 4, grants by free text instead of category ID, or fails the schema (REQ-17) |
| `migrate` | `[--to <schema version>] [--dry-run]` | migration record (form: OPEN-5); first use carries records 0001 to 0003 to the records branch (ADR-004; ADR-012 item 26) | no tested migration exists to the target (REQ-20) |

`approve rules <pull request>` is a further gate value: it binds a `rules/*` pull request's tree after the retrospective's citation check passes, and gate-check in its rules form requires it (ADR-012 item 23).

What `approve` binds and checks, per gate. The check runner evaluates the preconditions, with the same code CI uses. Every approval also lists the active waivers it showed (REQ-22).

| Gate | Binds | Refuses when |
|---|---|---|
| discovery | discovery report, proposed project-rules diff | a section is missing; coverage was not measured by the test tool; a secret is present; a refactoring is proposed (REQ-02) |
| 1 | PRD, a hash per requirement ID, red-team log; for a UI, the mockup snapshot | a red-team role reports neither findings nor "none found"; a finding has no disposition; a dismissal is unacknowledged; for a UI, no click-through acknowledgment, or a flow without a reachable screen; an enforcement layer is missing without a waiver (REQ-01, REQ-03, REQ-23) |
| 2 | the PRD at its current hash, the criterion-to-control mapping, design, eval plan, the runbook narrative and step file, rollback plan; for a UI, the refreshed mockup (ADR-013 item 8) | a required section is missing; a criterion has no control kind; a requirement is in no phase; a decision has no decider; a test is unclassified or misclassified; a rendering is unacknowledged; a founder-only project lacks the technical review (REQ-04 to REQ-06) |
| 3 | build plan and every story file | a story lacks a required field; a gap check reports neither findings nor "none found"; a finding has no disposition or a dismissal no acknowledgment; tokens and days are not estimated; a requirement has no story (REQ-07) |
| 4 | story branch head tree and review packet; `refs` name the check results relied on | the packet was not written by a fresh-context agent from that tree, misses a section, or lacks the four closing lines, which are shown before confirmation; no passing CI story-verify for that tree; an unresolved blocking security finding; QA without evidence (REQ-09, REQ-10) |
| 5 | source revision, artifact digest, environment, configuration and migration set, verification evidence, runbook, rollback plan | the artifact was not built and verified by CI; a checklist item lacks evidence; no rollback rehearsal evidence; the security condition is unmet (REQ-11) |

#### Other commands

| Command | Who may run it | What it does | Writes | Refuses or fails when |
|---|---|---|---|---|
| `lock` | human only: the lock is not one of the check runner's record types (ADR-004) | computes the REQ-06 lock set with hashes, right after `approve 2` | lock (form: OPEN-5) | no gate-2 approval binds the current eval plan |
| `status` | any actor | every story with stage, owner and what it waits on; open gates and questions; delegated decisions; parked stories; active waivers; budget mode; pending and invalid records (REQ-09, REQ-12, REQ-19). Story one of milestone zero (ADR-009) | nothing | the records cannot be read |
| `explain <story>` | any actor | names the gate, check or question blocking the story, in plain language (REQ-19) | nothing | the story is unknown |
| `doctor` | any actor | the seven layers (ADR-011 item 8) present, missing or waived, including protection of the three records refs and that main's protection binds administrators; the scheduled form fails on missing or waived, gate-check's doctor condition only on missing without a waiver (ADR-014 items 2, 10); pieces still bootstrap (ADR-009); in pod-factory's own repository, the Orca plugin branch against its folder (ADR-002). Offers to install a missing pre-commit hook (ADR-006) | nothing | any layer is missing or waived (REQ-19) |
| `start` | any actor; the start skill drives it | creates `.factory/`, the records branch when absent, and the project profile; pins the enforcing factory version (REQ-20); applies the chosen preset (ADR-008); runs the preflight; resumes an unfinished interview | check result for the preflight | a product question is unanswered (REQ-01) |
| `discover` | any actor; the discovery skill drives it | measured coverage from the test tool, the vulnerable-dependency inventory, risky paths (never file contents) | check result | never; a repository without tests is reported as such (reference REQ-02) |
| `hook <event>` | Claude Code, through the plugin (ADR-005) | see Hook protocol | nothing; denials go to the event log (REQ-19) | per Claude Code's protocol |
| `ci <job>` | CI (authoritative); anyone locally (advisory) | see Check runner jobs | check results | a check fails |
| `release <release ID>` | the release agent, or a human | runs or resumes the runbook (see Release executor) | through the check runner: release transitions and smoke results | see Release executor |
| `setup` | human only: it configures enforcement and may record a waiver | phase-two managed setup (REQ-24); idempotent; reports each step done, skipped with reason, or failed; never prints a credential | waiver, when chosen | the host plan is unsupported and no option was chosen; it offers public, upgrade or waiver |

#### Commands the documents imply but do not name

Names decided in ADR-010 item 17: `story set-status` (was `transition`), `decide`, `ask`, `metrics`, `audit`, `open`, `secret set`, plus `revert` and `incident`.

| Proposed name | Who | Purpose | Writes |
|---|---|---|---|
| `story set-status <subject> <stage>` | any actor | the only way a status changes; enforces the ready rule, required records and caps (reference "status transitions"); stages per OPEN-4 | status transition |
| `decide <question ID> --category <ID> --source <path> --quote <text>` | the orchestrator; the design skill before gate 2 | records a delegated decision. For gate 4, evaluates the policy's conditions from validated check results and writes the delegated gate-4 approval (REQ-17) | delegated decision, or delegated approval |
| `ask <subject> --question <text>` | the orchestrator | the "ask the human" verb | status transition to needs human |
| `metrics` | any actor | REQ-14 figures from records, offline | nothing |
| `audit` | any actor | every record with actor and time (REQ-19) | nothing |
| `open <item>` | any actor | shows an artifact, in Orca when present (reference REQ-12) | nothing |
| credential entry | human only | hidden prompt into the keychain or secret manager (REQ-21; OPEN-15) | nothing |

`decide --cite` records a citation answer, a question the documents already settle, with the quoted clause, and needs no policy. `decide` for an open question records a delegated decision and refuses, reporting a question that should have been asked, when there is no policy (deny-all), the category is not granted or is reserved, or the quote is not found verbatim in the cited source at its approved hash (ADR-012 item 13). Builders never decide (REQ-17); how the CLI knows the caller is a builder is OPEN-8.

#### Commands decided after this file was drafted

| Command | Who | Purpose |
|---|---|---|
| `story start <id>`, `story attach <id>`, `story wait <id>`, `story fix <id>`, `story set-status` | orchestrator and builders through the CLI; set-status any actor | the four backend verbs and the status transition (ADR-010 item 17; ADR-013 item 6) |
| `revert <story>` | human only | revocation of the story's gate-4 record and the revert pull request (ADR-010 item 19) |
| `incident` | human only | an incident record for REQ-14 (ADR-010 item 14) |
| `secret set <name>` | human only | hidden prompt into the keychain or secret manager (ADR-010 item 38) |
| `artifact submit <path>` | any actor | moves a draft into the work zone with redaction and hashing (ADR-011 item 12) |
| `mockup serve` | any actor | serves a mockup, refusing an archived one (ADR-011 item 21) |
| `decide --cite` | orchestrator, design skill | a citation answer needing no policy (ADR-012 item 13) |

### Records

One JSON file per record on `pod-factory/records`, named `<UTC compact timestamp>-<recordType>-<subject>.json`; UTF-8, LF line endings, two-space indentation, keys in a fixed order (ADR-004).

Common fields (ADR-004):

- `schemaVersion`: the record schema version. Records 0001 to 0003 are `bootstrap-0`.
- `recordType`: one of fourteen types: the eleven below plus `lock`, `migration` and `incident` (ADR-010 item 14; ADR-012 item 8).
- `factoryVersion`: the enforcing version pinned in the project profile (REQ-20).
- `hashAlgorithm`: names the content hash used in `binds`: SHA-256 over LF-normalized UTF-8, lowercase hex. Each record is verified with the algorithm it names (reference REQ-20).
- `createdAt`: ISO 8601 with offset.
- `actor`: `name` and `email` from the git identity, and `kind`: `human` or `check-runner`.
- `binds`: repository paths, or named bindings, mapped to hashes. Named bindings: `tree` (a git tree ID), `artifactDigest` (as the build reports it), `requirements` (requirement ID to hash), `evidence` (an evidence manifest hash).
- `outcome`: per type.
- Optional on every type: `subject` (the gate, story, release, question or record concerned), `refs` (file names of records relied on), `bootstrap` (exceptions and expiry; REQ-20).

| `recordType` | Writer and command | Type-specific fields | `outcome` |
|---|---|---|---|
| `approval` | human, `approve`; check runner, `decide`, for a delegated gate 4 only | `gate` (1 to 5, or `discovery`), `waiversShown`; gate 5 adds `release` (revision, environment); a delegated approval adds `delegated` (policy record, category, each condition with the check result that met it). Binds per the gate table | `approved`; delegated: `approved-pending-acknowledgment` |
| `rejection` | human, `reject` | `gate`, `reasons`; binds what an approval would have bound | `rejected` |
| `acknowledgment` | human, `acknowledge` or `amend` | `acknowledges`: a kind (`dismissal`, `rendering`, `click-through`, `delegated-merge`, `feedback-change`) and the item ID; binds the item | `acknowledged` |
| `answer` | human, `answer` | `question` (ID), `answer` (option or text); binds the question file | `answered` |
| `delegation-policy` | human, `delegate` | the policy itself: `categories` (ID, scope, limits), `reserved` (IDs), `gate4Conditions` (check and required result), `amendmentsPerPhase`. The latest validated policy is in force; none means deny-all | `granted` |
| `delegated-decision` | check runner, `decide` | `kind` (`citation` or `delegated`, ADR-012 item 13), `decider` (`orchestrator` or `design-skill`), `question`, `category` (delegated only), `clause` (source path and exact quote), `decision`; binds the source and the question | `decided`, or `refused` (a question that should have been asked) |
| `waiver` | human, `waive` | `waives` (check or layer), `scope` (story or gate), `expires`, `reason` | `granted` |
| `amendment` | human, `amend` | `amends` (record), `kind` (`locked-test`, `enforcement-code`, `requirement`, `upgrade`), `reason`; a locked test adds `testIds` and the renderings acknowledgment; enforcement code adds the factory version change and the diff hash. `binds` holds the after hashes, `before` the before hashes | `approved`, as in record 0002 |
| `revocation` | human, `revoke` | `revokes` (record), `reopens` (gate), `reason`; binds the revoked record | `revoked` |
| `status-transition` | check runner, `story set-status` and the backend verbs | `from`, `to` (OPEN-4), `rule` (checks passed), `cause` (for example a cap), `leaseToken` (entering in progress), `invokedBy`; binds the story file and any receipt | `applied` |
| `check-result` | check runner, `ci <job>`, `start`, `discover` | `job`, `check`, `controlKind` (`measured` or `reviewed`), `where` (`ci` or `local`), `run` (ID and link), `findings` (blocking and total); binds `tree` or the release inputs, and `evidence` | `pass`, `fail`, or `error` (the check could not run) |

Rules:

- No record is modified or deleted. A later record changes an earlier one's effect: a revocation, an amendment, a newer policy.
- Every gate, story CI, the executor and hook 3 rely only on validated records (reference decision 28). A `where: local` check result never counts for gate 4 or 5 (reference: a local run never substitutes).
- Records 0001 to 0003 keep their bootstrap form: `approvedAt` and `approver` in 0001, a descriptive `hashAlgorithm`, nested `binds`. Validators accept `bootstrap-0` until the bootstrap exception expires. `migrate` carries them to the records branch under ADR-004 names and binds their original content hashes (ADR-004 note).

Two short examples; version values are illustrative. A human approval at gate 4:

```json
{
  "schemaVersion": "1",
  "recordType": "approval",
  "factoryVersion": "0.1.0",
  "hashAlgorithm": "sha256",
  "createdAt": "2026-11-02T14:05:09Z",
  "actor": { "name": "<git user.name>", "email": "<git user.email>", "kind": "human" },
  "gate": 4,
  "subject": "story-001",
  "binds": { "tree": "<git tree id>", "<packet path>": "<hex>" },
  "refs": ["<story-verify check-result file>"],
  "waiversShown": [],
  "outcome": "approved"
}
```

A CI check result:

```json
{
  "schemaVersion": "1",
  "recordType": "check-result",
  "factoryVersion": "0.1.0",
  "hashAlgorithm": "sha256",
  "createdAt": "2026-11-02T13:41:30Z",
  "actor": { "name": "<CI identity>", "email": "<CI identity>", "kind": "check-runner" },
  "job": "story-verify",
  "check": "locked-tests",
  "controlKind": "measured",
  "where": "ci",
  "run": { "id": "<run id>", "url": "<run link>" },
  "subject": "story-001",
  "binds": { "tree": "<git tree id>", "evidence": "<manifest hex>" },
  "outcome": "pass"
}
```

### Runtime backends: the four verbs

Both backends implement the same four verbs and produce the same records (TECH-SPEC 4.1; reference REQ-08). Where the verbs live, CLI or orchestrator skill, is OPEN-6.

Rules on both backends:

- **Start** needs a CI-validated gate-3 record matching the current plan hash, and the ready rule (REQ-07). Hook 3 checks the record. The check runner writes the move to in progress, with a lease token. The orchestrator records the exact builder context, as paths and hashes: the story file, the spec sections and mockup screenshots the story lists, and the project rules (REQ-08).
- **Done** is never the worker's claim. Completion moves the story to verification. The story is done only when its locked tests pass on its branch in CI (REQ-08).
- A completion carrying a superseded lease token is rejected and logged (reference REQ-08).
- The orchestrator persists the dispatch receipt, the completion payload, the handoff note and the token usage (ADR-003); the next status transition binds their hashes. Where they are committed is OPEN-9.
- Each fix round counts toward the fix-round cap. The budget mode decides park, flag or nothing (ADR-007).
- Between orchestrator and human no default is ever taken; the story waits (REQ-13).

| Verb | Inline backend (ADR-003) | Orca backend |
|---|---|---|
| Start a story | the Claude Code subagent tool: builder role, the story's model, only the recorded context. every builder runs in its own worktree through Claude Code's worktree isolation and attaches its dispatch file there with `story attach` (ADR-011 item 1; ADR-012 item 10); stories marked independent at gate 3 may run in parallel; merges are serialized | once per plan: `run-create --objective <plan>` (`run-use --id <run>` after a restart). Per story: `task-create --spec <context> --task-title <story ID> [--deps <json>]`; `worker-start --task <task> --worktree new-child --name <story ID> --agent <agent> [--model <id>] --setup run`; then `worktree set --worktree <story worktree> --workspace-status <first stage>`. The dispatch ID is the lease token |
| Wait for done | the subagent call returns; the orchestrator reads its result and usage | `check --wait --types worker_done,escalation,question --timeout-ms <n>`; process every message in the Delivery, then `check --ack <delivery>`. `worker_done` carries `--outcome succeeded` or `failed`, `--task-id` and `--dispatch-id` |
| Send a fix back to the same worker | OPEN-7 | while the dispatch is live: `send --to dispatch:<dispatch> --subject <fix> --body <fix task>`. After `worker_done`: keep the worker with `worker-retain` until the story leaves verification; then `task-create --spec <fix task> --parent <story task>` and `worker-start --task <fix task> --terminal <worker terminal> --worktree <story worktree>`; `worker-release` once the story passes. A failed attempt is retried with `worker-start --task <task> --retry-of <dispatch>` and explicit placement; retries stay at or below Orca's breaker of three consecutive failures per task (reference REQ-08) |
| Ask the human | a builder cannot prompt (hook 4); it ends its run with the question in its handoff note. The orchestrator settles it with `decide` when a clause does; otherwise `ask` records the question with its hash, moves the subject to needs human, notifies, and stops. The human runs `pod-factory answer` in their own terminal; the orchestrator resumes once the answer record exists (OPEN-3) | a builder asks with `ask --question <text> [--options <csv>] --timeout-ms <n>`, resuming with `--resume <message>` after a timeout; the orchestrator answers with `reply --id <message> --body <answer, with its clause or answer record>`. For the human, the same `ask` flow, plus `gate-create --task <task> --question <plain-language question> --options <json>` so the board shows the block; the orchestrator ends its turn so Orca notifies; once the answer record exists, `gate-resolve --id <gate> --resolution <answer record>`. Orca's gate is display only; the answer record is the authority |

All Orca commands above are `<orca> orchestration <verb> ... --json`, except `<orca> worktree set`. `<orca>` resolves the way Orca's own skills do: `ORCA_CLI_COMMAND`, then `orca-dev`, then `orca-ide` on Linux, else `orca` (reference REQ-16). The Orca backend is used when `<orca> status --json` succeeds and orchestration is enabled in Orca's experimental settings; otherwise inline (TECH-SPEC 4.1). `worker-start` exits 0 only when the worker is ready. Orca's orchestration is experimental, so flags are pinned against `orca skills get orchestration --full` during implementation. The Claude Code subagent tool, its worktree isolation and its usage report: pin against current documentation during implementation.

### Check runner jobs

`pod-factory ci <job>` holds no provider-specific code (ADR-006). The provider template passes provider facts in as inputs.

Inputs to every job:

- the content checked: a records-branch push range, a pull request head and base, or a release revision;
- the records branch at its validated head: lock set, locked test command, approvals, waivers, policy;
- the project profile: budget mode, enforcing factory version;
- the run's ID and link, from the template.

Outputs of every job:

- exit status 0 for pass, 1 for fail; the provider shows the check accordingly;
- a plain-language summary listing the active waivers (ADR-006);
- check-result records with `where: ci`, where the table says so, pushed to the records branch by the job;
- an evidence bundle where the table says so, redacted before it is written (REQ-09).

| Job | Trigger | Checks | Records |
|---|---|---|---|
| `records-validate` | schedule and dispatch, defined on main (ADR-010 item 11) | only record paths (`.factory/records/`, `.factory/policy/`, `.factory/locks/`); schema per type and version; legal status transitions; writer identity per type; nothing modified or deleted; linear history | none; advances `pod-factory/records-validated` to the last good commit; an invalid record lands, is flagged and never counts (ADR-010 item 11) |
| `story-verify` | `story/*` pull requests (classes: ADR-012 item 1) | nothing under `.factory/` and nothing outside the story's file scope (OPEN-10); no locked path changed without a validated amendment; the locked test command, run exactly as locked from the records branch, not from the branch; restraint checks (traceability of new files, endpoints and public functions; code no requirement test exercises; size and complexity tripwires per budget mode; unused code; duplication); secret and dependency scans | a check result per check; one evidence bundle bound to the head tree |
| `gate-check` | required for merge of `story/*` | a validated gate-4 approval bound to the head tree, with no newer content change; a passing story-verify for that tree; a delegated approval only with the human's acknowledgment record (REQ-17); every locked path's hash equal to the lock record; the branch's dispatch record matching the validated plan hash; when main moved, the locked suite green on the merge result; no expired waiver relied on (ADR-011 item 4) | none |
| `release-gate` | build: the merge of a `release/*` pull request; verify: the executor's start request (ADR-011 item 6; ADR-013) | before gate 5: build the artifact from the merged revision, publish its digest, run the regression suite (the locked suite plus regression tests added since) against it, attach the rollback rehearsal evidence. After gate 5: a validated gate-5 record whose hashes match the digest, environment, configuration and migration set, runbook and rollback plan | check results; an evidence bundle with the digest |
| `doctor` | schedule and on demand | branch protection on main and on the records branch; CODEOWNERS over the protected paths; required checks; plugin version pinned per project; active waivers (ADR-006). Host facts: OPEN-12 | none |
| `precommit` | the pre-commit hook, installed by `doctor` or `setup` | locked and protected paths untouched; file scope respected; secrets in staged files. Advisory and bypassable | none |
| `lock-guard` | every pull request to main | no locked path changed without a validated amendment record bound to the head tree; before the first lock, the gate-2 record (ADR-013 item 1) | check result |
| `class-check` | every pull request to main | the branch matches exactly one class and the diff stays inside its allowed paths; unmatched branches fail (ADR-013 item 2) | check result |
| `work-only` | `work/*` and `rules/*` pull requests | only the class's allowed paths changed; no locked path changed; auto-merge on green for `work/*` only, `rules/*` needs its approval record (ADR-012 items 2, 23; ADR-014 item 1) | check result |
| `artifact-check <gate>` | a `work/*` pull request changing a gate 1 to 3 artifact; locally before `approve` | required sections, tags, dispositions and acknowledgments, plain-language lint, secret scan, flow IDs, against the pinned checklists (ADR-011 item 2) | check result bound to the artifact hash |
| `classify` | a `locked/*` pull request adding tests; locally before `approve 2` or a lock amendment | runs the locked suite and classifies every test per REQ-05 (ADR-011 item 3) | one check result per test plus a summary bound to the tree |

**Evidence bundle.** One directory per job run: harness and scanner output (redacted), check reports, and runner-captured screenshots for UI. A `manifest.json` lists the job, the subject, `tree` or the release inputs, the run ID and link, start and finish times, the redaction pattern set version, and every file with its SHA-256. The manifest hash identifies the bundle; the check-result record binds it as `evidence` beside `tree`. Agent-written text never enters a bundle (reference "evidence"). A packet's "tests passed" counts only when it cites a bundle bound to the same tree (ADR-009, refusal 3). Storage: OPEN-11.

**Validation.** `records-validate` checks every record added in the pushed range. A passing run makes them validated. Until then `status` shows them as pending, and an invalid record is flagged. How "validated" is represented and read is OPEN-1.

### Release executor

`pod-factory release <release ID>` runs the executor (REQ-11, REQ-18, REQ-21). The release agent drives it after sign-off; a human may run it. The executor is a factory process, not a model. It holds the credentials; its caller never does. Where it runs is OPEN-14.

1. **Bound inputs, checked before step one.** Read the records branch at its validated head and require a validated gate-5 record for this release. Recompute the hashes of the runbook, the rollback plan, and the configuration and migration set. Compare the target environment. Read the stored artifact's digest and compare it with the bound one. A missing record or any mismatch halts before the first step. The runbook does not build; a rebuild that does not reproduce the bound digest halts for a new gate-5 approval.
2. **Step declaration.** Each step declares: a name; the locked script it runs (REQ-06 locks every runbook script); its kind (migration, deploy, smoke, tag, changelog, notification); either `idempotent` or a `reconcile` check that answers done, not done or unknown; the credentials it needs, by name; the evidence it produces; and, for smoke steps, the retry rule (attempts, interval, and how a probe error is told from an application failure). The executor halts for the human at a step that declares neither, and at a step that ends without its evidence. File format: OPEN-16.
3. **Credential injection.** At step start, resolve each named credential from the operating-system keychain or the configured secret manager. Register the value with the redactor. Pass it only to that step's process, through its environment or standard input, never its arguments, which other processes can list. Never write it to state, logs, evidence, records, or anything returned to the caller. Entry is through a hidden prompt (OPEN-15).
4. **Redacted logging.** Per step: the command with credential names in place of values, start and end times, exit status, classification, and evidence file hashes. All output passes redaction (known credential values, then secret and personal-data patterns) before it is written or returned. Canary secrets in the keychain, a `.env` file and tool output prove it (REQ-21).
5. **Retry rule.** Only the rule the runbook states. A probe error (the check could not run) is retried up to the declared count, never triggers a rollback, and halts for the human when retries run out. An application failure (the application answered wrongly) is confirmed by the declared re-check. A retry count or classification the runbook does not declare is refused.
6. **Rollback.** The rollback plan is pre-approved by the gate-5 record. A confirmed application failure runs it at once, without a human; its log names the failure, and the rollback's own smoke result is reported. A failed rollback persists a `release broken` state and notifies on the independent channel. Any other recovery waits for a human decision recorded through the approval path.
7. **State.** Written atomically after every step, in the work zone. After a crash, the executor runs the in-progress step's reconcile check, or repeats the step if it is idempotent, then continues. Release status changes go through the check runner as status transitions; smoke runs as check results.
8. **Exit.** 0 only when every step finished with evidence and smoke passed. Otherwise 1; the state says halted, rolled back or release broken, and the message gives the options.

### Hook protocol

Claude Code runs `pod-factory hook <event>` from the plugin's hook configuration (ADR-005) for two events: before a tool call ("pre-tool-use") and at session start. The event arrives as JSON on standard input. Event names, field names, tool names and the exact form of a deny (exit code or JSON decision): pin against current documentation during implementation, then freeze them in the hook tests on macOS, Windows and Linux (ADR-005, ADR-006; Windows shim: OPEN-20).

What the hook reads from the event (exact field names: pin against current documentation during implementation): the event name; the working directory; the session ID; for pre-tool-use, the tool name and its input (the target path, or the shell command text); and, if Claude Code exposes it, whether the call comes from a subagent and which one (OPEN-8).

Steps:

1. Look for `.factory/` from the working directory up. If there is none, allow silently.
2. Load the lock set, protected paths, declared secret paths and validated records from the local copy of the records branch.
3. Resolve the target path (symlinks, `..`, letter case on macOS and Windows) before matching.
4. Decide, and append any denial to the event log (REQ-19).

The decision is allow, with no output, or deny with a plain-language reason that names the lock or record and the way forward. Session start prints context instead. When the hook cannot decide: OPEN-19.

| # | Event and tools | Denies when | The reason points to |
|---|---|---|---|
| 1 | pre-tool-use: edit, write, multi-edit, notebook edit | the target is locked, in the protected zone, or a declared secret path | the lock or record, and `amend` |
| 2 | pre-tool-use: shell | the text plainly writes to a locked or protected path (redirection, in-place edit, move, delete, checkout), or runs an approval-path command. A heuristic, advisory by design | the same; approvals are human only |
| 3 | pre-tool-use: shell, and the inline start verb (OPEN-8) | `orchestration worker-start` or `dispatch` under any resolved Orca CLI name, or the inline start, without a CI-validated gate-3 record matching the current plan hash | gate 3 |
| 4 | pre-tool-use: the question tool | the caller is a dispatched worker, recognized by the live dispatch file in its own worktree (ADR-011 item 1; ADR-012 item 10) | `orca orchestration ask` under Orca; the handoff note inline |
| 5 | pre-tool-use: read and search tools | the target is a declared secret path; shell reads per OPEN-18 | REQ-21 |
| 6 | session start | never denies; prints the stage, open gates and active waivers | none |

REQ-01's block on application code while gate 1 is open is hook 1's stage rule: it denies creating files under the preset's application source roots while no validated gate-1 record exists (ADR-010 item 24).

## 5. Non-goals for this design

What this design deliberately does not build or decide. A story that adds any of it is out of scope. A builder who meets a gap asks the orchestrator (REQ-13); it does not fill the gap.

Excluded or deferred by the PRD (section 5):

- Defense against a deliberately malicious agent running as the approver's operating-system user. Such an agent could forge a file-based approval. Version one guards against drift and mistakes. Signatures are optional (OPEN-21).
- A physical-action approval path. Version two.
- Agent hooks for anything but Claude Code. Codex parity is a version-two candidate; other agents are held by pre-commit, CI and branch protection only.
- Protection beyond redaction for secrets outside the hidden prompt, the keychain, the secret manager and the declared secret paths.
- A workaround for hosts without server-side branch protection, such as GitHub Free private repositories: a visible waiver or an upgrade only.
- Enforcement that depends on Orca. Orca's tasks, gates, board and notifications are transport and display; records and CI decide. No rich Orca side panel.
- Per-story sandboxes; production evals and monitoring of AI features; mutation testing; feature flags beyond a recipe; any hosted or multi-user service; Jira or Linear sync; the control room on SSH or remote worktrees; high-fidelity design tooling.
- Provisioning hosting, cloud accounts or environments. The executor deploys to an environment that already exists.
- A board without Orca. Without Orca, `status` is the view (reference section 8).

Excluded by an ADR:

- Self-contained binaries, or a bundled Node runtime, before phase two (ADR-001).
- Separate repositories, including one for the Orca plugin (ADR-002).
- Headless Claude Code processes per story; parallel stories not marked independent at gate 3; locking builder-written tests (ADR-003).
- Records in Markdown, per-type ledgers, sequence counters or a database; rewriting or force-pushing the records branch (ADR-004).
- Hook configuration committed per project (ADR-005).
- CI templates beyond GitHub Actions (others are bring-your-own); provider-specific code in the check runner; relying on pre-commit alone (ADR-006).
- Usage monitoring in budget mode off; the project owns it (ADR-007).
- Presets beyond web-default, node-tool and custom; pre-tested custom stacks (ADR-008).
- Orca concurrency before milestone zero passes; a bootstrap scaffold beyond its six pieces (ADR-009).

Limits these interfaces do not claim to close:

- Hook 2 reads command text. It is not a shell parser or a security boundary; CI is the authority (ADR-005).
- Hook 3 intercepts only the dispatch commands ADR-005 names. Other ways to start an agent are not intercepted; story CI still applies.
- The executor keeps credentials out of model context for the steps it runs. It does not isolate agents from the keychain or the network; per-role isolation waits for version-two sandboxes.
- A reviewed result (red team, security, simplicity, QA, the gate-4 citation check) records attention, never correctness. A passing AI eval means its defined scenario set passed (reference REQ-05).

Not measured:

- How people review or approve: no review time, wait time, interruption or approval counts (PRD section 2, "Throughout"). No telemetry (reference NFR-05); metrics are computed offline from records (REQ-14).

Not decided in these sections:

- Budget values beyond ADR-007's defaults, which milestone zero calibrates.
- Stack presets beyond ADR-008, and the second project (PRD open questions 1 and 2).
- The threat review, production readiness, eval plan and criterion-to-control mapping, which have their own sections.

## Open items

Decisions these sections need that the documents do not make. Each is a question for the approver, not a choice made here.

Records and validation:

- **OPEN-1 Validated state.** How does records-validate mark records validated without provider-specific code: a ref the job fast-forwards to the last validated commit, or the provider's check status on the records-branch commit? Is an invalid push rejected before it lands (ADR-006), or does it land and get flagged (reference "validated")? A host may be unable to reject a direct push on a check that runs after it.
- **OPEN-2 Human writer.** How does an approval-path command recognize a human-owned terminal beyond hook 2: an interactive terminal for the confirmation, refusing an agent-session marker in the environment, and how Claude Code's shell escape counts? What exactly does the human type to confirm? Must CI find a human record's identity among the project's approvers? How does CI recognize its own identity on `where: ci` results without provider code?
- **OPEN-3 Pending records.** May the orchestrator act on an answer, acknowledgment or policy record before CI validates it, or must it wait? The documents require validated records only for gates, story CI and the executor (reference decision 28).
- **OPEN-4 Stages.** The full stage list and its legal transitions. The documents name ready, in progress, needs human and done; records-validate, `status` and the Orca board columns all need the list. Also the lease expiry for in progress (reference REQ-08).
- **OPEN-5 Records outside the PRD's eleven types.** The lock: ADR-009 calls it a lock record; is it its own type under `.factory/locks/`, or the lock set inside the gate-2 approval, updated by amendments, and is `lock` separate from `approve 2`? The migration record: its own type (ADR-004 note) or an amendment kind? Incident records (REQ-14): which type, writer and command?

Runtime backends:

- **OPEN-6 Where the verbs live.** `pod-factory` commands that wrap Orca and the subagent handoff in code, or orchestrator-skill instructions that call them directly, with the CLI used only for records?
- **OPEN-7 Inline "same worker".** For a fix (REQ-09), resume the original subagent, if Claude Code can resume one by ID, or start a fresh builder subagent on the same worktree with the handoff note and the fix task?
- **OPEN-8 Recognizing a dispatched worker.** How do hooks 3 and 4 and `decide` know the caller is a dispatched builder? Orca puts task and dispatch IDs in the worker preamble; whether a hook can see them is unconfirmed. Inline needs the hook input to identify the subagent. And what is the inline start verb at the hook: the subagent tool call for a builder role, or a CLI start command?
- **OPEN-9 Work-zone outputs.** Receipts, handoff notes, questions and event logs are written during the build. How are they committed, given that main accepts only verified pull requests and story branches never touch `.factory/`?

Check runner:

- **OPEN-10 Pull request to story.** How does story-verify find the story for a pull request: a branch-name convention, or a field in the story file?
- **OPEN-11 Evidence storage.** CI artifacts (which expire), the records branch, or the work zone? Metrics need the evidence offline (REQ-14).
- **OPEN-12 Host facts for `doctor`.** Branch protection, rulesets, CODEOWNERS and required checks live in the host. With no provider code in the check runner, are they read by a host adapter in the CLI, or gathered by the provider template and passed in?
- **OPEN-13 Reverting a merged story.** Who opens the revert pull request, and how does story-verify scope it?

Release:

- **OPEN-14 Where the executor runs.** On the approver's machine with the keychain, or in a CI job with the provider's secret store? And where does the rollback rehearsal run?
- **OPEN-15 Credential entry.** The hidden-prompt command's name and home. REQ-21 lands with gate 5 in phase 3, but the keychain flow belongs to phase-two managed setup (`setup`).
- **OPEN-16 Runbook format.** The file format of step declarations. The executor section lists the fields it needs.

Hooks:

- **OPEN-17 No code before gate 1.** REQ-01 blocks application code while gate 1 is open, and none of ADR-005's six hooks does that. A stage rule in hook 1, or CI alone, since no story scope exists before gate 3?
- **OPEN-18 Shell reads of secrets.** Does hook 5 cover shell reads of declared secret paths through hook 2's heuristic? ADR-005 says "on reads" without naming tools, and REQ-21's `.env` canary depends on it.
- **OPEN-19 Hook failure mode.** When a hook cannot decide (records unreadable, a malformed lock), does it fail closed with a message, or fail open and log? The same for every hook?
- **OPEN-20 Node range and Windows shim.** ADR-001 deferred the supported Node LTS range and the Windows hook shim to the hook design; ADR-005 does not settle them.

Other:

- **OPEN-21 Signatures.** Does version one build optional signature verification (reference NFR-08: signed tags that CI verifies when present), or defer it? The PRD says only that signatures are optional.
- **OPEN-22 Notifications.** The channels and the notify interface (TECH-SPEC section 1: to be decided). `ask`, release halts and stop-work messages depend on it.
- **OPEN-23 Command names.** Names for the commands the documents imply: `transition`, `decide`, `ask`, `metrics`, `audit`, `open`, and the credential command.

## Resolutions (ADR-010)

| Open item | Resolved by |
|---|---|
| OPEN-1 validated state | ADR-010 item 11: scheduled records-validate from main advances `pod-factory/records-validated`; invalid records land and are flagged |
| OPEN-2 human writer | item 29a: interactive terminal, agent-session markers refused, typed confirmation of gate and hash, approver list in the bound profile; CI identity per item 12 |
| OPEN-3 pending records | item 1: answers and acknowledgments act at once; a policy only after validation |
| OPEN-4 stages | item 16 |
| OPEN-5 extra record types | items 14 and 15: lock, migration, incident; profile bound by amendment |
| OPEN-6 where the verbs live | item 17: CLI commands `story start|wait|fix|ask` |
| OPEN-7 inline same worker | item 22 |
| OPEN-8 recognizing a dispatched worker | item 23 |
| OPEN-9 work-zone outputs | item 2: auto-merged work-only pull requests |
| OPEN-10 pull request to story | item 18 |
| OPEN-11 evidence storage | item 30 |
| OPEN-12 host facts for doctor | item 31 |
| OPEN-13 reverting a merged story | item 19 |
| OPEN-14 where the executor runs | item 3; rehearsal per item 37 |
| OPEN-15 credential entry | item 38 |
| OPEN-16 runbook format | item 36 |
| OPEN-17 no code before gate 1 | item 24 |
| OPEN-18 shell reads of secrets | item 25 |
| OPEN-19 hook failure mode | item 4 |
| OPEN-20 Node range and Windows shim | item 28 |
| OPEN-21 signatures | item 33 |
| OPEN-22 notifications | item 32 |
| OPEN-23 command names | item 17 |
