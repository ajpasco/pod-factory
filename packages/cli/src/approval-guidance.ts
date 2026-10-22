/**
 * The plain-language half of an approval: why a person has to make this decision, what it covers,
 * and what writing it does. Held as structure rather than printed lines because the terminal is
 * one view of it: a later interface can render the same fields as a screen without reproducing the
 * wording here.
 *
 * `why`, `covers` and `does` are rendered into the approval's statement, so they are covered by
 * the shown key and stored in the record: a reader of the record a year later sees the same
 * explanation the human saw, not only the hashes they agreed to. `check` is advice rather than
 * content, so it is deliberately outside the statement and outside the key, and is shown only when
 * asked for.
 */
export interface Guidance {
  /** One line naming the decision and the content it was read from. */
  headline: string;
  /** Why the factory cannot make this decision for itself. One or two sentences. */
  why: string[];
  /** What the approval covers: a short label and where it lives. */
  covers: [label: string, where: string][];
  /** What writing the approval does, and what it does not do. */
  does: string[];
  /** The longer checklist, shown on request rather than by default. */
  check: string[];
}

/** The facts each kind of approval needs to describe itself. */
export interface GuidanceFacts {
  commit: string;
  /** Where the content was read from: the trunk's name, or "pull request <n>". */
  sourceName: string;
  /** Story identifier, for a story approval. */
  story?: string;
  /** Pull request number, for anything read from a pull request. */
  pullRequest?: number;
  /** How many spec files gate 2 binds besides the four named ones. */
  specCount?: number;
  /** The story files gate 3 binds. */
  stories?: string[];
  /** The locked paths an amendment changes. */
  amended?: string[];
  /** The record ID of the lock an amendment is written against. */
  lockId?: string;
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

export function gate2Guidance(f: GuidanceFacts): Guidance {
  return {
    headline: `Gate 2: what "done" means for this project, as it stands on ${f.sourceName} at ${f.commit}.`,
    why: [
      'Approving this lets the tests be frozen, and from then on nothing inside the factory can change what counts as done — no builder, and no agent.',
      'That protection is only worth something if a person chose the standard, so this decision is yours and cannot be delegated.',
    ],
    covers: [
      ['what the product must do', 'docs/PRD.md'],
      [
        'how it is to be built',
        `docs/TECH-SPEC.md and ${plural(f.specCount ?? 0, 'specification')} under docs/spec/`,
      ],
      ['how delivery is to be proved', 'docs/eval-plan.md'],
      ['which requirements are testable', '.factory/work/classification/gate-2.json'],
    ],
    does: [
      'Allows the lock, which freezes the eval plan and the project’s test files.',
      'Allows gate 3. Merges nothing and starts no work by itself.',
    ],
    check: [
      'Every requirement you care about appears in the eval plan with a test that would fail if the requirement were not delivered.',
      'The eval plan tests business behaviour. Architecture, security and code quality are the design’s job, and belong in docs/TECH-SPEC.md rather than in these tests.',
      'The classification record below describes this content, not an earlier run.',
    ],
  };
}

export function gate3Guidance(f: GuidanceFacts): Guidance {
  const stories = f.stories ?? [];
  return {
    headline: `Gate 3: the plan of work, as it stands on ${f.sourceName} at ${f.commit}.`,
    why: [
      'This is the last point at which the work is cheap to change. After it, a builder starts writing code against these stories.',
      'Nothing checks that the plan is a good one, so a person has to.',
    ],
    covers: [
      ['the order the work is done in', '.factory/work/plan/build-plan.md'],
      [
        `each of ${plural(stories.length, 'story', 'stories')}: scope, tests, inputs`,
        stories.join(', '),
      ],
    ],
    does: [
      'Allows a builder to be dispatched for one story at a time.',
      'Merges nothing. Each story is approved again at gate 4, against the pull request it produced.',
    ],
    check: [
      'Each story names the tests that prove it, so a builder cannot decide for itself when it is done.',
      'No two stories claim the same paths. Nothing checks this for you, and two builders writing the same file will collide.',
      'Every requirement in the eval plan is claimed by one of these stories.',
    ],
  };
}

export function storyGuidance(f: GuidanceFacts): Guidance {
  return {
    headline: `Gate 4: ${f.story}, as pull request ${f.pullRequest} stands at ${f.commit}.`,
    why: [
      'An agent wrote this code. The checks prove its tests pass; no check can tell you the result is what you wanted.',
      'That judgement is the one thing the factory cannot make for you, so it stops here until you make it.',
    ],
    covers: [
      [`every file in pull request ${f.pullRequest}`, `not only the ones ${f.story} named`],
      [
        'the whole of that content',
        'the tree key below; nothing in the pull request is outside it',
      ],
    ],
    does: [
      `Allows pull request ${f.pullRequest} to merge once its checks are green.`,
      'Allows this exact version only. A new commit voids the approval and the builder has to ask again.',
    ],
    check: [
      'The changed files are inside the story’s scope. A builder that wandered outside it fails the scope check, but it is cheaper to see it here.',
      'The frozen tests are untouched. The lock check fails the pull request if they are not, so a green check is the proof, not this reading.',
      'The implementation is one you want to keep. Passing the tests is the floor, not the goal.',
    ],
  };
}

export function bootstrapGuidance(f: GuidanceFacts): Guidance {
  return {
    headline: `Bootstrap merge: pull request ${f.pullRequest} as it stands at ${f.commit}.`,
    why: [
      'This is the one route that merges without a gate behind it, so none of the usual checking applies.',
      'It exists for preparation the gate sequence cannot yet describe, and a person has to agree that this is such a case.',
    ],
    covers: [
      [`every file in pull request ${f.pullRequest}`, 'whatever it contains'],
      ['no gate', 'nothing here was classified, planned or scoped'],
    ],
    does: [
      `Allows pull request ${f.pullRequest} to merge with no gate approval behind it.`,
      'Grants no standing authority. It names this pull request at this commit and nothing further.',
    ],
    check: [
      'The gates genuinely cannot cover this change. A bootstrap approval is the one place the sequence is not doing the work for you.',
      'The change is preparation rather than product behaviour. Behaviour belongs to a story, which gets its own approval and its own tests.',
    ],
  };
}

export function amendmentGuidance(f: GuidanceFacts): Guidance {
  const paths = f.amended ?? [];
  const one = paths.length === 1;
  return {
    headline: `Amendment: ${plural(paths.length, 'change')} to frozen ${paths.join(', ')}, as pull request ${f.pullRequest} stands at ${f.commit}, against lock ${f.lockId}.`,
    why: [
      `${one ? 'This file was' : 'These files were'} frozen so that nobody could change the standard the work has to meet. Unfreezing ${one ? 'it' : 'them'} is the one route that can quietly lower that bar.`,
      'Only a person who knows what the test was protecting can tell a correction from a weakening.',
    ],
    covers: [
      [one ? 'the frozen file being changed' : 'the frozen files being changed', paths.join(', ')],
      ['what it held before and after', 'both keys are listed below'],
    ],
    does: [
      `Allows pull request ${f.pullRequest} to land ${one ? 'that change' : 'those changes'} despite the lock.`,
      'Leaves the lock in force over everything else, with these paths at their new content.',
    ],
    check: [
      'The change corrects the test rather than weakening what it was protecting.',
      'A builder did not ask for this. An amendment exists for a mistake in the tests, not for an implementation that will not pass them.',
    ],
  };
}

/** Pads each label so that the second column lines up, for a two-column list. */
function columns(rows: [string, string][]): string[] {
  const width = Math.max(...rows.map(([label]) => label.length));
  return rows.map(([label, where]) => `  ${label.padEnd(width)}   ${where}`);
}

/**
 * The statement a human reads and the record stores: why the decision is theirs, what it covers,
 * what it does, and then the heading for the bindings `approve` prints next. The closing heading
 * lives here rather than in the command so that every line above the shown key is inside the
 * statement the key is taken over. `check` is left out on purpose: it is advice, not content, and
 * hashing advice would tie the key to wording rather than to what is being approved.
 */
export function renderGuidance(g: Guidance): string {
  const section = (title: string, items: string[]): string[] =>
    items.length === 0 ? [] : ['', title, ...items.map((item) => `  ${item}`)];
  return [
    g.headline,
    ...section('Why this one needs you', g.why),
    ...(g.covers.length === 0 ? [] : ['', 'What it covers', ...columns(g.covers)]),
    ...section('What approving does', g.does),
    '',
    'The exact content this covers. The key below is taken over all of it.',
  ].join('\n');
}

/** The checklist, for a reader who asked for it. Never part of the statement or the key. */
export function renderCheck(check: readonly string[]): string {
  return ['Worth checking before you agree', ...check.map((item) => `  ${item}`)].join('\n');
}
