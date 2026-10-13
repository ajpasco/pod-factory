# ADR-007: Default budgets, caps and budget modes

Date: 2026-10-12. Status: accepted. Decided by: the approver (asked; recommended defaults taken, with an added "off" mode). PRD basis: decision 12 (hard stop by default, switchable to tripwires), REQ-07 (estimates and caps in the gate-3 packet), REQ-09 (overruns park or flag), NFR-06. **This ADR extends an approved decision:** decision 12 and REQ-09 named two modes; the approver added a third, off. The PRD is amended by record 0002 (see below).

## Defaults per story, until a project changes them

| Kind | Default | Behavior in hard-stop mode |
|---|---|---|
| Cost | 5,000,000 tokens | park and ask |
| Time | 8 wall-clock hours | park and ask |
| Fix rounds | 3 per story | park and ask |
| Reopen cycles | 3 per build plan | park and ask |
| Re-reviews | 2 per story | park and ask |
| Files touched | 10 | tripwire: written justification |
| Lines changed | 400 | tripwire |
| Nesting depth | 3 | tripwire |
| Function complexity | 10 | tripwire |

## Budget modes, a project profile setting

- **hard-stop** (default): the table above.
- **tripwire**: every overrun flags with a required justification; nothing parks.
- **off**: no budget or cap is enforced or flagged. The project owns its usage monitoring. Estimates still appear in the gate-3 packet, usage is still recorded for metrics, and every packet and the status page carry a visible line that budgets are off.

## Calibration

Milestone zero reports its real tokens, hours and rounds per story; the first retrospective proposes new defaults from that data (REQ-15). The numbers above are starting points chosen to avoid parking the first stories on a guess.

## Alternatives rejected

- Tight defaults from the start: strong money protection, with a real chance that milestone zero parks on a guessed number.
- No defaults: founders cannot choose them and the start skill has nothing to recommend.
