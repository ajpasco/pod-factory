import { describe, expect, it } from 'vitest';
import {
  APPROVE_USAGE,
  hashText,
  loadRecords,
  readJournal,
  run,
  type ApprovalRecord,
} from '../src/index.js';
import { cleanEnv, runCli } from './support/cli.js';
import {
  CLASSIFICATION_RECORD,
  PROJECT_FILES,
  classificationRecord,
  confirms,
  human,
  project,
  shownHash,
} from './support/project.js';
import { BRANCH, sh } from './support/repo.js';

function approvals(cwd: string): ApprovalRecord[] {
  return loadRecords(cwd)
    .records.map((s) => s.record)
    .filter((r): r is ApprovalRecord => r.recordType === 'approval');
}

describe('approve', () => {
  it('T-03-N4 [M0] every approval-path command refuses from an agent session, naming the marker', () => {
    const f = project();
    const before = f.commitCount();
    const cases: [string[], Record<string, string>, string][] = [
      [
        ['approve', '2', '--classification', CLASSIFICATION_RECORD],
        { CLAUDECODE: '1' },
        'CLAUDECODE=1',
      ],
      [
        ['approve', 'story-1', '--pr', '7'],
        { AI_AGENT: 'claude-code_agent' },
        'AI_AGENT=claude-code_agent',
      ],
      [
        ['approve', 'amendment', '--pr', '7', 'docs/eval-plan.md'],
        { CLAUDECODE: '1' },
        'CLAUDECODE=1',
      ],
      [['approve', 'bootstrap', '7'], { CLAUDECODE: '1' }, 'CLAUDECODE=1'],
      [['lock'], { CLAUDECODE: '1' }, 'CLAUDECODE=1'],
    ];
    for (const [args, marker, named] of cases) {
      const result = runCli(f.work, args, cleanEnv(marker));
      expect(result.status, args.join(' ')).toBe(1);
      expect(result.stderr).toContain(
        `agent session marker ${named} is set, so this is an agent session`,
      );
      expect(result.stderr).toContain('from a terminal outside any agent session');
      expect(result.stderr).toContain('Nothing was written.');
    }
    expect(f.commitCount()).toBe(before);
    expect(readJournal(f.work).entries).toEqual([]);
  });

  it('refuses with no terminal and no marker, since who is running cannot be told', () => {
    const f = project();
    const result = runCli(f.work, ['approve', '3'], cleanEnv());
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(
      /cannot be told\. Only a human approves: run .* from an interactive terminal/,
    );
  });

  it('T-06-P3 [M0] gate 2 binds the main tree, PRD, design, eval plan, mapping and classification output', async () => {
    const f = project();
    const main = sh(f.remote, ['rev-parse', 'main']);
    const io = human(f.work, confirms('2'));
    expect(await run(['approve', '2', '--classification', CLASSIFICATION_RECORD], io)).toBe(0);
    expect(io.errors).toEqual([]);

    const [approval] = approvals(f.work);
    expect(approval?.binds.tree).toBe(sh(f.remote, ['rev-parse', 'main^{tree}']));
    const expected = [
      '.factory/work/classification/gate-2.json',
      'docs/PRD.md',
      'docs/TECH-SPEC.md',
      'docs/eval-plan.md',
      'docs/spec/criterion-to-control-mapping.md',
      'docs/spec/interfaces-and-non-goals.md',
      'docs/spec/production-readiness.md',
      'docs/spec/threat-review.md',
    ];
    expect(Object.keys(approval?.binds.files ?? {})).toEqual(expected);
    for (const path of expected) {
      expect(approval?.binds.files[path], path).toBe(hashText(PROJECT_FILES[path] as string));
    }
    expect(approval?.refs).toEqual([CLASSIFICATION_RECORD]);
    expect(approval?.approval).toMatchObject({ kind: 'gate', gate: 2, shownHash: shownHash(io) });
    expect(approval?.approval.statement).toContain(main);
    expect(approval?.actor).toEqual({
      name: 'Test Human',
      email: 'human@example.test',
      kind: 'human',
    });
    expect(io.lines.join('\n')).toContain(`tree ${approval?.binds.tree}`);
  });

  it('writes nothing when the typed confirmation does not match', async () => {
    const f = project();
    const before = f.commitCount();
    for (const typed of ['2 00000000', '3 deadbeef', '', 'yes']) {
      const io = human(f.work, () => typed);
      expect(await run(['approve', '2', '--classification', CLASSIFICATION_RECORD], io)).toBe(1);
      expect(io.errors.join('\n')).toMatch(/Not approved: you typed .* Nothing was written\./);
    }
    const prefixOnly = human(f.work, (io) => shownHash(io).slice(0, 8));
    expect(await run(['approve', '2', '--classification', CLASSIFICATION_RECORD], prefixOnly)).toBe(
      1,
    );
    expect(f.commitCount()).toBe(before);
  });

  it('accepts the hash prefix typed in uppercase', async () => {
    const f = project();
    const io = human(f.work, (io) => `2 ${shownHash(io).slice(0, 8).toUpperCase()}`);
    expect(await run(['approve', '2', '--classification', CLASSIFICATION_RECORD], io)).toBe(0);
    expect(approvals(f.work)).toHaveLength(1);
  });

  it('shows a different hash when the approval refers to a different classification record', async () => {
    const f = project();
    const rerun = '0006-classification-gate-2-rerun.json';
    f.plant({
      [`records/bootstrap/${rerun}`]: classificationRecord(
        PROJECT_FILES['.factory/work/classification/gate-2.json'] as string,
      ),
    });
    const first = human(f.work, () => '');
    const second = human(f.work, () => '');
    await run(['approve', '2', '--classification', CLASSIFICATION_RECORD], first);
    await run(['approve', '2', '--classification', rerun], second);
    const differing = (l: string): boolean =>
      l.includes('refers to') || l.startsWith('Hash of everything above: ');
    expect(first.lines.filter((l) => !differing(l))).toEqual(
      second.lines.filter((l) => !differing(l)),
    );
    expect(first.lines).toContain(`  refers to ${CLASSIFICATION_RECORD}`);
    expect(second.lines).toContain(`  refers to ${rerun}`);
    expect(shownHash(first)).not.toBe(shownHash(second));
  });

  it('writes nothing when main moves while the human is confirming', async () => {
    const f = project();
    const before = f.commitCount();
    const io = human(f.work, (io) => {
      f.commitToMain({ 'docs/PRD.md': '# PRD, edited after review\n' }, 'late change');
      return confirms('2')(io);
    });
    expect(await run(['approve', '2', '--classification', CLASSIFICATION_RECORD], io)).toBe(1);
    expect(io.errors.join('\n')).toMatch(
      /main moved from [0-9a-f]{12} to [0-9a-f]{12} while you were confirming\. Nothing was written/,
    );
    expect(f.commitCount()).toBe(before);
  });

  it('gate 2 refuses a missing, wrong-type or mismatched classification record', async () => {
    const missing = project({ classification: false });
    let io = human(missing.work, confirms('2'));
    expect(await run(['approve', '2', '--classification', CLASSIFICATION_RECORD], io)).toBe(1);
    expect(io.errors.join()).toMatch(
      /no classification record records\/bootstrap\/0005-classification-gate-2\.json/,
    );

    io = human(missing.work, confirms('2'));
    expect(await run(['approve', '2'], io)).toBe(1);
    expect(io.errors.join()).toMatch(/needs --classification/);

    const otherRun = project({ classification: false });
    otherRun.plant({
      [`records/bootstrap/${CLASSIFICATION_RECORD}`]: classificationRecord('{"another": "run"}\n'),
    });
    io = human(otherRun.work, confirms('2'));
    expect(await run(['approve', '2', '--classification', CLASSIFICATION_RECORD], io)).toBe(1);
    expect(io.errors.join()).toMatch(
      /does not bind the classification report on main .* describes a different run/,
    );

    const wrongType = project({ classification: false });
    wrongType.plant({
      [`records/bootstrap/${CLASSIFICATION_RECORD}`]: classificationRecord(
        PROJECT_FILES['.factory/work/classification/gate-2.json'] as string,
      ).replace('"classification"', '"amendment"'),
    });
    io = human(wrongType.work, confirms('2'));
    expect(await run(['approve', '2', '--classification', CLASSIFICATION_RECORD], io)).toBe(1);
    expect(io.errors.join()).toMatch(/is not a classification record \(its type is amendment\)/);
  });

  it('gate 2 refuses when main lacks a bound file, naming it', async () => {
    const f = project();
    f.commitToMain({ 'docs/spec/criterion-to-control-mapping.md': null });
    const io = human(f.work, confirms('2'));
    expect(await run(['approve', '2', '--classification', CLASSIFICATION_RECORD], io)).toBe(1);
    expect(io.errors.join()).toMatch(/has no docs\/spec\/criterion-to-control-mapping\.md/);
  });

  it('gate 3 binds the build plan, every story file it names, and the tree', async () => {
    const f = project();
    const plan = '# Build plan\n\nStory one: .factory/work/story-1/story.md\n';
    const story = '# Story 1: status\n';
    f.commitToMain({
      '.factory/work/plan/build-plan.md': plan,
      '.factory/work/story-1/story.md': story,
    });
    const io = human(f.work, confirms('3'));
    expect(await run(['approve', '3'], io)).toBe(0);
    const [approval] = approvals(f.work);
    expect(approval?.approval).toMatchObject({ kind: 'gate', gate: 3 });
    expect(approval?.binds).toEqual({
      tree: sh(f.remote, ['rev-parse', 'main^{tree}']),
      files: {
        '.factory/work/plan/build-plan.md': hashText(plan),
        '.factory/work/story-1/story.md': hashText(story),
      },
    });
  });

  it('gate 3 refuses a plan that names no story or a story that is missing', async () => {
    const f = project();
    let io = human(f.work, confirms('3'));
    expect(await run(['approve', '3'], io)).toBe(1);
    expect(io.errors.join()).toMatch(/has no build plan \.factory\/work\/plan\/build-plan\.md/);

    f.commitToMain({ '.factory/work/plan/build-plan.md': '# Plan with no stories\n' });
    io = human(f.work, confirms('3'));
    expect(await run(['approve', '3'], io)).toBe(1);
    expect(io.errors.join()).toMatch(/names no story file/);

    f.commitToMain({ '.factory/work/plan/build-plan.md': 'See .factory/work/story-2/story.md\n' });
    io = human(f.work, confirms('3'));
    expect(await run(['approve', '3'], io)).toBe(1);
    expect(io.errors.join()).toMatch(/names \.factory\/work\/story-2\/story\.md, which main/);
  });

  it('a story approval binds the pull request head tree and both numbers, kept distinct', async () => {
    const f = project();
    const head = f.pullRequest(7, { 'packages/cli/src/status.ts': 'export const status = 1;\n' });
    const io = human(f.work, confirms('story-1'));
    expect(await run(['approve', 'story-1', '--pr', '7'], io)).toBe(0);
    const [approval] = approvals(f.work);
    expect(approval?.binds).toEqual({
      tree: sh(f.remote, [`rev-parse`, `${head}^{tree}`]),
      files: {},
    });
    expect(approval?.approval).toMatchObject({
      kind: 'story',
      story: 'story-1',
      pullRequest: 7,
      gate: null,
    });
    expect(approval?.approval.statement).toContain(head);

    const noPr = human(f.work, confirms('story-1'));
    expect(await run(['approve', 'story-1'], noPr)).toBe(1);
    expect(noPr.errors.join()).toMatch(/needs the pull request number, for example --pr 7/);
    expect(APPROVE_USAGE).toContain('approve story-1 --pr 7');
  });

  it('a bootstrap approval binds the pull request head tree', async () => {
    const f = project();
    const head = f.pullRequest(3, { 'packages/cli/src/lock.ts': 'export {};\n' });
    const io = human(f.work, confirms('bootstrap'));
    expect(await run(['approve', 'bootstrap', '3'], io)).toBe(0);
    const [approval] = approvals(f.work);
    expect(approval?.binds.tree).toBe(sh(f.remote, ['rev-parse', `${head}^{tree}`]));
    expect(approval?.approval).toMatchObject({ kind: 'bootstrap', pullRequest: 3 });
  });

  it('refuses gates other than 2 and 3, and unknown targets', async () => {
    const f = project();
    let io = human(f.work);
    expect(await run(['approve', '5'], io)).toBe(1);
    expect(io.errors.join()).toMatch(/Gate 5 is not approved with this command in milestone zero/);
    io = human(f.work);
    expect(await run(['approve', 'everything'], io)).toBe(1);
    expect(io.errors.join()).toContain('Usage:');
  });

  it('keeps the records branch untouched by a refusal', () => {
    const f = project();
    const tip = sh(f.remote, ['rev-parse', BRANCH]);
    runCli(f.work, ['approve', '3'], cleanEnv({ CLAUDECODE: '1' }));
    expect(sh(f.remote, ['rev-parse', BRANCH])).toBe(tip);
  });
});
