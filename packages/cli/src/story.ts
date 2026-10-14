import { active } from './commands/common.js';
import { globToRegExp } from './lock-policy.js';
import type { ApprovalRecord, FactoryRecord, Stage, TransitionRecord } from './records/format.js';
import { git, readBlobs } from './records/git.js';
import { hashBytes } from './records/hash.js';
import type { RecordSet, StoredRecord } from './records/store.js';

export const STORY_ID = /^story-[1-9][0-9]*$/;

export function storyFile(story: string): string {
  return `.factory/work/${story}/story.md`;
}

export function handoffNote(story: string): string {
  return `.factory/work/${story}/handoff.md`;
}

export function storyFolder(story: string): string {
  return `.factory/work/${story}/`;
}

/** The three lists the story commands read; the rest of a story file is prose for the builder. */
export interface StoryLists {
  tests: string[];
  scope: string[];
  inputs: string[];
}

const LISTS = { Tests: 'tests', Scope: 'scope', Inputs: 'inputs' } as const;

/**
 * Reads the labelled lists from a story file: a line `Tests:`, `Scope:` or `Inputs:` followed by
 * `- <path or glob>` lines. Returns the lists, or the names of the ones that are missing or empty.
 */
export function parseStory(text: string): StoryLists | { missing: string[] } {
  const found: Partial<Record<keyof StoryLists, string[]>> = {};
  let current: keyof StoryLists | null = null;
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const label = /^(Tests|Scope|Inputs):$/.exec(line);
    if (label !== null) {
      current = LISTS[label[1] as keyof typeof LISTS];
      found[current] = [];
      continue;
    }
    const item = /^- +(\S+)$/.exec(line);
    if (current !== null && item !== null) {
      (found[current] as string[]).push(item[1] as string);
      continue;
    }
    current = null;
  }
  const missing = (Object.keys(LISTS) as (keyof typeof LISTS)[]).filter(
    (label) => (found[LISTS[label]] ?? []).length === 0,
  );
  if (missing.length > 0) return { missing };
  return found as StoryLists;
}

const isGate3 = (r: FactoryRecord): r is ApprovalRecord =>
  r.recordType === 'approval' && r.approval.kind === 'gate' && r.approval.gate === 3;

/** The latest valid, unrevoked gate-3 approval. */
export function gate3Approval(set: RecordSet): StoredRecord<ApprovalRecord> | undefined {
  return active(set, isGate3).at(-1);
}

const isTransition = (r: FactoryRecord): r is TransitionRecord => r.recordType === 'transition';

/** A story's stage from its valid transitions, in the order they were added; ready with none. */
export function storyStage(
  set: RecordSet,
  story: string,
): { stage: Stage; last: StoredRecord<TransitionRecord> | undefined } {
  const last = active(set, isTransition)
    .filter((s) => s.record.transition.story === story)
    .at(-1);
  return { stage: last?.record.transition.to ?? 'ready', last };
}

/**
 * The story file as the gate-3 approval bound it: read from the tree that approval binds and
 * checked against the hash it binds, so neither a pull request nor a later change on main can
 * widen a story's scope. Returns the text, or why it cannot be read.
 */
export function boundStoryFile(
  cwd: string,
  approval: ApprovalRecord,
  story: string,
): { text: string } | { reason: string } {
  const path = storyFile(story);
  const bound = approval.binds.files[path];
  if (typeof bound !== 'string' || approval.binds.tree === null) {
    return { reason: `gate-3 approval ${approval.recordId} does not bind ${path}` };
  }
  const blob = git(cwd, ['rev-parse', '--verify', '--quiet', `${approval.binds.tree}:${path}`], {
    allowFail: true,
  });
  if (blob.status !== 0) {
    return {
      reason: `the tree gate-3 approval ${approval.recordId} binds is not in this clone, so ${path} cannot be read as approved`,
    };
  }
  const oid = blob.stdout.toString().trim();
  const bytes = readBlobs(cwd, [oid]).get(oid) as Buffer;
  if (hashBytes(bytes) !== bound) {
    return {
      reason: `${path} in the approved tree does not match the hash gate-3 approval ${approval.recordId} binds`,
    };
  }
  return { text: bytes.toString('utf8') };
}

/**
 * The paths in a story diff outside what the story may touch: its Scope globs, plus its own work
 * folder. Anything else under .factory/ is outside, whatever the scope says.
 */
export function outsideScope(story: string, scope: string[], changed: string[]): string[] {
  const allowed = scope.map(globToRegExp);
  const folder = storyFolder(story);
  return changed.filter((path) => {
    if (path.startsWith(folder)) return false;
    if (path.startsWith('.factory/')) return true;
    return !allowed.some((re) => re.test(path));
  });
}
