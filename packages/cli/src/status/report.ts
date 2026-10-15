import { active, isGate2Approval, short } from '../commands/common.js';
import { effectiveLock } from '../lock-state.js';
import type {
  ApprovalRecord,
  FactoryRecord,
  RevocationRecord,
  TransitionRecord,
} from '../records/format.js';
import type { RecordSet, StoredRecord } from '../records/store.js';
import { gate3Approval, handoffNote, storyStage } from '../story.js';

/** A story the build plan on main names, with its story file's text there (null when missing). */
export interface PlannedStory {
  story: string;
  path: string;
  text: string | null;
}

/** Everything the report reads; status gathers it, so the report itself touches no git. */
export interface StatusInput {
  set: RecordSet;
  /** main's commit, for the header. */
  main: string;
  /** Why there are no stories to show, or null when the build plan on main named some. */
  noStories: string | null;
  stories: PlannedStory[];
  /** A path's sha256-lf hash on main, or null when main does not have it. */
  hashOnMain(path: string): string | null;
  now: Date;
}

/** The stage a story file claims for itself, from a line such as `Stage: done`, if any. */
export function claimedStage(text: string): string | null {
  return /^[ \t]*Stage:[ \t]*(\S+)[ \t]*$/im.exec(text)?.[1]?.toLowerCase() ?? null;
}

const isRevocation = (r: FactoryRecord): r is RevocationRecord => r.recordType === 'revocation';

const isStoryApproval =
  (story: string) =>
  (r: FactoryRecord): r is ApprovalRecord =>
    r.recordType === 'approval' && r.approval.kind === 'story' && r.approval.story === story;

/** The revocation that withdrew the latest gate approval of this number, if one did. */
function revokedGate(set: RecordSet, gate: number): { approval: string; by: string } | null {
  const last = set.records
    .filter(
      (s) =>
        s.record.recordType === 'approval' &&
        s.record.approval.kind === 'gate' &&
        s.record.approval.gate === gate,
    )
    .at(-1);
  if (last === undefined) return null;
  const by = set.records.find(
    (s) => isRevocation(s.record) && s.record.revocation.revokes === last.record.recordId,
  );
  return by === undefined ? null : { approval: last.record.recordId, by: by.record.recordId };
}

/** Why a gate is not approved, in words a human can act on. Never uses the word approved. */
function notApproved(set: RecordSet, gate: 2 | 3): string {
  const command = `pod-factory approve ${gate}`;
  const revoked = revokedGate(set, gate);
  if (revoked !== null) {
    return `Gate ${gate}: not approved. Its approval ${revoked.approval} was revoked by ${revoked.by}; the approver runs "${command}" again to reopen it.`;
  }
  const invalid = set.flagged.filter((f) => f.path.includes(`-approval-gate-${gate}-`));
  if (invalid.length > 0) {
    return `Gate ${gate}: not approved. ${invalid.length === 1 ? 'Its only approval record is' : 'Its approval records are'} invalid and ignored (${invalid.map((f) => f.path).join(', ')}, listed below); the approver runs "${command}" again.`;
  }
  return `Gate ${gate}: not approved. The approver runs "${command}" in a terminal outside any agent session.`;
}

function gateLines(input: StatusInput): string[] {
  const { set } = input;
  const lines: string[] = [];

  const gate2 = active(set, isGate2Approval).at(-1);
  if (gate2 === undefined) {
    lines.push(notApproved(set, 2));
  } else {
    const locked = effectiveLock(set);
    lines.push(
      `Gate 2: approved by record ${gate2.record.recordId} (${gate2.path}). ${
        locked === null
          ? 'Nothing is locked yet; the approver runs "pod-factory lock".'
          : `Lock ${locked.lock.record.recordId} is in force${locked.amendments.length === 0 ? '' : `, with ${locked.amendments.length} ${locked.amendments.length === 1 ? 'amendment' : 'amendments'} applied`}.`
      }`,
    );
  }

  const gate3 = gate3Approval(set);
  if (gate3 === undefined) {
    lines.push(notApproved(set, 3));
  } else {
    const drifted = Object.entries(gate3.record.binds.files)
      .filter(([path, hash]) => input.hashOnMain(path) !== hash)
      .map(([path]) => path);
    lines.push(
      drifted.length === 0
        ? `Gate 3: approved by record ${gate3.record.recordId} (${gate3.path}), and main still holds the plan it approved.`
        : `Gate 3: approved by record ${gate3.record.recordId} (${gate3.path}), but main no longer holds the plan it approved (${drifted.join(', ')} changed), so story start refuses. The approver runs "pod-factory approve 3" for the plan on main.`,
    );
  }
  return lines;
}

/** What one story waits on, and the record or rule holding it there. */
function storyLine(input: StatusInput, planned: PlannedStory): string {
  const { set } = input;
  const { story } = planned;
  const { stage, last } = storyStage(set, story);
  const held = (s: StoredRecord<FactoryRecord>) =>
    `Held by record ${s.record.recordId} (${s.path}).`;

  if (planned.text === null) {
    return `${story}: ${stage}, no owner. Waits on: ${planned.path} on main; the build plan names it, but main does not have it.`;
  }

  if (stage === 'ready' || last === undefined) {
    const gate3 = gate3Approval(set);
    if (gate3 === undefined) {
      return `${story}: ready, no owner. Waits on: a valid gate-3 approval, then "pod-factory story start ${story} --holder <builder>". Held by the rule that a story starts only under a valid, unrevoked gate-3 approval.`;
    }
    if (!(planned.path in gate3.record.binds.files)) {
      return `${story}: ready, no owner. Waits on: a gate-3 approval that covers it; gate-3 approval ${gate3.record.recordId} did not approve ${planned.path}, so story start refuses until the approver runs "pod-factory approve 3" for the plan on main.`;
    }
    return `${story}: ready, no owner. Waits on: "pod-factory story start ${story} --holder <builder>". ${held(gate3)}`;
  }

  const t: TransitionRecord['transition'] = last.record.transition;
  if (stage === 'in-progress') {
    const lease = t.lease;
    const owner =
      lease === null
        ? 'no owner'
        : `owner ${lease.holder} (lease ${Date.parse(lease.expiresAt) <= input.now.getTime() ? 'expired at' : 'until'} ${lease.expiresAt})`;
    return `${story}: in-progress, ${owner}. Waits on: the builder's pull request, then "pod-factory story finish ${story} --pr <n>", which needs the handoff note ${handoffNote(story)} on that pull request. ${held(last)}`;
  }

  if (stage === 'verifying') {
    const approval = active(set, isStoryApproval(story)).at(-1);
    if (approval === undefined) {
      return `${story}: verifying, no owner. Waits on: review, then the approver's "pod-factory approve ${story} --pr <n>" for the pull request's head. ${held(last)}`;
    }
    const pr = approval.record.approval.pullRequest;
    return `${story}: verifying, no owner. Waits on: the merge of pull request ${pr}, approved by ${approval.record.recordId}, then "pod-factory story finish ${story} --pr ${pr}". ${held(last)}`;
  }

  return `${story}: done, no owner. Waits on nothing. ${held(last)}`;
}

/** A line for every story file whose own claim about its stage its records do not justify. */
function claimLines(input: StatusInput): string[] {
  const lines: string[] = [];
  for (const planned of input.stories) {
    if (planned.text === null) continue;
    const claim = claimedStage(planned.text);
    if (claim === null) continue;
    const { stage } = storyStage(input.set, planned.story);
    if (claim === stage) continue;
    lines.push(
      `${planned.story}'s story file claims ${claim}, but its records say ${stage}. The records decide; the claim in ${planned.path} sets nothing.`,
    );
  }
  return lines;
}

/** The report `pod-factory status` prints, one line each. */
export function statusReport(input: StatusInput): string[] {
  const { set } = input;
  const lines = [
    set.head === null
      ? `Status at main ${short(input.main)}. There is no records branch yet, so nothing is approved, locked or started.`
      : `Status at main ${short(input.main)}, records branch ${short(set.head)}.`,
  ];
  if (input.noStories !== null) lines.push(input.noStories);
  for (const planned of input.stories) lines.push(storyLine(input, planned));
  lines.push(...claimLines(input));
  lines.push(...gateLines(input));
  for (const flag of set.flagged) lines.push(`Invalid and ignored: ${flag.path} (${flag.reason}).`);
  return lines;
}
