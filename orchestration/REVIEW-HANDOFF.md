# One business-flow review

Jay asked us to implement the first orchestration milestone, collaborate on feedback, and require proof for proposed fixes. The goal is a usable business journey, not a perfect architecture. Codex coordinates; Sol implemented the workflow and interface. Claude is requested as an independent reviewer.

Review only `orchestration/`, against `IMPLEMENTATION.md` and the first useful milestone in `../docs/spec-drafts/pre-build-orchestration-plan.md`.

The journey is: enter an idea → answer one material question → generate PRD plus clickable sample-data mockup → request one coordinated change → return to saved artifacts and an exact-content draft review packet. Drafts do not approve a gate. Four gate reviews remain unperformed. Trusted approvals, builder dispatch, later spec/eval/plan stages, general onboarding and session messaging implementation are outside this slice.

Current evidence: nine workflow/API checks pass and `npm run test:browser` exercises the actual UI with an explicitly labeled fixture provider. Codex is also running the actual CLI provider on a synthetic reading-list idea and revision; `evidence/live-*` and screenshots are written only as each step succeeds. Do not claim that run passed before its output exists.

Do one review. Every suggested immediate fix needs a reproduction, failing check, or exact source path/line plus its concrete business consequence. Label each finding:

- **Fix now:** the agreed journey fails, loses/confuses user work, falsely grants approval, or has a demonstrated security defect in that journey. Give the smallest sufficient correction.
- **Defer:** useful improvement that does not prevent the demonstrated journey. State the benefit briefly; do not implement it.
- **Reject:** added complexity or scope without a demonstrated need.

No review quota. No new lab, architecture redesign, model comparison, approval mechanism, event bus or source edit. Reading code and running existing tests in disposable temporary state is allowed. Do not modify the live demo at port 4318, factory records, comparison inputs, meeting app or private calendar snapshot. No extra model calls.

Write findings to `orchestration/CLAUDE-REVIEW.md`, with evidence and a concise verdict on this journey. If nothing blocks it, say so and stop. Root will record dispositions and make bounded fixes. Return completion through the existing coordination file; no additional round unless a concrete repair needs verification.
