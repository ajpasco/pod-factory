import { describe, expect, it } from 'vitest';
import { KILL_POINTS, loadRecords, storyStage, type KillPoint } from '../src/index.js';
import { runFlowChild } from './support/child.js';
import { CLASSIFICATION_RECORD, project } from './support/project.js';
import { sh, type Fixture } from './support/repo.js';

const STORY = [
  '# story-1: status',
  '',
  'Tests:',
  '- packages/cli/test/approve.test.ts',
  '',
  'Scope:',
  '- packages/cli/src/**',
  '',
  'Inputs:',
  '- docs/TECH-SPEC.md',
  '',
].join('\n');

const NOTE = '.factory/work/story-1/handoff.md';

interface Step {
  name: string;
  who: 'human' | 'agent';
  token: string;
  args: string[];
  /** What the builder or the merge does after this step; writes no record. */
  then?: (f: Fixture) => void;
}

/** Story one's scripted run: every step that writes a record, in order. */
const FLOW: Step[] = [
  {
    name: 'approve 2',
    who: 'human',
    token: '2',
    args: ['approve', '2', '--classification', CLASSIFICATION_RECORD],
  },
  { name: 'lock', who: 'human', token: '', args: ['lock'] },
  { name: 'approve 3', who: 'human', token: '3', args: ['approve', '3'] },
  {
    name: 'story start',
    who: 'agent',
    token: '',
    args: ['story', 'start', 'story-1', '--holder', 'builder-1'],
    then: (f) =>
      f.pullRequest(7, {
        'packages/cli/src/status.ts': 'export {};\n',
        [NOTE]: '# Handoff: story-1\n',
      }) && undefined,
  },
  {
    name: 'story finish to verifying',
    who: 'agent',
    token: '',
    args: ['story', 'finish', 'story-1', '--pr', '7'],
  },
  {
    name: 'approve story-1',
    who: 'human',
    token: 'story-1',
    args: ['approve', 'story-1', '--pr', '7'],
    then: (f) => {
      sh(f.work, ['fetch', '--quiet', 'origin', 'refs/pull/7/head']);
      sh(f.work, ['push', '--quiet', 'origin', 'FETCH_HEAD:refs/heads/main']);
    },
  },
  {
    name: 'story finish to done',
    who: 'agent',
    token: '',
    args: ['story', 'finish', 'story-1', '--pr', '7'],
  },
];

const STAGES = ['ready', 'ready', 'ready', 'in-progress', 'verifying', 'verifying', 'done'];

function storyProject(): Fixture {
  const f = project();
  f.commitToMain(
    {
      '.factory/work/plan/build-plan.md': '# Build plan\n\n1. .factory/work/story-1/story.md\n',
      '.factory/work/story-1/story.md': STORY,
    },
    'build plan',
  );
  return f;
}

function census(f: Fixture): { records: number; ids: number; flagged: string[] } {
  const set = loadRecords(f.work);
  return {
    records: set.records.length,
    ids: new Set(set.records.map((s) => s.record.recordId)).size,
    flagged: set.flagged.map((x) => x.path),
  };
}

describe('kill and resume', () => {
  for (const point of KILL_POINTS as readonly KillPoint[]) {
    it(`T-08-P1 [M0] killed at ${point} in every step and restarted, story one ends merged with no record lost or duplicated`, () => {
      const f = storyProject();
      FLOW.forEach((step, i) => {
        const killed = runFlowChild(f.work, step.who, step.token, step.args, point);
        expect(killed.signal, `${step.name}: killed at ${point}`).toBe('SIGKILL');

        const restarted = runFlowChild(f.work, step.who, step.token, step.args);
        expect(restarted.status, `${step.name} restarted: ${restarted.stderr}`).toBe(0);
        const now = census(f);
        expect(now.records, `${step.name}: one record per step so far`).toBe(i + 1);
        expect(now.ids, `${step.name}: no repeated record ID`).toBe(i + 1);
        expect(now.flagged, step.name).toEqual([]);
        expect(storyStage(loadRecords(f.work), 'story-1').stage, step.name).toBe(STAGES[i]);
        step.then?.(f);
      });
      expect(sh(f.remote, ['merge-base', '--is-ancestor', 'refs/pull/7/head', 'main']) === '').toBe(
        true,
      );
    });
  }

  it('T-08-N1 [M0] a half-written record is refused by name, never read, and the step writes its record whole', () => {
    const f = storyProject();
    for (const step of FLOW.slice(0, 3))
      expect(runFlowChild(f.work, step.who, step.token, step.args).status).toBe(0);
    const half = 'records/20261014T050000Z-transition-story-1-in-progress-0123456789ab.json';
    f.plant(
      { [half]: '{\n  "schemaVersion": 1,\n  "recordType": "transi' },
      'killed while writing a record',
    );

    const start = FLOW[3] as Step;
    expect(
      runFlowChild(f.work, start.who, start.token, start.args, 'during-journal-write').signal,
    ).toBe('SIGKILL');
    expect(runFlowChild(f.work, start.who, start.token, start.args).status).toBe(0);

    const set = loadRecords(f.work);
    expect(set.flagged).toEqual([
      {
        path: half,
        reason: `${half} is not complete JSON, so it may be half-written; it is ignored`,
      },
    ]);
    expect(set.records.some((s) => s.path === half)).toBe(false);
    expect(storyStage(set, 'story-1').stage).toBe('in-progress');
    expect(set.records.filter((s) => s.record.recordType === 'transition')).toHaveLength(1);
  });
});
