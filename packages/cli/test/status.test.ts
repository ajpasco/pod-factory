// Story one's tests: `pod-factory status`. They are new behaviour (NB) and fail on their first
// assertion until story one implements the command; until then the output they read is the CLI's
// answer that it has no command "status". Each test's stated reason is in its comment, and record
// 0005 states the same reasons. Givens are records planted as the commands write them, so only the
// When step, running status, can fail.
import { describe, expect, it } from 'vitest';
import { hashText, recordBase, type ApprovalRecord, type TransitionRecord } from '../src/index.js';
import { cleanEnv, runCli } from './support/cli.js';
import {
  CI_FILES,
  ciProject,
  plantGate3,
  plantLock,
  treeAt,
  type CiFixture,
} from './support/ci.js';
import { AGENT, stored } from './support/records.js';

const STORY_1 = '.factory/work/story-1/story.md';
const STORY_2 = '.factory/work/story-2/story.md';

function storyText(title: string, extra = ''): string {
  return [
    `# ${title}`,
    extra,
    'Tests:',
    '- packages/cli/test/a.test.ts',
    '',
    'Scope:',
    '- src/**',
    '',
    'Inputs:',
    '- package.json',
    '',
  ].join('\n');
}

/** A locked project whose gate-3 plan has two stories, with `story1` as story one's file. */
function twoStoryProject(story1 = storyText('story-1: status')): {
  f: CiFixture;
  gate3: ApprovalRecord;
} {
  const files = {
    '.factory/work/plan/build-plan.md': `# Build plan\n\n1. ${STORY_1}\n2. ${STORY_2}\n`,
    [STORY_1]: story1,
    [STORY_2]: storyText('story-2: a second story'),
  };
  const f = ciProject();
  f.commitToMain(files, 'build plan');
  plantLock(f);
  const gate3 = plantGate3(f, files);
  return { f, gate3 };
}

/** Story one moved to in progress, as `story start story-1 --holder builder-1` writes it. */
function startStoryOne(f: CiFixture, gate3: ApprovalRecord, story1: string): TransitionRecord {
  const record: TransitionRecord = {
    ...recordBase(AGENT),
    recordType: 'transition',
    binds: {
      tree: treeAt(f, 'main'),
      files: {
        [STORY_1]: hashText(story1),
        'package.json': hashText(CI_FILES['package.json'] as string),
      },
    },
    outcome: 'in-progress',
    refs: [gate3.recordId],
    transition: {
      story: 'story-1',
      from: 'ready',
      to: 'in-progress',
      lease: { holder: 'builder-1', expiresAt: '2099-01-01T00:00:00Z' },
      handoffNote: null,
    },
  };
  f.plant(Object.fromEntries([stored(record, 'story-1-in-progress')]), 'story start story-1');
  return record;
}

function status(f: CiFixture): { code: number | null; out: string } {
  const result = runCli(f.work, ['status'], cleanEnv());
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

function lineFor(out: string, story: string): string {
  return out.split('\n').find((l) => new RegExp(`\\b${story}\\b`).test(l)) ?? '';
}

describe('status', () => {
  // NB: status does not exist, so it prints no story line. The first assertion fails: expected the
  // output to match /story-1.*in-progress.*builder-1/, received 'pod-factory has no command "status"'.
  it('T-19-P1 [M0] prints every story with its stage, owner, what it waits on and the record that holds it', () => {
    const story1 = storyText('story-1: status');
    const { f, gate3 } = twoStoryProject(story1);
    const started = startStoryOne(f, gate3, story1);

    const { code, out } = status(f);
    expect(out).toMatch(/story-1.*in-progress.*builder-1/);
    const one = lineFor(out, 'story-1');
    expect(one).toMatch(/story finish/);
    expect(one).toMatch(/handoff note/);
    expect(one).toContain(started.recordId);
    const two = lineFor(out, 'story-2');
    expect(two).toMatch(/story-2.*ready/);
    expect(two).toMatch(/story start/);
    expect(code).toBe(0);
  });

  // NB: status does not exist, so nothing is flagged. The first assertion fails: expected the output
  // to match /story-1.*claims done.*records.*in-progress/, received 'pod-factory has no command "status"'.
  it('T-19-N1 [M0] flags a story file that claims a stage its records do not justify', () => {
    const story1 = storyText('story-1: status', 'Stage: done\n');
    const { f, gate3 } = twoStoryProject(story1);
    startStoryOne(f, gate3, story1);

    const { code, out } = status(f);
    expect(out).toMatch(/story-1.*claims done.*records.*in-progress/);
    const one = lineFor(out, 'story-1');
    expect(one).toMatch(/in-progress/);
    expect(one).not.toMatch(/\bstage:? done\b/i);
    expect(code).toBe(0);
  });

  // NB: status does not exist, so no gate line and no invalid record is shown. The first assertion
  // fails: expected the output to name the edited gate-3 approval as invalid, received
  // 'pod-factory has no command "status"'.
  it('T-19-N2 [M0] shows an approval record that fails validation as invalid, never as approved', () => {
    const { f, gate3 } = twoStoryProject();
    const [path, bytes] = stored(gate3, 'gate-3');
    f.plant(
      { [path]: bytes.replace('"statement": "Gate 3:', '"statement": "Gate 3 (edited):') },
      'edit in place',
    );

    const { code, out } = status(f);
    expect(out).toMatch(
      new RegExp(`${path.replace(/[.]/g, '\\.')}.*invalid|invalid.*${path.replace(/[.]/g, '\\.')}`),
    );
    const gateLines = out.split('\n').filter((l) => /gate 3/i.test(l));
    expect(gateLines.length).toBeGreaterThan(0);
    for (const line of gateLines) {
      expect(line.replace(/not approved/gi, '')).not.toMatch(/\bapproved\b/i);
    }
    expect(gateLines.some((l) => /not approved/i.test(l))).toBe(true);
    expect(code).toBe(0);
  });
});
