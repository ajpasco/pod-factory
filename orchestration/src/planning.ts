import { posix } from 'node:path';
import { BuildPlanOutput, Finding, PlanningInput, PlanningProvider, PlanningReview, TechnicalOutput, WorkflowError } from './types.js';

const text = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const texts = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);
function requireValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new WorkflowError('INVALID_PLANNING_OUTPUT', message);
}
function findings(value: unknown): value is Finding[] {
  return Array.isArray(value) && value.every(f => f && text(f.id) && text(f.description) && ['blocking', 'advisory'].includes(f.severity) &&
    (f.resolved === undefined || f.resolved === false) && (f.basis === undefined || text(f.basis)) && (f.resolution === undefined || ['plan-correction', 'user-decision', 'blueprint-change'].includes(f.resolution)));
}
function uniqueIds(items: { id: string }[], label: string): void {
  requireValid(new Set(items.map(item => item.id)).size === items.length, `${label} IDs must be unique.`);
}
export function validateTechnical(output: TechnicalOutput): TechnicalOutput {
  requireValid(output && text(output.markdown) && output.markdown.length <= 500_000 && text(output.stack), 'A technical blueprint and explicit stack are required.');
  requireValid(Number.isInteger(output.layers) && output.layers >= 1 && output.layers <= 3, 'Use one to three responsibility layers. Additional layers require an approved exception; exception approval is not implemented.');
  requireValid(Array.isArray(output.requirements) && output.requirements.length > 0 && output.requirements.every(r => r && text(r.id) && text(r.description) && text(r.authority)), 'Enumerate requirements with their source authority.');
  uniqueIds(output.requirements, 'Requirement');
  const topics = ['architecture', 'testability', 'security', 'configuration', 'docker', 'production'];
  requireValid(Array.isArray(output.decisions) && output.decisions.length === topics.length && topics.every(topic => output.decisions.filter(d => d && d.topic === topic && text(d.decision) && text(d.rationale)).length === 1), 'Address architecture, testability, security, configuration, Docker and production with explicit decisions and rationales.');
  requireValid(findings(output.findings), 'Technical findings must be concrete and structured.');
  return output;
}
function overlaps(first: string, second: string): boolean {
  const prefix = (value: string) => { const path = posix.normalize(value.replace(/\\/g, '/')).replace(/\/+$/, '').split(/[?*[{]/, 1)[0]; return path === '.' ? '' : path; };
  const a = prefix(first), b = prefix(second);
  return !a || !b || a === b || a.startsWith(b + '/') || b.startsWith(a + '/') || (/[?*[{]/.test(first) && b.startsWith(a)) || (/[?*[{]/.test(second) && a.startsWith(b));
}
export function validateBuildPlan(output: BuildPlanOutput, input: PlanningInput): BuildPlanOutput {
  requireValid(input.technical, 'A technical blueprint is required to validate a plan.');
  requireValid(output && text(output.markdown) && output.markdown.length <= 500_000 && Array.isArray(output.evals) && Array.isArray(output.stories) && Array.isArray(output.coverage), 'Provide a build plan, evals, stories and complete coverage.');
  const requirements = new Set(input.technical.requirements.map(r => r.id));
  const refs = (value: unknown) => texts(value) && value.every(id => requirements.has(id)) && new Set(value).size === value.length;
  requireValid(output.evals.every(e => e && text(e.id) && refs(e.requirements) && e.requirements.length > 0 && ['correctness', 'restraint', 'production'].includes(e.kind) && text(e.procedure) && text(e.expected) && ['automated', 'review'].includes(e.evidence)), 'Each eval needs valid requirement references, a procedure, expected evidence and an evidence method.');
  uniqueIds(output.evals, 'Eval');
  requireValid(['correctness', 'restraint', 'production'].every(kind => output.evals.some(e => e.kind === kind)), 'Include correctness, restraint and production evals; review evidence may explain non-applicable production checks.');
  const evals = new Map(output.evals.map(e => [e.id, e]));
  requireValid(output.stories.every(s => s && text(s.id) && text(s.title) && refs(s.requirements) && s.requirements.length > 0 && texts(s.evals) && s.evals.length > 0 && new Set(s.evals).size === s.evals.length && s.evals.every(id => evals.has(id)) && texts(s.scope) && s.scope.length > 0 && texts(s.dependsOn) && (s.parallelGroup === undefined || text(s.parallelGroup))), 'Each story needs valid requirements, evals, owned file scope and dependencies.');
  uniqueIds(output.stories, 'Story');
  const stories = new Map(output.stories.map((s, index) => [s.id, { ...s, index }]));
  // Validate the entire dependency graph before traversing ancestors for parallel groups.
  for (const story of output.stories) {
    requireValid(new Set(story.dependsOn).size === story.dependsOn.length && story.dependsOn.every(id => stories.has(id) && stories.get(id)!.index < stories.get(story.id)!.index), 'Story dependencies must exist and appear earlier in execution order; cycles are not allowed.');
  }
  for (const story of output.stories) {
    const missing = story.requirements.filter(id => !story.evals.some(evalId => evals.get(evalId)!.requirements.includes(id)));
    requireValid(missing.length === 0, `Story ${story.id} has no linked eval for: ${missing.join(', ')}. Each story requirement must link to an eval for that requirement. Correct the story's eval links or author the missing eval; do not remove required coverage.`);
    for (const other of output.stories) if (other !== story && story.parallelGroup && other.parallelGroup === story.parallelGroup) {
      requireValid(!story.scope.some(path => other.scope.some(otherPath => overlaps(path, otherPath))), 'Stories sharing file scope cannot be assigned to the same parallel group.');
      const pending = [...other.dependsOn], visited = new Set<string>();
      while (pending.length) { const id = pending.pop()!; if (!visited.has(id)) { visited.add(id); pending.push(...stories.get(id)!.dependsOn); } }
      requireValid(!visited.has(story.id), 'Dependent stories cannot run in the same parallel group.');
    }
  }
  requireValid(output.coverage.length === requirements.size && output.coverage.every(c => c && requirements.has(c.requirementId) && ['covered', 'not-applicable', 'gap'].includes(c.status) && text(c.reason)) && new Set(output.coverage.map(c => c.requirementId)).size === requirements.size, 'Every requirement needs exactly one covered, not-applicable or gap entry with a rationale.');
  for (const coverage of output.coverage) {
    if (coverage.status === 'covered') requireValid(output.evals.some(e => e.requirements.includes(coverage.requirementId)) && output.stories.some(s => s.requirements.includes(coverage.requirementId)), `Covered requirement ${coverage.requirementId} must have both an eval and a story.`);
    // A model-authored "later" decision cannot erase a confirmed requirement. Applicability remains reviewable, while explicit gaps remain blockers.
    if (coverage.status === 'not-applicable') requireValid(!/\b(defer(?:red|ral)?|postpon(?:e|ed)|later release|future release|out of scope)\b/i.test(coverage.reason), 'A deferral cannot be recorded as not-applicable. Record a gap and preserve the requirement for explicit user resolution.');
  }
  requireValid(findings(output.findings), 'Planning findings must be concrete and structured.');
  return output;
}
export function validatePlanningReview(output: PlanningReview): PlanningReview {
  requireValid(output && findings(output.findings), 'Independent review must return structured findings.');
  requireValid(output.findings.every(f => f.severity !== 'blocking' || text(f.basis)), 'Blocking review findings must cite a requirement, demonstrated defect or concrete security issue in basis.');
  return output;
}
export const planningBlockers = (technical: TechnicalOutput, plan?: BuildPlanOutput, review?: PlanningReview): string[] => [
  ...technical.findings, ...(plan?.findings ?? []), ...(review?.findings ?? []),
].filter(f => f.severity === 'blocking' && !f.resolved).map(f => f.description).concat((plan?.coverage ?? []).filter(c => c.status === 'gap').map(c => `${c.requirementId}: ${c.reason}`));

export async function runBoundedPlanning<K extends 'technical' | 'plan' | 'review'>(provider: PlanningProvider, kind: K, input: PlanningInput): Promise<K extends 'technical' ? TechnicalOutput : K extends 'plan' ? BuildPlanOutput : PlanningReview> {
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const output = await Promise.race([
      Promise.resolve().then(() => provider[kind](structuredClone(input), controller.signal)),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new WorkflowError('DRAFT_TIMEOUT', 'Planning execution limit reached; outcome unresolved.')); }, input.executionLimitMs); }),
    ]);
    const validated = kind === 'technical' ? validateTechnical(output as TechnicalOutput) : kind === 'plan' ? validateBuildPlan(output as BuildPlanOutput, input) : validatePlanningReview(output as PlanningReview);
    return validated as K extends 'technical' ? TechnicalOutput : K extends 'plan' ? BuildPlanOutput : PlanningReview;
  } finally { if (timer) clearTimeout(timer); }
}
