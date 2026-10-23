import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { ArtifactReference, Preparation, WorkflowError } from './types.js';
import { validateTechnical, validateBuildPlan, validatePlanningReview } from './planning.js';

export const digest = (content: string): string => createHash('sha256').update(content).digest('hex');
export const validId = (id: string): boolean => /^[a-zA-Z0-9_-]{1,100}$/.test(id);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const reference = (value: unknown): value is ArtifactReference => {
  if (!value || typeof value !== 'object') return false;
  const ref = value as ArtifactReference;
  return typeof ref.path === 'string' && !!ref.path && !isAbsolute(ref.path) && typeof ref.digest === 'string' && /^[a-f0-9]{64}$/.test(ref.digest) && Number.isInteger(ref.revision) && ref.revision > 0;
};
const findings = (value: unknown): boolean => Array.isArray(value) && value.every(item => item && typeof item.id === 'string' && typeof item.description === 'string' && ['blocking', 'advisory'].includes(item.severity) && (item.resolved === undefined || typeof item.resolved === 'boolean'));
const outputs: Record<string, string[]> = {
  'product-interviewer': ['interview.json'],
  'product-drafter': ['prd.md', 'mockup.html'], 'technical-author': ['technical.md'],
  'plan-author': ['build-plan.md'], 'planning-reviewer': ['planning-review.json', 'planning-handoff.json'],
};
export class PreparationStore {
  readonly dataDir: string;
  constructor(dataDir: string) { this.dataDir = resolve(dataDir); }
  projectPath(id: string): string {
    if (!validId(id)) throw new WorkflowError('INVALID_ID', 'Invalid preparation identifier.', 400);
    return resolve(this.dataDir, id);
  }
  async atomicWrite(path: string, content: string): Promise<void> {
    this.assertWithin(path);
    await mkdir(dirname(path), { recursive: true });
    const root = await realpath(this.dataDir);
    const parent = await realpath(dirname(path));
    if (parent !== root && !parent.startsWith(root + sep)) throw new WorkflowError('UNSAFE_PATH', 'Draft output directory escapes the preparation store.');
    const temporary = `${path}.${randomUUID()}.tmp`;
    const file = await open(temporary, 'wx', 0o600);
    try { await file.writeFile(content, 'utf8'); await file.sync(); } finally { await file.close(); }
    await rename(temporary, path);
  }
  assertWithin(path: string): void {
    const rel = relative(this.dataDir, resolve(path));
    if (!rel || rel.startsWith('..' + sep) || rel === '..' || isAbsolute(rel)) throw new WorkflowError('UNSAFE_PATH', 'Artifact path escapes the preparation store.');
  }
  async readText(path: string): Promise<string> {
    this.assertWithin(path);
    const actual = await realpath(path);
    const root = await realpath(this.dataDir);
    if (!actual.startsWith(root + sep)) throw new WorkflowError('UNSAFE_PATH', 'Artifact path escapes the preparation store.');
    return readFile(actual, 'utf8');
  }
  async readArtifact(ref: ArtifactReference): Promise<string> {
    const text = await this.readText(resolve(this.dataDir, ref.path));
    if (digest(text) !== ref.digest) throw new WorkflowError('ARTIFACT_CHANGED', `Artifact ${ref.path} changed. Restore its saved content or create a new preparation.`);
    return text;
  }
  async load(id: string): Promise<Preparation> {
    let raw: string;
    try { raw = await this.readText(resolve(this.projectPath(id), 'preparation.json')); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new WorkflowError('NOT_FOUND', 'Preparation not found.', 404);
      throw error;
    }
    let state: Preparation;
    try { state = JSON.parse(raw); } catch { throw new WorkflowError('INVALID_STATE', 'Preparation JSON is unreadable. Restore preparation.json from a known good copy or create a new preparation.'); }
    if (!state || state.schemaVersion !== 1 || state.id !== id || !Number.isInteger(state.revision) || state.revision < 1 ||
      !['intake', 'drafting', 'review', 'failed', 'interrupted'].includes(state.stage) || typeof state.idea !== 'string' ||
      !state.question || typeof state.question.id !== 'string' || typeof state.question.prompt !== 'string' || (state.question.answer !== undefined && typeof state.question.answer !== 'string') || !strings(state.confirmedScope) ||
      (state.interview && (!['needed', 'asking', 'ready'].includes(state.interview.status) || !Array.isArray(state.interview.answers) ||
        state.interview.answers.some(q => !q || typeof q.id !== 'string' || typeof q.prompt !== 'string' || typeof q.answer !== 'string') ||
        (state.interview.reason !== undefined && typeof state.interview.reason !== 'string') || (state.interview.summary !== undefined && typeof state.interview.summary !== 'string') ||
        (state.interview.status === 'ready' && !state.interview.summary?.trim()) || (state.interview.status === 'asking' && state.question.answer !== undefined))) ||
      !Array.isArray(state.proposals) || state.proposals.some(p => !p || typeof p.id !== 'string' || typeof p.description !== 'string') || !findings(state.findings) || !strings(state.feedback) ||
      !state.artifacts || typeof state.artifacts !== 'object' || (state.artifacts.prd !== undefined && !reference(state.artifacts.prd)) || (state.artifacts.mockup !== undefined && !reference(state.artifacts.mockup)) ||
      !strings(state.operations) || !strings(state.blockers) || typeof state.nextAction !== 'string' ||
      (state.task && (!validId(state.task.id) || !['running', 'completed', 'failed', 'interrupted'].includes(state.task.status) || !(state.task.role in outputs) || typeof state.task.operationId !== 'string' ||
        !Number.isInteger(state.task.inputRevision) || !Number.isInteger(state.task.savedRevision) || state.task.savedRevision < 1 || state.task.inputRevision < 1 ||
        !state.task.inputArtifacts || Object.values(state.task.inputArtifacts).some(ref => !reference(ref)) ||
        JSON.stringify(state.task.allowedOutputs) !== JSON.stringify(outputs[state.task.role]) || !Number.isInteger(state.task.executionLimitMs) || typeof state.task.startedAt !== 'string')) ||
      (state.reviewPacket && (typeof state.reviewPacket.path !== 'string' || !/^[a-f0-9]{64}$/.test(state.reviewPacket.digest) || !Number.isInteger(state.reviewPacket.preparationRevision) ||
        !state.reviewPacket.artifacts || !reference(state.reviewPacket.artifacts.prd) || !reference(state.reviewPacket.artifacts.mockup) || !findings(state.reviewPacket.unresolvedFindings) ||
        !Array.isArray(state.reviewPacket.requiredReviews) || state.reviewPacket.requiredReviews.some(review => !review || typeof review.role !== 'string' || review.status !== 'not-performed') ||
        state.reviewPacket.authority !== 'draft-only' || state.reviewPacket.approvalStatus !== 'approval-channel-not-implemented'))) {
      throw new WorkflowError('INVALID_STATE', 'Preparation state is invalid. Restore preparation.json from a known good copy or create a new preparation.');
    }
    if (state.planning) {
      try {
        const p = state.planning;
        if (p.correction && (!['running', 'completed', 'stopped'].includes(p.correction.status) || typeof p.correction.operationId !== 'string' || typeof p.correction.reason !== 'string')) throw new Error();
        if (!['technical-drafting', 'technical-review', 'technical-selected', 'plan-drafting', 'plan-review', 'reviewing', 'planning-complete', 'failed', 'interrupted'].includes(p.phase) ||
          typeof p.preferences !== 'string' || !p.sources || !reference(p.sources.prd) || !reference(p.sources.mockup) || !/^[a-f0-9]{64}$/.test(p.sources.confirmedScopeDigest)) throw new Error();
        if (p.technical) { validateTechnical(p.technical); if (!reference(p.technical.artifact)) throw new Error(); }
        if (p.technicalDecision && (!p.technical || p.technicalDecision.digest !== p.technical.artifact.digest || p.technicalDecision.authority !== 'local-review-only' || typeof p.technicalDecision.at !== 'string')) throw new Error();
        if (p.plan) {
          if (!p.technicalDecision || !reference(p.plan.artifact)) throw new Error();
          validateBuildPlan(p.plan, { taskId: '', inputRevision: state.revision, idea: state.idea, prdMarkdown: '', mockupHtml: '', confirmedScope: state.confirmedScope, preferences: p.preferences, sources: p.sources, technical: p.technical, executionLimitMs: 1 });
        }
        if (p.review) {
          validatePlanningReview(p.review);
          if (!p.plan || !reference(p.review.artifact) || p.review.authority !== 'draft-only' || p.review.technicalDigest !== p.technical!.artifact.digest || p.review.planDigest !== p.plan.artifact.digest) throw new Error();
        }
        if (p.handoff && (!p.review || !reference(p.handoff))) throw new Error();
        if (p.phase === 'planning-complete' && (!p.review || !p.handoff)) throw new Error();
      } catch { throw new WorkflowError('INVALID_STATE', 'Saved planning state is invalid. Restore matching state and artifacts before continuing.'); }
    }
    return state;
  }
  async save(state: Preparation): Promise<void> {
    await this.atomicWrite(resolve(this.projectPath(state.id), 'preparation.json'), JSON.stringify(state, null, 2) + '\n');
  }
  ref(path: string, content: string, revision: number): ArtifactReference {
    this.assertWithin(path); return { path: relative(this.dataDir, path), digest: digest(content), revision };
  }
}
