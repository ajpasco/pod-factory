# Rubric: the planning review

The review that gate 6 requires. It is performed by a session that started for this task.

## Inputs, and only these

The PRD, the mockup, the blueprint, the eval plan and the story list, plus the rubrics for each.
Not the drafting conversation, not an earlier review, not the orchestrator's state file commentary,
not any implementation of the application.

## What to check

1. Each artifact against its own rubric, reporting that rubric's verdict section.
2. Across artifacts: the PRD's criteria reach the blueprint's register and the eval plan's tests;
   the blueprint's story shape matches the eval plan's story table; the mockup demonstrates the
   PRD's journeys and no others.
3. Sequencing: no story is asked to prove something that does not exist yet; no eval needs a file
   a later story creates; combined or journey checks come after the stories that supply them.
4. Ownership: every test and every file has exactly one owning story.

## Finding format

One entry per finding:

- `id` — stable within this review, for example `R3-002`.
- `severity` — `blocker` or `advisory`.
- `description` — what is wrong, in one or two sentences.
- `basis` — the quoted text or the absence that proves it. A finding with no basis is dropped.
- `resolution` — `plan-correction`, `user-decision` or `blueprint-change`.

## Rules the reviewer follows

- Report defects, not preferences. If the artifacts satisfy the rubric, "I would have done it
  differently" is not a finding.
- Never propose new product scope. A missing capability is a `user-decision` finding that names
  the gap, not a recommendation to add a feature.
- Never weaken a rubric to clear a finding.
- Say "none found" where that is the answer. Silence on a section is not a pass.
- An advisory is never a licence to build more.

## The pre-review of a human-review criterion

Where a criterion is verified by a person, an agent reviews it first, to find what the person would
miss. That pre-review follows this rubric with three differences:

- **Its inputs include the conversation trail**, not only the artifacts: the confirmed scope with
  its citations, every question and its recorded answer, every decision with its decider, and every
  change round. Most gaps a person misses are things they said once, early, and nobody carried
  forward.
- **Every gap it reports is traced twice**: to the criterion it bears on, and to the place in the
  trail the expectation came from. A gap it cannot trace is reported as its own observation and
  labelled as such.
- **It states what it could not judge.** A pre-review that reads as though it checked everything is
  worse than none, because the person then stops looking.

It is evidence, not a verdict. It never records a criterion as passed or failed, never approves, and
its "found none" is not clearance. The person's record is what closes the criterion.

## Verdict

State the counts by severity. Then, for the orchestrator to turn into a costed decision list,
give for every `user-decision` and `blueprint-change` finding: what it blocks, and how much — the
tests that cannot be written, the story affected, the criterion left unobservable. Where you
cannot state a finding's cost, say that rather than guessing it.

Then one of:

- **No blockers.** The plan may go to the user for acceptance, with the advisories listed.
- **Blockers, all `plan-correction`.** The orchestrator may make one automatic correction pass,
  after which a new review in a new session is required.
- **Blockers including `user-decision` or `blueprint-change`.** Stop. The user decides. No
  automatic correction is permitted for a mixed or unclassified set.
