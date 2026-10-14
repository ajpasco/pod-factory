import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  hashText,
  loadRecords,
  run,
  type InvocationContext,
  type TransitionRecord,
} from '../src/index.js';
import {
  CI_FILES,
  STORY_FILES,
  STORY_TEXT,
  ciProject,
  job,
  plantApproval,
  plantGate3,
  plantLock,
  plantVerify,
  treeAt,
  type CiFixture,
} from './support/ci.js';
import { human, type ScriptedIO } from './support/project.js';
import { revocation, stored } from './support/records.js';
import { BRANCH, sh } from './support/repo.js';

const AGENT_SESSION: InvocationContext = {
  env: { CLAUDECODE: '1' },
  stdinIsTTY: false,
  stdoutIsTTY: false,
};
const NOTE = '.factory/work/story-1/handoff.md';
const NOTE_TEXT = '# Handoff: story-1\n\nDone: the app. Left: nothing.\n';

/** The orchestrator, an agent, running a story command. */
async function orchestrator(f: CiFixture, args: string[]): Promise<ScriptedIO & { code: number }> {
  const io = human(f.work, () => '', AGENT_SESSION);
  const code = await run(['story', ...args], io);
  return Object.assign(io, { code });
}

function transitions(f: CiFixture): TransitionRecord[] {
  return loadRecords(f.work)
    .records.map((s) => s.record)
    .filter((r): r is TransitionRecord => r.recordType === 'transition');
}

/** A locked project with story one approved at gate 3. */
function readyStory() {
  const f = ciProject({ story: true });
  plantLock(f);
  const gate3 = plantGate3(f);
  return { f, gate3 };
}

/** Story one in progress with pull request 7 open; `files` are the pull request's changes. */
async function inProgress(files: Record<string, string | null>) {
  const { f, gate3 } = readyStory();
  expect((await orchestrator(f, ['start', 'story-1', '--holder', 'builder-1'])).code).toBe(0);
  const head = f.pullRequest(7, files);
  return { f, gate3, head, tree: treeAt(f, head) };
}

describe('story start', () => {
  it('T-07-P3 [M0] starts a builder with a valid gate-3 approval for the current plan', async () => {
    const { f, gate3 } = readyStory();
    const io = await orchestrator(f, ['start', 'story-1', '--holder', 'builder-1']);
    expect(io.errors).toEqual([]);
    expect(io.code).toBe(0);
    const [started] = transitions(f);
    expect(started).toMatchObject({
      actor: { kind: 'agent' },
      outcome: 'in-progress',
      refs: [gate3.recordId],
      transition: {
        story: 'story-1',
        from: 'ready',
        to: 'in-progress',
        lease: { holder: 'builder-1' },
      },
    });
    expect(started?.binds.files).toEqual({
      '.factory/work/story-1/story.md': hashText(STORY_TEXT),
      'package.json': expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(io.lines.join('\n')).toMatch(
      /Builder inputs for story-1, with their hashes:\n {2}[0-9a-f]{64} {2}\.factory\/work\/story-1\/story\.md/,
    );
  });

  it('T-07-N5 [M0] refuses with no gate-3 approval, an invalid one, a revoked one, or one for an older plan', async () => {
    const none = ciProject({ story: true });
    plantLock(none);
    const noApproval = await orchestrator(none, ['start', 'story-1', '--holder', 'builder-1']);
    expect(noApproval.errors.join()).toMatch(/there is no valid, unrevoked gate-3 approval/);

    const editedInPlace = ciProject({ story: true });
    plantLock(editedInPlace);
    const record = plantGate3(editedInPlace);
    const [path, bytes] = stored(record, 'gate-3');
    editedInPlace.plant(
      { [path]: bytes.replace('Gate 3: the build plan', 'Gate 3: a wider plan') },
      'edit in place',
    );
    const edited = await orchestrator(editedInPlace, ['start', 'story-1', '--holder', 'builder-1']);
    expect(edited.errors.join()).toMatch(/the only gate-3 approvals are invalid and ignored/);

    const revoked = readyStory();
    revoked.f.plant(
      Object.fromEntries([stored(revocation(revoked.gate3.recordId), revoked.gate3.recordId)]),
    );
    const afterRevoke = await orchestrator(revoked.f, [
      'start',
      'story-1',
      '--holder',
      'builder-1',
    ]);
    expect(afterRevoke.errors.join()).toMatch(/there is no valid, unrevoked gate-3 approval/);

    const older = readyStory();
    older.f.commitToMain({
      '.factory/work/story-1/story.md': STORY_TEXT.replace('- src/**', '- src/**\n- docs/**'),
    });
    const stale = await orchestrator(older.f, ['start', 'story-1', '--holder', 'builder-1']);
    expect(stale.errors.join()).toMatch(
      new RegExp(
        `\\.factory/work/story-1/story\\.md on main no longer matches gate-3 approval ${older.gate3.recordId}.*Gate 3 is open again`,
      ),
    );
    for (const f of [none, editedInPlace, revoked.f, older.f]) expect(transitions(f)).toEqual([]);
  });

  it('T-07-N7 [M0] refuses the start when a story file gate 3 bound has changed its scope, and gate 3 shows as open', async () => {
    const { f, gate3 } = readyStory();
    f.commitToMain({
      '.factory/work/story-1/story.md': STORY_TEXT.replace('- src/**', '- src/**\n- docs/**'),
    });
    const io = await orchestrator(f, ['start', 'story-1', '--holder', 'builder-1']);
    expect(io.errors.join()).toMatch(
      new RegExp(
        `\\.factory/work/story-1/story\\.md on main no longer matches gate-3 approval ${gate3.recordId}, so the plan it approved is not the plan on main\\. Gate 3 is open again`,
      ),
    );
    expect(io.code).toBe(1);
    expect(transitions(f)).toEqual([]);
  });

  it('T-08-P4 [M0] records exactly the story file and the inputs it lists, with their hashes, when a builder starts', async () => {
    const f = ciProject({ story: true });
    plantLock(f);
    const text = STORY_TEXT.replace(
      '- package.json',
      '- package.json\n- packages/cli/vitest.config.ts',
    );
    f.commitToMain({ '.factory/work/story-1/story.md': text });
    plantGate3(f, { ...STORY_FILES, '.factory/work/story-1/story.md': text });
    expect((await orchestrator(f, ['start', 'story-1', '--holder', 'builder-1'])).code).toBe(0);
    expect(transitions(f)[0]?.binds.files).toEqual({
      '.factory/work/story-1/story.md': hashText(text),
      'package.json': hashText(CI_FILES['package.json'] as string),
      'packages/cli/vitest.config.ts': hashText(
        CI_FILES['packages/cli/vitest.config.ts'] as string,
      ),
    });
  });

  it('T-07-P4 [M0] moves a story whose tests are locked to in progress', async () => {
    const { f } = readyStory();
    expect((await orchestrator(f, ['start', 'story-1', '--holder', 'builder-1'])).code).toBe(0);
    expect(transitions(f).map((t) => t.transition.to)).toEqual(['in-progress']);
  });

  it('T-07-N6 [M0] refuses a story whose tests are not locked, naming the test', async () => {
    const f = ciProject({ story: true });
    plantLock(f);
    const text = STORY_TEXT.replace(
      '- packages/cli/test/a.test.ts',
      '- packages/cli/test/a.test.ts\n- packages/cli/test/new.test.ts',
    );
    f.commitToMain({
      '.factory/work/story-1/story.md': text,
      'packages/cli/test/new.test.ts': "it('new', () => {});\n",
    });
    plantGate3(f, { ...STORY_FILES, '.factory/work/story-1/story.md': text });
    const io = await orchestrator(f, ['start', 'story-1', '--holder', 'builder-1']);
    expect(io.errors.join()).toMatch(
      /story-1 is not ready, because its test packages\/cli\/test\/new\.test\.ts is not locked by lock [0-9a-f]{12}/,
    );
    expect(transitions(f)).toEqual([]);

    const ghost = ciProject({ story: true });
    plantLock(ghost);
    const ghostText = STORY_TEXT.replace(
      '- packages/cli/test/a.test.ts',
      '- packages/cli/test/missing.test.ts',
    );
    ghost.commitToMain({ '.factory/work/story-1/story.md': ghostText });
    plantGate3(ghost, { ...STORY_FILES, '.factory/work/story-1/story.md': ghostText });
    const absent = await orchestrator(ghost, ['start', 'story-1', '--holder', 'builder-1']);
    expect(absent.errors.join()).toMatch(
      /its test packages\/cli\/test\/missing\.test\.ts is not locked/,
    );

    const unlocked = ciProject({ story: true });
    plantGate3(unlocked);
    const noLock = await orchestrator(unlocked, ['start', 'story-1', '--holder', 'builder-1']);
    expect(noLock.errors.join()).toMatch(/is not locked \(there is no lock yet\)/);
  });

  it('refuses a story file missing a list, naming it', async () => {
    const f = ciProject({ story: true });
    plantLock(f);
    const text = STORY_TEXT.replace('Scope:\n- src/**\n', '');
    f.commitToMain({ '.factory/work/story-1/story.md': text });
    plantGate3(f, { ...STORY_FILES, '.factory/work/story-1/story.md': text });
    const io = await orchestrator(f, ['start', 'story-1', '--holder', 'builder-1']);
    expect(io.errors.join()).toMatch(/story\.md has no "Scope:" list/);
  });

  it('resumes a story already in progress without writing a second record', async () => {
    const { f } = readyStory();
    await orchestrator(f, ['start', 'story-1', '--holder', 'builder-1']);
    const again = await orchestrator(f, ['start', 'story-1', '--holder', 'builder-2']);
    expect(again.code).toBe(0);
    expect(again.lines.join('\n')).toMatch(
      /story-1 is already in progress .* held by builder-1 until .*Nothing was written\./,
    );
    expect(transitions(f)).toHaveLength(1);
  });
});

describe('story finish', () => {
  it('T-08-P3 [M0] keeps the handoff note with the story when the builder session ends with one', async () => {
    const { f, tree } = await inProgress({
      'src/app.js': 'export const app = 1;\n',
      [NOTE]: NOTE_TEXT,
    });
    const io = await orchestrator(f, ['finish', 'story-1', '--pr', '7']);
    expect(io.code).toBe(0);
    const verifying = transitions(f).at(-1);
    expect(verifying).toMatchObject({
      outcome: 'verifying',
      binds: { tree },
      transition: {
        from: 'in-progress',
        to: 'verifying',
        handoffNote: { path: NOTE, sha256: hashText(NOTE_TEXT) },
      },
    });
  });

  it('T-08-N3 [M0] refuses a session that ended without a handoff note, naming it', async () => {
    const { f } = await inProgress({ 'src/app.js': 'export const app = 1;\n' });
    const io = await orchestrator(f, ['finish', 'story-1', '--pr', '7']);
    expect(io.code).toBe(1);
    expect(io.errors.join()).toMatch(
      /the builder session for story-1 \(held by builder-1\) ended without a handoff note.*has no \.factory\/work\/story-1\/handoff\.md/,
    );
    expect(transitions(f).map((t) => t.transition.to)).toEqual(['in-progress']);
  });

  it('T-08-P2 [M0] moves to verifying with the note, and to done only after the story approval and the merge', async () => {
    const { f, head, tree } = await inProgress({
      'src/app.js': 'export const app = 1;\n',
      [NOTE]: NOTE_TEXT,
    });
    expect((await orchestrator(f, ['finish', 'story-1', '--pr', '7'])).code).toBe(0);
    const approval = plantApproval(f, 'story', 7, tree);
    sh(f.work, ['fetch', '--quiet', 'origin', `refs/pull/7/head`]);
    sh(f.work, ['push', '--quiet', 'origin', `${head}:refs/heads/main`]);
    f.commitToMain({ 'docs/after.md': 'main moved on after the merge\n' }, 'later work');
    const done = await orchestrator(f, ['finish', 'story-1', '--pr', '7']);
    expect(done.errors).toEqual([]);
    expect(done.lines.join('\n')).toMatch(
      /\(the approved head [0-9a-f]{12} is in main's history\)/,
    );
    expect(transitions(f).at(-1)).toMatchObject({
      outcome: 'done',
      refs: [approval.recordId],
      binds: { tree },
    });
    expect(transitions(f).map((t) => t.transition.to)).toEqual([
      'in-progress',
      'verifying',
      'done',
    ]);
  });

  it('accepts a squash merge as done when main holds exactly the approved tree, and says which proof held', async () => {
    const { f, tree } = await inProgress({
      'src/app.js': 'export const app = 1;\n',
      [NOTE]: NOTE_TEXT,
    });
    await orchestrator(f, ['finish', 'story-1', '--pr', '7']);
    plantApproval(f, 'story', 7, tree);
    f.commitToMain(
      { 'src/app.js': 'export const app = 1;\n', [NOTE]: NOTE_TEXT },
      'squash of pull request 7',
    );
    expect(treeAt(f, 'main')).toBe(tree);
    const done = await orchestrator(f, ['finish', 'story-1', '--pr', '7']);
    expect(done.errors).toEqual([]);
    expect(done.lines.join('\n')).toMatch(
      /\(main at [0-9a-f]{12} holds exactly the approved tree\)/,
    );
    expect(transitions(f).at(-1)?.outcome).toBe('done');
  });

  it('T-08-N2 [M0] refuses done without a story approval, or before the merge', async () => {
    const { f, tree } = await inProgress({
      'src/app.js': 'export const app = 1;\n',
      [NOTE]: NOTE_TEXT,
    });
    await orchestrator(f, ['finish', 'story-1', '--pr', '7']);
    const unapproved = await orchestrator(f, ['finish', 'story-1', '--pr', '7']);
    expect(unapproved.code).toBe(0);
    expect(unapproved.lines.join('\n')).toMatch(
      /story-1 is verifying .*cannot be done yet, because there is no valid, unrevoked story approval for it on pull request 7\. Nothing was written\./,
    );
    plantApproval(f, 'story', 7, tree);
    const unmerged = await orchestrator(f, ['finish', 'story-1', '--pr', '7']);
    expect(unmerged.code).toBe(0);
    expect(unmerged.lines.join('\n')).toMatch(
      /cannot be done until pull request 7 at [0-9a-f]{12} is merged into main.*Nothing was written\./,
    );
    expect(transitions(f).map((t) => t.transition.to)).toEqual(['in-progress', 'verifying']);
  });

  it('refuses done, as an error, when the pull request changed after its approval', async () => {
    const { f, tree } = await inProgress({
      'src/app.js': 'export const app = 1;\n',
      [NOTE]: NOTE_TEXT,
    });
    await orchestrator(f, ['finish', 'story-1', '--pr', '7']);
    plantApproval(f, 'story', 7, tree);
    f.pullRequest(7, { 'src/app.js': 'export const app = 2;\n', [NOTE]: NOTE_TEXT });
    const changed = await orchestrator(f, ['finish', 'story-1', '--pr', '7']);
    expect(changed.code).toBe(1);
    expect(changed.errors.join()).toMatch(
      /pull request 7 changed after approval [0-9a-f]{12}, so the approved content is not what would merge/,
    );
    expect(transitions(f).map((t) => t.transition.to)).toEqual(['in-progress', 'verifying']);
  });

  it('refuses to finish a story that has not started, naming its stage', async () => {
    const { f } = readyStory();
    f.pullRequest(7, { [NOTE]: NOTE_TEXT });
    const io = await orchestrator(f, ['finish', 'story-1', '--pr', '7']);
    expect(io.errors.join()).toMatch(
      /story-1 is ready; finish moves an in-progress story to verifying/,
    );
  });
});

describe('gate-check file scope', () => {
  async function approvedStoryPullRequest(files: Record<string, string | null>) {
    const { f, head, tree } = await inProgress(files);
    plantApproval(f, 'story', 7, tree);
    plantVerify(f, 7, tree);
    return { f, head };
  }

  it('T-08-P5 [M0] passes a story diff inside its approved scope and its own work folder', async () => {
    const { f, head } = await approvedStoryPullRequest({
      'src/app.js': 'export const app = 1;\n',
      [NOTE]: NOTE_TEXT,
    });
    const result = job(f.work, ['gate-check', '--pr', '7', '--head', head]);
    expect(result.out).toMatch(/All 2 changed files are inside story-1's approved scope\./);
    expect(result.status).toBe(0);
  });

  it("T-08-N5 [M0] fails a diff outside the scope or in the factory's own folder, naming the file", async () => {
    const { f, head } = await approvedStoryPullRequest({
      'src/app.js': 'export const app = 1;\n',
      'docs/notes.md': 'stray\n',
      '.factory/work/classification/gate-2.json': '{}\n',
    });
    const result = job(f.work, ['gate-check', '--pr', '7', '--head', head]);
    expect(result.out).toContain(
      "docs/notes.md is outside story-1's approved file scope (src/**).",
    );
    expect(result.out).toContain(
      ".factory/work/classification/gate-2.json is in the factory's own folder, outside story-1's work folder",
    );
    expect(result.status).toBe(1);
  });

  it('takes the scope from the story file gate 3 approved, so a pull request cannot widen its own', async () => {
    const { f, head } = await approvedStoryPullRequest({
      '.factory/work/story-1/story.md': STORY_TEXT.replace('- src/**', '- src/**\n- docs/**'),
      'docs/notes.md': 'widened\n',
    });
    const result = job(f.work, ['gate-check', '--pr', '7', '--head', head]);
    expect(result.out).toContain(
      "docs/notes.md is outside story-1's approved file scope (src/**).",
    );
    expect(result.status).toBe(1);
  });

  it('reads the approved story file from a shallow clone of main by deepening it', async () => {
    const { f } = readyStory();
    expect((await orchestrator(f, ['start', 'story-1', '--holder', 'builder-1'])).code).toBe(0);
    f.commitToMain({ 'docs/later.md': 'main moved on\n' }, 'later');
    const head = f.pullRequest(7, { 'src/app.js': 'export const app = 1;\n' });
    const tree = treeAt(f, head);
    plantApproval(f, 'story', 7, tree);
    plantVerify(f, 7, tree);
    const shallow = join(f.root, 'enforcer');
    sh(f.root, ['clone', '--quiet', '--depth', '1', `file://${f.remote}`, shallow]);
    sh(shallow, [
      'fetch',
      '--quiet',
      'origin',
      `+refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}`,
    ]);
    const result = job(shallow, ['gate-check', '--pr', '7', '--head', head]);
    expect(result.out).toMatch(/inside story-1's approved scope/);
    expect(result.status).toBe(0);
  });

  it("refuses the factory's own folder even when a scope glob would cover it", async () => {
    const f = ciProject({ story: true });
    plantLock(f);
    const text = STORY_TEXT.replace('- src/**', '- **');
    f.commitToMain({ '.factory/work/story-1/story.md': text });
    plantGate3(f, { ...STORY_FILES, '.factory/work/story-1/story.md': text });
    expect((await orchestrator(f, ['start', 'story-1', '--holder', 'builder-1'])).code).toBe(0);
    const head = f.pullRequest(7, {
      'src/app.js': 'x\n',
      '.factory/records/0006-forged.json': '{}\n',
    });
    const tree = treeAt(f, head);
    plantApproval(f, 'story', 7, tree);
    plantVerify(f, 7, tree);
    const result = job(f.work, ['gate-check', '--pr', '7', '--head', head]);
    expect(result.out).toContain(
      ".factory/records/0006-forged.json is in the factory's own folder",
    );
    expect(result.status).toBe(1);
  });
});
