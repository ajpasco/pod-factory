# The approver's scripts for the rest of milestone zero

Written by the design session on 2026-10-14, at the approver's direction: "Keep my involvement to
product decisions and the required approvals. Prepare the mechanics for me." They are the mechanics
for steps 2 to 6 of the approver's sequence in
`.factory/work/bootstrap-10-revocation-fixes/handoff.md`, which stays the authority for the order.

Run them in a terminal, one at a time, from anywhere:

```sh
bash .factory/work/approver-scripts/1-relay-workflow.sh
```

Each takes an optional first argument, the path to the repository, and defaults to
`/Users/jay/orca/projects/orca-software-factory`.

| Script | What it does | What it leaves for the approver |
|---|---|---|
| `1-relay-workflow.sh` | Opens the pull request that puts the revocation relay on main | `approve bootstrap <n>`, then the design session merges |
| `2-gate2-classification.sh` | Runs the locked command list against a clean export of main and opens the pull request that adds its report as the gate-2 classification | `approve bootstrap <n>`, then the design session merges |
| `3-record-0005-and-gate-2.sh` | Writes bootstrap record 0005 from the report on main, then runs `approve 2` and `lock` back to back | typing two hash prefixes |
| `4-approve-3.sh` | Checks what gate 3 depends on and runs `approve 3` | typing one hash prefix |
| `5-protection.sh` | Makes `lock-guard`, `verify` and `gate-check` the required checks, bound to the Actions app, and protects the records branch | typing `protect` |

Every one of them holds to the same shape, which is the point of them:

- They read only until the single prompt that asks for a hash prefix or a word. Before that prompt
  nothing has been written, pushed or changed, and they say so.
- They work from `origin` refs and build their commits with git plumbing, so the approver's working
  tree and whatever branch is checked out are never touched.
- They refuse rather than improvise: on a record that already exists, a branch that already exists,
  a hash that does not match, a missing git identity, a test failure outside the approved set, or a
  commit that would carry more than the one file it is supposed to carry. Every refusal ends by
  saying that nothing was written.
- They derive, never assume. Record 0005's numbers and its approved failures are read out of the
  classification report it binds; step 5's app id is read from a live check run before anything is
  bound to it.

They are an agent's work, so they are evidence of nothing by themselves. What they produce — the
records, the pull requests, the protection — is what counts, and each one prints what it produced.
