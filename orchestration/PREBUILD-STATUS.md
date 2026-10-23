# Requirements through the build boundary

This increment implements product preparation through a reviewed **draft build handoff**. It does not mark the factory's full pre-build contract complete. The following map preserves the requirements established in the [pre-build plan](../docs/spec-drafts/pre-build-orchestration-plan.md) and [technical blueprint](../docs/spec-drafts/tech-spec-builder-blueprint.md). Missing capability stays visible rather than becoming an implicit waiver.

| Phase requirement | Implemented in this local slice | Evidence or remaining work |
| --- | --- | --- |
| Capture user intent and retain answers | Saved idea, material scope question, answer, explicit revisions and proposal separation | Workflow/API/browser checks; adaptive interviewing is future work |
| PRD and experience agree on authorized journeys | Paired generation and revision; separate clickable sample mockup; source hashes bound into planning | Real generation evidence exists; semantic completeness needs product review and the four required gate-1 reviewer roles, which are not run here |
| User can choose stack and architecture | Preferences, generated stack/code structure, digest-bound local selection; changing the blueprint invalidates the plan | Selection and stale-digest tests; the selection is not a trusted gate approval |
| Keep architecture simple and secure | One–three responsibility-layer field and six mandatory decisions: architecture, testability, security, configuration, Docker and production | Shape is checked; actual design suitability, security and simplicity are model/human review judgments. No claim that layer count proves quality |
| Environment and deployment approach fit the product | Prompts require applicable .env/example/secret handling, explicit Docker decision, appropriate production criteria or justified non-applicability | Decisions and rationales are required; no containers, deployment or secret store are created by drafting |
| Evals address correctness and restraint plus applicable production requirements | Structured evals with requirement references, procedures, expected outcomes and evidence method; all three categories required | These are plans. Executable acceptance harness authoring, independent harness review and actual baseline execution are outstanding |
| Every requirement is accounted for | One coverage row per extracted requirement; covered rows need eval and story references; gaps block handoff | Structural coverage tests; source extraction and non-applicability require judgment. Model omission of a source requirement is not automatically detectable |
| Stories have scope, order and safe concurrency | Requirement/eval references, named scope, dependencies, execution ordering, optional parallel groups; overlapping scope and dependency conflicts refuse | Graph/reference tests. Interface correctness and intended ownership still require review |
| Review the whole contract before build | Fresh reviewer invocation reads the actual PRD, mockup, blueprint and plan; blocking findings require a basis; findings feed a requested plan revision | Model review does not equal executed tests or the separate mandated gate-role reviews; source-based finding validity remains judgment |
| Builders follow current inputs | Handoff binds source, blueprint, plan and review digests; upstream revision invalidates downstream work | Exact draft export and explicitly configured read-only cached factory diagnostics are implemented. They do not validate live authority or dispatch builders; source/record observations never approve the exported package |
| User approval without a terminal | Browser local choice and CLI/browser shared state work | Credential-isolated direct-user approval, gate records, lock integration and observed authoritative success remain outstanding. No local token or agent-accessible selection is portrayed as human identity |
| Production-ready result | Plan includes applicable production checks and combined-candidate verification instructions | Actual implementation, tests, product acceptance, release evidence and operational verification must happen later. A planning packet is never a production-readiness verdict |

The handoff always states `authority: draft-only` and `dispatchReady: false`. Its remaining blockers are explicit. This is the point where preparation artifacts are assembled for the next build-integration slice, not permission to send an agent around the factory's rules.

## Next integration, without reopening the design

Use one small project and the existing factory: author and independently check its acceptance harness, run and classify the actual baseline, protect the exact tests/runner, establish the real gate/lock chain through a supported user approval path, and only then verify one bounded builder dispatch. Each must have real evidence before its status changes. Do not add a new approval engine, another records store, or automatic merge machinery to disguise missing integration.

The local flow is still three responsibility layers: browser/CLI interface, workflow/state, and model/HTTP adapters. No database, event bus, hosted service or generic execution engine was introduced.

## Integrated read-only connection — 2026-10-19

`factory` and `factory-package` are now available through the CLI, with `GET /api/factory` in the shared service. Configuration explicitly names the repository and harness; story selection is explicit. Diagnostics show locally cached records and preserve `non-authoritative`, `packageBinding: unverified`, and blocked real dispatch. The draft export has a recomputable content digest. Two false-ready regressions (tampered package and blocked route) are covered. See [integration/sol-review/INTEGRATED.md](integration/sol-review/INTEGRATED.md) for independent integration evidence. This adds no gate approval, executable equipment harness, legal onboarding route or builder launch.
