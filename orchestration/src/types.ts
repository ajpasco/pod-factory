export interface Proposal { id: string; description: string }
export interface Finding { id: string; description: string; severity: 'blocking' | 'advisory'; resolved?: boolean; basis?: string; resolution?: 'plan-correction' | 'user-decision' | 'blueprint-change' }
export interface ArtifactReference { path: string; digest: string; revision: number }
export interface Question { id: string; prompt: string; answer?: string }
export interface InterviewInput {
  idea: string; confirmedScope: string[]; answers: Question[]; findings: Finding[]; executionLimitMs: number;
}
export interface InterviewOutput { question: string | null; reason: string; summary: string }
export interface InterviewState { status: 'needed' | 'asking' | 'ready'; answers: Question[]; reason?: string; summary?: string }
export interface DraftTask {
  id: string;
  role: 'product-interviewer' | 'product-drafter' | 'technical-author' | 'plan-author' | 'planning-reviewer';
  operationId: string;
  inputRevision: number;
  savedRevision: number;
  inputArtifacts: Partial<Record<'prd' | 'mockup' | 'technical' | 'build-plan', ArtifactReference>>;
  allowedOutputs: string[];
  executionLimitMs: number;
  status: 'running' | 'completed' | 'failed' | 'interrupted';
  startedAt: string;
  finishedAt?: string;
  failure?: string;
}
export interface ReviewPacket {
  path: string;
  digest: string;
  preparationRevision: number;
  artifacts: { prd: ArtifactReference; mockup: ArtifactReference };
  unresolvedFindings: Finding[];
  authority: 'draft-only';
  approvalStatus: 'approval-channel-not-implemented';
  requiredReviews: { role: string; status: 'not-performed' }[];
}
export interface Preparation {
  schemaVersion: 1;
  id: string;
  revision: number;
  stage: 'intake' | 'drafting' | 'review' | 'failed' | 'interrupted';
  idea: string;
  question: Question;
  interview?: InterviewState;
  confirmedScope: string[];
  proposals: Proposal[];
  findings: Finding[];
  feedback: string[];
  artifacts: Partial<Record<'prd' | 'mockup', ArtifactReference>>;
  task?: DraftTask;
  planning?: PlanningState;
  reviewPacket?: ReviewPacket;
  blockers: string[];
  nextAction: string;
  operations: string[];
}
export interface DraftInput {
  taskId: string;
  inputRevision: number;
  idea: string;
  question: Question & { answer: string };
  confirmedScope: string[];
  proposals: Proposal[];
  feedback: string[];
  previousArtifacts?: { prdMarkdown: string; mockupHtml: string };
  allowedOutputs: ['prd.md', 'mockup.html'];
  executionLimitMs: number;
}
export interface DraftOutput {
  prdMarkdown: string;
  mockupHtml: string;
  proposals: Proposal[];
  findings: Finding[];
}
export interface DraftProvider {
  draft(input: DraftInput, signal: AbortSignal): Promise<DraftOutput>;
  interview?(input: InterviewInput, signal: AbortSignal): Promise<InterviewOutput>;
}
export interface Mutation { expectedRevision: number; operationId: string }
export class WorkflowError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 409) {
    super(message); this.name = 'WorkflowError';
  }
}

export type TechnicalTopic = 'architecture' | 'testability' | 'security' | 'configuration' | 'docker' | 'production';
export interface TechnicalOutput {
  markdown: string;
  stack: string;
  layers: number;
  requirements: { id: string; description: string; authority: string }[];
  decisions: { topic: TechnicalTopic; decision: string; rationale: string }[];
  findings: Finding[];
}
export interface BuildPlanOutput {
  markdown: string;
  evals: { id: string; requirements: string[]; kind: 'correctness' | 'restraint' | 'production'; procedure: string; expected: string; evidence: 'automated' | 'review' }[];
  stories: { id: string; title: string; requirements: string[]; evals: string[]; scope: string[]; dependsOn: string[]; parallelGroup?: string }[];
  coverage: { requirementId: string; status: 'covered' | 'not-applicable' | 'gap'; reason: string }[];
  findings: Finding[];
}
export interface PlanningReview { findings: Finding[] }
export interface PlanningSources { prd: ArtifactReference; mockup: ArtifactReference; confirmedScopeDigest: string }
export interface PlanningInput {
  taskId: string;
  inputRevision: number;
  idea: string;
  prdMarkdown: string;
  mockupHtml: string;
  confirmedScope: string[];
  preferences: string;
  sources: PlanningSources;
  technical?: TechnicalOutput;
  technicalDigest?: string;
  technicalDecision?: { digest: string; at: string; authority: 'local-review-only' };
  plan?: BuildPlanOutput;
  planDigest?: string;
  feedback?: Finding[];
  executionLimitMs: number;
}
export interface PlanningProvider {
  technical(input: PlanningInput, signal: AbortSignal): Promise<TechnicalOutput>;
  plan(input: PlanningInput, signal: AbortSignal): Promise<BuildPlanOutput>;
  review(input: PlanningInput, signal: AbortSignal): Promise<PlanningReview>;
}
export interface PlanningState {
  correction?: { operationId: string; status: 'running' | 'completed' | 'stopped'; reason: string };
  phase: 'technical-drafting' | 'technical-review' | 'technical-selected' | 'plan-drafting' | 'plan-review' | 'reviewing' | 'planning-complete' | 'failed' | 'interrupted';
  preferences: string;
  sources: PlanningSources;
  technical?: TechnicalOutput & { artifact: ArtifactReference };
  technicalDecision?: { digest: string; at: string; authority: 'local-review-only' };
  plan?: BuildPlanOutput & { artifact: ArtifactReference };
  review?: PlanningReview & { artifact: ArtifactReference; technicalDigest: string; planDigest: string; authority: 'draft-only' };
  handoff?: ArtifactReference;
}
