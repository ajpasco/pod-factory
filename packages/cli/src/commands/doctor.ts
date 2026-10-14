import { accessSync, constants, existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fetchTrunk, filesAt, TRUNK } from '../git-tree.js';
import { gh } from '../github.js';
import { HOOK_COMMAND, HOOK_MATCHER } from '../hook/pre-tool-use.js';
import { RECORDS_BRANCH } from '../records/format.js';
import { git, readBlobs } from '../records/git.js';
import { loadRecords } from '../records/store.js';
import { Refusal, short, type CommandIO } from './common.js';

/** The GitHub Actions app, which every required check must be bound to. */
export const ACTIONS_APP_ID = 15368;
export const REQUIRED_CHECKS = ['lock-guard', 'verify', 'gate-check'] as const;
const PR_CHECK_JOBS = ['lock-guard', 'verify', 'verify-record', 'gate-check'];

const INSTALL = `npm ci && npm run build --workspace packages/cli && cd packages/cli && npm pack && npm install -g ./pod-factory-0.0.0-m0.tgz, from a checkout of ${TRUNK}`;

interface Layer {
  name: string;
  present: boolean;
  detail: string;
}

const present = (name: string, detail: string): Layer => ({ name, present: true, detail });
const missing = (name: string, detail: string): Layer => ({ name, present: false, detail });

function fileOnMain(io: CommandIO, files: Map<string, string>, path: string): string | null {
  const oid = files.get(path);
  return oid === undefined ? null : (readBlobs(io.cwd, [oid]).get(oid) as Buffer).toString('utf8');
}

function hookConfiguration(io: CommandIO, files: Map<string, string>): Layer {
  const name = 'hook configuration';
  const text = fileOnMain(io, files, '.claude/settings.json');
  if (text === null)
    return missing(name, `${TRUNK} has no .claude/settings.json, so no agent session runs hook 1`);
  try {
    const settings = JSON.parse(text) as {
      hooks?: {
        PreToolUse?: { matcher?: string; hooks?: { type?: string; command?: string }[] }[];
      };
    };
    const entry = settings.hooks?.PreToolUse?.find((e) => e.matcher === HOOK_MATCHER);
    if (entry?.hooks?.some((h) => h.type === 'command' && h.command === HOOK_COMMAND) === true) {
      return present(name, `${TRUNK}'s .claude/settings.json runs hook 1 on ${HOOK_MATCHER}`);
    }
    return missing(
      name,
      `${TRUNK}'s .claude/settings.json has no PreToolUse entry running hook 1 exactly as pod-factory ships it`,
    );
  } catch {
    return missing(name, `${TRUNK}'s .claude/settings.json is not readable JSON`);
  }
}

/** The first `pod-factory` on the invocation's PATH, as Claude Code's hook would find it. */
function onPath(io: CommandIO): string | null {
  for (const dir of (io.ctx.env.PATH ?? '').split(':')) {
    if (dir === '') continue;
    const candidate = join(dir, 'pod-factory');
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // not here
    }
  }
  return null;
}

function binary(io: CommandIO): Layer {
  const name = 'pod-factory binary';
  const found = onPath(io);
  if (found === null)
    return missing(
      name,
      `pod-factory is not on PATH, so the hook refuses every edit. Install a packed copy: ${INSTALL}`,
    );
  const real = realpathSync(found);
  const checkout = git(dirname(real), ['rev-parse', '--show-toplevel'], { allowFail: true });
  if (checkout.status === 0) {
    return missing(
      name,
      `${found} resolves to ${real}, inside the git checkout ${checkout.stdout.toString().trim()}, so whatever that checkout has built would judge. Install a packed copy instead: ${INSTALL}`,
    );
  }
  let version = 'unknown version';
  for (let dir = dirname(real); dir !== dirname(dir); dir = dirname(dir)) {
    const manifest = join(dir, 'package.json');
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string; version?: string };
    if (pkg.name === 'pod-factory') version = `version ${pkg.version}`;
    break;
  }
  return present(name, `${found} is a packed copy at ${real} (${version}), outside any checkout`);
}

function workflows(io: CommandIO, files: Map<string, string>): Layer {
  const name = 'CI workflows on main';
  const checks = fileOnMain(io, files, '.github/workflows/pr-checks.yml');
  const validate = fileOnMain(io, files, '.github/workflows/records-validate.yml');
  const problems: string[] = [];
  if (checks === null) problems.push('.github/workflows/pr-checks.yml is missing');
  else {
    if (!/^\s*pull_request_target:/m.test(checks))
      problems.push('pr-checks.yml does not run on pull_request_target');
    for (const job of PR_CHECK_JOBS) {
      if (!new RegExp(`^  ${job}:\\s*$`, 'm').test(checks))
        problems.push(`pr-checks.yml has no ${job} job`);
    }
  }
  if (validate === null) problems.push('.github/workflows/records-validate.yml is missing');
  else {
    if (!/^\s*schedule:/m.test(validate)) problems.push('records-validate.yml has no schedule');
    if (!validate.includes('--relay'))
      problems.push('records-validate.yml does not run the revocation relay');
  }
  return problems.length === 0
    ? present(
        name,
        `${TRUNK} has pr-checks.yml (${PR_CHECK_JOBS.join(', ')}) and records-validate.yml (scheduled, with the relay)`,
      )
    : missing(name, problems.join('; '));
}

interface Protection {
  enforce_admins?: { enabled?: boolean };
  required_status_checks?: {
    strict?: boolean;
    contexts?: string[];
    checks?: { context: string; app_id: number | null }[];
  } | null;
  required_pull_request_reviews?: unknown;
  allow_force_pushes?: { enabled?: boolean };
  allow_deletions?: { enabled?: boolean };
}

function protection(io: CommandIO, branch: string): Protection | { reason: string } {
  const result = gh(io.cwd, io.ctx, [
    'api',
    `repos/{owner}/{repo}/branches/${encodeURIComponent(branch)}/protection`,
  ]);
  if (!result.ok) return { reason: result.reason };
  try {
    return JSON.parse(result.stdout) as Protection;
  } catch {
    return { reason: 'GitHub answered something pod-factory cannot read' };
  }
}

function mainProtection(io: CommandIO): Layer[] {
  const name = `${TRUNK} branch protection`;
  const p = protection(io, TRUNK);
  if ('reason' in p) return [missing(name, `cannot be checked: ${p.reason}`)];
  const problems: string[] = [];
  if (p.enforce_admins?.enabled !== true) problems.push('administrators are not bound');
  if (p.allow_force_pushes?.enabled !== false) problems.push('force pushes are allowed');
  if (p.allow_deletions?.enabled !== false) problems.push('deletion is allowed');
  const checks = p.required_status_checks?.checks ?? [];
  for (const check of REQUIRED_CHECKS) {
    const bound = checks.find((c) => c.context === check);
    if (bound === undefined) problems.push(`${check} is not a required check`);
    else if (bound.app_id !== ACTIONS_APP_ID) {
      problems.push(
        `${check} is required but not bound to the GitHub Actions app (${ACTIONS_APP_ID}), so a status posted with any token could satisfy it`,
      );
    }
  }
  const layers = [
    problems.length === 0
      ? present(
          name,
          `administrators bound; ${REQUIRED_CHECKS.join(', ')} required from the GitHub Actions app; no force pushes or deletion`,
        )
      : missing(name, problems.join('; ')),
  ];
  const notes = [
    `strict (branches up to date before merge) is ${p.required_status_checks?.strict === true ? 'on' : 'off'}; that is the approver's call`,
  ];
  if (checks.some((c) => c.context === 'bootstrap-check'))
    notes.push('the placeholder bootstrap-check is still required');
  layers.push({ name: `${TRUNK} merge settings`, present: true, detail: notes.join('; ') });
  return layers;
}

function records(io: CommandIO): Layer[] {
  const set = loadRecords(io.cwd, io.remote);
  const name = 'records branch';
  if (set.head === null) return [missing(name, `${RECORDS_BRANCH} does not exist on ${io.remote}`)];
  const valid = set.records.length + set.bootstrap.length;
  const layers = [
    set.flagged.length === 0
      ? present(
          name,
          `${RECORDS_BRANCH} at ${short(set.head)}: ${valid} valid records, none flagged`,
        )
      : missing(
          name,
          `${set.flagged.length} flagged ${set.flagged.length === 1 ? 'record' : 'records'} on ${RECORDS_BRANCH}; run "pod-factory ci records-validate" for each reason`,
        ),
  ];
  const protName = 'records branch protection';
  const p = protection(io, RECORDS_BRANCH);
  if ('reason' in p) {
    layers.push(
      missing(
        protName,
        /not protected/i.test(p.reason)
          ? `${RECORDS_BRANCH} is not protected`
          : `cannot be checked: ${p.reason}`,
      ),
    );
    return layers;
  }
  const problems: string[] = [];
  if (p.allow_force_pushes?.enabled !== false) problems.push('force pushes are allowed');
  if (p.allow_deletions?.enabled !== false)
    problems.push('deletion is allowed, which would delete every revocation');
  if (p.required_status_checks != null)
    problems.push('it requires status checks, so verify-record could not push');
  if (p.required_pull_request_reviews != null)
    problems.push('it requires reviews, so verify-record could not push');
  layers.push(
    problems.length === 0
      ? present(
          protName,
          'no force pushes, no deletion, and nothing that would stop verify-record pushing',
        )
      : missing(protName, problems.join('; ')),
  );
  return layers;
}

/**
 * `pod-factory doctor`. Reports each enforcement layer present or missing, failing closed on any
 * it cannot check. Read-only, so it runs from any session, an agent's included. Returns 1 when
 * any layer is missing.
 */
export function doctor(argv: string[], io: CommandIO): number {
  if (argv.length > 0) throw new Refusal('Usage: pod-factory doctor (it takes no arguments)');
  const main = fetchTrunk(io.cwd, io.remote);
  const files = filesAt(io.cwd, main);
  const layers = [
    hookConfiguration(io, files),
    binary(io),
    workflows(io, files),
    ...mainProtection(io),
    ...records(io),
  ];
  for (const layer of layers)
    io.out(`${layer.present ? 'present' : 'MISSING'}  ${layer.name}: ${layer.detail}`);
  const gaps = layers.filter((l) => !l.present);
  io.out(
    gaps.length === 0
      ? `Every enforcement layer is present (${TRUNK} at ${short(main)}).`
      : `${gaps.length} enforcement ${gaps.length === 1 ? 'layer is' : 'layers are'} missing: ${gaps.map((l) => l.name).join(', ')}.`,
  );
  return gaps.length === 0 ? 0 : 1;
}
