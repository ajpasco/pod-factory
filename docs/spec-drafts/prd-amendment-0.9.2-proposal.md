# Proposed PRD amendment 0.9.1 to 0.9.2: ten criteria made checkable

For the approver's wording approval (ADR-010 item 6). Each row quotes the current criterion in `docs/PRD.md` section 4 and proposes a replacement that names what is observable. Nothing here widens or narrows scope; it states each criterion in terms the eval plan can test, as the PRD's section 4 introduction requires before gate 2. Applying it reopens gate 1 only for the requirements listed, and the gate-1 record stays valid for the other fourteen.

| # | Requirement | Current wording | Proposed wording |
|---|---|---|---|
| 1 | REQ-02 | "proposes no refactoring" | "proposes only additions to the project rules; a proposal to change existing code is flagged as out of scope" |
| 2 | REQ-04 | "a design question about something the PRD settles is rejected" | "a decision record that both cites a settling clause and records a question put to you is rejected; which clauses settle a question is reviewed, not measured" |
| 3 | REQ-04 and REQ-10 | "a fresh-context technical review" / "written by a fresh-context agent" | "a technical review (or packet) whose recorded inputs are exactly the inputs named for that role and whose agent session started for that task" |
| 4 | REQ-08 | "Builder context is exactly what the orchestrator supplied and is recorded" | "The inputs the orchestrator supplies to a builder are recorded with their hashes and limited to the story file, the spec sections and mockup screenshots it lists, and the project rules; what a builder reads afterwards with its own tools is outside the record until sandboxes exist" |
| 5 | REQ-08 | "Killing the builder, the orchestrator or Orca at any point and restarting loses no record" | "Killing the builder, the orchestrator or Orca at each defined kill point (after every record write, between steps, during a record write, during a push) and restarting loses no record and duplicates none" |
| 6 | REQ-13 | "A dispatched builder cannot open a question prompt the orchestrator cannot see" | "Under Claude Code, a dispatched builder's attempt to open the local question tool is denied and pointed at the orchestrator's ask command; other agents are held by instruction only" |
| 7 | REQ-16 | "the whole workflow runs with Claude Code alone" | "the whole workflow runs with Claude Code alone, demonstrated by the scripted flow in CI and by the live milestone-zero run" |
| 8 | REQ-18 and REQ-21 | "Credentials never appear in any log, artifact or model context" / "never appear in any transcript, log or artifact" | "Planted canary credentials appear in none of the transcripts, logs, artifacts, records, reports or executor output produced by the scripted story and release runs" |
| 9 | REQ-22 | "every failure that stops work produces a plain-language message with your options" | "each listed stopping failure (refused approval, blocked merge, parked story, halted release) and any unexpected crash produce a plain-language message with your options, checked by the plain-language lint, with the raw error kept in the log" |
| 10 | REQ-12 | "the approving process is never an agent" | "the approving process refuses to run from a known agent session and runs only from a human-owned shell; an agent forging a record as your user is the accepted limitation in section 5" |

When approved: apply to `docs/PRD.md`, bump to 0.9.2, write amendment record 0004 binding the before and after hash of each changed requirement (REQ-02, 04, 08, 10, 12, 13, 16, 18, 21, 22), and update the eval plan's "untestable" list to "closed by amendment 0004".
