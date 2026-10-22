/**
 * The plain-language half of an approval: what the decision covers, what writing it lets happen,
 * and what is worth looking at first. Held as structure rather than printed lines because the
 * terminal is one view of it: a later interface can render the same fields as a screen without
 * reproducing the wording here.
 *
 * The rendered form goes into the approval's statement, so it is covered by the shown hash and
 * stored in the record. A reader of the record a year later sees the same explanation the human
 * saw, not just the hashes they agreed to.
 */
export interface Guidance {
  /** One line naming the decision and the content it was read from. */
  headline: string;
  /** What the approval covers, in the reader's terms rather than by path alone. */
  covers: string[];
  /** What becomes possible once the record is written. */
  allows: string[];
  /** What is worth checking before agreeing, most important first. */
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
    headline: `Gate 2: the specification set as it stands on ${f.sourceName} at ${f.commit}.`,
    covers: [
      'What the product must do: docs/PRD.md.',
      `How it is to be built: docs/TECH-SPEC.md and ${plural(f.specCount ?? 0, 'specification')} under docs/spec/.`,
      'How delivery is to be proved: docs/eval-plan.md.',
      'Which requirements the classification run found testable: .factory/work/classification/gate-2.json.',
    ],
    allows: [
      'pod-factory lock, which freezes the eval plan and the test files listed below so that no builder can change the tests it has to pass.',
      'gate 3, where the build plan and its stories are approved.',
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
    headline: `Gate 3: the build plan and its ${plural(stories.length, 'story', 'stories')} as they stand on ${f.sourceName} at ${f.commit}.`,
    covers: [
      'The order the work is done in: .factory/work/plan/build-plan.md.',
      `Each story’s scope, its tests and its inputs: ${stories.join(', ')}.`,
    ],
    allows: [
      'a builder to be dispatched for a story, and that story alone.',
      'nothing to merge. Each story is approved separately at gate 4, against the pull request it produced.',
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
    headline: `Gate 4: ${f.story} as pull request ${f.pullRequest} stands at ${f.commit}.`,
    covers: [
      `Every file in pull request ${f.pullRequest} at this commit, not only the ones ${f.story} named.`,
      'The tree hash below is the whole of that content; nothing in the pull request is outside it.',
    ],
    allows: [
      `pull request ${f.pullRequest} to merge once its checks are green. The checks run against this exact content.`,
      'nothing else. A new commit on the pull request voids this approval, and the builder has to ask again.',
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
    covers: [
      `The whole of pull request ${f.pullRequest} at this commit, whatever it contains.`,
      'No gate. This is the route for preparation the gate sequence cannot yet describe.',
    ],
    allows: [
      `pull request ${f.pullRequest} to merge without a gate approval behind it.`,
      'no standing authority. It names this pull request at this commit and nothing further.',
    ],
    check: [
      'The gates genuinely cannot cover this change. A bootstrap approval is the one place the sequence is not doing the work for you.',
      'The change is preparation rather than product behaviour. Behaviour belongs to a story, which gets its own approval and its own tests.',
    ],
  };
}

export function amendmentGuidance(f: GuidanceFacts): Guidance {
  const paths = f.amended ?? [];
  return {
    headline: `Amendment: ${plural(paths.length, 'change')} to locked ${paths.join(', ')} as pull request ${f.pullRequest} stands at ${f.commit}, against lock ${f.lockId}.`,
    covers: [
      `${paths.length === 1 ? 'A file' : 'Files'} the lock froze, changed by hand: ${paths.join(', ')}.`,
      'The before and after hash of each one, listed below.',
    ],
    allows: [
      `pull request ${f.pullRequest} to land ${paths.length === 1 ? 'that change' : 'those changes'} even though the lock covers ${paths.length === 1 ? 'it' : 'them'}.`,
      'the lock to continue over everything else, with these paths at their new hashes.',
    ],
    check: [
      'The change corrects the test rather than weakening what it was protecting. This is the one route that can quietly lower the bar a builder has to clear.',
      'A builder did not ask for this. An amendment exists for a mistake in the tests, not for an implementation that will not pass them.',
    ],
  };
}

/**
 * The statement a human reads and the record stores: the headline, then the three sections, then
 * the heading for the bindings `approve` prints next. Items are indented by two spaces to match
 * the indent of those bindings. The closing heading lives here rather than in the command so that
 * every line above the shown hash is inside the statement the hash covers.
 */
export function renderGuidance(g: Guidance): string {
  const section = (title: string, items: string[]): string[] =>
    items.length === 0 ? [] : ['', title, ...items.map((item) => `  ${item}`)];
  return [
    g.headline,
    ...section('What this approval covers', g.covers),
    ...section('What it allows once written', g.allows),
    ...section('Worth checking before you agree', g.check),
    '',
    'The exact content this binds, which the hash below is taken over',
  ].join('\n');
}
