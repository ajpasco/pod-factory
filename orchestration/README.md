# Product preparation

The orchestration takes a product idea through one scope question, a generated PRD and clickable mockup, a technical blueprint, requirement-linked evals and stories, and a separate planning review. Answers, revisions and exact-content draft packets survive restart.

This is a drafting and review workspace. It cannot approve a gate, change a factory lock, dispatch a builder or merge anything. Its packet lists all four gate-1 reviews as not performed. The factory comparison and meeting app are separate and unchanged.

## Run

Requires Node 22.12+ and the installed Claude CLI with an existing working login. From this directory:

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4317. Use that address, rather than a LAN address. One process owns one data directory. Preparation is stored under ignored `.preparation/`; no credentials are stored there.

To give an app its own visible Orca worktree, open **Session**, enter its project workspace name, save the agent preferences, and select **Start workspace + …**. Disconnect an existing owner first; its chat is preserved. The launcher reveals the new worktree and pairs the chat there without starting a builder. See [named workspace behavior and recovery](ORCA-INTEGRATION.md#named-project-workspaces).

Optional process environment: `ORCH_PORT` (default 4317), `ORCH_DATA_DIR` (default `.preparation` here), `ORCH_MODEL` (default `sonnet`). `.env` is ignored but not automatically loaded. No Docker or new API key is needed. The provider uses the existing Claude login, requests structured text with all model tools and MCP disabled, limits each draft to $2 and 180 seconds, and writes no output selected by the model. A task that times out stays unresolved; it is not automatically retried.

Read-only factory diagnostics are unconfigured by default. For an explicitly selected local checkout and repository-relative harness directory, start the service with `ORCH_FACTORY_REPO=/absolute/path/to/repo ORCH_FACTORY_HARNESS_ROOT=docs/projects/equipment-checkout npm start`. Optional: `ORCH_FACTORY_REMOTE` (default `origin`) and `ORCH_FACTORY_CLI_PACKAGE` (explicit installed CLI package.json for version provenance). Partial or invalid settings report `configuration.status: invalid` and select no route. Diagnostics never fetch, check out files, write records or launch a builder.

Use `npm run cli -- factory --story story-N` for locally cached observations, or `GET /api/factory?story=story-N`. Omitting `story` selects nothing. The result separates `observations` (minimally parsed candidate records and path/hash heuristics) from `prerequisites` (exact-package validation unconnected; real dispatch unsupported). Cached refs may be stale. Factory schema, history, writer rules, effective amendments, protected harness/runner hashes, and the exported package's scope/contract binding are unverified. A matching cached story hash, including an unrelated application's story, supplies no package authorization. `route.authority` is `non-authoritative`, `route.packageBinding` is `unverified`, and dispatch stays blocked even if every observation matches. Missing local refs report `uncertain`.

`npm run cli -- factory-package` or `GET /api/factory?include=package` exports the full reviewed draft after planning completes. It includes requirements, decisions, evals, coverage, story scope and artifact/source references. Recompute `manifestDigest` as SHA-256 over LF-normalized UTF-8 of `JSON.stringify(bodyWithoutManifestDigest, null, 2) + "\n"`. This proves content integrity only; it is not a factory approval. No approval or dispatch endpoint is added.


Each successful draft produces immutable artifact files and content digests. Requested changes are explicit scope input; suggestions remain separate. The actual meaning and completeness of model-generated documents still need review—schema and hashes do not prove their content is right.

Requirements interview: the configured Claude provider now reviews the supplied idea and answers, asks one material product question at a time, and finishes with a scope summary. The browser starts the interview after saving an idea and checks the next question after each answer. Complete supplied scope can proceed without redundant questions. The user explicitly requests the drafts after reviewing the summary. Existing single-question preparations can use **Clarify the scope → Review remaining requirements**; review preserves existing artifacts, while a new answer clears their current references and downstream planning because their inputs changed. Previously saved files remain on disk. No model summary becomes scope authority. Semantic completeness still requires user review.

CLI: after `start` or `answer`, use `interview --id PREP --revision N --operation-id ID` with the latest saved revision, then inspect `status`. Each call performs one bounded review; it cannot approve or build. Tasks expose running/completed/failed/interrupted status. The browser displays that status beside the relevant form, including elapsed time, and resumes polling after reload.

## Checks

```sh
npm test
npm run test:browser
```

The second command needs a Playwright Chromium installation (`npx playwright install chromium` if absent). Both commands use fixture providers and no paid model calls. The browser check uses the actual local HTTP interface and exercises the complete draft/revise/reload journey.

The independent live-provider demonstration is recorded under `evidence/`: a synthetic reading-list idea generated both artifacts, then changed their heading to “My next book” on request. This evidence is distinct from the fixture tests. No real calendar data is included.

## Current limits

- One active preparation and one local service process. No hosted service, team accounts or general project onboarding.
- The first question is a fixed primary-user/first-outcome question. More adaptive interviewing is later work.
- A running task at restart is reconciled against saved result evidence; when no matching result exists it remains explicitly interrupted. It cannot silently launch another model call. The page offers an explicit separate preparation, retaining the previous files. A chooser for reopening older preparations is deferred; recovery of the old task itself needs matching result evidence.
- The local request token and sandboxed preview protect this preparation interface; they are not human approval credentials or a defense against another process running as the same OS user.
- Technical-spec/eval/story preparation is implemented. Executable acceptance-test authoring, baseline runs, required gate-role reviews, trusted approvals, test protection and actual factory dispatch remain unfinished. Orca plugin consent is not treated as proof of human-only factory approval.

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the bounded scope and [REVIEW-HANDOFF.md](REVIEW-HANDOFF.md) for the proof-required review policy.

## CLI, Claude, Codex and Orca

The CLI uses the running HTTP service, so it shares the browser's state and never starts a second writer against the data directory. Start the service as above, then use another terminal or agent session:

```sh
npm run --silent cli -- status
npm run --silent cli -- open
npm run --silent cli -- start --text 'A reading list' --operation-id reading-list-start
```

`open` requests the default browser at the same local page. `orca-open` opens it in Orca’s existing workspace browser instead. Browser launch is not evidence that the person reviewed or approved anything.

The page’s **Orca session connection** offers Claude (`claude-opus-5-5`, medium) or Codex (`gpt-6.1-sol`, high), with Claude preferred initially. Saving preferences does not change an existing session or the internal drafting provider. Starting a new native chat is a separate explicit action. See [ORCA-INTEGRATION.md](ORCA-INTEGRATION.md) for connection behavior, notification receipts and installed-version limits.

After the user answers the saved question, the agent can record the answer and request a draft. Take the actual ID and revision from `status` before each mutation:

```sh
npm run --silent cli -- answer --id PREP_ID --revision 1 --operation-id reading-list-answer --text 'One reader chooses their next book.'
npm run --silent cli -- draft --id PREP_ID --revision 2 --operation-id reading-list-draft
npm run --silent cli -- status
npm run --silent cli -- packet
```

Draft/revise responses acknowledge asynchronous work; `status` reports the result. A failed or interrupted state exits nonzero and retains its JSON explanation. No command automatically retries a model call. Reconcile uncertain delivery with status and the recorded operation ID. `revise` takes the same ID/revision/operation options plus `--text` (or `--file`); `artifact --kind prd|mockup` reads the current document. `--help` lists the commands. Use `node /absolute/path/to/orchestration/dist/src/cli.js` outside this directory; optional `--url http://127.0.0.1:PORT` selects another local instance.

The portable [pod-preparation skill](skills/pod-preparation/SKILL.md) is the thin host instruction for both Claude Code and Codex. To try it without changing either host's configuration, ask the agent to read that file by its absolute path and use it for your preparation. It is packaged here, not installed into global skill directories. It has no bypass-permission settings or approval powers. Calling from Codex still drafts through the current Claude provider; a Codex drafting provider is future work.

The [proactive-site direction](PROACTIVE-DIRECTION.md) records how to carry authorized work forward and hand decisions back through the browser. It is a proposal for the next slice, not an implemented background agent.

## From product review to a build handoff

After reviewing the PRD and experience, enter stack preferences in **Technical blueprint**. The model proposes architecture/code structure, testability, security, configuration, Docker and production decisions, citing the product requirements. One to three responsibility layers are supported; more needs an exception path that is not implemented. No environment variables or Docker setup are added just to satisfy a ritual when the project has no need for them.

Review the exact blueprint, then choose **Use this blueprint and prepare evals & stories**. That action saves a digest-bound local selection and continues the requested plan generation. It is a planning choice available to the local user/process, not proof of human identity or a factory gate approval. Stack changes regenerate the blueprint and clear the selection and all downstream plans.

The plan includes correctness, restraint and production evals, a disposition for every extracted requirement, story scope and eval references, ordered dependencies and optional disjoint parallel groups. Coverage and graph shape are checked in code. The meaning and completeness of extracted requirements, justified non-applicability, architecture quality and test quality require review. **Review the complete package for gaps** makes a fresh text-only model invocation reading the actual product, technical and plan artifacts. Blocking findings need a concrete basis. A separate invocation is review evidence, not an independent credential, different model or proof of correctness. It does not replace the required gate-1 roles.

Unresolved gaps prevent a handoff. With no planning blockers, the packet reports `planning-complete` and `dispatchReady: false`, names all unimplemented factory/evidence requirements, and binds its source artifacts. PRD revisions clear downstream planning. No generated commands run, no test is reported passed, no record is written, and no builder is dispatched.

CLI equivalents (append current `--id`, `--revision` and a unique stable `--operation-id` to each mutation):

```text
technical --text "Prefer TypeScript; recommend the simplest suitable structure."
select-technical --digest EXACT_BLUEPRINT_DIGEST
plan
review-plan
artifact --kind technical|build-plan|handoff
```

Use the [Orca walkthrough](ORCA-WALKTHROUGH.md) and [clickable illustration](http://127.0.0.1:4317/walkthrough) to see the proposed conversation/browser handoff. The [phase requirements map](PREBUILD-STATUS.md) distinguishes completed preparation from the evidence and authority still required to build.
