# The phase-1b transition: the complete sequence, and every human act in it

**Status: proposed.** Nothing in this has been requested, no lock has been revoked, no approval has
been written, and nothing is pushed or merged. ADR-019 is a proposed migration exception. This
document is the sequence as demonstrated, so that the decision to start it can be made against
evidence rather than a plan.

Each act below gives: what you type, what it binds, what refuses if it is skipped or taken out of
order, and where it was demonstrated. The labs are disposable repositories; the register rows are
TECH-SPEC section 12, L12 to L17. Every lab ran the real CI jobs from an unmodified copy of main at
6db310a **and** from a copy carrying the change under test, so each row says what today's code does
as well as what the change does. Every lab planted its human-authority records, so **no lab says
anything about `requireHuman`** — that one layer is verified by reading the code and by your own use
of the commands.

## Before act 1: what is ready, and what is not

Ready: the nine enforcement changes (ADR-019), the build plan with fourteen stories, the fourteen
story briefs, the frozen-test authoring and review brief, the hand-performed gap review, and the
eval-plan rows for everything new. Written, not built: the changes themselves, the tests, the
tracker skeleton and the mockup — those are the window pull request's work, and they are an agent's.

**Not demonstrated, and the one thing I need from you before act 1:** real GitHub protection
behaviour. Ten cases are specified in `.factory/work/transition-1b/protection-lab.md`, needing one
repository — `ajpasco/pod-factory-protection-lab`, public, retained. Say yes to the name and
visibility and it is mine to run; the rest of this sequence does not depend on it, but your
confidence in acts 3 and 8 should.

## The acts

**1. Revoke milestone zero's lock.**
`pod-factory revoke <lock id> --reason "phase 1b transition"`, then the word and eight characters of
the hash. It binds nothing; it withdraws the lock. Nothing in `.github/workflows/**`, the lockfile
or the locked tests can change until you do, because a milestone's last story seals main — this is
the finding that makes a transition necessary at all. **Demonstrated: L12.** With the lock still in
force, the window pull request was refused by lock-guard on four locked paths and by gate-check
("bootstrap approvals … stop counting once the lock exists"); after the revocation all four checks
passed.
*Recovery:* nothing is enforced on locked paths until act 5 re-locks. That is the open window, and
it is why acts 1 to 5 are one sitting. And if you withdraw anything mid-sequence: today a pull
request the relay has blocked is **not** unblocked by re-approving and re-running (lab 7 case P7),
so the recovery would be a new commit. Change 9 closes that: the relay posts the current conclusion
and `approve` dispatches it, so a fresh valid approval restores eligibility on the same candidate.

**2. Apply the staged workflow changes.**
`.github/workflows/**` is hook-protected as well as locked, so an agent cannot write it. Two lines
for the window: `actions: write` on the `records-validate` job, which is what lets the relay re-run
the authoritative gate-check job (change 9, demonstrated in lab 7 round 3); and `fetch-depth: 0` on
the verify job's `subject` checkout (`pr-checks.yml:55-58`), since a depth-one subject cannot be
merged with main — **L15**, where the merge-candidate spike failed closed without it. Both land
before the lock, so neither costs an amendment; the lab had to re-plant its lock each time only
because it changed the workflow after locking.

**3. Approve and merge the window pull request.**
`pod-factory approve bootstrap <pr>`, then merge. It binds that pull request's head tree. It
carries the nine changes, the documents with every blocking gap-review finding closed in them, the
tracker skeleton with one passing scaffold test, the new locked command with its one locked-test
edit, the browser dependencies, the mockup with `docs/spec/mockup-1b.md`, the plan and the story
files. Every check is green on it — and it must be, because the code that judges it is main's, not
its own. **Before you approve: click the mockup, and read the gap review's second reading**, which
is written against that mockup inside this pull request; REQ-26 blocks gate 2 by name while a
blocking finding is open. **Demonstrated: L12** for the route, and the enforcing-copy property is
why nothing in the pull request can judge itself.
*Expect one unusual thing in it:* ten of the repository's own locked tests have fixtures that plant
a gate-3 record with `refs: []`, which change 6 can no longer accept. Their fixtures are updated in
this pull request, which is legal only while nothing is locked. The handoff note lists every one.
*Recovery:* if it is wrong, close it. Nothing is bound until you approve, and nothing is enforced
until act 5.

**4. Nothing — the fourteen tests are written and reviewed.**
One author session and one independent reviewer session per test file, on `pod-factory/frozen-tests`,
reading the story files and the eval plan from main. It happens here, before the lock, because the
agent hook denies an agent writing a locked path. Each review note names its findings and the file's
hash; an open finding blocks that file's signature. This is where a weak test is caught, and the
reviewer is asked by name for a **conditional skip**, which is the one weakness a hash cannot catch.

**5. Classify, approve gate 2, lock.**
`pod-factory approve 2 --classification <record>`, then `pod-factory lock`. Gate 2 binds the PRD,
TECH-SPEC, the eval plan, the classification report, the mapping and every `docs/spec/*.md`; the
lock binds a hash for every locked path and freezes the test command list verbatim. The
classification describes a **green** suite, because no failing test was ever merged — that is the
whole point of ADR-019. **Demonstrated: L14**, where a lock over a project whose story tests did not
exist behaved correctly, and L17, where `lock` was exercised for real.
*Recovery:* `lock` refuses a second lock for the same gate-2 approval ("Already locked … Nothing was
written"), so a correction here means a new `approve 2` first, not a revocation (`commands/lock.ts:38-45`).

**6. Sign the frozen tests.**
`pod-factory approve tests --from pod-factory/frozen-tests <the fourteen paths>`. One act for the
phase. The ceremony shows every path with its hash; the record is an ordinary amendment naming the
lock, with no pull request and no tree, and `effectiveLock` folds it into what is locked.
**Demonstrated: L14** — one amendment over two paths that existed nowhere made both locked at their
hashes, each story's pull request then passed all four jobs **from unmodified main** carrying its
test unchanged, a later unrelated pull request still passed the drift check, and revoking the
amendment made that pull request fail, which is the control that proves the amendment is what made
it legal. Refused: the test altered by one byte, the test failing, a regression in a merged test,
and — from the patched copy — an implementation arriving with no test at all.
*Recovery:* a wrong hash costs one further signature and no re-lock. Abandoning a test means
revoking the record, after which `story start` refuses that story until a new one is signed.

**7. Approve gate 3, which binds the chain.**
`pod-factory approve 3`. It binds the plan and its story files, and it now refuses unless the gate-2
approval's files still match main, an active lock is in force that main has not drifted from, and
the inventory holds a hash for every test path the plan's story files name. It records a reference
to each, so the authorization says what it rests on. **Demonstrated: L17** — today's command wrote
an authorization with no gate 2, no lock, no inventory and `refs: []`, because it never asks; the
change refused each of those in turn by name, and gate-check refused a candidate whose authorization
rested on a revoked lock, a superseded lock or a drifted `docs/PRD.md`, where the unmodified copy
passed.
*Recovery:* `approve 3` writes nothing on refusal. Re-approving gate 3 is free and is the normal
response to any later change in the plan or the contract.

**8. Approve and merge stories 3 to 6, one at a time.**
`pod-factory approve story-<n> --pr <n>`, then merge. Four acts. Story 6 is the switch: when it has
merged and its rows pass on main, per-story approvals stop. **Demonstrated: L16** — with the story
approval revoked, unmodified main refused and the patched copy merged on the gate-3 authorization
plus a review and a verify bound to the candidate, naming its authority; it refused for a missing
review, a failed review, a stale review, a stale head, a revoked authorization, a drifted contract
file, an out-of-scope diff, an untagged source file, and a locked test edited under an
authorization.

**9. Turn "branches up to date before merge" back on.**
One settings change, here and not earlier: while a story needs its own approval, every update from
main voids that approval, so turning it on sooner doubles the approvals. Stories run one at a time,
so the exposure until now is one pull request at a time. **Demonstrated twice.** L15 shows the
exposure: two pull requests that each passed alone broke main together, and only the merge-candidate
change caught it. The protection lab's case P4 shows the price, on real GitHub: with the setting on,
the first pull request merged, the second — green, but behind main — was refused for both the API
merge and an administrator merge ("3 of 3 required status checks are expected"), and updating its
branch re-ran the checks and made **gate-check fail, because the story approval binds the tree that
has now moved**. The conclusion is narrower than "two approvals per
story", which is what an earlier draft of this said: **a renewed approval is required when an
approved candidate changes** — which is correct, because the approval binds content and the content
moved. A story whose branch is still current when it is approved needs one approval and no more.
How often it happens is a function of how often main moves under an open pull request, and with
stories running one at a time that is at most once per story, not always once per story.

The two controls are **complementary, not alternatives**: candidate verification binds the evidence
to the content that would actually land, and strict protection stops a merge whose content is not
that candidate. Automatic merging requires both — the switch alone leaves evidence bound to the
branch head, and the binding alone leaves a stale green merge-able. Action 19 sits where it does
only because the renewed approvals are a cost worth deferring while stories still carry a human
approval each, not because the setting is optional.

**10. Nothing per story, from story 7 to story 16.**
Ten stories, no approval, while the five conditions in the build plan hold.

**11. Accept the product — gate 4.**
`pod-factory approve 4`, which story 16 builds: every required test passing for the revision you
accept, every story the plan names at done, every recorded review closed with no blocking finding
open, and an acceptance packet whose hash the record binds beside the revision. Acceptance is never
delegated and no machine evidence substitutes for it. Gate 5 is release, and release is not in this
phase.

## The actual number of human confirmations

Counted act by act, not act by phase. "Approve and merge four stories" is eight actions, and it is
written as eight below. A **typed ceremony** means the command shows you the content and its hash
and you type a token and the first eight characters of that hash (`commands/approve.ts:321-330`);
there is exactly one such prompt per `approve`, and one per `revoke`. `lock` has **no** prompt — it
is `requireHuman` and then it runs. A **merge** is a separate action in every case.

| | Action | Kind |
|---|---|---|
| 1 | `revoke <lock id> --reason …` | typed ceremony |
| 2 | Commit the workflow change onto the window branch | edit and push |
| 3 | `approve bootstrap <pr>` | typed ceremony |
| 4 | Merge the window pull request | merge |
| 5 | Run the classification | command, no prompt |
| 6 | Push the classification record | typed ceremony (the script's own prompt, not the CLI's) |
| 7 | `approve 2 --classification <record>` | typed ceremony |
| 8 | `lock` | command, no prompt |
| 9 | `approve tests --from pod-factory/frozen-tests <14 paths>` | typed ceremony |
| 10 | `approve 3` | typed ceremony |
| 11 | `approve story-3 --pr <n>` | typed ceremony |
| 12 | Merge story 3 | merge |
| 13 | `approve story-4 --pr <n>` | typed ceremony |
| 14 | Merge story 4 | merge |
| 15 | `approve story-5 --pr <n>` | typed ceremony |
| 16 | Merge story 5 | merge |
| 17 | `approve story-6 --pr <n>` | typed ceremony |
| 18 | Merge story 6 | merge |
| 19 | Turn "branches up to date before merge" on | settings change |
| 20 | Accept the product — gate 4 | **no producer exists — see below** |

**Twenty actions. Ten of them are typed ceremonies, five are merges**, two are commands with no
prompt, two are an edit and a settings change, and one has nothing behind it yet. Stories 7 to 16
add none. Reviewing the mockup and the gap review before action 3 is reading, not a confirmation,
and it is the one place where your reading is the whole point.

**Action 20 has no producer, and the gap is precise.** PRD section 2: **gate 4 is acceptance of the
product**; gate 5 is release, which is not in this phase. The record is not what is missing — a gate
approval with `gate: 4` is already valid (`records/validate.ts:202-204`), and `binds` already carries
a tree and a file-hash map. What is missing is the command: `approve` refuses every gate but 2 and 3
(`commands/approve.ts:279-283`). So `pod-factory approve 4` has to exist, binding the accepted
revision's tree and the acceptance packet's hash, and refusing unless the product-verification
evidence is complete and nothing blocking is open — a story the gate-3 plan names that is not done, a
required check with no passing result for that revision's tree, a recorded review for that revision
with an open blocking finding, a packet missing a section or its four closing lines or carrying code
in its summary, a revision that moved after the packet was written, or an agent session.

It is assigned, not noted: **story 16**, with its implementation and its refusal tests, as T-10-P9
and T-10-N14 to T-10-N19 in the eval plan, plus T-10-P10 for the label. Story 16 already owned the
mockup-review evidence that acceptance rests on, and it depends on stories 4, 14 and 15, which
produce the rest of that evidence. The refusals REQ-27 already stated — a failing journey, missing
mockup-review evidence, a production check outside its threshold — keep their own rows there.

One label is corrected with it, which ADR-018 already flagged: the per-story approval prints
"Gate 4" (`commands/approve.ts:188`), the PRD's name for acceptance. The two cannot share it once
acceptance exists.

**What is not yours in any of this:** nothing. Milestone zero's papercut — that nothing re-runs the
checks when a record reaches the records branch, so an orchestrator had to — is closed by change 9,
not deferred to story 8: `approve` dispatches the relay and the relay posts the current conclusion.
If change 9 were dropped, that coordination comes back and an agent does it; it is coordination, not
authority, either way.

## The acts that are not on this list

No amendment for a batch of tests. No second transition pull request. No approval between stories 7
and 16 unless a check refuses and asks for one. No protection change except act 9. And no act of
mine anywhere in it: every one above needs a terminal that is not an agent session.

## The protection lab: what GitHub enforces, and the two things it does not

Lab 7, `ajpasco/pod-factory-protection-lab`, public and retained. Eleven cases, 6 pull-request
events, 17 workflow runs, about 6.6 minutes of Actions time, free because the repository is public.
The full table with run links is in `plab/TRANSCRIPT.md`; the register row is L18. Protection on the
lab mirrored this repository's, and `strict` was on for one case only, as it is off here.

**Enforced as the design assumes:** a merge refused while the required checks fail, by the API and
by an administrator merge with `enforce_admins` on; commit statuses of the same three names posted
from a non-App identity leaving the merge blocked, against checks bound to app 15368; a pull request
that edited `pr-checks.yml` judged by **main's** workflow, its marker step absent and the checkout
resolving to main's commit; the revocation relay taking a mergeable pull request to blocked; a force
push rejected and the default branch undeletable; and the committer rule flagging a check-result
committed by a person and a human approval committed by the bot, while six bot-written check-results
were valid.

**Two things are not as assumed. Both are now closed by changes in the window, demonstrated, with
permanent regression tests; and closing them exposed a third, which is designed and not
demonstrated:**

1. **A revocation block survives a re-approval.** Nothing re-runs a check when an approval lands, and
   re-running the job **re-creates** the relay's failing check in the same suite, so the head then
   carries both a passing and a failing `gate-check` and stays blocked. Re-approving and re-running
   did not unblock it. **Change 9 closes this**: the relay posts the current conclusion rather than
   failures only, and `approve` dispatches it, so a fresh valid approval restores eligibility on the
   same unchanged candidate. Rows T-22-P5, T-22-N12 and T-22-P6, with permanent regression tests.
2. **The fallback schedule's latency is hours, not fifteen minutes.** `records-validate.yml` says
   `*/15`; twelve consecutive scheduled runs on this repository fired at gaps of 1.9 to 5.2 hours,
   and the lab's fresh `*/5` did not fire at all in 61 minutes (case P10, recorded as not observed).
   `revoke`'s own dispatch is the primary path and it works — case P5 — so what is slow is only the
   backstop for a pull request already green when its approval was revoked. Row L10 is closed with
   that measurement instead of its earlier "no cadence is claimed".

**And one case failed against my own design — now closed by a corrected change 6.** P11b was meant
to prove that revoking the current authorization does not reactivate a superseded one. It did not: the spike checked the chain of
whichever record `gate3Approval` returned, and the predecessor's chain was intact, so gate-check
passed. **Checking the chain is not the fix**; the fix is at the selection — `gate3Approval` must
report a revoked latest record rather than return its predecessor. Until that lands, revoking a
gate-3 authorization silently promotes the one before it, which case P11a confirmed on real GitHub.
Change 6 now specifies the selection fix itself — take the latest gate-3 record regardless of
revocation and report a revoked one as revoked — with locked tests for both directions, and row
T-10-N13 carries it.

**The third blocker, found while closing the first two, and closed.** A check run created through
the API attaches to the **oldest** check suite on a head, and GitHub evaluates the **newest** — so
on a head with more than one suite, after a reopen or any workflow re-run, a relay-posted failure
sat in an old suite while a stale pass in the newest suite decided. The lab merged a pull request
whose authorization had been **validly revoked** for exactly that reason: head e25c0ca, six suites,
the relay's failure in the oldest and a pass in the newest.

Change 9 answers it by not posting a verdict at all: the relay **re-runs the gate-check job of the
newest `pr-checks` run**, so the authoritative job writes the current conclusion into the suite that
decides, and it keeps writing the check-result record that `revoke` reads. Demonstrated on pull
request 7, head f1c2391c with two suites, using only the workflow's own `GITHUB_TOKEN` plus
`actions: write`: revoking took the newest suite's gate-check to a failure, left the older suite
untouched, moved the pull request to BLOCKED and a real merge was refused 405 under
`enforce_admins`; a fresh approval for the same head and tree took it back to a pass and the merge
succeeded — identical head sha throughout, no empty commit, no new head, nothing done to a check run
by hand. Five regression tests cover it, including that the relay re-runs the newest run and not the
first one listed.

Two costs, both small and both named: the relay re-runs the gate-check job on **every** affected
open pull request when a record lands, which is correct and which the lab saw reconcile two
unrelated pull requests at once; and `revoke`'s message still says CI "posted a failing gate-check"
when it now re-runs one, which is wording to fix in the window rather than behaviour.

**What the lab establishes nothing about:** identity. Every record in it was planted or scripted, so
nothing tested `requireHuman`. Case P8 is the committer rule and only that. It is also one repository
with one admin token, so it covers no organization rules, rulesets, bypass lists or merge queues, and
the lock's command list was narrowed to `npm ci` and a single test file, so the suite itself was not
exercised. State left behind, deliberately: three pull requests open, three flagged records on the
records branch for case P8, and main returned to the unmodified enforcing copy with the spike
preserved in history and in `SPIKE.diff`.

## What `requireHuman` actually does, and what it does not

`requireHuman` guards `approve`, `lock` and `revoke`. It requires that stdin and stdout are both
terminals and that no agent marker is in the environment (`commands/common.ts:42-53`,
`records/actor.ts:45-59`). Record validation then requires the declared actor kind to match the
record type (`records/validate.ts:39-45`), and the store flags a human-authority record committed by
the Actions bot (`records/store.ts:148-153`).

**These are guardrails, not proof of human identity.** They stop an agent session as configured and
a non-interactive process; they do not stop a process that has the same credentials, a terminal, and
no marker in its environment, because an environment variable is trivially removable by whoever
controls the environment. The declared actor kind is self-asserted. And **committer identity does not
prove a human acted**: it distinguishes the Actions bot from a non-bot committer, and nothing more —
git identity is self-asserted, and an agent running as you commits as you. `writeRecord` is exported
from the package, so a process with push rights to the records branch can write a record declaring
`actor.kind: 'human'` and it will validate; nothing afterwards can tell it from a typed ceremony.

So the separation is worth stating exactly:

- **What the labs prove** — every one of them — is that each action's **effect** is enforced: what it
  binds, what refuses without it, what refuses when it is withdrawn, and that a pull request cannot
  judge itself. Every lab planted or scripted its human-authority records. Where a lab ran the real
  command it did so on a pseudo-terminal **with the agent markers removed**, which exercises the
  prompt, the shown hash and the typed-prefix check and deliberately steps around the identity test.
  **No lab tested `requireHuman`, and no planted record tested it.**
- **What the protection lab proves** about this, and only this: a record committed by a person where
  the Actions bot is required is flagged (case P8). That is the committer rule working. It is not
  evidence about who typed anything.
- **What the rest depends on is credential isolation** — that your terminal, your git credentials and
  push rights to the records branch are not available to an agent session, that the binary is
  installed outside the checkout, and that the hook denies agents the approval path. Those are
  properties of how the machine is set up. Nothing in the repository verifies them: `doctor` checks
  that the layers are present, not that your credentials are out of reach.

This is what PRD section 5 already accepts: an agent running as you, with your identity, is outside
what any of this can stop. The migration does not change that, and does not try to.

## Architecture and simplicity: where the controls live, and what is missing

Nothing new is required of the contract. REQ-09 already requires "size and complexity tripwires" and
"a simplicity review" before anything merges, REQ-06 already binds "the significant architecture
decisions and boundaries", and REQ-09 already sets the repair cap: once inside the story's own scope,
by the worker that built it, and a second failure or a path outside that scope goes to the approver.
So these are controls inside the existing contract and the existing review, with **no new gate and
no new step**.

Mapped to deliverables that already exist:

| Control | Where it lives | Owner |
|---|---|---|
| The short, project-specific architecture checklist | `docs/spec/architecture-checklist.md`, bound by gate 2 like every other `docs/spec/*.md` | written, travels in the window pull request |
| The fixed reviewer checklist | `templates/checklists/simplicity-review.md`; `templates/checklists/**` is already a locked pattern | written, travels in the window pull request |
| Automated checks for the objective boundaries — items 1 to 6 | the traceability check, extended: it already reads the diff against the contract | **story 5** |
| Size and complexity tripwires, which flag and never fail (ADR-007, C-09-1, C-09-6) | the same check | **story 5** |
| Blocking findings citing a clause or demonstrating a defect; preferences to the backlog; the review finishing when every line is answered | the review bundle and its record | **story 4** |
| The repair cap | REQ-09, unchanged | already contract |
| Where a story's authority comes from, and the line between an implementation choice and new product behavior, with the worked example | `docs/spec/architecture-checklist.md`, section "Authority, and what is not approval"; the **Authority** bullet of every story in the build plan and in every story file | written, travels in the window pull request |
| Added behavior read from what the diff adds, not from the file scope it stayed inside — checklist item 11, reviewer rows 9 and 10 | the review bundle and its record; the two reviewer rows are staged in `.factory/work/transition-1b/staged-locked-changes.md` because that checklist is a locked path | **story 4** |
| The register that holds suggestions and is not scope | `.factory/work/backlog.md` | written |

**What is missing, explicitly, and nothing here is implied to exist:** the boundary check does not
exist (no `check-runner/boundaries.ts`, nothing reads the import graph or the lockfile against a
checklist); the tripwires do not exist in any form; `review-record` does not exist at all, so
nothing today can refuse a blocking finding that cites nothing, and nothing records a preference to a
backlog. `.factory/work/backlog.md` now exists as that register, empty. No plan check exists either,
so nothing today reads a story's **Authority** bullet: T-07-P1 was always NB, and the authority field
joins the row it already owes. Eval rows T-09-P12, T-09-N25 to N28 and T-09-P13 carry the
architecture controls, and mapping rows C-09-12 and C-09-13 map them; the scope-authority controls
are mapped at C-01-9, C-03-9, C-04-10, C-07-7, C-09-14 and C-26-7, and their eval rows are staged
rather than written because `docs/eval-plan.md` is a locked path. Those six rows say what is
mechanically checkable, not what runs: not one of the five mechanical ones has a checker on main, so
every part of the rule rests today on the reviewer and the approver, exactly as the phase-1b 22 do.
Items 7 to 11 of the checklist are judgement and are mapped Reviewed, not Enforced: once
`review-record` exists, CI can prove a review exists, answers every line and binds this content, and
even then cannot prove the judgement was good — including the judgement that nothing in the diff is
behavior nobody approved.

## Two operating assumptions, and which one this rests on

Every statement in this package should be read against one of these. They are not variations of each
other; they are different systems.

**Assumption one — trusted agents sharing the operator's credentials.** This is how the factory runs
today and how the whole of phase 1b is planned. Agents have the operator's git identity, the
operator's push rights and, in principle, the operator's terminal. Under it, the approval ceremonies
are **guardrails**: they stop the accidental and the configured case, they make the approval path a
deliberate act, and they are trivially bypassable by a process that holds the same credentials and
controls its own environment. What the records then provide is **traceability**: every authority is a
durable, append-only, attributable entry that cannot be erased, so what was authorized and on what
evidence can always be reconstructed. Guardrails plus traceability is the honest description of the
security model, and it is the basis on which implementation planning continues.

**Assumption two — agents technically prevented from approving their own work.** This requires an
approval credential or service the agent cannot reach: a signing key held outside every agent
session, a second machine or person, or an approval service that authenticates the human
independently. **It is not implemented, nothing in this plan implements it, and no claim in this
package or in any ADR rests on it.** Until it exists, "an agent cannot approve its own work" is not a
property this system has.

Two consequences I want on the record, because they are easy to assume wrongly:

- **Ending per-story approvals does not weaken a prevention, because there was no prevention.** Under
  assumption one, a per-story approval was already a guardrail, not a barrier an agent could not
  cross. What replaces it is a set of evidence requirements that are mechanical and cannot be
  satisfied by assertion: a passing verify bound to the merge candidate, a closed review bound to the
  same candidate, the diff inside an approved scope, traceability clean, the gate-3 chain intact.
  That is a different kind of control, and arguably a stronger one, but it is not the same kind.
- **Automatic merging is not enabled on any claim about agent capability.** Its three conditions
  (ADR-018) are about demonstrated behaviour of the checks and the protection settings. It stays off
  until those hold, and it would stay off under assumption two as well, because the two are
  unrelated.

## Unmet security requirements, stated before any migration request

1. **No record is signed.** Human authorship is asserted and never proven. ADR-010 item 33 says
   signatures are verified when present; none are present.
2. **The records branch is append-only and openly writable, which is not the same as unprotected.**
   Read live from `ajpasco/pod-factory`, branch `pod-factory/records`, and matched against what
   `doctor` requires (`commands/doctor.ts:215-228`):
   - **Direct-write permissions:** no required reviews, no required status checks and no push
     restrictions (`restrictions: null`), so anyone or anything with push access to the repository
     can add a record directly. This is deliberate and `doctor` *insists* on it: a required check or
     review here would stop `verify-record` pushing from Actions.
   - **Force-push prevention:** `allow_force_pushes: false`. History cannot be rewritten, so a
     record that has been written cannot be made to disappear.
   - **Deletion prevention:** `allow_deletions: false`. `doctor`'s own words for why: deleting the
     branch "would delete every revocation".
   - **Admin enforcement:** `enforce_admins: true`, so both of those apply to the account owner too.
   - **Validation:** `records-validate` validates every record and flags what fails; every consumer
     ignores a flagged record (`records/store.ts:270-283`). It runs after the push, not as a gate on
     it — so an invalid record can land and is then inert.

   Net: **append-only, writable by anything with push access, validated after the fact.** What it
   gives you is that nothing can be erased or rewritten; what it does not give you is any control
   over what gets added.
3. **The ceremony can be bypassed** by calling the exported writer directly, as described above.
4. **The agent hook is not a boundary**, only a default. Its matcher covers Write, Edit, MultiEdit
   and NotebookEdit (`hook/pre-tool-use.ts:10`); Bash is not matched, so an agent can place a
   protected or locked path with `git checkout`, `cp` or a heredoc. CI still refuses the merge, which
   is where the real boundary is.
5. **What this migration adds to that surface, stated correctly.** The frozen-test inventory becomes
   the authority for what a test *contains*. A forged `approve tests` record would therefore
   authorize **weakened tests**, and every check afterwards would pass honestly: the suite would be
   green against tests that assert less. **A green suite does not compensate for forgeable approval
   authority** — it is the wrong kind of evidence for that threat, because the forger chooses what
   "approved" means. (An earlier draft of this document argued that a forged inventory "cannot make
   a failing suite pass". That is true and beside the point: it answers a forged *report*, not a
   forged *approval*.)

   What actually bounds it, under the first operating assumption below: the ceremony shows every path
   with its hash before you type, so a substitution is visible **if the hashes are read against the
   reviewed files**; the review notes on the frozen branch come from sessions that did not write the
   tests, though under that same assumption those notes are forgeable too; and the records are
   append-only, so a forged approval cannot be erased afterwards and the inventory it signed stays
   attributable. That is traceability, not prevention. The only technical prevention is the second
   assumption below, and it is not implemented.

6. **A revocation did not reliably block a pull request whose head has several check suites.**
   Measured on real GitHub and **closed** by change 9, which re-runs the authoritative job instead
   of posting a verdict, demonstrated on a two-suite head. It is listed here because it was a live
   hole in revocation until this round, not because it remains one.

None of the first five is new and none is introduced by the migration, though item 5 is made more
valuable by it; the sixth is newly measured rather than newly created. No item on this list is treated as solved, and building the approval credential or service of
assumption two is not part of this phase.

## What else a lab cannot tell you

Real GitHub protection, except for the eleven cases of the protection lab. The thoroughness of any
review, frozen test or gap review — a hash proves what ran, not that it was worth running. And every
lab is a synthetic project: none of them says anything about how long the real suite takes, or how a
real builder behaves.
