# pod-factory

Governance for software that agents write.

The bet is not that agents can write code — they can. It is that nobody should have to take an
agent's word for anything. So the factory makes an agent's word irrelevant: a human decides in
writing, bound to exact content; the tests that define "done" are frozen before any building
starts; CI, not an agent's report, decides whether anything may merge; and every authority and
every piece of evidence is an append-only record anyone can read back.

It is meant for engineers and for people who are not engineers. Engineers first.

## The five ideas

1. **An approval is a record bound to exact content.** `approve` shows one hash over the statement,
   the tree, the files it binds and the records it cites, and waits for the human to type its
   prefix. Change one byte afterwards and the approval stops counting.
2. **The tests that define done are frozen before the work starts.** That is the lock. An agent
   cannot weaken a test, widen a spec or declare success, because the standard was set, hashed and
   protected before it began.
3. **CI is the authority.** Three required checks run from the enforcing copy on main, never from
   the code under review: did a protected file change, do the locked tests pass on this exact code,
   and is there a real human approval for this exact version.
4. **The evidence is a trail, not a report.** Approvals, the lock, every check result, every story
   transition, every revocation — who authorized what content, what ran, what passed.
5. **Agents are boxed in structurally.** One story, one approved list of files, hooks that refuse
   writes to the records, the workflows and the protected tests. Not by instruction — by refusal.

The human's job is deliberately small: product decisions and gates. Not merging, not coordinating,
not carrying messages between agents.

## What exists today

**The enforcement spine, proven.** The record store with per-record validation; four gates with
hash-bound human approvals; `lock`, freezing the test files and the exact test commands; the
amendment path for a protected file; `story start` / `story finish` with a lease; hooks denying
agent writes to records, workflows, settings and locked paths; `lock-guard`, `verify` and
`gate-check` as required checks with administrators bound; revocation reaching CI; `status` and
`doctor`. Proven **once**, on the factory building its own `status` command, with a human approval
for every pull request and automatic merging off.

**The preparation flow, built outside the enforcement spine.** Seven gates from an idea to a
requirements document, a technical blueprint, an eval plan and a frozen, build-ready project, with an
orchestrator that refuses to advance a gate whose exit conditions are unmet, separate drafting and
checking agents, and written rubrics as the standard. Runtime-neutral markdown: it runs in Claude
Code alone, in Codex CLI, or in Orca. See [docs/orchestrator](docs/orchestrator/README.md).

**Two applications.** The meeting-reminder page is **governed by the factory**: its own PRD,
technical spec and eval plan under `docs/projects/meeting-reminder/`, an approved contract at
`docs/spec/meeting-reminder-contract.md`, and stories two and three authorized against it and in
progress. An earlier version of the same page was built and tested *outside* the factory as a model
comparison and survives only on the branch that produced it. The equipment-checkout application is
prepared to the bar — 17 requirements, 182 acceptance criteria, 182 verification rows, 257 tests,
four stories — and **not built**.

(Those meeting-reminder files are on `origin/main`. This branch was cut from a slightly earlier
main and does not carry them.)

## What does not exist

- **A second project.** Nothing in the shipped code reads a project name. One lock, one build plan
  and one story numbering for the whole repository.
- **A second story without an approver ceremony.** Stories two and three exist, so the route works
  — but only as a human act: revoke the lock, reopen gate 2, re-approve, re-lock. That was run on
  2026-10-18. No agent can do it, and that is the design: bootstrap authority stops counting once a
  lock exists, and a story's scope can never carry a `.factory/` path outside its own folder.
- **Any check on code quality or security.** The lock proves requirements are met. It says nothing
  about whether the code is clean, readable or safe. The reviewers that would judge that are
  designed and unbuilt.
- **Managed setup.** Nothing bootstraps git, CI, branch protection, hooks or a keychain in somebody
  else's repository.
- **The build half of the preparation flow.** Freeze, dispatch, check, accept are scoped and
  unbuilt, so a prepared plan cannot yet be handed to a builder under protection.

## Honest maturity

One story has been built through the gates, and it was the factory's own CLI command. No
application has been built through them. The one application that exists was built outside the
factory by a session that then verified its own work, which is exactly the arrangement the factory
exists to replace. Everything in "what does not exist" is a real blocker, not a nice-to-have.

## Where to read next

| | |
|---|---|
| What the product is for, and its requirements | [docs/PRD.md](docs/PRD.md), [docs/PRD-reference.md](docs/PRD-reference.md) |
| How it is built and what each gate binds | [docs/TECH-SPEC.md](docs/TECH-SPEC.md) |
| The tests that define done, by requirement | [docs/eval-plan.md](docs/eval-plan.md) |
| Decisions, with their reasoning | [docs/adr/](docs/adr/) |
| The preparation flow, in plain English | [docs/orchestrator/README.md](docs/orchestrator/README.md) |
