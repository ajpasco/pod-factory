// Draft export and read-only diagnostics. Cached records are observations, not authorization of
// this package. This module never writes records, fetches refs, approves work or launches builders.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { WorkflowError } from './types.js';
import type { ArtifactReference, BuildPlanOutput, Preparation, PlanningSources, TechnicalOutput } from './types.js';

/** sha256 over LF-normalized UTF-8: the factory's own `hashAlgorithm`, so hashes compare directly. */
export const sha256Lf = (content: string): string => createHash('sha256').update(content.replace(/\r\n/g, '\n'), 'utf8').digest('hex');

/** The five outcomes the interface may render. Anything unproven is never `ready`. */
export type FactoryOutcome = 'ready' | 'waiting-for-user' | 'blocked' | 'failed' | 'uncertain';

export interface FactoryPrerequisite {
  id: string;
  satisfied: boolean;
  requirement: string;
  observed: string;
  /** The exact command a person must run, when a human action is the only thing missing. */
  humanAction?: string;
}

export interface FactoryRouteState {
  outcome: FactoryOutcome;
  summary: string;
  readOnly: true;
  source: 'locally-cached-factory-records' | 'fixture' | 'none';
  authority: 'non-authoritative' | 'fixture-only';
  packageBinding: 'unverified' | 'fixture-only';
  observedAt: string;
  observations?: FactoryPrerequisite[];
  factoryVersion: string | null;
  recordsCommit: string | null;
  trunkCommit: string | null;
  prerequisites: FactoryPrerequisite[];
}

export interface FactoryRecord {
  recordId?: string;
  recordType?: string;
  createdAt?: string;
  schemaVersion?: number | string;
  actor?: { name?: string; email?: string; kind?: string };
  binds?: { tree: string | null; files: Record<string, string> };
  outcome?: string;
  refs?: string[];
  approval?: { kind?: string; gate?: number | null; story?: string | null; pullRequest?: number | null };
  lock?: { patterns: string[]; testCommands: string[] };
  revocation?: { revokes: string; reason?: string };
}

/** Minimally parsed diagnostic fields; factory schema/history/writer validation is not performed. */
export type ValidRecord = FactoryRecord & { recordId: string; recordType: string; createdAt: string };

/** One prepared story, exported exactly as the reviewed plan states it. */
export interface ExportedStory {
  id: string;
  title: string;
  requirements: string[];
  evals: string[];
  scope: string[];
  dependsOn: string[];
  parallelGroup?: string;
}

export interface FactoryExportPackage {
  schemaVersion: 1;
  projectId: string;
  preparationRevision: number;
  authority: 'draft-only';
  approvalStatus: 'approval-channel-not-implemented';
  sources: PlanningSources;
  artifacts: { technical: ArtifactReference; plan: ArtifactReference; review: ArtifactReference; handoff: ArtifactReference };
  technicalDecision: { digest: string; at: string; authority: 'local-review-only' };
  stack: string;
  layers: number;
  requirements: TechnicalOutput['requirements'];
  decisions: TechnicalOutput['decisions'];
  evals: BuildPlanOutput['evals'];
  coverage: BuildPlanOutput['coverage'];
  stories: ExportedStory[];
  /** Planned procedures are not runnable tests. This states that plainly inside the package. */
  harness: { executableTestsAuthored: false; baselineRun: false; protectedByLock: false; note: string };
  manifestDigest: string;
}

const canonical = (pkg: Omit<FactoryExportPackage, 'manifestDigest'>): string => JSON.stringify(pkg, null, 2) + '\n';

/**
 * Exports the reviewed package, or refuses. It never summarizes: every requirement, eval, coverage
 * row and story scope entry the plan holds is carried across, and a mismatch is an error rather
 * than a quietly shorter package.
 */
export function buildExportPackage(state: Preparation): FactoryExportPackage {
  if (state.interview && state.interview.status !== 'ready') throw new WorkflowError('EXPORT_NOT_READY', 'Finish the requirements interview before exporting a plan.');
  const planning = state.planning;
  if (!planning || planning.phase !== 'planning-complete') throw new WorkflowError('EXPORT_NOT_READY', 'Complete the planning review before exporting to the factory.');
  const { technical, plan, review, handoff, technicalDecision } = planning;
  if (!technical || !plan || !review || !handoff || !technicalDecision) throw new WorkflowError('EXPORT_NOT_READY', 'The reviewed package is incomplete; export refused.');
  if (review.technicalDigest !== technical.artifact.digest || review.planDigest !== plan.artifact.digest) throw new WorkflowError('EXPORT_STALE', 'The review does not match the current blueprint and plan; export refused.');
  if (technicalDecision.digest !== technical.artifact.digest) throw new WorkflowError('EXPORT_STALE', 'The local blueprint choice does not match the current blueprint; export refused.');

  const stories: ExportedStory[] = plan.stories.map(story => {
    if (story.scope.length === 0) throw new WorkflowError('EXPORT_INCOMPLETE', `Story ${story.id} has no permitted scope; export refused rather than widened.`);
    if (story.requirements.length === 0 || story.evals.length === 0) throw new WorkflowError('EXPORT_INCOMPLETE', `Story ${story.id} must keep its requirement and eval references.`);
    return { id: story.id, title: story.title, requirements: [...story.requirements], evals: [...story.evals], scope: [...story.scope], dependsOn: [...story.dependsOn], ...(story.parallelGroup === undefined ? {} : { parallelGroup: story.parallelGroup }) };
  });
  for (const requirement of technical.requirements) {
    if (!plan.coverage.some(row => row.requirementId === requirement.id)) throw new WorkflowError('EXPORT_INCOMPLETE', `Requirement ${requirement.id} has no coverage row; export refused.`);
  }
  if (plan.coverage.some(row => row.status === 'gap')) throw new WorkflowError('EXPORT_INCOMPLETE', 'Coverage still reports a gap; resolve it before exporting.');

  const body: Omit<FactoryExportPackage, 'manifestDigest'> = {
    schemaVersion: 1, projectId: state.id, preparationRevision: state.revision,
    authority: 'draft-only', approvalStatus: 'approval-channel-not-implemented',
    sources: planning.sources,
    artifacts: { technical: technical.artifact, plan: plan.artifact, review: review.artifact, handoff },
    technicalDecision, stack: technical.stack, layers: technical.layers,
    requirements: technical.requirements, decisions: technical.decisions,
    evals: plan.evals, coverage: plan.coverage, stories,
    harness: { executableTestsAuthored: false, baselineRun: false, protectedByLock: false,
      note: 'These evals are planned procedures. An authored and independently reviewed executable harness, a classified baseline run and a lock covering it are prerequisites the factory must hold before dispatch.' },
  };
  return { ...body, manifestDigest: sha256Lf(canonical(body)) };
}

export interface DispatchRequest {
  operationId: string;
  preparationRevision: number;
  packageDigest: string;
  story: string;
}

export interface DispatchLedgerEntry {
  operationId: string;
  packageDigest: string;
  story: string;
  requestedAt: string;
  status: 'running' | 'succeeded' | 'failed' | 'uncertain';
  factoryRef?: string;
  detail?: string;
}

export interface DispatchDecision {
  outcome: FactoryOutcome;
  reasons: string[];
  blockedBy: FactoryPrerequisite[];
  /** Set when an existing attempt answers this request, so no second builder is started. */
  existing?: DispatchLedgerEntry;
}

/**
 * Contract evaluator, exercised by the fixture adapter; it does not establish real authority.
 * New attempts require an intact package, a ready route and no unresolved earlier attempt.
 */
export function evaluateDispatch(input: { state: FactoryRouteState; pkg: FactoryExportPackage; request: DispatchRequest; ledger: readonly DispatchLedgerEntry[] }): DispatchDecision {
  const { state, pkg, request, ledger } = input;
  const reasons: string[] = [];

  const replay = ledger.find(entry => entry.operationId === request.operationId);
  if (replay) {
    const outcome: FactoryOutcome = replay.status === 'succeeded' ? 'ready' : replay.status === 'failed' ? 'failed' : replay.status === 'uncertain' ? 'uncertain' : 'waiting-for-user';
    return { outcome, reasons: [`Operation ${request.operationId} was already requested at ${replay.requestedAt}; reporting its recorded result instead of dispatching again.`], blockedBy: [], existing: replay };
  }

  const { manifestDigest, ...body } = pkg;
  if (sha256Lf(canonical(body)) !== manifestDigest) reasons.push('The package content does not match its manifest digest; the exported bytes changed.');
  if (request.packageDigest !== pkg.manifestDigest) reasons.push('The requested package digest does not match the reviewed package; the inputs changed after review.');
  if (request.preparationRevision !== pkg.preparationRevision) reasons.push(`The request names preparation revision ${request.preparationRevision} but the reviewed package is revision ${pkg.preparationRevision}.`);
  if (!pkg.stories.some(story => story.id === request.story)) reasons.push(`The reviewed plan has no story ${request.story}.`);
  if (reasons.length > 0) return { outcome: 'blocked', reasons, blockedBy: [] };

  const unresolved = ledger.filter(entry => entry.story === request.story && (entry.status === 'running' || entry.status === 'uncertain'));
  if (unresolved.length > 0) {
    const first = unresolved[0];
    return { outcome: 'uncertain', reasons: [`An earlier attempt on ${request.story} (${first.operationId}, ${first.status}) is unresolved. Reconcile it against the factory's own records before requesting again; a retry must not start a second builder.`], blockedBy: [], existing: first };
  }
  const stale = ledger.find(entry => entry.story === request.story && entry.status === 'succeeded' && entry.packageDigest !== request.packageDigest);
  if (stale) reasons.push(`${request.story} already ran against a different reviewed package (${stale.packageDigest.slice(0, 12)}). A changed package needs its own authorization.`);

  const missing = state.prerequisites.filter(prerequisite => !prerequisite.satisfied);
  if (reasons.length > 0) return { outcome: 'blocked', reasons, blockedBy: missing };
  if (state.authority === 'non-authoritative') return { outcome: 'blocked', reasons: ['Locally cached diagnostics cannot authorize this exported package.', state.summary], blockedBy: missing };
  if (state.outcome !== 'ready') return { outcome: state.outcome, reasons: [state.summary, ...missing.map(p => p.observed)], blockedBy: missing };
  if (missing.length > 0) {
    const onlyHuman = missing.every(prerequisite => prerequisite.humanAction !== undefined);
    return { outcome: onlyHuman ? 'waiting-for-user' : 'blocked', reasons: missing.map(p => p.observed), blockedBy: missing };
  }
  return { outcome: 'ready', reasons: ['Fixture prerequisites are satisfied and the request matches the intact exported package; this is not real factory authorization.'], blockedBy: [] };
}

/**
 * The one rule every adapter uses before acting. A decision carrying `existing` is reporting an
 * attempt that already happened, so it is never permission to start another one, however its
 * outcome reads.
 */
export const mayDispatch = (decision: DispatchDecision): boolean => decision.outcome === 'ready' && decision.existing === undefined;

/** What a route adapter must provide. `requestDispatch` is the only non-read operation. */
export interface FactoryRoute {
  inspect(story: string): Promise<FactoryRouteState>;
  requestDispatch(request: DispatchRequest, pkg: FactoryExportPackage): Promise<{ decision: DispatchDecision; entry?: DispatchLedgerEntry }>;
}

export interface RealFactoryRouteOptions {
  /** Explicit local checkout. No network access or repository mutation. */
  repoPath: string;
  remote?: string;
  /** Explicit repository-relative path; no application is selected by default. */
  harnessRoot: string;
  cliPackagePath?: string;
  ledger?: readonly DispatchLedgerEntry[];
}

export type FactoryDiagnosticsConfig = Partial<Omit<RealFactoryRouteOptions, 'ledger'>>;

/** Normal startup uses these exact settings; a partial configuration never selects a target. */
export function factoryDiagnosticsConfigFromEnv(env: NodeJS.ProcessEnv): FactoryDiagnosticsConfig {
  return { repoPath: env.ORCH_FACTORY_REPO, harnessRoot: env.ORCH_FACTORY_HARNESS_ROOT,
    remote: env.ORCH_FACTORY_REMOTE, cliPackagePath: env.ORCH_FACTORY_CLI_PACKAGE };
}

export function configureFactoryDiagnostics(config: FactoryDiagnosticsConfig = {}) {
  const configured = Object.values(config).some(value => value !== undefined);
  const repoPath = config.repoPath?.trim();
  const harnessRoot = config.harnessRoot?.trim();
  const remote = config.remote ?? 'origin';
  const valid = repoPath && harnessRoot && !harnessRoot.startsWith('/') &&
    !harnessRoot.split('/').some(part => !part || part === '.' || part === '..') &&
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(remote);
  const configuration = !configured
    ? { status: 'unconfigured' as const, summary: 'Factory diagnostics are unconfigured. Set ORCH_FACTORY_REPO and ORCH_FACTORY_HARNESS_ROOT explicitly.' }
    : !valid
      ? { status: 'invalid' as const, summary: 'Factory diagnostics need an explicit repository and repository-relative harness root without empty, dot or parent segments; the remote must be a simple name.' }
      : { status: 'configured' as const, summary: 'Read-only diagnostics use locally cached refs only; package authorization is unverified.' };
  return { configuration, route: valid ? new RealFactoryRoute({ repoPath, harnessRoot, remote, cliPackagePath: config.cliPackagePath }) : undefined };
}

/** Read-only local observations. Not a substitute for factory validation or exact package binding. */
export class RealFactoryRoute implements FactoryRoute {
  private readonly remote: string;
  constructor(private readonly options: RealFactoryRouteOptions) { this.remote = options.remote ?? 'origin'; }

  private tryGit(args: string[]): string | null {
    try {
      return execFileSync('git', args, { cwd: this.options.repoPath, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch { return null; }
  }

  /** Only minimal shape parsing, deliberately not the factory's authority engine. */
  private records(commit: string): ValidRecord[] {
    const listing = this.tryGit(['ls-tree', '-r', '--name-only', commit, 'records/']);
    if (listing === null) return [];
    const out: ValidRecord[] = [];
    for (const path of listing.split('\n').filter(line => line.endsWith('.json') && line.lastIndexOf('/') === 'records'.length)) {
      const content = this.tryGit(['show', `${commit}:${path}`]);
      if (content === null) continue;
      try {
        const record = JSON.parse(content) as FactoryRecord;
        if (record?.schemaVersion === 1 && typeof record.recordId === 'string' && typeof record.recordType === 'string' && typeof record.createdAt === 'string') out.push(record as ValidRecord);
      } catch { /* Unparseable records do not supply observations. */ }
    }
    return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async inspect(story: string): Promise<FactoryRouteState> {
    const recordsCommit = this.tryGit(['rev-parse', '--verify', `refs/remotes/${this.remote}/pod-factory/records^{commit}`])?.trim() ?? null;
    const trunkCommit = this.tryGit(['rev-parse', '--verify', `refs/remotes/${this.remote}/main^{commit}`])?.trim() ?? null;
    const base = { readOnly: true as const, source: 'locally-cached-factory-records' as const,
      authority: 'non-authoritative' as const, packageBinding: 'unverified' as const,
      observedAt: new Date().toISOString(), factoryVersion: this.cliVersion(), recordsCommit, trunkCommit };
    const prerequisites: FactoryPrerequisite[] = [
      { id: 'exact-package-authority', satisfied: false, requirement: 'The factory validates its records and binds the exact exported application package.',
        observed: 'Not connected: these diagnostics validate neither factory record history/writer rules/effective amendments nor this package contract, scope, harness or runner bytes.' },
      { id: 'dispatch-supported', satisfied: false, requirement: 'A supported submission path is connected.', observed: 'Real dispatch is not implemented; no builder is launched.' },
    ];
    if (!/^story-[1-9][0-9]*$/.test(story)) return { ...base, outcome: 'blocked', summary: 'Select an explicit story-N for diagnostics.', prerequisites, observations: [] };
    if (recordsCommit === null || trunkCommit === null) return { ...base, outcome: 'uncertain',
      summary: 'Configured local records or trunk ref is unavailable. No fetch is attempted; cached diagnostics cannot establish package authorization.', prerequisites, observations: [] };

    const all = this.records(recordsCommit);
    // Latest minimally parsed candidates, without claiming validity, active status or authority.
    const gate2 = all.filter(r => r.recordType === 'approval' && r.approval?.kind === 'gate' && r.approval.gate === 2).at(-1);
    const lock = all.filter(r => r.recordType === 'lock').at(-1);
    const gate3 = all.filter(r => r.recordType === 'approval' && r.approval?.kind === 'gate' && r.approval.gate === 3).at(-1);
    const trunkFiles = (this.tryGit(['ls-tree', '-r', '--name-only', trunkCommit]) ?? '').split('\n').filter(Boolean);
    const root = this.options.harnessRoot.replace(/\/+$/, '');
    const harnessFiles = trunkFiles.filter(path => path.startsWith(`${root}/`));
    const storyPath = `.factory/work/${story}/story.md`;
    const boundStoryHash = gate3?.binds?.files?.[storyPath];
    const storyContent = trunkFiles.includes(storyPath) ? this.tryGit(['show', `${trunkCommit}:${storyPath}`]) : null;
    const patterns = Array.isArray(lock?.lock?.patterns) ? lock.lock.patterns.filter(p => typeof p === 'string') : [];
    const commands = Array.isArray(lock?.lock?.testCommands) ? lock.lock.testCommands.filter(c => typeof c === 'string') : [];
    const observation = (id: string, satisfied: boolean, observed: string): FactoryPrerequisite => ({ id, satisfied, requirement: 'Diagnostic observation only; not proof of approval, executable harness or protection.', observed });
    const describe = (record: ValidRecord | undefined) => record ? `Cached candidate ${record.recordId}, actor field ${record.actor?.kind ?? 'unknown'}; not factory-validated.` : 'No minimally parsed candidate record found.';
    const observations = [
      observation('gate-2-record', gate2 !== undefined, describe(gate2)),
      observation('lock-record', lock !== undefined, describe(lock)),
      observation('test-directory-present', harnessFiles.some(path => /\/tests?\//.test(path)), `${harnessFiles.length} cached trunk path(s) under ${root}; presence does not prove executable acceptance tests.`),
      observation('lock-pattern-match', patterns.some(pattern => harnessFiles.some(file => globToRegExp(pattern).test(file))), 'Candidate lock patterns compared to cached paths only; effective amendments and protected file bytes are unverified.'),
      observation('lock-command-mentions-root', commands.some(command => command.includes(root)), 'Substring comparison only; runner executability, runner hash and protection are unverified.'),
      observation('gate-3-record', gate3 !== undefined, describe(gate3)),
      observation('story-hash-mentioned', typeof boundStoryHash === 'string', `Cached candidate record ${typeof boundStoryHash === 'string' ? 'mentions' : 'does not mention'} ${storyPath}; this does not bind the exported application package.`),
      observation('story-hash-matches-trunk', typeof boundStoryHash === 'string' && storyContent !== null && sha256Lf(storyContent) === boundStoryHash,
        'Comparison is only the cached story file and candidate hash; unrelated story records supply no application package authority.'),
    ];
    return { ...base, outcome: 'blocked', prerequisites, observations,
      summary: `Locally cached observations for ${story}; exact exported package authorization is unverified and real dispatch is blocked.` };
  }

  /** Replays report existing results; every new real request remains blocked. */
  async requestDispatch(request: DispatchRequest, pkg: FactoryExportPackage): Promise<{ decision: DispatchDecision; entry?: DispatchLedgerEntry }> {
    const state = await this.inspect(request.story);
    const decision = evaluateDispatch({ state, pkg, request, ledger: this.options.ledger ?? [] });
    return { decision, ...(decision.existing === undefined ? {} : { entry: decision.existing }) };
  }

  private cliVersion(): string | null {
    if (this.options.cliPackagePath === undefined) return null;
    try { const version = JSON.parse(readFileSync(this.options.cliPackagePath, 'utf8')).version; return typeof version === 'string' ? version : null; } catch { return null; }
  }
}

/** Diagnostic glob comparison only, not a factory lock-policy validation. */
export function globToRegExp(pattern: string): RegExp {
  let source = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') { source += '.*'; i++; }
    else if (c === '*') { source += '[^/]*'; }
    else { source += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&'); }
  }
  return new RegExp(`^${source}$`);
}
