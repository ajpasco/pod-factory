import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { runBoundedDraft } from './draft.js';
import { digest, PreparationStore } from './store.js';
import { BuildPlanOutput, DraftInput, DraftProvider, Mutation, PlanningInput, PlanningProvider, PlanningReview, Preparation, TechnicalOutput, WorkflowError } from './types.js';
import { planningBlockers, runBoundedPlanning, validateBuildPlan, validatePlanningReview, validateTechnical } from './planning.js';
import { runInterview } from './interview.js';
export * from './types.js';

interface Options { dataDir: string; provider: DraftProvider; planningProvider?: PlanningProvider; executionLimitMs?: number }
const requiredReviews = () => ['skeptical founder', 'security reviewer', 'operations engineer', 'feasibility reviewer'].map(role => ({ role, status: 'not-performed' as const }));
export class WorkflowService {
  private readonly store: PreparationStore;
  private readonly provider: DraftProvider;
  private readonly executionLimitMs: number;
  private readonly planningProvider?: PlanningProvider;
  private readonly active = new Set<string>();
  private readonly corrections = new Map<string, Set<string>>();
  private readonly queues = new Map<string, Promise<unknown>>();
  constructor(options: Options) {
    this.store = new PreparationStore(options.dataDir); this.provider = options.provider; this.planningProvider = options.planningProvider;
    this.executionLimitMs = options.executionLimitMs ?? 120_000;
    if (!Number.isInteger(this.executionLimitMs) || this.executionLimitMs < 1 || this.executionLimitMs > 600_000) throw new WorkflowError('INVALID_LIMIT', 'Draft execution limit must be between 1 and 600000 milliseconds.', 400);
  }
  private async serial<T>(id: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(id) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(fn); this.queues.set(id, next);
    try { return await next; } finally { if (this.queues.get(id) === next) this.queues.delete(id); }
  }
  private operation(operationId: string): void {
    if (typeof operationId !== 'string' || !operationId.trim() || operationId.length > 200) throw new WorkflowError('INVALID_OPERATION', 'Supply a stable operation identifier of 1–200 characters.', 400);
  }
  private text(value: string, label: string): string {
    if (typeof value !== 'string' || !value.trim() || value.length > 20_000) throw new WorkflowError('INVALID_INPUT', `${label} must contain 1–20000 characters.`, 400);
    return value.trim();
  }
  private check(state: Preparation, mutation: Mutation): void {
    this.operation(mutation.operationId);
    if (this.corrections.has(state.id) && !this.corrections.get(state.id)!.has(mutation.operationId)) throw new WorkflowError('TASK_UNRESOLVED', 'The plan correction and re-review are still running.');
    if (state.operations.includes(mutation.operationId)) throw new WorkflowError('DUPLICATE_OPERATION', 'This operation was already recorded. Refresh the preparation to inspect its outcome.');
    if (state.revision !== mutation.expectedRevision) throw new WorkflowError('STALE_REVISION', 'Preparation changed. Refresh before submitting this action.');
    if (state.task?.status === 'running' || state.task?.status === 'interrupted') throw new WorkflowError('TASK_UNRESOLVED', 'Draft execution is running or its outcome is unresolved. Reconcile saved task evidence before starting another task.');
  }
  async create(input: { idea: string; operationId: string }): Promise<Preparation> {
    this.operation(input.operationId); const idea = this.text(input.idea, 'Product idea');
    const id = `prep-${digest(input.operationId).slice(0, 24)}`;
    return this.serial(id, async () => {
      try { await this.store.load(id); throw new WorkflowError('DUPLICATE_OPERATION', 'This create operation was already recorded. Resume the existing preparation.'); }
      catch (error) { if (!(error instanceof WorkflowError) || error.code !== 'NOT_FOUND') throw error; }
      const state: Preparation = {
        schemaVersion: 1, id, revision: 1, stage: 'intake', idea,
        question: { id: 'primary-journey', prompt: 'Who is the primary user, and what single outcome must they be able to complete in the first version?' },
        confirmedScope: [idea], proposals: [], findings: [], feedback: [], artifacts: {},
        blockers: ['Answer the material product question.'], nextAction: 'Answer the product question.', operations: [input.operationId],
      };
      if (this.provider.interview) {
        state.interview = { status: 'needed', answers: [] };
        state.blockers = ['Review the material product decisions before drafting.']; state.nextAction = 'Start the requirements interview.';
      }
      await this.store.save(state); return state;
    });
  }
  async get(id: string): Promise<Preparation> {
    return this.serial(id, () => this.reconcile(id));
  }
  private async reconcile(id: string): Promise<Preparation> {
    const state = await this.store.load(id);
    if (state.planning?.correction?.status === 'running' && !this.corrections.has(id) && state.task?.status !== 'running') {
      state.planning.correction.status = 'stopped'; state.planning.correction.reason = 'Correction interrupted between tasks. Inspect the saved result before explicitly retrying review.';
      state.revision++; state.nextAction = state.planning.correction.reason; await this.store.save(state);
    }
    if (!state.task || !['running', 'interrupted'].includes(state.task.status) || this.active.has(state.task.id)) return state;
    const evidencePath = resolve(this.store.projectPath(id), 'tasks', `${state.task.id}.result.json`);
    try {
      const result = JSON.parse(await this.store.readText(evidencePath)) as Preparation;
      if (result.id !== id || result.task?.id !== state.task.id || result.task.inputRevision !== state.task.inputRevision ||
        result.task.savedRevision !== state.task.savedRevision || result.task.role !== state.task.role || result.task.operationId !== state.task.operationId ||
        JSON.stringify(result.task.inputArtifacts) !== JSON.stringify(state.task.inputArtifacts) || JSON.stringify(result.task.allowedOutputs) !== JSON.stringify(state.task.allowedOutputs) || result.revision !== state.task.savedRevision + 1 ||
        !['completed', 'failed', 'interrupted'].includes(result.task.status)) throw new WorkflowError('INVALID_TASK_EVIDENCE', 'Task result evidence does not match the saved task. Restore matching evidence before retrying.');
      // A restart marker may have incremented the state revision once. No other edits may be overwritten.
      if (state.revision !== state.task.savedRevision && !(state.task.status === 'interrupted' && state.revision === state.task.savedRevision + 1)) throw new WorkflowError('STALE_OUTPUT', 'Task output is older than the current preparation and cannot be applied.');
      if (result.task.status === 'completed' && result.task.role === 'product-drafter') {
        if (!result.artifacts.prd || !result.artifacts.mockup || !result.reviewPacket) throw new WorkflowError('INVALID_TASK_EVIDENCE', 'Completed task evidence is missing its artifact pair or review packet.');
        await this.store.readArtifact(result.artifacts.prd); await this.store.readArtifact(result.artifacts.mockup);
        const packet = await this.store.readText(resolve(this.store.dataDir, result.reviewPacket.path));
        if (digest(packet) !== result.reviewPacket.digest) throw new WorkflowError('ARTIFACT_CHANGED', 'Saved review packet content changed. Restore the matching packet before recovery.');
      }
      if (result.task.status === 'completed' && result.task.role === 'product-interviewer' && !result.interview) throw new WorkflowError('INVALID_TASK_EVIDENCE', 'Interview result is missing its saved question or summary.');
      if (result.task.status === 'completed' && !['product-drafter', 'product-interviewer'].includes(result.task.role)) {
        await this.verifyPlanningArtifacts(result);
      }
      await this.store.save(result); return result;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        if (error instanceof WorkflowError) throw error;
        throw new WorkflowError('INVALID_TASK_EVIDENCE', 'Task evidence is unreadable. Restore matching result evidence; do not blindly retry the task.');
      }
    }
    if (state.task.status === 'running') {
      state.revision += 1; state.stage = 'interrupted'; state.task.status = 'interrupted';
      if (state.planning) state.planning.phase = 'interrupted';
      state.task.failure = 'Interrupted—outcome unresolved. No matching durable task result was found.';
      state.blockers = [state.task.failure]; state.nextAction = 'Recover matching task result evidence or start a separate preparation; automatic retry is disabled.';
      await this.store.save(state);
    }
    return state;
  }
  async answer(id: string, input: Mutation & { answer: string }): Promise<Preparation> {
    return this.serial(id, async () => {
      const state = await this.reconcile(id); this.check(state, input);
      if (state.interview && state.interview.status !== 'asking') throw new WorkflowError('QUESTION_REQUIRED', 'Review the requirements to obtain the next question.');
      if (state.question.answer) throw new WorkflowError('ALREADY_ANSWERED', 'The saved question is already answered. Use requested changes to refine the confirmed scope.');
      const answer = this.text(input.answer, 'Answer');
      if (!state.interview && /^(yes|yeah|yep|ok|okay|sure|looks good|go ahead|great|thanks|thank you)[.!\s]*$/i.test(answer)) throw new WorkflowError('MATERIAL_ANSWER_REQUIRED', 'Give the primary user and intended outcome; encouragement does not answer the product question.', 400);
      state.question.answer = answer; state.confirmedScope.push(state.interview ? `Answer to "${state.question.prompt}": ${answer}` : answer); state.revision += 1;
      state.operations.push(input.operationId); state.blockers = []; state.nextAction = 'Draft the PRD and clickable sample-data mockup.';
      if (state.interview) {
        state.interview.answers.push(structuredClone(state.question)); state.interview.status = 'needed';
        delete state.interview.summary; state.artifacts = {}; delete state.reviewPacket; delete state.planning;
        state.stage = 'intake'; state.blockers = ['Check the remaining requirements.']; state.nextAction = 'Check for the next material question.';
      }
      await this.store.save(state); return state;
    });
  }
  async interview(id: string, mutation: Mutation): Promise<Preparation> {
    if (!this.provider.interview) throw new WorkflowError('INTERVIEW_UNAVAILABLE', 'The configured provider does not support requirements interviews.', 503);
    const { state, input } = await this.serial(id, async () => {
      const state = await this.reconcile(id); this.check(state, mutation);
      if (state.interview?.status === 'asking') throw new WorkflowError('ANSWER_REQUIRED', 'Answer the current interview question first.');
      state.interview ??= { status: 'needed', answers: state.question.answer ? [structuredClone(state.question)] : [] };
      state.interview.status = 'needed';
      const input = { idea: state.idea, confirmedScope: [...state.confirmedScope], answers: structuredClone(state.interview.answers), findings: structuredClone(state.findings), executionLimitMs: this.executionLimitMs };
      const taskId = randomUUID(), inputRevision = state.revision;
      state.revision++; state.stage = 'intake'; state.operations.push(mutation.operationId);
      state.nextAction = 'Reviewing your answers for the next material decision.';
      state.task = { id: taskId, role: 'product-interviewer', operationId: mutation.operationId, inputRevision, savedRevision: state.revision,
        inputArtifacts: structuredClone(state.artifacts), allowedOutputs: ['interview.json'], executionLimitMs: this.executionLimitMs, status: 'running', startedAt: new Date().toISOString() };
      await this.store.atomicWrite(resolve(this.store.projectPath(id), 'tasks', `${taskId}.input.json`), JSON.stringify(input, null, 2) + '\n');
      await this.store.save(state); this.active.add(taskId); return { state, input };
    });
    try {
      const output = await runInterview(this.provider, input);
      return await this.serial(id, async () => {
        await this.assertCurrentTask(state);
        state.interview!.reason = output.reason; state.interview!.summary = output.summary;
        state.interview!.status = output.question === null ? 'ready' : 'asking';
        if (output.question) state.question = { id: randomUUID(), prompt: output.question.trim() };
        else if (!state.question.answer) state.question = { id: 'scope-provided', prompt: 'Initial product scope', answer: state.idea };
        state.revision++; state.task!.status = 'completed'; state.task!.finishedAt = new Date().toISOString();
        state.blockers = output.question ? [output.reason] : [];
        state.nextAction = output.question ? 'Answer the next product question.' : 'Review the confirmed scope, then request the PRD and mockup.';
        await this.persistResult(state); return state;
      });
    } catch (error) {
      return await this.serial(id, async () => {
        await this.assertCurrentTask(state);
        const interrupted = error instanceof WorkflowError && error.code === 'DRAFT_TIMEOUT';
        state.revision++; state.stage = interrupted ? 'interrupted' : 'failed'; state.task!.status = interrupted ? 'interrupted' : 'failed';
        state.task!.failure = error instanceof Error ? error.message : String(error); state.task!.finishedAt = new Date().toISOString();
        state.blockers = [state.task!.failure]; state.nextAction = interrupted ? 'Interview outcome unresolved; inspect saved task evidence.' : 'Your answers are saved. Explicitly retry the requirements review.';
        await this.persistResult(state); return state;
      });
    } finally { this.active.delete(state.task!.id); }
  }
  async draft(id: string, input: Mutation): Promise<Preparation> { return this.beginDraft(id, input); }
  async requestChanges(id: string, input: Mutation & { feedback: string }): Promise<Preparation> {
    return this.beginDraft(id, input, this.text(input.feedback, 'Requested change'));
  }
  private async beginDraft(id: string, mutation: Mutation, feedback?: string): Promise<Preparation> {
    const prepared = await this.serial(id, async () => {
      const state = await this.reconcile(id); this.check(state, mutation);
      if (state.interview && state.interview.status !== 'ready') throw new WorkflowError('INTERVIEW_REQUIRED', 'Finish the requirements interview and review its summary before drafting.');
      if (!state.question.answer) throw new WorkflowError('ANSWER_REQUIRED', 'Answer the material product question before drafting.');
      if (feedback && (!state.artifacts.prd || !state.artifacts.mockup)) throw new WorkflowError('DRAFT_REQUIRED', 'Create the initial artifact pair before requesting changes.');
      let previousArtifacts: DraftInput['previousArtifacts'];
      if (state.artifacts.prd && state.artifacts.mockup) previousArtifacts = { prdMarkdown: await this.store.readArtifact(state.artifacts.prd), mockupHtml: await this.store.readArtifact(state.artifacts.mockup) };
      if (feedback) { state.feedback.push(feedback); state.confirmedScope.push(`Requested change: ${feedback}`); }
      const taskId = randomUUID(); const inputRevision = state.revision;
      state.revision += 1; state.stage = 'drafting'; delete state.reviewPacket; delete state.planning;
      state.operations.push(mutation.operationId); state.blockers = []; state.nextAction = 'Drafting the saved product scope.';
      state.task = { id: taskId, role: 'product-drafter', operationId: mutation.operationId, inputRevision, savedRevision: state.revision,
        inputArtifacts: structuredClone(state.artifacts), allowedOutputs: ['prd.md', 'mockup.html'], executionLimitMs: this.executionLimitMs, status: 'running', startedAt: new Date().toISOString() };
      const draftInput: DraftInput = { taskId, inputRevision, idea: state.idea, question: { ...state.question, answer: state.question.answer },
        confirmedScope: [...state.confirmedScope], proposals: structuredClone(state.proposals), feedback: [...state.feedback], previousArtifacts,
        allowedOutputs: ['prd.md', 'mockup.html'], executionLimitMs: this.executionLimitMs };
      // Input evidence and task identity must be durable before model invocation.
      await this.store.atomicWrite(resolve(this.store.projectPath(id), 'tasks', `${taskId}.input.json`), JSON.stringify(draftInput, null, 2) + '\n');
      await this.store.save(state); this.active.add(taskId); return { state, draftInput };
    });
    const { state, draftInput } = prepared;
    try {
      const output = await runBoundedDraft(this.provider, draftInput);
      return await this.serial(id, async () => {
        await this.assertCurrentTask(state);
        const completed = structuredClone(state);
        const directory = resolve(this.store.projectPath(id), 'artifacts', draftInput.taskId);
        const revision = (state.artifacts.prd?.revision ?? 0) + 1;
        const prdPath = resolve(directory, 'prd.md'), mockupPath = resolve(directory, 'mockup.html');
        await this.store.atomicWrite(prdPath, output.prdMarkdown); await this.store.atomicWrite(mockupPath, output.mockupHtml);
        const artifacts = { prd: this.store.ref(prdPath, output.prdMarkdown, revision), mockup: this.store.ref(mockupPath, output.mockupHtml, revision) };
        completed.revision += 1; completed.stage = 'review'; completed.artifacts = artifacts; completed.proposals = output.proposals; completed.findings = output.findings;
        completed.task!.status = 'completed'; completed.task!.finishedAt = new Date().toISOString();
        completed.blockers = output.findings.filter(f => f.severity === 'blocking' && !f.resolved).map(f => f.description);
        completed.nextAction = completed.blockers.length ? 'Resolve the listed findings through requested changes.' : 'Ready for human review; approval channel not implemented.';
        const packetPath = resolve(directory, 'gate-1-review-packet.json');
        const packetContent = JSON.stringify({ schemaVersion: 1, projectId: id, preparationRevision: completed.revision, taskId: draftInput.taskId,
          authority: 'draft-only', approvalStatus: 'approval-channel-not-implemented', artifacts, confirmedScope: completed.confirmedScope,
          proposals: completed.proposals, unresolvedFindings: completed.findings.filter(f => !f.resolved), feedback: completed.feedback,
          requiredReviews: requiredReviews(),
          reviewStatus: 'Independent gate-1 reviews have not been performed; this is a preparation packet.' }, null, 2) + '\n';
        await this.store.atomicWrite(packetPath, packetContent);
        completed.reviewPacket = { path: this.store.ref(packetPath, packetContent, revision).path, digest: digest(packetContent), preparationRevision: completed.revision,
          artifacts, unresolvedFindings: completed.findings.filter(f => !f.resolved), authority: 'draft-only', approvalStatus: 'approval-channel-not-implemented', requiredReviews: requiredReviews() };
        await this.persistResult(completed); return completed;
      });
    } catch (error) {
      return await this.serial(id, async () => {
        await this.assertCurrentTask(state);
        state.revision += 1; state.task!.finishedAt = new Date().toISOString();
        const interrupted = error instanceof WorkflowError && error.code === 'DRAFT_TIMEOUT';
        state.stage = interrupted ? 'interrupted' : 'failed'; state.task!.status = interrupted ? 'interrupted' : 'failed';
        state.task!.failure = error instanceof Error ? error.message : String(error);
        state.blockers = [state.task!.failure]; state.nextAction = interrupted ? 'Outcome unresolved. Recover matching evidence or start a separate preparation.' : 'Inspect the drafting failure and explicitly retry with a new operation.';
        await this.persistResult(state); return state;
      });
    } finally { this.active.delete(draftInput.taskId); }
  }
  async technical(id: string, input: Mutation & { preferences: string }): Promise<Preparation> {
    if (typeof input.preferences !== 'string' || input.preferences.length > 20_000) throw new WorkflowError('INVALID_INPUT', 'Technical preferences must be text of at most 20000 characters.', 400);
    return this.beginPlanning(id, input, 'technical', input.preferences.trim());
  }
  async acceptTechnical(id: string, input: Mutation & { digest: string }): Promise<Preparation> {
    return this.serial(id, async () => {
      const state = await this.reconcile(id); this.check(state, input);
      if (state.interview && state.interview.status !== 'ready') throw new WorkflowError('INTERVIEW_REQUIRED', 'Finish the requirements interview before selecting a blueprint.');
      await this.verifyPlanningArtifacts(state);
      const planning = state.planning;
      if (!planning?.technical) throw new WorkflowError('TECHNICAL_REQUIRED', 'Create a technical blueprint before selecting it.');
      if (input.digest !== planning.technical.artifact.digest) throw new WorkflowError('STALE_TECHNICAL', 'The selected digest does not match the current blueprint. Review the current artifact before selecting it.');
      const blockers = planningBlockers(planning.technical);
      if (blockers.length) throw new WorkflowError('PLANNING_BLOCKED', blockers.join(' '));
      planning.technicalDecision = { digest: input.digest, at: new Date().toISOString(), authority: 'local-review-only' };
      delete planning.plan; delete planning.review; delete planning.handoff;
      planning.phase = 'technical-selected'; state.stage = 'review'; state.revision += 1; state.operations.push(input.operationId);
      state.blockers = []; state.nextAction = 'Generate the requirement-linked eval and story plan. Local selection grants no factory approval.';
      await this.store.save(state); return state;
    });
  }
  async plan(id: string, input: Mutation): Promise<Preparation> { return this.beginPlanning(id, input, 'plan'); }
  async reviewPlan(id: string, input: Mutation): Promise<Preparation> {
    const operation = (step: string) => `correction-${digest(input.operationId + ':' + step).slice(0, 32)}`;
    const planOperation = operation('plan'), reviewOperation = operation('review');
    await this.serial(id, async () => {
      const current = await this.reconcile(id); this.check(current, input);
      this.corrections.set(id, new Set([input.operationId, planOperation, reviewOperation]));
    });
    let attempted = false;
    try {
      let state = await this.beginPlanning(id, input, 'review');
      const blockers = state.planning?.review?.findings.filter(f => f.severity === 'blocking' && !f.resolved) ?? [];
      // Unknown/legacy classifications and product decisions never grant correction authority.
      if (state.task?.status === 'completed' && blockers.length && blockers.every(f => f.resolution === 'plan-correction') &&
          !planningBlockers(state.planning!.technical!, state.planning!.plan).length) {
        attempted = true;
        state = await this.beginPlanning(id, { expectedRevision: state.revision, operationId: planOperation }, 'plan');
        if (state.task?.status === 'completed' && !planningBlockers(state.planning!.technical!, state.planning!.plan).length) {
          state = await this.beginPlanning(id, { expectedRevision: state.revision, operationId: reviewOperation }, 'review');
        }
      }
      return await this.serial(id, async () => {
        const current = await this.reconcile(id);
        const complete = current.planning?.phase === 'planning-complete';
        current.planning!.correction!.status = complete ? 'completed' : 'stopped';
        current.planning!.correction!.reason = complete ? (attempted ? 'Plan corrected and independently re-reviewed; no blocking findings remain.' : 'Review complete; no blocking findings remain.')
          : attempted ? 'One correction pass finished without clearing all blockers. Inspect the remaining findings or task failure; no further automatic retry.'
          : 'Review stopped for a task failure, an unresolved product/blueprint decision, or a finding not classified as a plan correction. No automatic change was made.';
        if (!complete) current.nextAction = current.planning!.correction!.reason;
        current.revision++; await this.store.save(current); return current;
      });
    } catch (error) {
      await this.serial(id, async () => {
        const current = await this.store.load(id);
        if (current.planning?.correction?.operationId === input.operationId) {
          current.planning.correction.status = 'stopped'; current.planning.correction.reason = 'Correction stopped: ' + (error instanceof Error ? error.message : String(error));
          current.nextAction = current.planning.correction.reason; current.revision++; await this.store.save(current);
        }
      });
      throw error;
    } finally { this.corrections.delete(id); }
  }
  private sourceBinding(state: Preparation) {
    if (!state.artifacts.prd || !state.artifacts.mockup) throw new WorkflowError('DRAFT_REQUIRED', 'Create the PRD and mockup before planning.');
    return { prd: structuredClone(state.artifacts.prd), mockup: structuredClone(state.artifacts.mockup), confirmedScopeDigest: digest(JSON.stringify(state.confirmedScope)) };
  }
  private planningContent(output: TechnicalOutput | BuildPlanOutput): string {
    const { markdown, ...evidence } = output;
    return markdown + '\n\n## Structured planning evidence\n\n```json\n' + JSON.stringify(evidence, null, 2) + '\n```\n';
  }
  private async verifyPlanningArtifacts(state: Preparation): Promise<void> {
    const planning = state.planning;
    if (!planning) throw new WorkflowError('TECHNICAL_REQUIRED', 'Create a technical blueprint first.');
    if (JSON.stringify(planning.sources) !== JSON.stringify(this.sourceBinding(state))) throw new WorkflowError('STALE_PLANNING', 'The PRD, mockup or confirmed scope changed. Regenerate the technical blueprint.');
    await this.store.readArtifact(planning.sources.prd); await this.store.readArtifact(planning.sources.mockup);
    if (planning.technical) validateTechnical(planning.technical);
    if (planning.plan) validateBuildPlan(planning.plan, { technical: planning.technical } as PlanningInput);
    if (planning.review) validatePlanningReview(planning.review);
    for (const output of [planning.technical, planning.plan]) if (output) {
      const { artifact, ...body } = output;
      const content = await this.store.readArtifact(artifact);
      if (content !== this.planningContent(body as TechnicalOutput | BuildPlanOutput)) throw new WorkflowError('INVALID_TASK_EVIDENCE', 'Structured planning evidence does not match its bound artifact.');
    }
    if (planning.technicalDecision && planning.technicalDecision.digest !== planning.technical?.artifact.digest) throw new WorkflowError('STALE_TECHNICAL', 'The local technical decision no longer matches the blueprint.');
    if (planning.review) {
      if (planning.review.technicalDigest !== planning.technical?.artifact.digest || planning.review.planDigest !== planning.plan?.artifact.digest) throw new WorkflowError('STALE_PLANNING', 'The independent review no longer matches the blueprint and plan.');
      const review = await this.store.readArtifact(planning.review.artifact);
      if (review !== JSON.stringify({ findings: planning.review.findings }, null, 2) + '\n') throw new WorkflowError('INVALID_TASK_EVIDENCE', 'Independent review evidence does not match its artifact.');
    }
    if (planning.handoff) {
      if (planning.phase !== 'planning-complete' || !planning.technical || !planning.technicalDecision || !planning.plan || !planning.review || planningBlockers(planning.technical, planning.plan, planning.review).length) throw new WorkflowError('INVALID_TASK_EVIDENCE', 'Planning handoff lacks completed, unblocked review evidence.');
      const handoff = await this.store.readArtifact(planning.handoff);
      if (handoff !== JSON.stringify(this.planningHandoff(state, planning.handoff.revision), null, 2) + '\n') throw new WorkflowError('INVALID_TASK_EVIDENCE', 'Planning handoff does not match its current draft-only evidence.');
    }
  }
  private planningHandoff(state: Preparation, preparationRevision = state.revision) {
    const planning = state.planning!;
    return { schemaVersion: 1, projectId: state.id, preparationRevision, authority: 'draft-only', approvalStatus: 'approval-channel-not-implemented',
      status: 'planning-complete', dispatchReady: false, sources: planning.sources, technical: planning.technical!.artifact, technicalDecision: planning.technicalDecision,
      plan: planning.plan!.artifact, review: planning.review!.artifact, remainingBlockers: [
        'Independent acceptance test authoring and review have not been performed.', 'Implementation and acceptance test execution have not been performed.',
        'Trusted gate approvals and protected approval integration are not implemented.', 'Factory dispatch integration is not implemented.'
      ] };

  }
  private async beginPlanning(id: string, mutation: Mutation, kind: 'technical' | 'plan' | 'review', preferences?: string): Promise<Preparation> {
    if (!this.planningProvider) throw new WorkflowError('PLANNING_UNAVAILABLE', 'No planning provider is configured.', 503);
    const prepared = await this.serial(id, async () => {
      const state = await this.reconcile(id); this.check(state, mutation);
      if (state.interview && state.interview.status !== 'ready') throw new WorkflowError('INTERVIEW_REQUIRED', 'Finish the requirements interview before preparing a blueprint or plan.');
      const sources = this.sourceBinding(state);
      if (state.findings.some(f => f.severity === 'blocking' && !f.resolved)) throw new WorkflowError('PLANNING_BLOCKED', 'Resolve blocking PRD findings before planning.');
      let feedback: PlanningInput['feedback'];
      if (kind !== 'technical') {
        await this.verifyPlanningArtifacts(state);
        if (!state.planning?.technical || !state.planning.technicalDecision) throw new WorkflowError('TECHNICAL_SELECTION_REQUIRED', 'Review and explicitly select the current technical blueprint before generating a plan.');
        if (kind === 'review' && !state.planning.plan) throw new WorkflowError('PLAN_REQUIRED', 'Generate an eval and story plan before independent review.');
        if (kind === 'plan') {
          feedback = structuredClone(state.planning.review?.findings ?? []);
          if (state.task?.role === 'plan-author' && state.task.status === 'failed' && state.task.failure &&
              state.task.inputArtifacts.technical?.digest === state.planning.technical.artifact.digest &&
              state.task.inputArtifacts.prd?.digest === sources.prd.digest && state.task.inputArtifacts.mockup?.digest === sources.mockup.digest) {
            feedback.push({ id: 'previous-plan-validation', severity: 'blocking', description: state.task.failure, basis: 'The previous generation against these same source artifacts failed structural validation. Correct the generated plan; preserve the authoritative requirements and expected outcomes.' });
          }
        }
      }
      const taskId = randomUUID(), inputRevision = state.revision;
      const prdMarkdown = await this.store.readArtifact(sources.prd), mockupHtml = await this.store.readArtifact(sources.mockup);
      if (kind === 'technical') state.planning = { phase: 'technical-drafting', preferences: preferences!, sources };
      const planning = state.planning!;
      const correctionOperation = this.corrections.get(id)?.values().next().value;
      if (!correctionOperation) delete planning.correction;
      else if (planning.correction?.operationId !== correctionOperation) planning.correction = { operationId: correctionOperation, status: 'running', reason: 'Reviewing the plan; eligible plan defects receive at most one correction and independent re-review.' };
      const planningInput: PlanningInput = { taskId, inputRevision, idea: state.idea, prdMarkdown, mockupHtml, confirmedScope: [...state.confirmedScope], preferences: planning.preferences,
        sources, executionLimitMs: this.executionLimitMs };
      if (planning.technical) {
        const { artifact, ...technical } = planning.technical;
        planningInput.technical = technical; planningInput.technicalDigest = artifact.digest; planningInput.technicalDecision = structuredClone(planning.technicalDecision);
      }
      if ((kind === 'review' || kind === 'plan') && planning.plan) { const { artifact, ...plan } = planning.plan; planningInput.plan = plan; planningInput.planDigest = artifact.digest; }
      if (kind === 'plan') { planningInput.feedback = feedback; delete planning.plan; delete planning.review; delete planning.handoff; planning.phase = 'plan-drafting'; }
      if (kind === 'review') { delete planning.review; delete planning.handoff; planning.phase = 'reviewing'; }
      state.revision += 1; state.stage = 'drafting'; state.operations.push(mutation.operationId); state.blockers = []; state.nextAction = `Running draft-only ${kind} preparation.`;
      state.task = { id: taskId, role: kind === 'technical' ? 'technical-author' : kind === 'plan' ? 'plan-author' : 'planning-reviewer', operationId: mutation.operationId,
        inputRevision, savedRevision: state.revision, inputArtifacts: { prd: sources.prd, mockup: sources.mockup, ...(planning.technical ? { technical: planning.technical.artifact } : {}), ...(planning.plan ? { 'build-plan': planning.plan.artifact } : {}) },
        allowedOutputs: kind === 'technical' ? ['technical.md'] : kind === 'plan' ? ['build-plan.md'] : ['planning-review.json', 'planning-handoff.json'],
        executionLimitMs: this.executionLimitMs, status: 'running', startedAt: new Date().toISOString() };
      await this.store.atomicWrite(resolve(this.store.projectPath(id), 'tasks', `${taskId}.input.json`), JSON.stringify(planningInput, null, 2) + '\n');
      await this.store.save(state); this.active.add(taskId); return { state, planningInput };
    });
    const { state, planningInput } = prepared;
    try {
      const output = await runBoundedPlanning(this.planningProvider, kind, planningInput);
      return await this.serial(id, async () => {
        await this.assertCurrentTask(state);
        const completed = structuredClone(state), planning = completed.planning!;
        const directory = resolve(this.store.projectPath(id), 'artifacts', planningInput.taskId);
        const fileName = kind === 'technical' ? 'technical.md' : kind === 'plan' ? 'build-plan.md' : 'planning-review.json';
        const content = kind === 'review' ? JSON.stringify(output, null, 2) + '\n' : this.planningContent(output as TechnicalOutput | BuildPlanOutput);
        const path = resolve(directory, fileName); await this.store.atomicWrite(path, content);
        const artifact = this.store.ref(path, content, completed.revision + 1);
        if (kind === 'technical') { planning.technical = { ...output as TechnicalOutput, artifact }; planning.phase = 'technical-review'; }
        if (kind === 'plan') { planning.plan = { ...output as BuildPlanOutput, artifact }; planning.phase = 'plan-review'; }
        if (kind === 'review') {
          planning.review = { ...output as PlanningReview, artifact, technicalDigest: planning.technical!.artifact.digest, planDigest: planning.plan!.artifact.digest, authority: 'draft-only' };
          planning.phase = 'plan-review';
        }
        completed.revision += 1; completed.stage = 'review'; completed.task!.status = 'completed'; completed.task!.finishedAt = new Date().toISOString();
        completed.blockers = planningBlockers(planning.technical!, planning.plan, planning.review);
        completed.nextAction = completed.blockers.length ? 'Resolve planning blockers by revising the blueprint or regenerating the plan.' : kind === 'technical' ? 'Review the blueprint and explicitly select its digest as a local technical decision.' : kind === 'plan' ? 'Run independent planning review.' : 'Planning is complete; independent acceptance authoring, execution and trusted factory approvals remain outstanding.';
        if (kind === 'review' && !completed.blockers.length) {
          planning.phase = 'planning-complete';
          const handoff = this.planningHandoff(completed);
          const handoffPath = resolve(directory, 'planning-handoff.json'), handoffContent = JSON.stringify(handoff, null, 2) + '\n';
          await this.store.atomicWrite(handoffPath, handoffContent); planning.handoff = this.store.ref(handoffPath, handoffContent, completed.revision);
          completed.blockers = handoff.remainingBlockers;
        }
        await this.persistResult(completed); return completed;
      });
    } catch (error) {
      return await this.serial(id, async () => {
        await this.assertCurrentTask(state);
        const interrupted = error instanceof WorkflowError && error.code === 'DRAFT_TIMEOUT';
        state.revision += 1; state.stage = interrupted ? 'interrupted' : 'failed'; state.planning!.phase = interrupted ? 'interrupted' : 'failed';
        state.task!.status = interrupted ? 'interrupted' : 'failed'; state.task!.finishedAt = new Date().toISOString(); state.task!.failure = error instanceof Error ? error.message : String(error);
        state.blockers = [state.task!.failure]; state.nextAction = interrupted ? 'Outcome unresolved. Recover matching planning evidence or start a separate preparation.' : 'Inspect the planning failure and explicitly retry with a new operation.';
        await this.persistResult(state); return state;
      });
    } finally { this.active.delete(planningInput.taskId); }
  }
  private async assertCurrentTask(expected: Preparation): Promise<void> {
    const current = await this.store.load(expected.id);
    if (current.revision !== expected.task!.savedRevision || current.task?.id !== expected.task!.id || current.task.status !== 'running') throw new WorkflowError('STALE_OUTPUT', 'Draft output no longer matches the current preparation and was refused.');
  }
  private async persistResult(state: Preparation): Promise<void> {
    await this.store.atomicWrite(resolve(this.store.projectPath(state.id), 'tasks', `${state.task!.id}.result.json`), JSON.stringify(state, null, 2) + '\n');
    await this.store.save(state);
  }
  async readArtifact(id: string, kind: 'prd' | 'mockup' | 'packet' | 'technical' | 'build-plan' | 'handoff'): Promise<string> {
    const state = await this.get(id);
    if (kind === 'packet') {
      if (!state.reviewPacket) throw new WorkflowError('ARTIFACT_NOT_FOUND', 'No current review packet exists.', 404);
      return this.store.readArtifact({ ...state.reviewPacket, revision: state.reviewPacket.preparationRevision });
    }
    if (kind === 'technical' || kind === 'build-plan' || kind === 'handoff') {
      if (state.planning) await this.verifyPlanningArtifacts(state);
      const ref = kind === 'technical' ? state.planning?.technical?.artifact : kind === 'build-plan' ? state.planning?.plan?.artifact : state.planning?.handoff;
      if (!ref) throw new WorkflowError('ARTIFACT_NOT_FOUND', 'No current planning artifact exists.', 404);
      return this.store.readArtifact(ref);
    }
    const ref = state.artifacts[kind];
    if (!ref) throw new WorkflowError('ARTIFACT_NOT_FOUND', 'No draft artifact exists yet.', 404);
    return this.store.readArtifact(ref);
  }
}
